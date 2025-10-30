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
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../constants/colors";
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
        Alert.alert("ログインエラー", result.error || "ログインに失敗しました");
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
        Alert.alert("登録エラー", result.error || "登録に失敗しました");
      }
    }
  };

  const handleGoogleAuth = async () => {
    const result = await signInWithGoogle();
    if (!result.success) {
      Alert.alert("エラー", result.error || "Googleログインに失敗しました");
    }
  };

  const handleAppleAuth = async () => {
    const result = await signInWithApple();
    if (!result.success) {
      Alert.alert("エラー", result.error || "Appleログインに失敗しました");
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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

              <AuthInput
                label="メールアドレス"
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail"
                error={errors.email}
              />

              <AuthInput
                label="パスワード"
                value={password}
                onChangeText={setPassword}
                placeholder="6文字以上"
                isPassword
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                leftIcon="lock-closed"
                error={errors.password}
              />

              <Button
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
    </TouchableWithoutFeedback>
  );

  const renderSignupUI = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.signupContainer}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark, Colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.signupGradient}
        >
          <SafeAreaView style={styles.signupSafeArea}>
            <KeyboardAvoidingView
              style={styles.keyboardAvoidingView}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.signupScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Header Section */}
                <View style={styles.signupHeader}>
                  <Ionicons name="golf" size={50} color={Colors.white} />
                  <Text style={styles.signupWelcome}>ようこそ！</Text>
                  <Text style={styles.signupSubtitle}>
                    ゴルフ仲間と出会おう
                  </Text>
                </View>

                {/* Form Card */}
                <View style={styles.signupFormCard}>
                  <Text style={styles.signupTitle}>新規登録</Text>

                  <AuthInput
                    label="メールアドレス"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="example@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon="mail"
                    error={errors.email}
                  />

                  <AuthInput
                    label="パスワード"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="6文字以上"
                    isPassword
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    leftIcon="lock-closed"
                    error={errors.password}
                  />

                  <Button
                    title="登録する"
                    onPress={handleAuth}
                    style={styles.signupButton}
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
        </LinearGradient>
      </View>
    </TouchableWithoutFeedback>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  formSection: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    marginTop: 16,
    marginBottom: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
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
  },
  socialLoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 24,
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
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  switchModeLink: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "600",
  },
  termsText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 20,
  },

  // Login Specific Styles
  loginLogoSection: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 50,
  },
  loginAppName: {
    fontSize: 42,
    fontWeight: "bold",
    color: Colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  loginTagline: {
    fontSize: 18,
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginBottom: 24,
  },

  // Signup Specific Styles
  signupContainer: {
    flex: 1,
  },
  signupGradient: {
    flex: 1,
  },
  signupSafeArea: {
    flex: 1,
  },
  signupScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  signupHeader: {
    alignItems: "center",
    paddingVertical: 40,
    marginBottom: 20,
  },
  signupWelcome: {
    fontSize: 36,
    fontWeight: "bold",
    color: Colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  signupSubtitle: {
    fontSize: 18,
    color: Colors.white,
    opacity: 0.9,
  },
  signupFormCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
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
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginBottom: 24,
    textAlign: "center",
  },
  signupButton: {
    backgroundColor: Colors.secondary,
    marginTop: 16,
    marginBottom: 16,
  },
});

export default AuthScreen;
