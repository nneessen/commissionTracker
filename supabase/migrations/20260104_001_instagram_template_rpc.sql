-- Migration: Instagram Template Use Count RPC Function
-- Creates RPC function to increment template use count atomically

-- Create the function to increment template use count
CREATE OR REPLACE FUNCTION increment_template_use_count(p_template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE instagram_message_templates
  SET
    use_count = use_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_template_id;

  -- Log if template not found (optional, for debugging)
  IF NOT FOUND THEN
    RAISE WARNING 'Template with id % not found', p_template_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_template_use_count(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION increment_template_use_count(UUID) IS
  'Atomically increments the use_count and updates last_used_at for an Instagram message template';
