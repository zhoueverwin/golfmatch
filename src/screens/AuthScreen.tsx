import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import AuthInput from '../components/AuthInput';
import Button from '../components/Button';
import Loading from '../components/Loading';
import { testOAuthConfig } from '../utils/testOAuth';

type AuthMode = 'welcome' | 'phone' | 'email' | 'otp' | 'link';

const AuthScreen: React.FC = () => {
  const {
    signInWithPhone,
    verifyOTP,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    loading,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('welcome');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handlePhoneAuth = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setErrors({ phoneNumber: 'Please enter a valid phone number' });
      return;
    }

    setErrors({});
    console.log('📱 Attempting to send OTP to:', phoneNumber);
    
    const result = await signInWithPhone(phoneNumber);
    console.log('📱 OTP result:', result);
    
    if (result.success) {
      setMode('otp');
    } else {
      console.error('📱 OTP failed:', result.error);
      Alert.alert('Error', result.error || 'Failed to send OTP');
    }
  };

  const handleOTPVerification = async () => {
    if (otpCode.length !== 6) {
      setErrors({ otpCode: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setErrors({});
    console.log('🔐 Attempting to verify OTP:', otpCode, 'for phone:', phoneNumber);
    
    const result = await verifyOTP(phoneNumber, otpCode);
    console.log('🔐 OTP verification result:', result);
    
    if (result.success) {
      console.log('✅ OTP verified successfully, user should be signed in');
      // User will be automatically signed in via auth state change
    } else {
      console.error('❌ OTP verification failed:', result.error);
      Alert.alert('Error', result.error || 'Invalid OTP');
    }
  };

  const handleEmailAuth = async () => {
    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    if (!validatePassword(password)) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    setErrors({});
    const result = isSignUp 
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);
    
    if (result.success) {
      // User will be automatically signed in via auth state change
    } else {
      Alert.alert('Error', result.error || `Failed to ${isSignUp ? 'sign up' : 'sign in'}`);
    }
  };

  const handleGoogleAuth = async () => {
    console.log('🔍 Starting Google OAuth test...');
    
    // Test OAuth configuration first
    testOAuthConfig();
    
    const result = await signInWithGoogle();
    console.log('🔍 Google OAuth result:', result);
    
    if (!result.success) {
      console.error('❌ Google OAuth failed:', result.error);
      Alert.alert('Error', result.error || 'Failed to sign in with Google');
    } else {
      console.log('✅ Google OAuth successful!');
    }
  };

  const handleAppleAuth = async () => {
    const result = await signInWithApple();
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to sign in with Apple');
    }
  };

  const renderWelcomeScreen = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.title}>GolfMatch</Text>
        <Text style={styles.subtitle}>ゴルフでつながる</Text>
      </View>

      <View style={styles.authOptions}>
        <Button
          title="電話番号で始める"
          onPress={() => setMode('phone')}
          style={styles.primaryButton}
          textStyle={styles.primaryButtonText}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>または</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="メールアドレスで続行"
          onPress={() => setMode('email')}
          style={styles.secondaryButton}
          textStyle={styles.secondaryButtonText}
        />

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleAuth}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={Colors.text.primary} />
            <Text style={styles.socialButtonText}>Googleで続行</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleAppleAuth}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={20} color={Colors.text.primary} />
            <Text style={styles.socialButtonText}>Appleで続行</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.termsText}>
        続行することで、利用規約とプライバシーポリシーに同意したことになります。
      </Text>
    </View>
  );

  const renderPhoneScreen = () => (
    <View style={styles.formContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMode('welcome')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>電話番号で始める</Text>
      </View>

      <View style={styles.formContent}>
        <Text style={styles.formDescription}>
          電話番号を入力してください。確認コードを送信します。
        </Text>

        <AuthInput
          label="電話番号"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+81 90-1234-5678"
          keyboardType="phone-pad"
          leftIcon="call"
          error={errors.phoneNumber}
        />

        <Button
          title="確認コードを送信"
          onPress={handlePhoneAuth}
          style={styles.submitButton}
          disabled={loading || !phoneNumber.trim()}
        />
      </View>
    </View>
  );

  const renderOTPScreen = () => (
    <View style={styles.formContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMode('phone')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>確認コード</Text>
      </View>

      <View style={styles.formContent}>
        <Text style={styles.formDescription}>
          {phoneNumber} に送信された6桁の確認コードを入力してください。
        </Text>

        <AuthInput
          label="確認コード"
          value={otpCode}
          onChangeText={setOtpCode}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          leftIcon="keypad"
          error={errors.otpCode}
        />

        <Button
          title="確認"
          onPress={handleOTPVerification}
          style={styles.submitButton}
          disabled={loading || otpCode.length !== 6}
        />

        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>確認コードを再送信</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmailScreen = () => (
    <View style={styles.formContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMode('welcome')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSignUp ? 'アカウント作成' : 'ログイン'}
        </Text>
      </View>

      <View style={styles.formContent}>
        <Text style={styles.formDescription}>
          {isSignUp ? '新しいアカウントを作成してください。' : 'メールアドレスとパスワードを入力してください。'}
        </Text>

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
          placeholder="パスワードを入力"
          isPassword
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          leftIcon="lock-closed"
          error={errors.password}
        />

        <Button
          title={isSignUp ? 'アカウント作成' : 'ログイン'}
          onPress={handleEmailAuth}
          style={styles.submitButton}
          disabled={loading || !email.trim() || !password.trim()}
        />

        <TouchableOpacity
          style={styles.switchModeButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchModeText}>
            {isSignUp ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでない方は'}
          </Text>
          <Text style={styles.switchModeLink}>
            {isSignUp ? 'ログイン' : '新規登録'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'welcome' && renderWelcomeScreen()}
          {mode === 'phone' && renderPhoneScreen()}
          {mode === 'otp' && renderOTPScreen()}
          {mode === 'email' && renderEmailScreen()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.text.secondary,
  },
  authOptions: {
    flex: 1,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
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
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  termsText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  formContent: {
    flex: 1,
  },
  formDescription: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  switchModeButton: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchModeText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  switchModeLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default AuthScreen;
