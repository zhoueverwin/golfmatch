import { supabase } from "./supabase";
import { Session, User, AuthError } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
  isSuccessResponse,
  isNoSavedCredentialFoundResponse,
} from "@react-native-google-signin/google-signin";
import {
  translateAuthError,
  logAuthError,
} from "../utils/authErrorTranslator";

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
    this.configureGoogleSignIn();
    this.initializeAuth();
  }

  private configureGoogleSignIn(): void {
    try {
      GoogleSignin.configure({
        // Web Client ID from Google Cloud Console (used for Supabase authentication)
        // This is the OAuth 2.0 Client ID of type "Web application"
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "986630263277-rv4ir98jarhmi43pcjptq7m7e7sf37od.apps.googleusercontent.com",
        
        // iOS Client ID (optional - will be read from GoogleService-Info.plist if not provided)
        iosClientId: "986630263277-4n44sucemnougkvqotdksvbjcis3vivt.apps.googleusercontent.com",
        
        // Request offline access to get refresh tokens
        offlineAccess: true,
        
        // Request basic profile and email
        scopes: ["email", "profile"],
      });
      
      if (__DEV__) {
        console.log("✅ Google Sign-In configured");
      }
    } catch (error) {
      logAuthError("Failed to configure Google Sign-In", error);
    }
  }

  private async initializeAuth(): Promise<void> {
    try {
      // Get initial session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logAuthError("Error getting session", error);
      }

      this.updateAuthState({
        user: session?.user || null,
        session,
        loading: false,
      });

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((event, session) => {
        if (__DEV__) {
          console.log("Auth state changed:", event, session?.user?.id);
        }
        this.updateAuthState({
          user: session?.user || null,
          session,
          loading: false,
        });
      });
    } catch (error) {
      logAuthError("Error initializing auth", error);
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
          error: translateAuthError(error.message),
        };
      }

      return {
        success: true,
        messageId: "OTP sent successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: translateAuthError(
          error instanceof Error ? error.message : "Failed to send OTP"
        ),
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
          error: translateAuthError(error.message),
        };
      }

      return {
        success: true,
        session: data.session || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: translateAuthError(
          error instanceof Error ? error.message : "Failed to verify OTP"
        ),
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
          emailRedirectTo: undefined, // Use OTP flow instead of magic link
          data: {
            name: email.split('@')[0], // Use email username as default name
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: translateAuthError(error.message),
        };
      }

      // Check if user already exists and is verified (repeated signup)
      // Supabase returns a user object but doesn't send a new confirmation email
      if (data.user && data.user.email_confirmed_at && !data.session) {
        return {
          success: false,
          error: translateAuthError("User already registered"),
        };
      }

      // Check if email confirmation is required (new unverified user)
      if (data.user && !data.session) {
        return {
          success: true,
          session: undefined,
          error: "メールアドレスを確認してください。",
        };
      }

      return {
        success: true,
        session: data.session || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: translateAuthError(
          error instanceof Error ? error.message : "Failed to sign up"
        ),
      };
    }
  }

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<OTPVerificationResult> {
    try {
      if (__DEV__) {
        console.log('🔐 Attempting email login:', email);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logAuthError('Login error from Supabase', error, {
          status: error.status,
          name: error.name,
        });
        return {
          success: false,
          error: translateAuthError(error.message),
        };
      }

      if (__DEV__) {
        console.log('✅ Login successful:', {
          userId: data.user?.id,
          email: data.user?.email,
          hasSession: !!data.session,
        });
      }

      return {
        success: true,
        session: data.session || undefined,
      };
    } catch (error) {
      logAuthError('Login exception', error, {
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Check if it's a JSON parse error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('JSON') || errorMessage.includes('parse') || errorMessage.includes('unexpected')) {
        return {
          success: false,
          error: translateAuthError('Network error'),
        };
      }
      
      return {
        success: false,
        error: translateAuthError(error instanceof Error ? error.message : "Failed to sign in"),
      };
    }
  }

  // Native Google Sign-In
  async signInWithGoogle(): Promise<OTPVerificationResult> {
    try {
      if (__DEV__) {
        console.log("🔵 Starting native Google Sign-In");
      }

      // Check if Play Services are available (Android only, always resolves true on iOS)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Trigger native Google Sign-In flow
      const response = await GoogleSignin.signIn();

      if (__DEV__) {
        console.log("📊 Google Sign-In response type:", response.type);
      }

      // Check if user cancelled the sign-in
      if (!isSuccessResponse(response)) {
        if (__DEV__) {
          console.log("🚫 Google Sign-In cancelled by user");
        }
        return {
          success: false,
          error: translateAuthError("OAuth cancelled"),
        };
      }

      const { data } = response;

      if (__DEV__) {
        console.log("✅ Native Google Sign-In successful, got user data");
        console.log("👤 User:", {
          email: data.user.email,
          name: data.user.name,
          hasIdToken: !!data.idToken,
        });
      }

      // Get the ID token to authenticate with Supabase
      const { idToken } = data;

      if (!idToken) {
        logAuthError("No ID token received from Google", new Error("Missing ID token"));
        return {
          success: false,
          error: translateAuthError("No ID token received from Google"),
        };
      }

      if (__DEV__) {
        console.log("🔐 Authenticating with Supabase using Google ID token");
      }

      // Sign in to Supabase with the Google ID token
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (supabaseError) {
        logAuthError("Supabase Google auth error", supabaseError);
        return {
          success: false,
          error: translateAuthError(supabaseError.message),
        };
      }

      if (__DEV__) {
        console.log("✅ Supabase authentication successful");
        console.log("🎫 Session created:", {
          userId: supabaseData.session?.user?.id,
          hasAccessToken: !!supabaseData.session?.access_token,
        });
      }

      return {
        success: true,
        session: supabaseData.session || undefined,
      };
    } catch (error) {
      // Handle specific Google Sign-In errors
      if (isErrorWithCode(error)) {
        if (__DEV__) {
          console.log("❌ Google Sign-In error code:", error.code);
        }

        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            if (__DEV__) {
              console.log("🚫 User cancelled the sign-in flow");
            }
            return {
              success: false,
              error: translateAuthError("OAuth cancelled"),
            };

          case statusCodes.IN_PROGRESS:
            if (__DEV__) {
              console.log("⏳ Sign-in already in progress");
            }
            return {
              success: false,
              error: translateAuthError("Sign in already in progress"),
            };

          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            if (__DEV__) {
              console.log("❌ Google Play Services not available");
            }
            return {
              success: false,
              error: translateAuthError("Google Play Servicesが利用できません"),
            };

          default:
            logAuthError("Google Sign-In error", error);
            return {
              success: false,
              error: translateAuthError(error.message || "Googleログインに失敗しました"),
            };
        }
      }

      // Handle general errors
      logAuthError("Google Sign-In exception", error);
      return {
        success: false,
        error: translateAuthError(
          error instanceof Error ? error.message : "Failed to sign in with Google"
        ),
      };
    }
  }

  // Apple OAuth
  async signInWithApple(): Promise<OTPVerificationResult> {
    try {
      // Create the deep link redirect URL for the app
      const appRedirectUrl = AuthSession.makeRedirectUri({
        scheme: "golfmatch",
        path: "auth/callback",
      });

      if (__DEV__) {
        console.log("🔗 Apple OAuth app redirect URL:", appRedirectUrl);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: appRedirectUrl,
        },
      });

      if (error) {
        logAuthError("Apple OAuth error", error);
        return {
          success: false,
          error: translateAuthError(error.message),
        };
      }

      if (data.url) {
        if (__DEV__) {
          console.log("🌐 Opening Apple OAuth URL:", data.url);
        }

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          appRedirectUrl,
          {
            showInRecents: false,
            preferEphemeralSession: true,
          },
        );

        if (__DEV__) {
          console.log("🔗 Apple OAuth result:", result);
        }

        if (result.type === "success" && result.url) {
          if (__DEV__) {
            console.log("✅ Apple OAuth success, processing URL:", result.url);
          }

          const url = new URL(result.url);
          const accessToken = url.searchParams.get("access_token");
          const refreshToken = url.searchParams.get("refresh_token");
          const errorParam = url.searchParams.get("error");
          const errorDescription = url.searchParams.get("error_description");

          if (errorParam) {
            logAuthError("Apple OAuth returned error", new Error(errorParam), {
              description: errorDescription,
            });
            return {
              success: false,
              error: translateAuthError(errorDescription || `OAuth error: ${errorParam}`),
            };
          }

          if (accessToken && refreshToken) {
            if (__DEV__) {
              console.log("🔐 Setting Apple session with tokens");
            }
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              logAuthError("Apple session error", sessionError);
              return {
                success: false,
                error: translateAuthError(sessionError.message),
              };
            }

            if (__DEV__) {
              console.log("✅ Apple sign-in successful");
            }
            return {
              success: true,
              session: sessionData.session || undefined,
            };
          } else {
            logAuthError("Missing tokens in Apple OAuth response", new Error("Missing tokens"), {
              url: result.url,
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
            });
          }
        } else if (result.type === "cancel") {
          if (__DEV__) {
            console.log("🚫 Apple OAuth cancelled by user");
          }
          return {
            success: false,
            error: translateAuthError("OAuth cancelled"),
          };
        }
      }

      return {
        success: false,
        error: translateAuthError("Apple sign-in was cancelled or failed"),
      };
    } catch (error) {
      logAuthError("Apple OAuth exception", error);
      return {
        success: false,
        error: translateAuthError(
          error instanceof Error
            ? error.message
            : "Failed to sign in with Apple"
        ),
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
          error: translateAuthError(error.message),
        };
      }

      return {
        success: true,
        message: "Email successfully linked to your account",
      };
    } catch (error) {
      return {
        success: false,
        error: translateAuthError(
          error instanceof Error ? error.message : "Failed to link email"
        ),
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
          error: translateAuthError(error.message),
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
      if (__DEV__) {
        console.log("🔗 Starting native Google account linking");
      }

      // Check if Play Services are available (Android only)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Trigger native Google Sign-In flow for linking
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        if (__DEV__) {
          console.log("🚫 Google account linking cancelled by user");
        }
        return {
          success: false,
          error: "Google linking was cancelled",
        };
      }

      const { data } = response;
      const { idToken } = data;

      if (!idToken) {
        return {
          success: false,
          error: "No ID token received from Google",
        };
      }

      if (__DEV__) {
        console.log("🔐 Linking Google account with Supabase");
      }

      // Link the Google account to the current user using ID token
      const { data: linkData, error: linkError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        options: {
          // This will link the identity if user is already signed in
        },
      });

      if (linkError) {
        logAuthError("Failed to link Google account", linkError);
        return {
          success: false,
          error: translateAuthError(linkError.message),
        };
      }

      if (__DEV__) {
        console.log("✅ Google account linked successfully");
      }

      return {
        success: true,
        message: "Google account successfully linked",
      };
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            return {
              success: false,
              error: "Google linking was cancelled",
            };
          case statusCodes.IN_PROGRESS:
            return {
              success: false,
              error: "Sign in already in progress",
            };
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            return {
              success: false,
              error: "Google Play Servicesが利用できません",
            };
          default:
            logAuthError("Google account linking error", error);
            return {
              success: false,
              error: error.message || "Failed to link Google account",
            };
        }
      }

      logAuthError("Google account linking exception", error);
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
          error: translateAuthError(error.message),
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

  // Silent Google Sign-In (auto sign-in if user previously signed in)
  async signInWithGoogleSilently(): Promise<OTPVerificationResult> {
    try {
      if (__DEV__) {
        console.log("🔍 Attempting silent Google Sign-In");
      }

      // Check if user has previously signed in
      if (!GoogleSignin.hasPreviousSignIn()) {
        if (__DEV__) {
          console.log("ℹ️ No previous Google Sign-In found");
        }
        return {
          success: false,
          error: "No previous sign-in",
        };
      }

      // Attempt silent sign-in
      const response = await GoogleSignin.signInSilently();

      // Check if no saved credential was found
      if (isNoSavedCredentialFoundResponse(response)) {
        if (__DEV__) {
          console.log("ℹ️ No saved credentials found for silent sign-in");
        }
        return {
          success: false,
          error: "No saved credentials",
        };
      }

      // Response is SignInSuccessResponse
      const { data } = response;
      const { idToken } = data;

      if (!idToken) {
        return {
          success: false,
          error: "No ID token received",
        };
      }

      // Sign in to Supabase with the Google ID token
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (supabaseError) {
        logAuthError("Silent Google auth error", supabaseError);
        return {
          success: false,
          error: translateAuthError(supabaseError.message),
        };
      }

      if (__DEV__) {
        console.log("✅ Silent Google Sign-In successful");
      }

      return {
        success: true,
        session: supabaseData.session || undefined,
      };
    } catch (error) {
      if (__DEV__) {
        console.log("❌ Silent sign-in exception:", error);
      }
      return {
        success: false,
        error: "Silent sign-in failed",
      };
    }
  }

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user before signing out
      const { data: { user } } = await supabase.auth.getUser();
      
      // Clear last_active_at to mark user as offline immediately
      if (user?.id) {
        try {
          if (__DEV__) {
            console.log('[AuthService] Marking user as offline on logout:', user.id);
          }
          await supabase
            .from("profiles")
            .update({ last_active_at: null })
            .eq("id", user.id);
        } catch (presenceError) {
          logAuthError('[AuthService] Error clearing presence on logout', presenceError);
          // Don't block logout if this fails
        }
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: translateAuthError(error.message),
        };
      }

      // Also sign out from Google to clear the native session
      try {
        await GoogleSignin.signOut();
        if (__DEV__) {
          console.log("✅ Google Sign-In session cleared");
        }
      } catch (googleSignOutError) {
        // Don't fail the entire sign-out if Google sign-out fails
        if (__DEV__) {
          console.log("⚠️ Failed to clear Google Sign-In session:", googleSignOutError);
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: translateAuthError(
          error instanceof Error ? error.message : "Failed to sign out"
        ),
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
          error: translateAuthError(error.message),
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
