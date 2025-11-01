import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { RootStackParamList } from '../types';
import { notificationService } from '../services/notificationService';
import { NotificationData } from '../types/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import StandardHeader from '../components/StandardHeader';

type NotificationHistoryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'NotificationHistory'
>;

const NotificationHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NotificationHistoryScreenNavigationProp>();
  const { profileId } = useAuth();
  const { refreshNotifications, markAsRead, markAllAsRead } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [profileId])
  );

  const loadNotifications = async () => {
    if (!profileId) return;

    try {
      setLoading(true);
      const result = await notificationService.getNotifications(profileId);
      if (result.success && result.data) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      await refreshNotifications();
    }

    // Navigate based on notification type
    const { data } = notification;
    
    // For messages, go to the chat
    if (data.chatId) {
      navigation.navigate('Chat', { 
        chatId: data.chatId, 
        userId: data.fromUserId || '',
        userName: notification.from_user_name || 'User',
        userImage: notification.from_user_image || ''
      });
    }
    // For all other notifications (likes, matches, post reactions), go to the user's profile
    else if (data.fromUserId || notification.from_user_id) {
      navigation.navigate('Profile', { 
        userId: data.fromUserId || notification.from_user_id || ''
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await refreshNotifications();
  };

  const getIconName = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'like':
        return 'heart';
      case 'match':
        return 'people';
      case 'post_reaction':
        return 'thumbs-up';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'message':
        return Colors.primary;
      case 'like':
        return '#FF6B6B';
      case 'match':
        return '#4ECDC4';
      case 'post_reaction':
        return '#FFD93D';
      default:
        return Colors.primary;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderNotificationItem = ({ item }: { item: NotificationData }) => {
    const iconColor = getIconColor(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {/* Avatar or icon */}
          {item.from_user_image ? (
            <Image
              source={{ uri: item.from_user_image }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
              <Ionicons name={getIconName(item.type)} size={24} color={iconColor} />
            </View>
          )}

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
          </View>

          {/* Unread indicator */}
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off" size={64} color={Colors.gray[300]} />
      <Text style={styles.emptyTitle}>通知はありません</Text>
      <Text style={styles.emptySubtitle}>
        新しい通知があるとここに表示されます
      </Text>
    </View>
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const rightComponent = unreadCount > 0 ? (
    <TouchableOpacity
      style={styles.markAllButton}
      onPress={handleMarkAllAsRead}
    >
      <Text style={styles.markAllText}>すべて既読</Text>
    </TouchableOpacity>
  ) : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <StandardHeader
        title="お知らせ"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={rightComponent}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyList : styles.list
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary + '10',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Typography.getFontFamily('600'),
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  unreadItem: {
    backgroundColor: Colors.primary + '05',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Typography.getFontFamily('600'),
    color: Colors.text.primary,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.tertiary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Typography.getFontFamily('600'),
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationHistoryScreen;

