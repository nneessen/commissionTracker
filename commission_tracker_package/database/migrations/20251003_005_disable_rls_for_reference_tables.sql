-- Disable RLS on carriers and products tables
-- These are reference/lookup tables that all users need to read
-- No sensitive user data, safe for public read access

ALTER TABLE public.carriers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
