-- Remove trigger that causes "Database error saving new user" during signup.
-- Profile creation is handled by authService.upsert after signUp instead.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
