-- Add savings_goal column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS savings_goal DECIMAL(15, 2) CHECK (savings_goal IS NULL OR savings_goal >= 0);

COMMENT ON COLUMN user_preferences.savings_goal IS 'Monthly savings goal amount in user default currency';
