import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationPreferences } from '../types/notifications';

const NotificationSettingsScreen: React.FC = () => {
  const { preferences, updatePreferences } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(
    preferences
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const newPreferences = {
      ...localPreferences,
      [key]: value,
    };

    setLocalPreferences(newPreferences);

    // Save to backend
    setSaving(true);
    try {
      await updatePreferences(newPreferences);
    } catch (error) {
      Alert.alert(
        'エラー',
        '設定の保存に失敗しました。もう一度お試しください。'
      );
      // Revert on error
      setLocalPreferences(localPreferences);
    } finally {
      setSaving(false);
    }
  };

  const notificationOptions = [
    {
      key: 'messages' as keyof NotificationPreferences,
      title: 'メッセージ通知',
      description: '新しいメッセージを受信したときに通知',
      icon: 'chatbubble' as keyof typeof Ionicons.glyphMap,
      color: Colors.primary,
    },
    {
      key: 'likes' as keyof NotificationPreferences,
      title: 'いいね通知',
      description: '誰かがあなたをいいねしたときに通知',
      icon: 'heart' as keyof typeof Ionicons.glyphMap,
      color: '#E94B67',
    },
    {
      key: 'post_reactions' as keyof NotificationPreferences,
      title: 'リアクション通知',
      description: 'あなたの投稿にリアクションがついたときに通知',
      icon: 'thumbs-up' as keyof typeof Ionicons.glyphMap,
      color: '#4CAF50',
    },
    {
      key: 'matches' as keyof NotificationPreferences,
      title: 'マッチ通知',
      description: '新しいマッチが成立したときに通知',
      icon: 'flash' as keyof typeof Ionicons.glyphMap,
      color: '#FF6B35',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>通知設定</Text>
          <Text style={styles.headerSubtitle}>
            受け取る通知の種類を選択できます
          </Text>
        </View>

        <View style={styles.section}>
          {notificationOptions.map((option) => (
            <View key={option.key} style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: option.color + '15' },
                  ]}
                >
                  <Ionicons name={option.icon} size={24} color={option.color} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
              </View>
              <Switch
                value={localPreferences[option.key]}
                onValueChange={(value) => handleToggle(option.key, value)}
                trackColor={{
                  false: Colors.gray[300],
                  true: Colors.primary + '80',
                }}
                thumbColor={
                  localPreferences[option.key] ? Colors.primary : Colors.white
                }
                ios_backgroundColor={Colors.gray[300]}
                disabled={saving}
              />
            </View>
          ))}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle"
              size={24}
              color={Colors.primary}
              style={styles.infoIcon}
            />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>通知について</Text>
              <Text style={styles.infoDescription}>
                通知はアプリ内とプッシュ通知の両方で表示されます。デバイスの設定で通知を許可していることを確認してください。
              </Text>
            </View>
          </View>
        </View>

        {saving && (
          <View style={styles.savingIndicator}>
            <Text style={styles.savingText}>保存中...</Text>
          </View>
        )}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  infoSection: {
    marginTop: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 6,
  },
  infoDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  savingIndicator: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  savingText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
});

export default NotificationSettingsScreen;

