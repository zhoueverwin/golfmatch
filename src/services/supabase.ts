import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names
export const TABLES = {
  PROFILES: 'profiles',
  LIKES: 'likes',
  MATCHES: 'matches',
  CHAT_MESSAGES: 'chat_messages',
  POSTS: 'posts',
  POST_LIKES: 'post_likes',
  POST_COMMENTS: 'post_comments',
} as const;
