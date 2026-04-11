import { useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, Loader2, Check, Pencil } from 'lucide-react';
import api from '../../services/api.ts';
import CategoryIcon from '../categories/CategoryIcon.tsx';
import { Category } from '../../types/index.ts';

interface Props {
  categories: Category[];
  monthlyIncome: number;
  currency: string;
  currentMonth: number;
  currentYear: number;
  onApplied: () => void;
  onClose: () => void;
  setSavingsGoal: (goal: number | null) => Promise<void>;
}

interface Allocation {
  category_id: string;
  category_name: string;
  amount: number;
  reasoning: string;
}

interface AISuggestion {
  allocations: Allocation[];
  savings_goal: number;
  savings_reasoning: string;
  overall_advice: string;
}

const QUESTIONS = [
  {
    id: 'financialGoal',
    question: "What's your primary financial goal right now?",
    options: [
      { value: 'save aggressively', label: '💰 Save as much as possible' },
      { value: 'pay off debt', label: '📉 Pay off debt' },
      { value: 'build emergency fund', label: '🛡️ Build an emergency fund' },
      { value: 'invest and grow wealth', label: '📈 Invest and grow wealth' },
      { value: 'live comfortably', label: '😊 Live comfortably day to day' },
    ],
  },
  {
    id: 'savingsPriority',
    question: 'How aggressively do you want to save this month?',
    options: [
      { value: 'very aggressive - save 30%+ of income', label: '🔥 Very aggressive (30%+)' },
      { value: 'moderate - save around 20% of income', label: '⚖️ Moderate (around 20%)' },
      { value: 'light - save around 10% of income', label: '🌱 Light (around 10%)' },
      { value: 'not a priority right now', label: '😌 Not a priority right now' },
    ],
  },
  {
    id: 'lifestyle',
    question: 'How would you describe your lifestyle?',
    options: [
      { value: 'minimalist - I spend only on essentials', label: '🧘 Minimalist' },
      { value: 'balanced - mix of needs and wants', label: '⚖️ Balanced' },
      { value: 'comfortable - I enjoy spending on quality', label: '✨ Comfortable' },
      { value: 'social - I spend a lot on going out and experiences', label: '🎉 Social & active' },
    ],
  },
  {
    id: 'dependents',
    question: 'Do you have any financial obligations or dependents?',
    options: [
      { value: 'none', label: '🙋 Just myself' },
      { value: 'partner', label: '👫 Supporting a partner' },
      { value: 'children', label: '👨‍👩‍👧 Children' },
      { value: 'elderly parents', label: '👴 Elderly parents' },
      { value: 'loan or mortgage payments', label: '🏦 Loan or mortgage payments' },
    ],
  },
  {
    id: 'bigExpenses',
    question: 'Any big planned expenses this month?',
    options: [
      { value: 'none', label: '✅ Nothing special' },
      { value: 'vacation or travel', label: '✈️ Vacation or travel' },
      { value: 'home repair or renovation', label: '🔧 Home repair or renovation' },
      { value: 'medical expenses', label: '🏥 Medical expenses' },
      { value: 'large purchase like electronics or furniture', label: '🛍️ Large purchase' },
    ],
  },
];

export default function AutoBudgetWizard({
  categories,
  monthlyIncome,
  currency,
  currentMonth,
  currentYear,
  onApplied,
  onClose,
  setSavingsGoal,
}: Props) {
  const [step, setStep] = useState(0); // 0-4 = questions, 5 = loading, 6 = preview
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [editableAmounts, setEditableAmounts] = useState<Record<string, string>>({});
  const [editableSavings, setEditableSavings] = useState('');
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = QUESTIONS.length;
  const currentQ = QUESTIONS[step];
  const selectedAnswer = answers[currentQ?.id];

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const handleNext = async () => {
    if (loading) return; // prevent double-click
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      // All questions answered — call AI
      setStep(5); // loading
      setLoading(true);
      setError('');
      try {
        const { data } = await api.post('/ai/budget-suggestion', {
          answers,
          categories: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
          monthlyIncome,
          currency,
        });
        setSuggestion(data);
        const amounts: Record<string, string> = {};
        data.allocations.forEach((a: Allocation) => {
          amounts[a.category_id] = a.amount.toFixed(2);
        });
        setEditableAmounts(amounts);
        setEditableSavings(data.savings_goal.toFixed(2));
        setStep(6); // preview
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Something went wrong. Please try again.');
        setStep(4); // back to last question
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApply = async () => {
    if (!suggestion) return;
    setApplying(true);
    try {
      // Fetch existing budgets to know which to update vs create
      const { data: existingBudgets } = await api.get(`/budgets/status/${currentYear}/${currentMonth}`);

      await Promise.all(
        suggestion.allocations.map(async ({ category_id }) => {
          const amount = parseFloat(editableAmounts[category_id] || '0');
          if (amount <= 0) return;
          const existing = existingBudgets.find((b: any) => b.category_id === category_id);
          if (existing) {
            await api.put(`/budgets/${existing.id}`, { limit_amount: amount, currency });
          } else {
            await api.post('/budgets', {
              category_id,
              month: currentMonth,
              year: currentYear,
              limit_amount: amount,
              currency,
            });
          }
        })
      );

      // Apply savings goal
      const savingsVal = parseFloat(editableSavings);
      if (!isNaN(savingsVal) && savingsVal > 0) {
        await setSavingsGoal(savingsVal);
      }

      // Call onApplied to refresh the parent component
      onApplied();
    } catch (e) {
      console.error('Apply error:', e);
      alert('Failed to apply budgets. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const progress = Math.round(((step) / totalSteps) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Budget Planner</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
          </div>
          {step < totalSteps && (
            <>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Question {step + 1} of {totalSteps}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Question step */}
          {step < totalSteps && (
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-white mb-5">{currentQ.question}</p>
              <div className="space-y-2">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                      selectedAnswer === opt.value
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-violet-300 dark:hover:border-violet-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            </div>
          )}

          {/* Loading step */}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">Analyzing your profile and generating a personalized budget...</p>
            </div>
          )}

          {/* Preview step */}
          {step === 6 && suggestion && (
            <div className="space-y-5">
              {/* Overall advice */}
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 text-sm text-violet-800 dark:text-violet-300">
                {suggestion.overall_advice}
              </div>

              {/* Category allocations */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Budget Allocations</p>
                <div className="space-y-2">
                  {suggestion.allocations.map((alloc) => {
                    const cat = categories.find((c) => c.id === alloc.category_id);
                    return (
                      <div key={alloc.category_id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                        {cat && <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{alloc.category_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{alloc.reasoning}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editableAmounts[alloc.category_id] ?? ''}
                            onChange={(e) => setEditableAmounts((prev) => ({ ...prev, [alloc.category_id]: e.target.value }))}
                            className="w-24 text-right px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <span className="text-xs text-gray-400">{currency}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Savings goal */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Suggested Savings Goal</p>
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center text-base flex-shrink-0">🐷</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Monthly Savings</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{suggestion.savings_reasoning}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editableSavings}
                      onChange={(e) => setEditableSavings(e.target.value)}
                      className="w-24 text-right px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-xs text-gray-400">{currency}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex gap-3">
          {step > 0 && step < totalSteps && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}

          {step < totalSteps && (
            <button
              onClick={handleNext}
              disabled={!selectedAnswer || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === totalSteps - 1 ? (
                <><Sparkles className="w-4 h-4" /> Generate Budget</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          )}

          {step === 6 && (
            <>
              <button
                onClick={() => { setStep(0); setAnswers({}); setSuggestion(null); }}
                className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                <Pencil className="w-3.5 h-3.5" /> Redo
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {applying ? 'Applying...' : 'Apply Budget'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
