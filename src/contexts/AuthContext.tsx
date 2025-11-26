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
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
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
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = authService.subscribeToAuthState(async (state) => {
      if (!isMounted) return;

      try {
        setAuthState(state);
        
        // Get profile ID when user is authenticated
        if (state.user) {
          // Helper function to retry profile fetch with delays
          const fetchProfileWithRetry = async (retryCount: number = 0): Promise<void> => {
            if (!isMounted) return;
            
            const id = await userMappingService.getProfileIdFromAuth();
            
            if (id && isMounted) {
              setProfileId(id);
            } else if (retryCount < 3 && isMounted) {
              // Retry with increasing delays (1s, 2s, 3s)
              retryTimeout = setTimeout(() => {
                if (isMounted) {
                  fetchProfileWithRetry(retryCount + 1);
                }
              }, 1000 * (retryCount + 1));
            } else if (isMounted) {
              // Profile not found after retries
              setProfileId(null);
            }
          };

          // Start fetching profile
          fetchProfileWithRetry();
        } else {
          // Clear all caches when user logs out
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
          }
          setProfileId(null);
          if (isMounted) {
            supabaseDataProvider.clearCache().catch(() => {
              // Silently handle cache clear errors
            });
          }
          userMappingService.clearCache();
        }
      } catch (error) {
        // Set loading to false to prevent app from hanging
        if (isMounted) {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      }
    });

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      unsubscribe();
    };
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
    deleteAccount: authService.deleteAccount.bind(authService),
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
