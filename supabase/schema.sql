-- Budget Management App Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Preferences Table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    default_currency TEXT NOT NULL DEFAULT 'USD',
    date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
    week_start_day INTEGER NOT NULL DEFAULT 0 CHECK (week_start_day >= 0 AND week_start_day <= 6),
    savings_goal DECIMAL(15, 2) CHECK (savings_goal IS NULL OR savings_goal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id)
);

-- Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    color TEXT NOT NULL DEFAULT '#3B82F6',
    icon TEXT NOT NULL DEFAULT 'circle',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    converted_amount DECIMAL(15, 2) NOT NULL CHECK (converted_amount > 0),
    date DATE NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB,
    parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Budgets Table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    limit_amount DECIMAL(15, 2) NOT NULL CHECK (limit_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, category_id, month, year)
);

-- Exchange Rates Table
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate DECIMAL(15, 6) NOT NULL CHECK (rate > 0),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(base_currency, target_currency)
);

-- Create indexes for better query performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_month_year ON budgets(month, year);
CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(base_currency, target_currency);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Categories Policies
CREATE POLICY "Users can view their own categories"
    ON categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE
    USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Users can view their own budgets"
    ON budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
    ON budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
    ON budgets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
    ON budgets FOR DELETE
    USING (auth.uid() = user_id);

-- Exchange Rates Policies (public read access)
CREATE POLICY "Anyone can view exchange rates"
    ON exchange_rates FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can modify exchange rates
CREATE POLICY "Service role can manage exchange rates"
    ON exchange_rates FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
