import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Get environment variables with proper fallback chain
// Try Constants.expoConfig.extra first (for EAS builds), then process.env
const supabaseUrl = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || 
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase configuration missing!');
  console.error('Environment check:', {
    supabaseUrl: supabaseUrl ? '✅ Present' : '❌ MISSING',
    supabaseAnonKey: supabaseAnonKey ? '✅ Present' : '❌ MISSING',
    expoConfigExtra: Constants.expoConfig?.extra,
    processEnv: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
    }
  });
  
  throw new Error(
    'Supabase credentials not configured.\n\n' +
    'Required environment variables:\n' +
    '- EXPO_PUBLIC_SUPABASE_URL\n' +
    '- EXPO_PUBLIC_SUPABASE_ANON_KEY\n\n' +
    'Please run:\n' +
    'eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "YOUR_URL"\n' +
    'eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_KEY"'
  );
}

// Validate that they're not placeholder values
if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  throw new Error(
    'Supabase credentials are still using placeholder values.\n' +
    'Please set actual values for EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

console.log('✅ Supabase configuration validated');
console.log('Supabase URL:', supabaseUrl.substring(0, 30) + '...');

// Custom fetch wrapper for debugging
const customFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  console.log('🌐 Supabase Request:', {
    url: url.substring(0, 100),
    method: init?.method || 'GET',
  });

  try {
    const response = await fetch(input, init);
    
    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    
    try {
      const text = await clonedResponse.text();
      console.log('📥 Supabase Response:', {
        status: response.status,
        statusText: response.statusText,
        hasBody: text.length > 0,
        bodyPreview: text.substring(0, 200),
      });
      
      // Check for empty body on success status
      if (response.ok && (!text || text.trim() === '')) {
        console.warn('⚠️ Empty response body on success status!');
      }
    } catch (readError) {
      console.warn('Could not read response body for logging:', readError);
    }

    return response;
  } catch (error) {
    console.error('❌ Fetch error:', error);
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
  global: {
    fetch: customFetch,
  },
});

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// Database table names
export const TABLES = {
  PROFILES: "profiles",
  LIKES: "likes",
  MATCHES: "matches",
  CHAT_MESSAGES: "chat_messages",
  POSTS: "posts",
  POST_LIKES: "post_likes",
  POST_COMMENTS: "post_comments",
  NOTIFICATIONS: "notifications",
  NOTIFICATION_PREFERENCES: "notification_preferences",
} as const;
