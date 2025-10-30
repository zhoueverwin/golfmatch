import { supabase } from "./supabase";
import { Session, User, AuthError } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export interface PhoneAuthResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface OTPVerificationResult {
  success: boolean;
  error?: string;
  session?: Session;
}

export interface IdentityLinkResult {
  success: boolean;
  error?: string;
  message?: string;
}

class AuthService {
  private authStateListeners: ((state: AuthState) => void)[] = [];
  private currentAuthState: AuthState = {
    user: null,
    session: null,
    loading: true,
  };

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      // Get initial session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
      }

      this.updateAuthState({
        user: session?.user || null,
        session,
        loading: false,
      });

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        this.updateAuthState({
          user: session?.user || null,
          session,
          loading: false,
        });
      });
    } catch (error) {
      console.error("Error initializing auth:", error);
      this.updateAuthState({
        user: null,
        session: null,
        loading: false,
      });
    }
  }

  private updateAuthState(newState: AuthState): void {
    this.currentAuthState = newState;
    this.authStateListeners.forEach((listener) => listener(newState));
  }

  // Subscribe to auth state changes
  subscribeToAuthState(listener: (state: AuthState) => void): () => void {
    this.authStateListeners.push(listener);

    // Call immediately with current state
    listener(this.currentAuthState);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Phone number authentication
  async sendOTP(phoneNumber: string): Promise<PhoneAuthResult> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        messageId: "OTP sent successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send OTP",
      };
    }
  }

  async verifyOTP(
    phoneNumber: string,
    token: string,
  ): Promise<OTPVerificationResult> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token,
        type: "sms",
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        session: data.session || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to verify OTP",
      };
    }
  }

  // Email/Password authentication
  async signUpWithEmail(
    email: string,
    password: string,
  ): Promise<OTPVerificationResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: email.split('@')[0], // Use email username as default name
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Check if user already exists and is verified (repeated signup)
      // Supabase returns a user object but doesn't send a new confirmation email
      if (data.user && data.user.email_confirmed_at && !data.session) {
        return {
          success: false,
          error: "このメールアドレスは既に登録されています。ログインしてください。",
        };
      }

      // Check if email confirmation is required (new unverified user)
      if (data.user && !data.session) {
        return {
          success: true,
          session: undefined,
          error: "Please check your email to confirm your account.",
        };
      }

      return {
        success: true,
        session: data.session || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign up",
      };
    }
  }

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<OTPVerificationResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        session: data.session || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign in",
      };
    }
  }

  // Google OAuth
  async signInWithGoogle(): Promise<OTPVerificationResult> {
    try {
      // Use Supabase callback URL - this is the only URL Google accepts
      const redirectUrl =
        "https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback";

      console.log("🔗 Google OAuth redirect URL:", redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("❌ Google OAuth error:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.url) {
        console.log("🌐 Opening Google OAuth URL:", data.url);

        // Use a different approach - don't specify redirect URL in WebBrowser
        // This prevents the redirect loop
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          undefined, // Don't specify redirect URL here
          {
            showInRecents: false,
            preferEphemeralSession: true,
          },
        );

        console.log("🔗 OAuth result:", result);

        if (result.type === "success" && result.url) {
          console.log("✅ OAuth success, processing URL:", result.url);

          // Parse the URL to extract tokens
          const url = new URL(result.url);
          const accessToken = url.searchParams.get("access_token");
          const refreshToken = url.searchParams.get("refresh_token");
          const errorParam = url.searchParams.get("error");

          if (errorParam) {
            return {
              success: false,
              error: `OAuth error: ${errorParam}`,
            };
          }

          if (accessToken && refreshToken) {
            console.log("🔐 Setting session with tokens");
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              console.error("❌ Session error:", sessionError);
              return {
                success: false,
                error: sessionError.message,
              };
            }

            console.log("✅ Google sign-in successful");
            return {
              success: true,
              session: sessionData.session || undefined,
            };
          } else {
            console.error("❌ Missing tokens in OAuth response");
            return {
              success: false,
              error: "Missing authentication tokens",
            };
          }
        } else if (result.type === "cancel") {
          console.log("🚫 Google OAuth cancelled by user");
          return {
            success: false,
            error: "Google sign-in was cancelled",
          };
        } else {
          console.error("❌ Unexpected OAuth result:", result);
          return {
            success: false,
            error: "Unexpected OAuth result",
          };
        }
      }

      return {
        success: false,
        error: "No OAuth URL received from Supabase",
      };
    } catch (error) {
      console.error("❌ Google OAuth exception:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to sign in with Google",
      };
    }
  }

  // Apple OAuth
  async signInWithApple(): Promise<OTPVerificationResult> {
    try {
      // Use Supabase's callback URL for OAuth
      const redirectUrl =
        "https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const accessToken = url.searchParams.get("access_token");
          const refreshToken = url.searchParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              return {
                success: false,
                error: sessionError.message,
              };
            }

            return {
              success: true,
              session: sessionData.session || undefined,
            };
          }
        }
      }

      return {
        success: false,
        error: "Apple sign-in was cancelled or failed",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to sign in with Apple",
      };
    }
  }

  // Identity linking
  async linkEmail(
    email: string,
    password: string,
  ): Promise<IdentityLinkResult> {
    try {
      // For email linking, we need to use the updateUser method
      const { error } = await supabase.auth.updateUser({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        message: "Email successfully linked to your account",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to link email",
      };
    }
  }

  async linkPhone(phoneNumber: string): Promise<IdentityLinkResult> {
    try {
      // For phone linking, we need to use the updateUser method
      const { error } = await supabase.auth.updateUser({
        phone: phoneNumber,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        message: "Phone number successfully linked to your account",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to link phone number",
      };
    }
  }

  async linkGoogle(): Promise<IdentityLinkResult> {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "golfmatch",
        path: "auth/callback",
      });

      // For OAuth linking, we need to use signInWithOAuth with link option
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        if (result.type === "success") {
          return {
            success: true,
            message: "Google account successfully linked",
          };
        }
      }

      return {
        success: false,
        error: "Google linking was cancelled or failed",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to link Google account",
      };
    }
  }

  async linkApple(): Promise<IdentityLinkResult> {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "golfmatch",
        path: "auth/callback",
      });

      // For OAuth linking, we need to use signInWithOAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        if (result.type === "success") {
          return {
            success: true,
            message: "Apple account successfully linked",
          };
        }
      }

      return {
        success: false,
        error: "Apple linking was cancelled or failed",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to link Apple account",
      };
    }
  }

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign out",
      };
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentAuthState.user;
  }

  // Get current session
  getCurrentSession(): Session | null {
    return this.currentAuthState.session;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentAuthState.user;
  }

  // Get user identities (linked accounts)
  async getUserIdentities(): Promise<{
    success: boolean;
    identities?: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        identities: data.user?.identities || [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get user identities",
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
