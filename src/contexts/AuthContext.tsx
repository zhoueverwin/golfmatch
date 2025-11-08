import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authService, AuthState } from "../services/authService";
import { User, Session } from "@supabase/supabase-js";
import { userMappingService } from "../services/userMappingService";
import { supabaseDataProvider } from "../services/supabaseDataProvider";
import { useUserPresence } from "../hooks/useUserPresence";

interface AuthContextType extends AuthState {
  profileId: string | null; // Profile ID from profiles table
  signInWithPhone: (
    phoneNumber: string,
  ) => Promise<{ success: boolean; error?: string; messageId?: string }>;
  verifyOTP: (
    phoneNumber: string,
    token: string,
  ) => Promise<{ success: boolean; error?: string; session?: Session }>;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; session?: Session }>;
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; session?: Session }>;
  signInWithGoogle: () => Promise<{
    success: boolean;
    error?: string;
    session?: Session;
  }>;
  signInWithApple: () => Promise<{
    success: boolean;
    error?: string;
    session?: Session;
  }>;
  linkEmail: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  linkPhone: (
    phoneNumber: string,
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  linkGoogle: () => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  linkApple: () => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  getUserIdentities: () => Promise<{
    success: boolean;
    identities?: any[];
    error?: string;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = authService.subscribeToAuthState(async (state) => {
        try {
          setAuthState(state);
          
          // Get profile ID when user is authenticated
          if (state.user) {
            // Retry up to 3 times with delays (in case profile creation is delayed)
            let id = await userMappingService.getProfileIdFromAuth();
            let retries = 0;
            
            while (!id && retries < 3) {
              retries++;
              console.log(`[AuthContext] Profile not found, retry ${retries}/3`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // 1s, 2s, 3s delays
              id = await userMappingService.getProfileIdFromAuth();
            }
            
            if (!id) {
              console.error('[AuthContext] Profile not found after 3 retries. Trigger may not be working.');
            }
            
            setProfileId(id);
          } else {
            // Clear all caches when user logs out
            setProfileId(null);
            await supabaseDataProvider.clearCache();
            userMappingService.clearCache();
          }
        } catch (error) {
          console.error('[AuthProvider] Error in auth state handler:', error);
          // Set loading to false to prevent app from hanging
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('[AuthProvider] Error subscribing to auth state:', error);
      // Ensure app doesn't hang on auth initialization failure
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Track user presence based on authentication state
  useUserPresence(profileId, !!profileId);

  const contextValue: AuthContextType = {
    ...authState,
    profileId,
    signInWithPhone: authService.sendOTP.bind(authService),
    verifyOTP: authService.verifyOTP.bind(authService),
    signInWithEmail: authService.signInWithEmail.bind(authService),
    signUpWithEmail: authService.signUpWithEmail.bind(authService),
    signInWithGoogle: authService.signInWithGoogle.bind(authService),
    signInWithApple: authService.signInWithApple.bind(authService),
    linkEmail: authService.linkEmail.bind(authService),
    linkPhone: authService.linkPhone.bind(authService),
    linkGoogle: authService.linkGoogle.bind(authService),
    linkApple: authService.linkApple.bind(authService),
    signOut: authService.signOut.bind(authService),
    getUserIdentities: authService.getUserIdentities.bind(authService),
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
