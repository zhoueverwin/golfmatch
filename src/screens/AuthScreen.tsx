import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { useAuth } from "../contexts/AuthContext";
import AuthInput from "../components/AuthInput";
import Button from "../components/Button";
import Loading from "../components/Loading";
import VerifyEmailScreen from "./VerifyEmailScreen";

const { width } = Dimensions.get("window");

type AuthMode = "login" | "signup" | "verify";

const AuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    loading,
    user,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<"google" | "apple" | null>(null);

  // Clear OAuth loading when user becomes authenticated
  useEffect(() => {
    if (user && oauthLoading) {
      setOauthLoading(false);
      setOauthProvider(null);
    }
  }, [user, oauthLoading]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleAuth = async () => {
    // Validate inputs
    const newErrors: Record<string, string> = {};
    
    if (!validateEmail(email)) {
      newErrors.email = "有効なメールアドレスを入力してください";
    }
    
    if (!validatePassword(password)) {
      newErrors.password = "パスワードは6文字以上である必要があります";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (mode === "login") {
      // Login
      const result = await signInWithEmail(email, password);
      if (!result.success) {
        // Show error inline instead of Alert
        setErrors({
          general: result.error || "ログインに失敗しました。もう一度お試しください。",
        });
      }
    } else {
      // Signup
      const result = await signUpWithEmail(email, password);
      if (__DEV__) {
        console.log("📊 [AuthScreen] Signup result:", {
          success: result.success,
          hasError: !!result.error,
          error: result.error,
        });
      }
      if (result.success) {
        if (result.error) {
          // Email confirmation required - show verification screen
          setPendingVerificationEmail(email);
          setMode("verify");
        } else {
          // Auto-login successful
          Alert.alert("登録成功", "アカウントが作成されました！");
        }
      } else {
        // Show error inline instead of Alert
        if (__DEV__) {
          console.log("❌ [AuthScreen] Setting signup error:", result.error);
        }
        setErrors({
          general: result.error || "登録に失敗しました。もう一度お試しください。",
        });
      }
    }
  };

  const handleGoogleAuth = async () => {
    console.log("🔵 [AuthScreen] Google auth button pressed");
    setErrors({});
    setOauthLoading(true);
    setOauthProvider("google");
    
    try {
      console.log("🔄 [AuthScreen] Calling signInWithGoogle...");
      const result = await signInWithGoogle();
      console.log("📊 [AuthScreen] signInWithGoogle result:", result);
      
      if (!result.success) {
        console.log("❌ [AuthScreen] Google auth failed:", result.error);
        // Show error inline
        setErrors({
          general: result.error || "Googleログインに失敗しました。もう一度お試しください。",
        });
        // Clear loading on error
        setOauthLoading(false);
        setOauthProvider(null);
      } else {
        console.log("✅ [AuthScreen] Google auth succeeded");
      }
      // Success will trigger auth state change and redirect automatically
      // Loading state will be cleared by useEffect when user becomes authenticated
    } catch (error) {
      console.log("💥 [AuthScreen] Google auth exception:", error);
      // Clear loading on exception
      setOauthLoading(false);
      setOauthProvider(null);
    }
  };

  const handleAppleAuth = async () => {
    setErrors({});
    setOauthLoading(true);
    setOauthProvider("apple");
    
    try {
      const result = await signInWithApple();
      if (!result.success) {
        // Show error inline
        setErrors({
          general: result.error || "Appleログインに失敗しました。もう一度お試しください。",
        });
        // Clear loading on error
        setOauthLoading(false);
        setOauthProvider(null);
      }
      // Success will trigger auth state change and redirect automatically
      // Loading state will be cleared by useEffect when user becomes authenticated
    } catch (error) {
      // Clear loading on exception
      setOauthLoading(false);
      setOauthProvider(null);
    }
  };

  if (loading || oauthLoading) {
    const loadingMessage = oauthProvider === "google" 
      ? "Googleアカウントで認証中..." 
      : oauthProvider === "apple"
      ? "Appleアカウントで認証中..."
      : undefined;
    
    return (
      <Loading 
        fullScreen 
        text={loadingMessage}
      />
    );
  }

  // Show verification screen if email needs to be verified
  if (mode === "verify" && pendingVerificationEmail) {
    return (
      <VerifyEmailScreen
        email={pendingVerificationEmail}
        onVerified={() => {
          setMode("login");
          setPendingVerificationEmail("");
          Alert.alert("確認完了", "ログインできます");
        }}
        onBack={() => {
          setMode("login");
          setPendingVerificationEmail("");
        }}
      />
    );
  }

  // Unified Modern UI with Tabs
  return (
    <View style={styles.container}>
      {/* Background Gradient - same as Welcome screen */}
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 1)",      // Top right: FFFFFF 100%
          "rgba(156, 255, 252, 0.75)",   // Middle: 9CFFFC 75%
          "rgba(0, 184, 177, 0.5)",      // Bottom left: 00B8B1 50%
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient}
      />

      <SafeAreaView
        style={styles.safeArea}
        testID={mode === "login" ? "AUTH.LOGIN_SCREEN.ROOT" : "AUTH.SIGNUP_SCREEN.ROOT"}
        edges={["bottom"]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 30 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            onScrollBeginDrag={Keyboard.dismiss}
          >
            {/* Logo Section - same as WelcomeScreen */}
            <View style={styles.logoSection}>
              <Image
                source={require("../../assets/images/welcome/GolfMatch-GetStarted-Logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.tagline}>
                {mode === "login" ? "お帰りなさい" : "ようこそ！"}
              </Text>
            </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              testID="AUTH.TAB.LOGIN"
              style={[
                styles.tab,
                mode === "login" && styles.activeTab,
              ]}
              onPress={() => {
                setMode("login");
                setErrors({});
              }}
              accessibilityRole="button"
              accessibilityLabel="ログインタブ"
            >
              <Text
                style={[
                  styles.tabText,
                  mode === "login" && styles.activeTabText,
                ]}
              >
                ログイン
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="AUTH.TAB.SIGNUP"
              style={[
                styles.tab,
                mode === "signup" && styles.activeTab,
              ]}
              onPress={() => {
                setMode("signup");
                setErrors({});
              }}
              accessibilityRole="button"
              accessibilityLabel="新規登録タブ"
            >
              <Text
                style={[
                  styles.tabText,
                  mode === "signup" && styles.activeTabText,
                ]}
              >
                新規登録
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* General Error Message */}
            {errors.general && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <AuthInput
              testID={`AUTH.${mode.toUpperCase()}_SCREEN.EMAIL_INPUT`}
              label="メールアドレス"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.general) {
                  const { general, ...rest } = errors;
                  setErrors(rest);
                }
              }}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={errors.email}
            />

            <AuthInput
              testID={`AUTH.${mode.toUpperCase()}_SCREEN.PASSWORD_INPUT`}
              label="パスワード"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.general) {
                  const { general, ...rest } = errors;
                  setErrors(rest);
                }
              }}
              placeholder="6文字以上"
              isPassword
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              leftIcon="lock-closed"
              error={errors.password}
            />

            <Button
              testID={`AUTH.${mode.toUpperCase()}_SCREEN.SUBMIT_BTN`}
              title={mode === "login" ? "ログイン" : "登録する"}
              onPress={handleAuth}
              style={styles.primaryButton}
              textStyle={styles.buttonText}
              disabled={loading || !email.trim() || !password.trim()}
            />

            {/* Social Login */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialLoginRow}>
              <TouchableOpacity
                style={styles.socialIcon}
                onPress={handleGoogleAuth}
                disabled={loading || oauthLoading}
                accessibilityRole="button"
                accessibilityLabel="Googleでログイン"
              >
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialIcon}
                onPress={handleAppleAuth}
                disabled={loading || oauthLoading}
                accessibilityRole="button"
                accessibilityLabel="Appleでログイン"
              >
                <Ionicons name="logo-apple" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text style={styles.termsText}>
              続行することで、利用規約とプライバシーポリシーに同意したことになります。
            </Text>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // Logo Section - matches WelcomeScreen positioning
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoImage: {
    width: width * 0.5,
    height: 45,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 20,
    fontFamily: Typography.getFontFamily("500"),
    color: Colors.text.secondary,
    fontWeight: "500",
  },

  // Tab Switcher
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontFamily: Typography.getFontFamily("600"),
    color: Colors.text.secondary,
    fontWeight: "600",
  },
  activeTabText: {
    color: Colors.primary,
  },

  // Form Section
  formSection: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    marginTop: 16,
    marginBottom: 20,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "600",
  },

  // Error Container
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    marginLeft: 8,
    lineHeight: 20,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.text.secondary,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
  },

  // Social Login
  socialLoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  socialIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Terms
  termsText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 8,
  },
});

export default AuthScreen;
