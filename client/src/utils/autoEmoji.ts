/**
 * Returns a suggested emoji based on a category name.
 * Single-word keywords must match a whole word; multi-word keywords match as a phrase.
 */

const rules: { keywords: string[]; emoji: string }[] = [
  // Food & Drink
  { keywords: ['food', 'dining', 'restaurant', 'eat', 'meal', 'lunch', 'dinner', 'breakfast', 'snack', 'cuisine'], emoji: '🍽️' },
  { keywords: ['coffee', 'cafe', 'espresso', 'latte'], emoji: '☕' },
  { keywords: ['pizza'], emoji: '🍕' },
  { keywords: ['burger', 'fastfood', 'fast food'], emoji: '🍔' },
  { keywords: ['sushi', 'japanese'], emoji: '🍣' },
  { keywords: ['grocery', 'groceries', 'supermarket', 'market'], emoji: '🛒' },
  { keywords: ['alcohol', 'beer', 'wine', 'bar', 'pub', 'drinks'], emoji: '🍺' },
  { keywords: ['bakery', 'bread', 'pastry'], emoji: '🥐' },
  { keywords: ['ice cream', 'dessert', 'sweets', 'candy'], emoji: '🍦' },

  // Transport
  { keywords: ['transport', 'transportation', 'commute', 'transit'], emoji: '🚌' },
  { keywords: ['car', 'auto', 'vehicle', 'drive', 'driving'], emoji: '🚗' },
  { keywords: ['fuel', 'gas', 'petrol', 'gasoline'], emoji: '⛽' },
  { keywords: ['taxi', 'uber', 'lyft', 'ride'], emoji: '🚕' },
  { keywords: ['flight', 'airline', 'airplane', 'plane', 'airport'], emoji: '✈️' },
  { keywords: ['train', 'rail', 'metro', 'subway', 'underground'], emoji: '🚆' },
  { keywords: ['bike', 'bicycle', 'cycling'], emoji: '🚲' },
  { keywords: ['parking'], emoji: '🅿️' },
  { keywords: ['boat', 'ferry', 'ship'], emoji: '⛵' },

  // Shopping
  { keywords: ['shopping', 'shop', 'retail', 'store', 'purchase', 'buy'], emoji: '🛍️' },
  { keywords: ['clothes', 'clothing', 'fashion', 'apparel', 'outfit', 'dress', 'shoes'], emoji: '👗' },
  { keywords: ['electronics', 'gadget', 'tech', 'device', 'computer', 'laptop', 'phone'], emoji: '💻' },
  { keywords: ['furniture', 'home decor', 'decor'], emoji: '🛋️' },
  { keywords: ['book', 'books'], emoji: '📚' },
  { keywords: ['toy', 'toys', 'games', 'game'], emoji: '🎮' },
  { keywords: ['jewelry', 'jewellery', 'accessories'], emoji: '💍' },

  // Bills & Utilities
  { keywords: ['bill', 'bills', 'utilities', 'utility'], emoji: '📄' },
  { keywords: ['electricity', 'electric', 'power', 'energy'], emoji: '⚡' },
  { keywords: ['water'], emoji: '💧' },
  { keywords: ['internet', 'wifi', 'broadband'], emoji: '📶' },
  { keywords: ['mobile', 'cell', 'telephone'], emoji: '📱' },
  { keywords: ['rent', 'lease'], emoji: '🏠' },
  { keywords: ['mortgage'], emoji: '🏦' },
  { keywords: ['insurance'], emoji: '🛡️' },
  { keywords: ['subscription', 'subscriptions', 'streaming'], emoji: '📺' },
  { keywords: ['tax', 'taxes'], emoji: '🧾' },

  // Healthcare
  { keywords: ['health', 'healthcare', 'medical', 'medicine', 'clinic', 'hospital'], emoji: '🏥' },
  { keywords: ['doctor', 'physician', 'checkup'], emoji: '👨‍⚕️' },
  { keywords: ['dentist', 'dental', 'teeth'], emoji: '🦷' },
  { keywords: ['pharmacy', 'drug', 'drugs', 'prescription', 'medication'], emoji: '💊' },
  { keywords: ['gym', 'fitness', 'workout', 'exercise', 'sport', 'sports'], emoji: '💪' },
  { keywords: ['therapy', 'therapist', 'counseling'], emoji: '🧠' },
  { keywords: ['vision', 'glasses', 'optician'], emoji: '👓' },

  // Education
  { keywords: ['education', 'school', 'university', 'college', 'study', 'learning', 'course', 'tuition'], emoji: '🎓' },
  { keywords: ['elearning', 'udemy', 'coursera'], emoji: '💡' },
  { keywords: ['stationery', 'supplies', 'notebook'], emoji: '✏️' },
  { keywords: ['library'], emoji: '📖' },

  // Entertainment
  { keywords: ['entertainment', 'fun', 'leisure', 'hobby', 'hobbies'], emoji: '🎉' },
  { keywords: ['movie', 'movies', 'cinema', 'film', 'theatre', 'theater'], emoji: '🎬' },
  { keywords: ['music', 'concert', 'spotify'], emoji: '🎵' },
  { keywords: ['gaming', 'playstation', 'xbox', 'nintendo'], emoji: '🕹️' },
  { keywords: ['travel', 'vacation', 'holiday', 'trip', 'tourism', 'tourist'], emoji: '🌍' },
  { keywords: ['hotel', 'accommodation', 'airbnb', 'hostel', 'motel'], emoji: '🏨' },
  { keywords: ['football', 'soccer', 'basketball', 'tennis'], emoji: '⚽' },
  { keywords: ['art', 'museum', 'gallery', 'exhibition'], emoji: '🎨' },
  { keywords: ['photography', 'camera'], emoji: '📷' },
  { keywords: ['reading', 'kindle'], emoji: '📚' },
  { keywords: ['pet', 'pets', 'dog', 'cat', 'animal'], emoji: '🐾' },

  // Housing
  { keywords: ['housing', 'home', 'house', 'apartment', 'flat'], emoji: '🏠' },
  { keywords: ['maintenance', 'repair', 'renovation', 'remodel'], emoji: '🔧' },
  { keywords: ['cleaning', 'cleaner', 'laundry'], emoji: '🧹' },
  { keywords: ['garden', 'gardening', 'lawn'], emoji: '🌱' },
  { keywords: ['security', 'alarm', 'lock'], emoji: '🔒' },

  // Personal Care
  { keywords: ['personal care', 'self care', 'selfcare', 'grooming'], emoji: '✨' },
  { keywords: ['hair', 'haircut', 'salon', 'barber'], emoji: '💇' },
  { keywords: ['beauty', 'makeup', 'cosmetics', 'skincare'], emoji: '💄' },
  { keywords: ['spa', 'massage', 'wellness', 'relax'], emoji: '🧖' },
  { keywords: ['hygiene', 'toiletries'], emoji: '🧴' },

  // Income
  { keywords: ['salary', 'wage', 'paycheck', 'payroll', 'income'], emoji: '💰' },
  { keywords: ['freelance', 'freelancing', 'consulting', 'contract'], emoji: '💼' },
  { keywords: ['investment', 'investments', 'stocks', 'dividends', 'crypto', 'trading'], emoji: '📈' },
  { keywords: ['gift', 'gifts', 'present', 'bonus'], emoji: '🎁' },
  { keywords: ['refund', 'refunds', 'cashback', 'reimbursement'], emoji: '↩️' },
  { keywords: ['rental income', 'rent income'], emoji: '🏘️' },
  { keywords: ['business', 'revenue', 'sales'], emoji: '🏢' },
  { keywords: ['pension', 'retirement'], emoji: '👴' },
  { keywords: ['scholarship', 'grant', 'bursary'], emoji: '🎓' },

  // Misc
  { keywords: ['charity', 'donation', 'donate'], emoji: '❤️' },
  { keywords: ['savings', 'saving', 'piggy bank'], emoji: '🐷' },
  { keywords: ['loan', 'debt', 'credit', 'repayment'], emoji: '💳' },
  { keywords: ['fee', 'fees', 'charge', 'charges', 'fine'], emoji: '🧾' },
  { keywords: ['child', 'children', 'kids', 'baby', 'childcare', 'daycare'], emoji: '👶' },
  { keywords: ['family', 'parents', 'relatives'], emoji: '👨‍👩‍👧' },
  { keywords: ['wedding', 'marriage'], emoji: '💒' },
  { keywords: ['party', 'celebration', 'event'], emoji: '🎊' },
  { keywords: ['work', 'office'], emoji: '💼' },
];

export function suggestEmoji(name: string): string {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/);
  for (const rule of rules) {
    const matched = rule.keywords.some((kw) => {
      if (kw.includes(' ')) return lower.includes(kw);
      return words.includes(kw);
    });
    if (matched) return rule.emoji;
  }
  return '';
}
