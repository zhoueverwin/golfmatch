import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { useAuth } from "../contexts/AuthContext";
import AuthInput from "../components/AuthInput";
import Button from "../components/Button";
import Loading from "../components/Loading";
import VerifyEmailScreen from "./VerifyEmailScreen";

type AuthMode = "login" | "signup" | "verify";

const AuthScreen: React.FC = () => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    loading,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");

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
        setErrors({
          general: result.error || "登録に失敗しました。もう一度お試しください。",
        });
      }
    }
  };

  const handleGoogleAuth = async () => {
    setErrors({});
    const result = await signInWithGoogle();
    if (!result.success) {
      // Show error inline
      setErrors({
        general: result.error || "Googleログインに失敗しました。もう一度お試しください。",
      });
    }
  };

  const handleAppleAuth = async () => {
    setErrors({});
    const result = await signInWithApple();
    if (!result.success) {
      // Show error inline
      setErrors({
        general: result.error || "Appleログインに失敗しました。もう一度お試しください。",
      });
    }
  };

  if (loading) {
    return <Loading />;
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

  // Render different UI based on mode
  const renderLoginUI = () => (
    <SafeAreaView style={styles.container} testID="AUTH.LOGIN_SCREEN.ROOT">
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          onScrollBeginDrag={Keyboard.dismiss}
        >
            {/* Logo Section - Centered for Login */}
            <View style={styles.loginLogoSection}>
              <Ionicons name="golf" size={60} color={Colors.primary} />
              <Text style={styles.loginAppName}>GolfMatch</Text>
              <Text style={styles.loginTagline}>お帰りなさい</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <Text style={styles.loginTitle}>ログイン</Text>

              {/* General Error Message */}
              {errors.general && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={Colors.error} />
                  <Text style={styles.errorText}>{errors.general}</Text>
                </View>
              )}

              <AuthInput
                testID="AUTH.LOGIN_SCREEN.EMAIL_INPUT"
                label="メールアドレス"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  // Clear general error when user starts typing
                  if (errors.general) {
                    setErrors({ ...errors, general: undefined });
                  }
                }}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail"
                error={errors.email}
              />

              <AuthInput
                testID="AUTH.LOGIN_SCREEN.PASSWORD_INPUT"
                label="パスワード"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  // Clear general error when user starts typing
                  if (errors.general) {
                    setErrors({ ...errors, general: undefined });
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
                testID="AUTH.LOGIN_SCREEN.SUBMIT_BTN"
                title="ログイン"
                onPress={handleAuth}
                style={styles.primaryButton}
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
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Googleでログイン"
                >
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialIcon}
                  onPress={handleAppleAuth}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Appleでログイン"
                >
                  <Ionicons name="logo-apple" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Switch to Signup */}
              <TouchableOpacity
                testID="AUTH.LOGIN_SCREEN.SWITCH_TO_SIGNUP_BTN"
                style={styles.switchModeButton}
                onPress={() => {
                  setMode("signup");
                  setErrors({});
                  setEmail("");
                  setPassword("");
                }}
                accessibilityRole="button"
              >
                <Text style={styles.switchModeText}>アカウントをお持ちでない方</Text>
                <Text style={styles.switchModeLink}>新規登録</Text>
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text style={styles.termsText}>
              続行することで、利用規約とプライバシーポリシーに同意したことになります。
            </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderSignupUI = () => (
    <SafeAreaView style={styles.container} testID="AUTH.SIGNUP_SCREEN.ROOT">
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {/* Header Section */}
          <View style={styles.signupHeader}>
            <Ionicons name="golf" size={50} color={Colors.primary} />
            <Text style={styles.signupWelcome}>ようこそ！</Text>
            <Text style={styles.signupSubtitle}>
              ゴルフ仲間と出会おう
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.signupFormCard}>
            <Text style={styles.signupTitle}>新規登録</Text>

            {/* General Error Message */}
            {errors.general && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <AuthInput
              testID="AUTH.SIGNUP_SCREEN.EMAIL_INPUT"
              label="メールアドレス"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // Clear general error when user starts typing
                if (errors.general) {
                  setErrors({ ...errors, general: undefined });
                }
              }}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={errors.email}
            />

            <AuthInput
              testID="AUTH.SIGNUP_SCREEN.PASSWORD_INPUT"
              label="パスワード"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                // Clear general error when user starts typing
                if (errors.general) {
                  setErrors({ ...errors, general: undefined });
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
              testID="AUTH.SIGNUP_SCREEN.SUBMIT_BTN"
              title="登録する"
              onPress={handleAuth}
              style={styles.primaryButton}
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
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Googleでログイン"
              >
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialIcon}
                onPress={handleAppleAuth}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Appleでログイン"
              >
                <Ionicons name="logo-apple" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Switch to Login */}
            <TouchableOpacity
              testID="AUTH.SIGNUP_SCREEN.SWITCH_TO_LOGIN_BTN"
              style={styles.switchModeButton}
              onPress={() => {
                setMode("login");
                setErrors({});
                setEmail("");
                setPassword("");
              }}
              accessibilityRole="button"
            >
              <Text style={styles.switchModeText}>
                すでにアカウントをお持ちの方
              </Text>
              <Text style={styles.switchModeLink}>ログイン</Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              続行することで、利用規約とプライバシーポリシーに同意したことになります。
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return mode === "login" ? renderLoginUI() : renderSignupUI();
};

const styles = StyleSheet.create({
  // Common Styles
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formSection: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    marginTop: 12,
    marginBottom: 12,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.text.secondary,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
  },
  socialLoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 16,
  },
  socialIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  switchModeButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  switchModeText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  switchModeLink: {
    fontSize: 16,
    fontFamily: Typography.getFontFamily("600"),
    color: Colors.primary,
    fontWeight: "600",
  },
  termsText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 12,
    marginBottom: 12,
  },

  // Login Specific Styles
  loginLogoSection: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  loginAppName: {
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: Typography.getFontFamily("700"),
    color: Colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  loginTagline: {
    fontSize: 18,
    fontFamily: Typography.getFontFamily("500"),
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: Typography.getFontFamily("700"),
    color: Colors.text.primary,
    marginBottom: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)", // Colors.error with 10% opacity
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)", // Colors.error with 30% opacity
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    marginLeft: 8,
  },

  // Signup Specific Styles
  signupHeader: {
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 12,
  },
  signupWelcome: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: Typography.getFontFamily("700"),
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  signupSubtitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  signupFormCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  signupTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: Typography.getFontFamily("700"),
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: "center",
  },
});

export default AuthScreen;
