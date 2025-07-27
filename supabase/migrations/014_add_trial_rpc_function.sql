-- Создаем RPC функцию для добавления категории в список использованных пробных периодов
CREATE OR REPLACE FUNCTION add_used_trial_category(user_id UUID, category_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET used_trial_categories = array_append(
        COALESCE(used_trial_categories, '{}'), 
        category_id::TEXT
    )
    WHERE id = user_id
    AND NOT (category_id::TEXT = ANY(COALESCE(used_trial_categories, '{}')));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 