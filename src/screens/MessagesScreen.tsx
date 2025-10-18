import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { messagesService, ChatPreview } from "../services/supabase/messages.service";

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
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load chats from Supabase
  const loadChats = async () => {
    try {
      setLoading(true);
      
      const userId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      console.log('[MessagesScreen] Loading chats for user:', userId);
      
      if (!userId) {
        setMessages([]);
        return;
      }

      const response = await messagesService.getUserChats(userId);
      
      console.log('[MessagesScreen] Chats response:', {
        success: response.success,
        count: response.data?.length,
        chats: response.data?.map((c: any) => ({
          chat_id: c.chat_id,
          other_user_id: c.other_user_id,
          other_user_name: c.other_user_name
        }))
      });
      
      if (response.success && response.data) {
        // Transform ChatPreview to MessagePreview format
        const previews: MessagePreview[] = response.data.map((chat: ChatPreview) => ({
          id: chat.chat_id,
          userId: chat.other_user_id,
          name: chat.other_user_name,
          profileImage: chat.other_user_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
          lastMessage: chat.last_message || 'New conversation',
          timestamp: chat.last_message_at ? formatTimestamp(chat.last_message_at) : 'Just now',
          isUnread: chat.unread_count > 0,
          unreadCount: chat.unread_count,
        }));
        
        console.log('[MessagesScreen] メッセージ page users:', previews.map(p => ({
          id: p.userId,
          name: p.name
        })));
        
        setMessages(previews);
      } else {
        setMessages([]);
      }
    } catch (error) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  // Format timestamp to display format
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}分前`;
    } else if (hours < 24) {
      return `${hours}時間前`;
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
    }
  };

  useEffect(() => {
    loadChats();
  }, [user?.id]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [user?.id])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>メッセージ</Text>
        </View>
        <Loading text="チャットを読み込み中..." fullScreen />
      </SafeAreaView>
    );
  }


  const renderMessageItem = ({ item }: { item: MessagePreview }) => (
    <Card
      style={styles.messageItem}
      onPress={() =>
        navigation.navigate("Chat", {
          chatId: item.id,  // Pass chat ID
          userId: item.userId,
          userName: item.name,
          userImage: item.profileImage,
        })
      }
      shadow="small"
    >
      <TouchableOpacity
        style={styles.profileImageContainer}
        onPress={() => navigation.navigate("Profile", { userId: item.userId })}
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
            onPress={() =>
              navigation.navigate("Profile", { userId: item.userId })
            }
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
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="メッセージがありません"
            subtitle="マッチした人とメッセージを始めましょう"
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize["2xl"],
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
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
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
    textAlign: "center",
  },
  messageItem: {
    flexDirection: "row",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
