export interface User {
  id: string;
  email?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  currency: string;
  converted_amount: number;
  date: string;
  description?: string;
  is_recurring: boolean;
  recurrence_pattern?: any;
  parent_transaction_id?: string;
  created_at: string;
  updated_at: string;
  categories?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: number;
  year: number;
  limit_amount: number;
  created_at: string;
  updated_at: string;
  categories?: Category;
  spent?: number;
  remaining?: number;
  percentage?: number;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  default_currency: string;
  date_format: string;
  week_start_day: number;
  created_at: string;
  updated_at: string;
}
