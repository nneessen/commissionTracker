-- Fix get_training_leaderboard: user_profiles has first_name/last_name, not full_name
CREATE OR REPLACE FUNCTION get_training_leaderboard(
  p_agency_id UUID,
  p_period TEXT DEFAULT 'all_time'
)
RETURNS SETOF JSON AS $$
BEGIN
  IF p_period = 'all_time' THEN
    RETURN QUERY
    SELECT json_build_object(
      'user_id', s.user_id,
      'full_name', CONCAT(up.first_name, ' ', up.last_name),
      'total_xp', s.total_xp,
      'modules_completed', s.modules_completed,
      'current_streak_days', s.current_streak_days,
      'rank', ROW_NUMBER() OVER (ORDER BY s.total_xp DESC)
    )
    FROM training_user_stats s
    JOIN user_profiles up ON up.id = s.user_id
    WHERE s.agency_id = p_agency_id
    ORDER BY s.total_xp DESC
    LIMIT 50;
  ELSE
    -- Period-based: aggregate XP from xp_entries within the time window
    RETURN QUERY
    SELECT json_build_object(
      'user_id', xe.user_id,
      'full_name', CONCAT(up.first_name, ' ', up.last_name),
      'total_xp', SUM(xe.xp_amount),
      'modules_completed', COALESCE(s.modules_completed, 0),
      'current_streak_days', COALESCE(s.current_streak_days, 0),
      'rank', ROW_NUMBER() OVER (ORDER BY SUM(xe.xp_amount) DESC)
    )
    FROM training_xp_entries xe
    JOIN user_profiles up ON up.id = xe.user_id
    LEFT JOIN training_user_stats s ON s.user_id = xe.user_id
    WHERE xe.agency_id = p_agency_id
    AND xe.created_at >= CASE
      WHEN p_period = 'week' THEN NOW() - INTERVAL '7 days'
      WHEN p_period = 'month' THEN NOW() - INTERVAL '30 days'
      ELSE '1970-01-01'::TIMESTAMPTZ
    END
    GROUP BY xe.user_id, up.first_name, up.last_name, s.modules_completed, s.current_streak_days
    ORDER BY SUM(xe.xp_amount) DESC
    LIMIT 50;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
