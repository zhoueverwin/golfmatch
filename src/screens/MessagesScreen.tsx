import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

interface MessagePreview {
  id: string;
  userId: string;
  name: string;
  profileImage: string;
  lastMessage: string;
  timestamp: string;
  isUnread: boolean;
  unreadCount: number;
}

type MessagesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<MessagesScreenNavigationProp>();
  const [messages, setMessages] = useState<MessagePreview[]>([]);

  // Mock data for development
  useEffect(() => {
    const mockMessages: MessagePreview[] = [
      {
        id: '1',
        userId: '1',
        name: 'Mii',
        profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        lastMessage: 'はじめまして♪(^^)♪',
        timestamp: '9/17 20:05',
        isUnread: true,
        unreadCount: 0,
      },
      {
        id: '2',
        userId: '2',
        name: 'Yuki',
        profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
        lastMessage: 'ゴルフ一緒にやりませんか？',
        timestamp: '9/16 15:30',
        isUnread: false,
        unreadCount: 0,
      },
      {
        id: '3',
        userId: '3',
        name: 'Sakura',
        profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
        lastMessage: '今度の週末空いてますか？',
        timestamp: '9/15 22:10',
        isUnread: true,
        unreadCount: 0,
      },
      {
        id: '4',
        userId: '4',
        name: 'Aoi',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
        lastMessage: 'ありがとうございました！',
        timestamp: '9/14 18:45',
        isUnread: false,
        unreadCount: 0,
      },
      {
        id: '5',
        userId: '5',
        name: 'Hana',
        profileImage: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face',
        lastMessage: '楽しかったです！またやりましょう',
        timestamp: '9/13 21:20',
        isUnread: false,
        unreadCount: 0,
      },
    ];
    setMessages(mockMessages);
  }, []);

  const renderMessageItem = ({ item }: { item: MessagePreview }) => (
    <Card
      style={styles.messageItem}
      onPress={() => navigation.navigate('Chat', { 
        userId: item.userId, 
        userName: item.name,
        userImage: item.profileImage 
      })}
      shadow="small"
    >
      <TouchableOpacity
        style={styles.profileImageContainer}
        onPress={() => navigation.navigate('Profile', { userId: item.userId })}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}のプロフィールを見る`}
      >
        <Image
          source={{ uri: item.profileImage }}
          style={styles.profileImage}
          accessibilityLabel={`${item.name}のプロフィール写真`}
        />
      </TouchableOpacity>
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { userId: item.userId })}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}のプロフィールを見る`}
          >
            <Text style={styles.name}>{item.name}</Text>
          </TouchableOpacity>
          <View style={styles.statusContainer}>
            <View style={styles.onlineIndicator} />
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
        </View>
        <View style={styles.messageFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.isUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>未返信</Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>メッセージ</Text>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="メッセージがありません"
            subtitle="マッチした人とメッセージを始めましょう"
            buttonTitle="プロフィールを探す"
            onButtonPress={() => console.log('Go to search')}
          />
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  searchButton: {
    padding: Spacing.sm,
  },
  messagesList: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  profileImageContainer: {
    marginRight: Spacing.md,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
    marginRight: Spacing.xs,
  },
  timestamp: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadBadge: {
    backgroundColor: Colors.gray[200],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  unreadText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
});

export default MessagesScreen;
