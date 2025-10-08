import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthState } from '../services/authService';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  signInWithPhone: (phoneNumber: string) => Promise<{ success: boolean; error?: string; messageId?: string }>;
  verifyOTP: (phoneNumber: string, token: string) => Promise<{ success: boolean; error?: string; session?: Session }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; session?: Session }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; session?: Session }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; session?: Session }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string; session?: Session }>;
  linkEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  linkPhone: (phoneNumber: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  linkGoogle: () => Promise<{ success: boolean; error?: string; message?: string }>;
  linkApple: () => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  getUserIdentities: () => Promise<{ success: boolean; identities?: any[]; error?: string }>;
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

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthState((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
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
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

