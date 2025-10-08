import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import AuthInput from '../components/AuthInput';
import Button from '../components/Button';
import Loading from '../components/Loading';

interface Identity {
  id: string;
  provider: string;
  email?: string;
  phone?: string;
  created_at: string;
}

const LinkAccountScreen: React.FC = () => {
  const {
    linkEmail,
    linkPhone,
    linkGoogle,
    linkApple,
    getUserIdentities,
    loading,
  } = useAuth();

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingIdentities, setLoadingIdentities] = useState(true);

  useEffect(() => {
    loadIdentities();
  }, []);

  const loadIdentities = async () => {
    setLoadingIdentities(true);
    const result = await getUserIdentities();
    
    if (result.success && result.identities) {
      setIdentities(result.identities);
    } else {
      Alert.alert('Error', result.error || 'Failed to load identities');
    }
    
    setLoadingIdentities(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleLinkEmail = async () => {
    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    if (!validatePassword(password)) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    setErrors({});
    const result = await linkEmail(email, password);
    
    if (result.success) {
      Alert.alert('Success', result.message || 'Email successfully linked');
      setEmail('');
      setPassword('');
      loadIdentities();
    } else {
      Alert.alert('Error', result.error || 'Failed to link email');
    }
  };

  const handleLinkPhone = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setErrors({ phoneNumber: 'Please enter a valid phone number' });
      return;
    }

    setErrors({});
    const result = await linkPhone(phoneNumber);
    
    if (result.success) {
      Alert.alert('Success', result.message || 'Phone number successfully linked');
      setPhoneNumber('');
      loadIdentities();
    } else {
      Alert.alert('Error', result.error || 'Failed to link phone number');
    }
  };

  const handleLinkGoogle = async () => {
    const result = await linkGoogle();
    
    if (result.success) {
      Alert.alert('Success', result.message || 'Google account successfully linked');
      loadIdentities();
    } else {
      Alert.alert('Error', result.error || 'Failed to link Google account');
    }
  };

  const handleLinkApple = async () => {
    const result = await linkApple();
    
    if (result.success) {
      Alert.alert('Success', result.message || 'Apple account successfully linked');
      loadIdentities();
    } else {
      Alert.alert('Error', result.error || 'Failed to link Apple account');
    }
  };

  const getProviderIcon = (provider: string): keyof typeof Ionicons.glyphMap => {
    switch (provider) {
      case 'email':
        return 'mail';
      case 'phone':
        return 'call';
      case 'google':
        return 'logo-google';
      case 'apple':
        return 'logo-apple';
      default:
        return 'person';
    }
  };

  const getProviderName = (provider: string): string => {
    switch (provider) {
      case 'email':
        return 'Email';
      case 'phone':
        return 'Phone';
      case 'google':
        return 'Google';
      case 'apple':
        return 'Apple';
      default:
        return provider;
    }
  };

  const isProviderLinked = (provider: string): boolean => {
    return identities.some(identity => identity.provider === provider);
  };

  if (loadingIdentities) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>アカウント連携</Text>
          <Text style={styles.subtitle}>
            複数の認証方法を連携して、より便利にログインできます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>現在の認証方法</Text>
          {identities.length > 0 ? (
            <View style={styles.identitiesList}>
              {identities.map((identity, index) => (
                <View key={index} style={styles.identityItem}>
                  <View style={styles.identityInfo}>
                    <Ionicons
                      name={getProviderIcon(identity.provider)}
                      size={24}
                      color={Colors.primary}
                    />
                    <View style={styles.identityDetails}>
                      <Text style={styles.identityProvider}>
                        {getProviderName(identity.provider)}
                      </Text>
                      <Text style={styles.identityValue}>
                        {identity.email || identity.phone || 'Connected'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.connectedBadge}>
                    <Text style={styles.connectedText}>連携済み</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noIdentitiesText}>連携された認証方法がありません</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新しい認証方法を追加</Text>

          {/* Email Link */}
          {!isProviderLinked('email') && (
            <View style={styles.linkMethod}>
              <View style={styles.linkMethodHeader}>
                <Ionicons name="mail" size={24} color={Colors.text.primary} />
                <Text style={styles.linkMethodTitle}>メールアドレス</Text>
              </View>
              
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
                title="メールアドレスを連携"
                onPress={handleLinkEmail}
                style={styles.linkButton}
                disabled={loading || !email.trim() || !password.trim()}
              />
            </View>
          )}

          {/* Phone Link */}
          {!isProviderLinked('phone') && (
            <View style={styles.linkMethod}>
              <View style={styles.linkMethodHeader}>
                <Ionicons name="call" size={24} color={Colors.text.primary} />
                <Text style={styles.linkMethodTitle}>電話番号</Text>
              </View>
              
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
                title="電話番号を連携"
                onPress={handleLinkPhone}
                style={styles.linkButton}
                disabled={loading || !phoneNumber.trim()}
              />
            </View>
          )}

          {/* Google Link */}
          {!isProviderLinked('google') && (
            <View style={styles.linkMethod}>
              <View style={styles.linkMethodHeader}>
                <Ionicons name="logo-google" size={24} color={Colors.text.primary} />
                <Text style={styles.linkMethodTitle}>Google</Text>
              </View>
              
              <Button
                title="Googleアカウントを連携"
                onPress={handleLinkGoogle}
                style={styles.linkButton}
                disabled={loading}
              />
            </View>
          )}

          {/* Apple Link */}
          {!isProviderLinked('apple') && (
            <View style={styles.linkMethod}>
              <View style={styles.linkMethodHeader}>
                <Ionicons name="logo-apple" size={24} color={Colors.text.primary} />
                <Text style={styles.linkMethodTitle}>Apple</Text>
              </View>
              
              <Button
                title="Appleアカウントを連携"
                onPress={handleLinkApple}
                style={styles.linkButton}
                disabled={loading}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  identitiesList: {
    gap: 12,
  },
  identityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  identityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  identityDetails: {
    marginLeft: 12,
    flex: 1,
  },
  identityProvider: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  identityValue: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  connectedBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  connectedText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '500',
  },
  noIdentitiesText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    padding: 24,
  },
  linkMethod: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  linkMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkMethodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 12,
  },
  linkButton: {
    backgroundColor: Colors.primary,
    marginTop: 16,
  },
});

export default LinkAccountScreen;

