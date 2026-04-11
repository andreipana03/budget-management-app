import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

interface QuestionnaireAnswers {
  financialGoal: string;       // Q1: primary financial goal
  savingsPriority: string;     // Q2: how aggressively they want to save
  lifestyle: string;           // Q3: lifestyle type
  dependents: string;          // Q4: dependents / obligations
  bigExpenses: string;         // Q5: any big planned expenses this month
}

interface CategoryInput {
  id: string;
  name: string;
  icon: string;
}

router.post('/budget-suggestion', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      answers,
      categories,
      monthlyIncome,
      currency,
    }: {
      answers: QuestionnaireAnswers;
      categories: CategoryInput[];
      monthlyIncome: number;
      currency: string;
    } = req.body;

    if (!monthlyIncome || monthlyIncome <= 0) {
      return res.status(400).json({ error: 'Monthly income must be greater than 0' });
    }

    if (!categories || categories.length === 0) {
      return res.status(400).json({ error: 'No categories provided' });
    }

    const categoryList = categories.map((c) => `- ${c.name} (id: ${c.id})`).join('\n');

    const prompt = `You are a personal finance advisor. Based on the user's profile and their expense categories, generate a monthly budget allocation.

USER PROFILE:
- Monthly income: ${monthlyIncome.toFixed(2)} ${currency}
- Primary financial goal: ${answers.financialGoal}
- Savings priority: ${answers.savingsPriority}
- Lifestyle: ${answers.lifestyle}
- Dependents/obligations: ${answers.dependents}
- Planned big expenses this month: ${answers.bigExpenses}

EXPENSE CATEGORIES TO BUDGET:
${categoryList}

INSTRUCTIONS:
1. Allocate the monthly income across the expense categories in a financially healthy way based on the user's profile.
2. Also suggest a monthly savings goal amount.
3. The sum of all category allocations + savings goal should equal exactly ${monthlyIncome.toFixed(2)} ${currency}.
4. Be practical and realistic. Prioritize needs over wants based on the user's answers.
5. Return ONLY valid JSON, no markdown, no explanation. Use this exact structure:

{
  "allocations": [
    { "category_id": "<id>", "category_name": "<name>", "amount": <number>, "reasoning": "<one short sentence why>" }
  ],
  "savings_goal": <number>,
  "savings_reasoning": "<one short sentence>",
  "overall_advice": "<2-3 sentence summary of the strategy>"
}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set in server/.env' });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Gemini raw response:', text);
      return res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' });
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('AI budget suggestion error:', error?.message || error);
    const msg: string = error?.message || '';
    if (msg.includes('API_KEY') || msg.includes('API key')) {
      return res.status(500).json({ error: 'Invalid Gemini API key. Check GEMINI_API_KEY in server/.env' });
    }
    if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      // Extract whether it's per-minute or per-day
      const isDaily = msg.includes('daily') || msg.includes('per day');
      return res.status(429).json({ 
        error: isDaily 
          ? 'Daily Gemini API quota exceeded. Try again tomorrow or generate a new API key at aistudio.google.com.'
          : 'Gemini rate limit hit (10 req/min). Wait 60 seconds and try again.'
      });
    }
    res.status(500).json({ error: msg || 'Failed to generate budget suggestion' });
  }
});

export default router;
