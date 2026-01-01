import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

/**
 * EnvironmentBanner - Shows a visual indicator when the app is running in development mode
 *
 * This banner only appears when connected to the development Supabase branch.
 * In production builds, it remains hidden.
 */
export const EnvironmentBanner: React.FC = () => {
  const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
                      process.env.EXPO_PUBLIC_SUPABASE_URL;

  // Don't show banner in production (main branch)
  if (supabaseUrl?.includes('rriwpoqhbgvprbhomckk')) {
    return null;
  }

  // Show banner for development branch
  if (supabaseUrl?.includes('vpbsievccbtyycsfsflh')) {
    return (
      <View style={styles.banner}>
        <Text style={styles.text}>🔧 DEVELOPMENT MODE</Text>
      </View>
    );
  }

  // Show banner for any other non-production environment
  return (
    <View style={[styles.banner, styles.unknownBanner]}>
      <Text style={styles.text}>⚠️ UNKNOWN ENVIRONMENT</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unknownBanner: {
    backgroundColor: '#FFA500',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
