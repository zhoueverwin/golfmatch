import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { notificationsService, Notification } from '../services/supabase/notifications.service';

type NotificationsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'NotificationsList'
>;

const NotificationsListScreen: React.FC = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { profileId } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [profileId]);

  const loadNotifications = async () => {
    if (!profileId) return;

    setLoading(true);
    const result = await notificationsService.getUserNotifications(profileId);
    
    if (result.success) {
      setNotifications(result.data);
    }
    
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    if (!profileId) return;

    const result = await notificationsService.getUnreadCount(profileId);
    if (result.success) {
      setUnreadCount(result.data);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(), loadUnreadCount()]);
    setRefreshing(false);
  }, [profileId]);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await notificationsService.markAsRead(notification.id);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate based on notification type
    switch (notification.notification_type) {
      case 'message':
        if (notification.data.chat_id) {
          navigation.navigate('Chat', {
            chatId: notification.data.chat_id,
            userId: notification.sender_id || '',
            userName: notification.sender_name || '',
            userImage: notification.sender_image || '',
          });
        }
        break;
      case 'like':
      case 'super_like':
        if (notification.sender_id) {
          navigation.navigate('Profile', { userId: notification.sender_id });
        }
        break;
      case 'post_reaction':
        navigation.navigate('Main', { screen: 'Home' } as any);
        break;
      case 'match':
        navigation.navigate('Main', { screen: 'Connections' } as any);
        break;
    }
  };

  const handleMarkAllRead = async () => {
    if (!profileId) return;

    const result = await notificationsService.markAllAsRead(profileId);
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'like':
      case 'super_like':
        return 'heart';
      case 'post_reaction':
        return 'thumbs-up';
      case 'match':
        return 'flash';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message':
        return Colors.primary;
      case 'like':
      case 'super_like':
        return '#E94B67';
      case 'post_reaction':
        return '#4CAF50';
      case 'match':
        return '#FF6B35';
      default:
        return Colors.gray[500];
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'たった今';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間前`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}日前`;
    
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconColor = getNotificationColor(item.notification_type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.is_read && styles.unreadItem,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {item.sender_image ? (
            <Image
              source={{ uri: item.sender_image }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
              <Ionicons
                name={getNotificationIcon(item.notification_type) as any}
                size={24}
                color={iconColor}
              />
            </View>
          )}

          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.time}>{getTimeAgo(item.created_at)}</Text>
          </View>

          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>お知らせ</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>お知らせ</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
          >
            <Text style={styles.markAllText}>すべて既読</Text>
          </TouchableOpacity>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            {unreadCount}件の未読通知
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.gray[400]} />
            <Text style={styles.emptyText}>通知はありません</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
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
    color: Colors.primary,
  },
  unreadBanner: {
    backgroundColor: Colors.primary + '10',
    padding: 12,
    alignItems: 'center',
  },
  unreadBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  unreadItem: {
    backgroundColor: Colors.primary + '05',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
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
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray[500],
    marginTop: 16,
  },
});

export default NotificationsListScreen;

