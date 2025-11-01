import React, { useEffect, useState, useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_600SemiBold,
  NotoSansJP_700Bold,
} from '@expo-google-fonts/noto-sans-jp';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('SplashScreen.preventAutoHideAsync error:', error);
});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    NotoSansJP_400Regular,
    NotoSansJP_500Medium,
    NotoSansJP_600SemiBold,
    NotoSansJP_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Wait for fonts to load
        if (fontsLoaded || fontError) {
          if (fontError) {
            console.error('Font loading error:', fontError);
          }
          
          // Artificial delay to ensure app is ready (optional, helps with slower devices)
          await new Promise(resolve => setTimeout(resolve, 100));
          
          setAppIsReady(true);
        }
      } catch (e) {
        console.error('Error preparing app:', e);
        // Set app as ready anyway to prevent infinite splash screen
        setAppIsReady(true);
      }
    }

    prepare();
  }, [fontsLoaded, fontError]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately after the root view layout
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('SplashScreen.hideAsync error:', error);
      }
    }
  }, [appIsReady]);

  // Add timeout fallback to prevent infinite splash screen (10 seconds max)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!appIsReady) {
        console.warn('App taking too long to load, forcing splash screen to hide');
        setAppIsReady(true);
        SplashScreen.hideAsync().catch(console.warn);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [appIsReady]);

  if (!appIsReady) {
    return null; // Keep splash screen visible while loading
  }

  return (
    <ErrorBoundary>
      <AppNavigator onReady={onLayoutRootView} />
    </ErrorBoundary>
  );
}
