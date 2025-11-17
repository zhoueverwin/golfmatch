import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius, Shadows } from "../constants/spacing";
import { Typography } from "../constants/typography";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { messagesService, ChatPreview, UnmessagedMatch } from "../services/supabase/messages.service";

interface MessagePreview {
  id: string;
  userId: string;
  name: string;
  profileImage: string;
  lastMessage: string;
  timestamp: string;
  isUnread: boolean;
  unreadCount: number;
  isOnline: boolean;
}

type MessagesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<MessagesScreenNavigationProp>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [unmessagedMatches, setUnmessagedMatches] = useState<UnmessagedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load chats from Supabase
  const loadChats = async (unmessagedMatchesList: UnmessagedMatch[] = []) => {
    try {
      setLoading(true);
      
      const userId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      
      if (!userId) {
        setMessages([]);
        return;
      }

      const response = await messagesService.getUserChats(userId);
      
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
          isOnline: chat.is_online || false,
        }));
        
        // Filter out users that are in unmessaged matches to avoid duplicates
        const unmessagedUserIds = new Set(unmessagedMatchesList.map(m => m.other_user_id));
        const filteredPreviews = previews.filter(
          (preview) => !unmessagedUserIds.has(preview.userId)
        );
        
        setMessages(filteredPreviews);
      } else {
        setMessages([]);
      }
    } catch (error) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Load unmessaged matches
  const loadUnmessagedMatches = async () => {
    try {
      const userId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!userId) {
        setUnmessagedMatches([]);
        return;
      }

      const response = await messagesService.getUnmessagedMatches(userId);
      if (response.success && response.data) {
        setUnmessagedMatches(response.data);
      } else {
        setUnmessagedMatches([]);
      }
    } catch (error) {
      console.error("[MessagesScreen] Failed to load unmessaged matches:", error);
      setUnmessagedMatches([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Load unmessaged matches first, then load chats with the list to filter
    const unmessagedResponse = await messagesService.getUnmessagedMatches(
      user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID || ''
    );
    const unmessagedList = unmessagedResponse.success ? unmessagedResponse.data || [] : [];
    setUnmessagedMatches(unmessagedList);
    await loadChats(unmessagedList);
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
    const loadData = async () => {
      const userId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!userId) return;

      // Load unmessaged matches first, then load chats with the list to filter
      const unmessagedResponse = await messagesService.getUnmessagedMatches(userId);
      const unmessagedList = unmessagedResponse.success ? unmessagedResponse.data || [] : [];
      setUnmessagedMatches(unmessagedList);
      await loadChats(unmessagedList);
    };

    loadData();
  }, [user?.id]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const userId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
        if (!userId) return;

        // Load unmessaged matches first, then load chats with the list to filter
        const unmessagedResponse = await messagesService.getUnmessagedMatches(userId);
        const unmessagedList = unmessagedResponse.success ? unmessagedResponse.data || [] : [];
        setUnmessagedMatches(unmessagedList);
        await loadChats(unmessagedList);
      };

      loadData();
    }, [user?.id])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <Loading text="チャットを読み込み中..." fullScreen />
      </SafeAreaView>
    );
  }


  const handleUnmessagedMatchPress = async (match: UnmessagedMatch) => {
    try {
      const userId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;
      if (!userId) return;

      // Get or create chat for this match
      const chatResponse = await messagesService.getOrCreateChatBetweenUsers(
        userId,
        match.other_user_id,
        match.match_id
      );

      if (chatResponse.success && chatResponse.data) {
        navigation.navigate("Chat", {
          chatId: chatResponse.data,
          userId: match.other_user_id,
          userName: match.other_user_name,
          userImage: match.other_user_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        });
      }
    } catch (error) {
      console.error("[MessagesScreen] Failed to open chat:", error);
    }
  };

  const renderUnmessagedMatch = (match: UnmessagedMatch) => (
    <TouchableOpacity
      key={match.match_id}
      style={styles.unmessagedMatchItem}
      onPress={() => handleUnmessagedMatchPress(match)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${match.other_user_name}とメッセージを始める`}
    >
      <View style={styles.profileImageWrapper}>
        <Image
          source={{ uri: match.other_user_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face' }}
          style={styles.unmessagedProfileImage}
          accessibilityLabel={`${match.other_user_name}のプロフィール写真`}
        />
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      </View>
      <Text style={styles.matchInfoText} numberOfLines={1}>
        {match.other_user_age}歳 ・ {match.other_user_prefecture}
      </Text>
    </TouchableOpacity>
  );

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
            {item.isOnline && <View style={styles.onlineIndicator} />}
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

      {/* Unmessaged Matches Section */}
      {unmessagedMatches.length > 0 && (
        <View style={styles.matchingSection}>
          <View style={styles.matchingSectionHeader}>
            <Text style={styles.matchingSectionTitle}>マッチング</Text>
            <Text style={styles.matchingSectionInstruction}>
              24時間以内に送るとお相手からの返信率アップ！
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.unmessagedMatchesContainer}
          >
            {unmessagedMatches.map((match) => renderUnmessagedMatch(match))}
          </ScrollView>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesList,
          unmessagedMatches.length > 0 && styles.messagesListWithMatching,
        ]}
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
  matchingSection: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  matchingSectionHeader: {
    marginBottom: Spacing.sm,
  },
  matchingSectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
    marginBottom: Spacing.xs / 2,
  },
  matchingSectionInstruction: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
  },
  unmessagedMatchesContainer: {
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.md,
  },
  unmessagedMatchItem: {
    alignItems: "center",
    marginRight: Spacing.md,
    width: 80,
  },
  profileImageWrapper: {
    position: "relative",
    marginBottom: Spacing.xs,
  },
  unmessagedProfileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  newBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 28,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.small,
  },
  newBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
  },
  matchInfoText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    width: "100%",
    marginTop: Spacing.xs / 2,
    lineHeight: Typography.fontSize.xs * 1.3,
  },
  messagesList: {
    padding: Spacing.sm,
    flexGrow: 1,
  },
  messagesListWithMatching: {
    paddingTop: Spacing.md,
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
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
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
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
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
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  timestamp: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
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
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
});

export default MessagesScreen;
