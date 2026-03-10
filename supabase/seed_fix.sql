-- Fix for Database Error on User Registration
-- Run this in Supabase SQL Editor if you're getting "Database error saving new user"

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS create_default_categories(UUID);
DROP FUNCTION IF EXISTS create_default_preferences(UUID);

-- Recreate the functions with better error handling
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating default categories: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default user preferences function
CREATE OR REPLACE FUNCTION create_default_preferences(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO user_preferences (user_id, theme, default_currency, date_format, week_start_day)
    VALUES (p_user_id, 'light', 'USD', 'MM/DD/YYYY', 0)
    ON CONFLICT (user_id) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating default preferences: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function with error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Use a slight delay to ensure user is fully created
    PERFORM pg_sleep(0.1);
    
    -- Create default data
    PERFORM create_default_categories(NEW.id);
    PERFORM create_default_preferences(NEW.id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Verify the trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
