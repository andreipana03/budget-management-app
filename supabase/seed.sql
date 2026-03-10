-- Seed Default Categories
-- This function will be called when a new user registers to create default categories

CREATE OR REPLACE FUNCTION create_default_categories(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Default Expense Categories
    INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES
    (p_user_id, 'Food & Dining', 'expense', '#EF4444', 'utensils', true),
    (p_user_id, 'Transportation', 'expense', '#F59E0B', 'car', true),
    (p_user_id, 'Shopping', 'expense', '#EC4899', 'shopping-bag', true),
    (p_user_id, 'Entertainment', 'expense', '#8B5CF6', 'film', true),
    (p_user_id, 'Bills & Utilities', 'expense', '#3B82F6', 'receipt', true),
    (p_user_id, 'Healthcare', 'expense', '#10B981', 'heart-pulse', true),
    (p_user_id, 'Education', 'expense', '#6366F1', 'book-open', true),
    (p_user_id, 'Housing', 'expense', '#14B8A6', 'home', true),
    (p_user_id, 'Personal Care', 'expense', '#F97316', 'sparkles', true),
    (p_user_id, 'Other', 'expense', '#6B7280', 'more-horizontal', true);

    -- Default Income Categories
    INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES
    (p_user_id, 'Salary', 'income', '#10B981', 'briefcase', true),
    (p_user_id, 'Freelance', 'income', '#3B82F6', 'laptop', true),
    (p_user_id, 'Investments', 'income', '#8B5CF6', 'trending-up', true),
    (p_user_id, 'Gifts', 'income', '#EC4899', 'gift', true),
    (p_user_id, 'Refunds', 'income', '#F59E0B', 'arrow-left-right', true),
    (p_user_id, 'Other', 'income', '#6B7280', 'more-horizontal', true);
END;
$$ LANGUAGE plpgsql;

-- Create default user preferences function
CREATE OR REPLACE FUNCTION create_default_preferences(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO user_preferences (user_id, theme, default_currency, date_format, week_start_day)
    VALUES (p_user_id, 'light', 'USD', 'MM/DD/YYYY', 0)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create default categories and preferences for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_categories(NEW.id);
    PERFORM create_default_preferences(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Seed some common exchange rates (these will be updated by the backend service)
INSERT INTO exchange_rates (base_currency, target_currency, rate) VALUES
('USD', 'EUR', 0.92),
('USD', 'RON', 4.55),
('EUR', 'USD', 1.09),
('EUR', 'RON', 4.97),
('RON', 'USD', 0.22),
('RON', 'EUR', 0.20),
('USD', 'USD', 1.00),
('EUR', 'EUR', 1.00),
('RON', 'RON', 1.00)
ON CONFLICT (base_currency, target_currency) DO NOTHING;
