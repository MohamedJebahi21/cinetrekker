-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create followed_shows table
CREATE TABLE public.followed_shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL,
  show_name TEXT NOT NULL,
  poster_path TEXT,
  last_watched_season INTEGER DEFAULT 0,
  last_watched_episode INTEGER DEFAULT 0,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, show_id)
);

-- Enable RLS on followed_shows
ALTER TABLE public.followed_shows ENABLE ROW LEVEL SECURITY;

-- Followed shows policies
CREATE POLICY "Users can view their followed shows" ON public.followed_shows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can follow shows" ON public.followed_shows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their followed shows" ON public.followed_shows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can unfollow shows" ON public.followed_shows FOR DELETE USING (auth.uid() = user_id);

-- Create watched_episodes table
CREATE TABLE public.watched_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  episode_name TEXT,
  air_date DATE,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, show_id, season_number, episode_number)
);

-- Enable RLS on watched_episodes
ALTER TABLE public.watched_episodes ENABLE ROW LEVEL SECURITY;

-- Watched episodes policies
CREATE POLICY "Users can view their watched episodes" ON public.watched_episodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark episodes as watched" ON public.watched_episodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update watched episodes" ON public.watched_episodes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove watched episodes" ON public.watched_episodes FOR DELETE USING (auth.uid() = user_id);

-- Create user_watchlist table (to replace localStorage)
CREATE TABLE public.user_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id, media_type)
);

-- Enable RLS on user_watchlist
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

-- Watchlist policies
CREATE POLICY "Users can view their watchlist" ON public.user_watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to watchlist" ON public.user_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from watchlist" ON public.user_watchlist FOR DELETE USING (auth.uid() = user_id);

-- Create user_watched table (to replace localStorage for watched media)
CREATE TABLE public.user_watched (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  note TEXT,
  status TEXT CHECK (status IN ('watching', 'completed', 'dropped', 'plan_to_watch')),
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id, media_type)
);

-- Enable RLS on user_watched
ALTER TABLE public.user_watched ENABLE ROW LEVEL SECURITY;

-- Watched media policies
CREATE POLICY "Users can view their watched media" ON public.user_watched FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add watched media" ON public.user_watched FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update watched media" ON public.user_watched FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove watched media" ON public.user_watched FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();