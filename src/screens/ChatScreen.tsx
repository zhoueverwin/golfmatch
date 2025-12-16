import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  Keyboard,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { RootStackParamList } from "../types";
import { useBackHandler } from "../hooks/useBackHandler";
import { useAuth } from "../contexts/AuthContext";
import { messagesService } from "../services/supabase/messages.service";
import { Message as DBMessage } from "../types/dataModels";
import { supabase } from "../services/supabase";
import FullscreenImageViewer from "../components/FullscreenImageViewer";
import VideoPlayer from "../components/VideoPlayer";
import MessageMenuModal from "../components/MessageMenuModal";
import { supabaseDataProvider } from "../services/supabaseDataProvider";
import { revenueCatService } from "../services/revenueCatService";
import { blocksService } from "../services/supabase/blocks.service";
import Toast from "../components/Toast";

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chat">;

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isFromUser: boolean;
  isRead: boolean;
  type: "text" | "image" | "emoji" | "video";
  imageUri?: string;
}

const { width } = Dimensions.get("window");

// Memoized message bubble component for scroll performance
interface MessageBubbleProps {
  item: Message;
  onImagePress: (imageUri: string) => void;
}

const MessageBubble = memo(({ item, onImagePress }: MessageBubbleProps) => {
  const isFromUser = item.isFromUser;

  if (item.type === "image" && item.imageUri) {
    return (
      <View
        style={[
          styles.mediaMessageBubble,
          isFromUser ? styles.userMediaMessage : styles.otherMediaMessage,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(item.imageUri!)}
        >
          <ExpoImage
            source={{ uri: item.imageUri }}
            style={styles.messageImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        </TouchableOpacity>
        <View style={styles.mediaFooter}>
          <Text style={styles.mediaTimestamp}>
            {item.timestamp}
          </Text>
          {isFromUser && (
            <Ionicons
              name={item.isRead ? "checkmark-done" : "checkmark"}
              size={10}
              color={item.isRead ? Colors.info : Colors.gray[400]}
            />
          )}
        </View>
      </View>
    );
  }

  if (item.type === "video" && item.imageUri) {
    return (
      <View
        style={[
          styles.mediaMessageBubble,
          isFromUser ? styles.userMediaMessage : styles.otherMediaMessage,
        ]}
      >
        <View style={styles.messageVideoContainer}>
          <VideoPlayer
            videoUri={item.imageUri}
            style={styles.messageVideo}
            contentFit="contain"
          />
        </View>
        <View style={styles.mediaFooter}>
          <Text style={styles.mediaTimestamp}>
            {item.timestamp}
          </Text>
          {isFromUser && (
            <Ionicons
              name={item.isRead ? "checkmark-done" : "checkmark"}
              size={10}
              color={item.isRead ? Colors.info : Colors.gray[400]}
            />
          )}
        </View>
      </View>
    );
  }

  // Emoji messages - no footer, just the emoji
  if (item.type === "emoji") {
    return (
      <View
        style={[
          styles.emojiMessage,
          isFromUser ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" },
        ]}
      >
        <Text style={styles.emojiText}>{item.text}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.messageBubble,
        isFromUser ? styles.userMessage : styles.otherMessage,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          isFromUser ? styles.userMessageText : styles.otherMessageText,
        ]}
      >
        {item.text}
      </Text>
      <View style={styles.messageFooter}>
        <Text
          style={[
            styles.messageTimestamp,
            isFromUser ? styles.userTimestamp : styles.otherTimestamp,
          ]}
        >
          {item.timestamp}
        </Text>
        {isFromUser && (
          <Ionicons
            name={item.isRead ? "checkmark-done" : "checkmark"}
            size={10}
            color={item.isRead ? Colors.info : "rgba(255,255,255,0.8)"}
          />
        )}
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.isRead === nextProps.item.isRead &&
    prevProps.item.text === nextProps.item.text
  );
});

// Popular emojis for quick selection
const POPULAR_EMOJIS = [
  "😀", "😂", "😍", "🥰", "😘", "😊", "😉", "😎",
  "🤔", "😮", "😢", "😭", "😡", "🤯", "😱", "🥳",
  "👍", "👎", "❤️", "💕", "🔥", "💯", "✨", "🎉",
  "⛳", "🏌️‍♂️", "🏌️‍♀️", "🏆", "🎯", "💪", "🌟", "💎", "🚀",
];

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { chatId, userId, userName, userImage } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(0);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [mediaIconsVisible, setMediaIconsVisible] = useState(true);
  const BASE_INPUT_OFFSET = Math.max(insets.bottom * 0.4, Spacing.sm);
  const inputBottomAnim = useRef(new Animated.Value(BASE_INPUT_OFFSET)).current;
  const menuWidthAnim = useRef(new Animated.Value(0)).current;
  const emojiOpacityAnim = useRef(new Animated.Value(1)).current;
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({
    visible: false,
    message: "",
    type: "success",
  });

  const DEFAULT_INPUT_HEIGHT = 72;
  const bottomSpacerHeight = useMemo(() => {
    const safeInputHeight = inputHeight || DEFAULT_INPUT_HEIGHT;
    const keyboardOffset = keyboardHeight > 0 ? keyboardHeight : 0;
    return safeInputHeight + keyboardOffset + Spacing.md + BASE_INPUT_OFFSET;
  }, [inputHeight, keyboardHeight, BASE_INPUT_OFFSET]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Dynamic icon sizing and spacing based on screen width
  const screenWidth = Dimensions.get("window").width;
  const ICON_SIZE = screenWidth <= 360 ? 18 : screenWidth <= 414 ? 20 : 22;
  const ARROW_SIZE = Math.max(16, ICON_SIZE - 2);
  const ICON_SPACING = screenWidth <= 360 ? Spacing.xs : screenWidth <= 414 ? 6 : Spacing.sm;
  const ICON_GAP_WIDE = screenWidth <= 360 ? 16 : screenWidth <= 414 ? 18 : 20;
  const iconImageStyle = { width: ICON_SIZE, height: ICON_SIZE };
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);

  // Message menu state
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // OPTIMIZED: Cache verification and membership status to avoid checking on every message
  // Previous: Queried database + RevenueCat on EVERY message send
  // Now: Check once on mount, re-check only on focus (after returning from KYC/Store)
  const [cachedVerificationStatus, setCachedVerificationStatus] = useState<{
    isVerified: boolean;
    isPremium: boolean;
    lastChecked: number;
  } | null>(null);

  const currentUserId = user?.id || process.env.EXPO_PUBLIC_TEST_USER_ID;

  // Format timestamp for message display
  const formatMessageTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Reset time to midnight for date comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate difference in milliseconds
    const diffTime = today.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    // Format time as HH:MM
    const timeString = date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    
    // Today
    if (diffDays === 0) {
      return `今日 ${timeString}`;
    }
    
    // Yesterday
    if (diffDays === 1) {
      return `昨日 ${timeString}`;
    }
    
    // Within a week (2-6 days ago)
    if (diffDays < 7) {
      return `${diffDays}日前`;
    }
    
    // Within a month (1-4 weeks ago)
    if (diffDays < 30) {
      return `${diffWeeks}週間前`;
    }
    
    // Within a year (1-11 months ago)
    if (diffMonths < 12) {
      return `${diffMonths}ヶ月前`;
    }
    
    // Older than a year - show date
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  // Handle Android back button
  useBackHandler(() => {
    if (imageViewerVisible) {
      setImageViewerVisible(false);
      return true;
    }
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      return true;
    }
    return false;
  });

  useEffect(() => {
    loadMessages();
    requestPermissions();
    loadOnlineStatus();

    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        Animated.timing(inputBottomAnim, {
          toValue: e.endCoordinates.height + Spacing.sm,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
        setMenuExpanded(false);
        Animated.timing(menuWidthAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        Animated.timing(inputBottomAnim, {
          toValue: BASE_INPUT_OFFSET,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [chatId, BASE_INPUT_OFFSET, inputBottomAnim, menuWidthAnim]);

  // Real-time subscription
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    console.log(`[ChatScreen] Setting up real-time subscription for chat:${chatId}`);
    
    const unsubscribe = messagesService.subscribeToChat(chatId, (newMessage: DBMessage) => {
      console.log(`[ChatScreen] Received real-time message:`, {
        id: newMessage.id,
        sender_id: newMessage.sender_id,
        currentUserId,
        isFromOtherUser: newMessage.sender_id !== currentUserId,
      });

      // Check if message already exists to prevent duplicates
      setMessages((prev) => {
        const messageExists = prev.some((msg) => msg.id === newMessage.id);
        if (messageExists) {
          console.log(`[ChatScreen] Message ${newMessage.id} already exists, skipping`);
          return prev;
        }

        // Transform and add the message
        const transformedMessage = transformMessage(newMessage);
        const updatedMessages = [...prev, transformedMessage];
        
        // Auto-scroll to bottom for messages from other users
        if (newMessage.sender_id !== currentUserId) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
          
          // Mark as read
          messagesService.markAsRead(newMessage.id);
        }
        
        return updatedMessages;
      });
    });

    return () => {
      console.log(`[ChatScreen] Cleaning up subscription for chat:${chatId}`);
      unsubscribe();
    };
  }, [chatId, currentUserId]);

  // Reload messages when screen comes into focus (disabled to prevent conflicts with realtime)
  // useFocusEffect(
  //   useCallback(() => {
  //     loadMessages();
  //   }, [chatId])
  // );

  const requestPermissions = async () => {
    // Request media library permissions
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaPermission.status !== "granted") {
      Alert.alert(
        "フォトライブラリの許可が必要です",
        "写真を選択するには許可が必要です。",
      );
    }

    // Request camera permissions
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status !== "granted") {
      Alert.alert(
        "カメラの許可が必要です",
        "写真を撮影するには許可が必要です。",
      );
    }
  };

  const transformMessage = (dbMessage: DBMessage): Message => {
    // Handle both snake_case (from DB) and camelCase (from TypeScript)
    const imageUri = (dbMessage as any).image_uri || (dbMessage as any).imageUri || undefined;
    
    return {
      id: dbMessage.id,
      text: dbMessage.text || "",
      timestamp: formatMessageTimestamp(dbMessage.created_at),
      isFromUser: dbMessage.sender_id === currentUserId,
      isRead: dbMessage.isRead || false,
      type: dbMessage.type as "text" | "image" | "emoji" | "video",
      imageUri: imageUri,
    };
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      const response = await messagesService.getChatMessages(chatId);
      
      if (response.success && response.data) {
        const transformedMessages = response.data.map(transformMessage);
        setMessages(transformedMessages);
        
        // Mark unread messages as read
        const unreadMessages = response.data.filter(
          msg => !msg.isRead && msg.receiver_id === currentUserId
        );
        
        for (const msg of unreadMessages) {
          await messagesService.markAsRead(msg.id);
        }
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      Alert.alert("エラー", "メッセージの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // Load online status for the chat partner
  const loadOnlineStatus = async () => {
    try {
      const response = await supabaseDataProvider.getUserOnlineStatus(userId);
      if (response.success && response.data) {
        setIsOnline(response.data.isOnline);
        setLastActiveAt(response.data.lastActiveAt);
      }
    } catch (error) {
      console.error("[ChatScreen] Error loading online status:", error);
    }
  };

  // OPTIMIZED: Load and cache verification/premium status
  // Called once on mount and when returning from KYC/Store screens
  const loadVerificationStatus = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_verified, is_premium')
        .eq('id', currentUserId)
        .single();

      if (error || !profile) {
        console.error("[ChatScreen] Error loading verification status:", error);
        return;
      }

      // Check RevenueCat for premium status
      const hasRevenueCatPro = await revenueCatService.checkProEntitlement();
      const isPremium = hasRevenueCatPro || profile.is_premium;

      setCachedVerificationStatus({
        isVerified: profile.is_verified || false,
        isPremium,
        lastChecked: Date.now(),
      });
    } catch (error) {
      console.error("[ChatScreen] Error loading verification status:", error);
    }
  }, [currentUserId]);

  // Load verification status on mount and when screen regains focus (e.g., after KYC/Store)
  useFocusEffect(
    useCallback(() => {
      // Only re-check if status is stale (> 5 minutes) or not loaded
      const STALE_TIME = 5 * 60 * 1000;
      const isStale = !cachedVerificationStatus ||
        (Date.now() - cachedVerificationStatus.lastChecked > STALE_TIME);

      if (isStale) {
        loadVerificationStatus();
      }
    }, [cachedVerificationStatus, loadVerificationStatus])
  );

  // Block user handler
  const handleBlockUser = async () => {
    if (!currentUserId) return;

    try {
      const result = await blocksService.blockUser(currentUserId, userId);
      if (result.success) {
        Alert.alert(
          "ブロック完了",
          `${userName}さんをブロックしました。`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("エラー", result.error || "ブロックに失敗しました。");
      }
    } catch (error) {
      console.error("[ChatScreen] Error blocking user:", error);
      Alert.alert("エラー", "ブロックに失敗しました。");
    }
  };

  // Report user handler
  const handleReportUser = () => {
    setShowUserMenu(false);
    navigation.navigate("Report", {
      reportedUserId: userId,
      reportedUserName: userName,
    });
  };

  // Report message handler
  const handleReportMessage = () => {
    if (!selectedMessage) return;
    setShowUserMenu(false);
    navigation.navigate("Report", {
      reportedUserId: userId,
      reportedMessageId: selectedMessage.id,
      reportedUserName: userName,
    });
  };

  // Format last active time for display
  const formatLastActive = (timestamp: string | null): string => {
    if (!timestamp) return "";
    
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

  const sendMessage = async (text?: string, mediaUrl?: string, mediaType?: "image" | "video") => {
    const messageText = text || newMessage.trim();
    if (!messageText && !mediaUrl) return;

    if (!currentUserId) {
      Alert.alert("エラー", "ユーザーIDが見つかりません。");
      return;
    }

    // OPTIMIZED: Use cached verification/membership status instead of querying every time
    // Previous: Made 2 API calls (database + RevenueCat) on EVERY message send
    // Now: Uses cached status, only re-checks on screen focus
    if (!cachedVerificationStatus) {
      // Status not loaded yet, load it now
      await loadVerificationStatus();
      // Check again after loading
      if (!cachedVerificationStatus) {
        Alert.alert("エラー", "認証状態の確認に失敗しました。");
        return;
      }
    }

    if (!cachedVerificationStatus.isVerified) {
      Alert.alert(
        "本人確認が必要です",
        "メッセージを送信するには本人確認（KYC認証）が必要です。マイページから本人確認を完了してください。",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "本人確認へ",
            onPress: () => navigation.navigate("KycVerification"),
          },
        ]
      );
      return;
    }

    if (!cachedVerificationStatus.isPremium) {
      Alert.alert(
        "メンバーシップが必要です",
        "メッセージを送信するには、Golfmatch Pro への登録が必要です。",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "ストアへ",
            onPress: () => navigation.navigate("Store"),
          },
        ],
      );
      return;
    }

    try {
      setSending(true);

      let messageType: "text" | "image" | "emoji" | "video" = "text";
      
      if (mediaUrl && mediaType) {
        messageType = mediaType;
      } else if (mediaUrl) {
        messageType = "image"; // Default to image for backward compatibility
      } else if (messageText.length <= 3 && /[\p{Emoji}]/u.test(messageText)) {
        messageType = "emoji";
      }

      const response = await messagesService.sendMessage(
        chatId,
        currentUserId,
        userId,  // receiver
        messageText || "",  // Ensure text is never undefined
        messageType,
        mediaUrl
      );

      if (response.success && response.data) {
        const transformedMessage = transformMessage(response.data);
        
        try {
          // Add message to state, checking for duplicates
          setMessages((prev) => {
            const messageExists = prev.some((msg) => msg.id === transformedMessage.id);
            if (messageExists) {
              console.log(`[ChatScreen] Sent message ${transformedMessage.id} already exists, skipping`);
              return prev;
            }
            return [...prev, transformedMessage];
          });
        } catch (stateError) {
          console.error("[ChatScreen] Failed to display message:", stateError);
          showToast("メッセージの表示に失敗しました", "error");
        }
        
        setNewMessage("");

        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      } else {
        Alert.alert("エラー", "メッセージの送信に失敗しました。");
        showToast("メッセージの送信に失敗しました", "error");
      }
    } catch (error) {
      Alert.alert("エラー", "メッセージの送信に失敗しました。");
      showToast("メッセージの送信に失敗しました", "error");
    } finally {
      setSending(false);
    }
  };

  const uploadImageToStorage = async (localUri: string): Promise<string | null> => {
    try {
      console.log('[ChatScreen] Starting image upload:', localUri);
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${chatId}/${timestamp}_${randomId}.${fileExt}`;

      console.log('[ChatScreen] Generated filename:', fileName);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64',
      });

      console.log('[ChatScreen] File read, size:', base64.length);

      // Decode base64 to ArrayBuffer using base64-arraybuffer library
      const arrayBuffer = decode(base64);

      console.log('[ChatScreen] Converted to ArrayBuffer, size:', arrayBuffer.byteLength);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('message-media')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('[ChatScreen] Upload error:', error);
        throw error;
      }

      console.log('[ChatScreen] Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message-media')
        .getPublicUrl(fileName);

      console.log('[ChatScreen] Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('[ChatScreen] Error uploading image:', error);
      Alert.alert("エラー", "画像のアップロードに失敗しました。");
      return null;
    }
  };

  const handleCameraPress = async () => {
    try {
      // Check camera permission first
      const permission = await ImagePicker.getCameraPermissionsAsync();
      if (!permission.granted) {
        const newPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!newPermission.granted) {
          Alert.alert(
            "カメラの許可が必要です",
            "写真を撮影するには設定からカメラの許可を有効にしてください。",
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uploadedUrl = await uploadImageToStorage(result.assets[0].uri);
        
        if (uploadedUrl) {
          sendMessage("", uploadedUrl, "image");
        }
      }
    } catch (error) {
      console.error('[ChatScreen] Camera error:', error);
      setSending(false);
      Alert.alert("エラー", "カメラの起動に失敗しました。");
    }
  };

  const handleImagePickerPress = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uploadedUrl = await uploadImageToStorage(result.assets[0].uri);
        
        if (uploadedUrl) {
          sendMessage("", uploadedUrl, "image");
        }
      }
    } catch (_error) {
      setSending(false);
      Alert.alert("エラー", "画像の選択に失敗しました。");
    }
  };

  const uploadVideoToStorage = async (localUri: string): Promise<string | null> => {
    try {
      console.log('[ChatScreen] Starting video upload:', localUri);
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileExt = localUri.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${chatId}/${timestamp}_${randomId}.${fileExt}`;

      console.log('[ChatScreen] Generated filename:', fileName);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64',
      });

      console.log('[ChatScreen] File read, size:', base64.length);

      // Decode base64 to ArrayBuffer
      const arrayBuffer = decode(base64);

      console.log('[ChatScreen] Converted to ArrayBuffer, size:', arrayBuffer.byteLength);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('message-media')
        .upload(fileName, arrayBuffer, {
          contentType: `video/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('[ChatScreen] Upload error:', error);
        throw error;
      }

      console.log('[ChatScreen] Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message-media')
        .getPublicUrl(fileName);

      console.log('[ChatScreen] Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('[ChatScreen] Error uploading video:', error);
      Alert.alert("エラー", "動画のアップロードに失敗しました。");
      return null;
    }
  };

  const handleVideoPickerPress = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSending(true);
        const uploadedUrl = await uploadVideoToStorage(result.assets[0].uri);
        
        if (uploadedUrl) {
          await sendMessage("", uploadedUrl, "video");
        }
        setSending(false);
      }
    } catch (_error) {
      setSending(false);
      Alert.alert("エラー", "動画の選択に失敗しました。");
    }
  };

  const handleEmojiPress = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const handleImagePress = useCallback((imageUri: string) => {
    // Get all image messages for gallery
    const imageMessages = messages.filter(msg => msg.type === "image" && msg.imageUri);
    const imageUris = imageMessages.map(msg => msg.imageUri!);
    const currentIndex = imageUris.indexOf(imageUri);

    setImageGallery(imageUris);
    setSelectedImageIndex(currentIndex);
    setImageViewerVisible(true);
  }, [messages]);

  // Memoized renderItem for FlatList
  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble
      item={item}
      onImagePress={handleImagePress}
    />
  ), [handleImagePress]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <View style={styles.backContent}>
            <Image
              source={require("../../assets/images/Icons/Arrow-LeftGrey.png")}
              style={[
                styles.backIconImage,
                { width: Math.max(14, ARROW_SIZE - 2), height: Math.max(14, ARROW_SIZE - 2) },
              ]}
              resizeMode="contain"
            />
            <Text style={styles.backLabel}>戻る</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{userName}</Text>
        </View>
      </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>メッセージを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <View style={styles.backContent}>
                <Image
                  source={require("../../assets/images/Icons/Arrow-LeftGrey.png")}
                  style={[
                    styles.backIconImage,
                    { width: Math.max(14, ARROW_SIZE - 2), height: Math.max(14, ARROW_SIZE - 2) },
                  ]}
                  resizeMode="contain"
                />
                <Text style={styles.backLabel}>戻る</Text>
              </View>
            </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => navigation.navigate("Profile", { userId })}
        >
          <Image source={{ uri: userImage }} style={styles.headerAvatar} />
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerName}>{userName}</Text>
            {isOnline === true && (
              <Text style={styles.headerStatus}>オンライン</Text>
            )}
            {isOnline === false && lastActiveAt && (
              <Text style={styles.headerStatusOffline}>
                最後にアクセス: {formatLastActive(lastActiveAt)}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerMenuButton}
          onPress={() => setShowUserMenu(true)}
          accessibilityRole="button"
          accessibilityLabel="メニュー"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Messages Container - Optimized for scroll performance */}
      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={11}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={<View style={{ height: bottomSpacerHeight }} />}
          onContentSizeChange={() => {
            if (keyboardHeight > 0 || messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 50);
            }
          }}
          onLayout={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }}
        />
      </View>

      {/* Input Area */}
      <Animated.View
        style={[styles.inputContainer, { bottom: inputBottomAnim }]}
        onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.inputRow}>
          <View style={styles.menuSection}>
            {isInputFocused && !mediaIconsVisible && (
              <TouchableOpacity
                style={[styles.iconTouchable, { marginRight: ICON_SPACING }]}
                onPress={() => setMediaIconsVisible((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={mediaIconsVisible ? "隠す" : "表示"}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              >
                <Image
                  source={require("../../assets/images/Icons/Arrow-RightGrey.png")}
                  style={[styles.iconImage, { width: ARROW_SIZE, height: ARROW_SIZE }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            <Animated.View style={styles.expandedIconsContainer}>
              <View style={styles.expandedIconsRow}>
                {mediaIconsVisible && (
                  <TouchableOpacity
                    style={[styles.iconTouchable, styles.expandedIcon, { width: ICON_SIZE, height: ICON_SIZE, marginRight: ICON_GAP_WIDE }]}
                    onPress={handleVideoPickerPress}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  >
                    <Image
                      source={require("../../assets/images/Icons/Chat-Video.png")}
                      style={[styles.iconImage, iconImageStyle]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
                {mediaIconsVisible && (
                  <TouchableOpacity
                    style={[styles.iconTouchable, styles.expandedIcon, { width: ICON_SIZE, height: ICON_SIZE, marginRight: ICON_GAP_WIDE }]}
                    onPress={handleImagePickerPress}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  >
                    <Image
                      source={require("../../assets/images/Icons/Chat-Image.png")}
                      style={[styles.iconImage, iconImageStyle]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
                {mediaIconsVisible && (
                  <TouchableOpacity
                    style={[styles.iconTouchable, styles.expandedIcon, { width: ICON_SIZE, height: ICON_SIZE }]}
                    onPress={handleCameraPress}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  >
                    <Image
                      source={require("../../assets/images/Icons/Chat-Camera.png")}
                      style={[styles.iconImage, iconImageStyle]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
                {/* No collapse/expand arrows; icons are always visible */}
              </View>
            </Animated.View>
          </View>

          <View style={styles.textInputWrapper}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              placeholder="メッセージを入力..."
              placeholderTextColor={Colors.gray[400]}
              value={newMessage}
              onChangeText={(text) => {
                setNewMessage(text);
                if (isInputFocused && text.trim().length > 0) {
                  setMediaIconsVisible(false);
                }
              }}
              multiline
              maxLength={500}
              onFocus={() => {
                setIsInputFocused(true);
                setMediaIconsVisible(false);
                Animated.timing(emojiOpacityAnim, {
                  toValue: 1,
                  duration: 200,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: false,
                }).start();
              }}
              onBlur={() => {
                setIsInputFocused(false);
                setMediaIconsVisible(true);
                Animated.timing(emojiOpacityAnim, {
                  toValue: 1,
                  duration: 200,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: false,
                }).start();
              }}
            />
            {isInputFocused ? (
              <TouchableOpacity
                style={[styles.iconTouchable, { marginBottom: 6 }]}
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              >
                <Animated.View style={{ opacity: emojiOpacityAnim }}>
                  <Image
                    source={require("../../assets/images/Icons/Chat-EmojiGrey.png")}
                    style={[styles.iconImage, iconImageStyle]}
                    resizeMode="contain"
                  />
                </Animated.View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.iconTouchable, { marginBottom: 6 }]}
                onPress={() => sendMessage("💚")}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              >
                <Animated.View style={{ opacity: emojiOpacityAnim }}>
                  <Image
                    source={require("../../assets/images/Icons/Like-Green.png")}
                    style={[styles.iconImage, { width: Math.max(20, ICON_SIZE), height: Math.max(20, ICON_SIZE) }]}
                    resizeMode="contain"
                  />
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>

          {newMessage.trim() && (
            <TouchableOpacity
              style={[styles.sendButtonFixed, sending && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Image
                  source={require("../../assets/images/Icons/Subtract.png")}
                  style={[styles.sendIconImage, { width: Math.max(18, ICON_SIZE - 2), height: Math.max(18, ICON_SIZE - 2) }]}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableOpacity
          style={styles.emojiModalOverlay}
          activeOpacity={1}
          onPress={() => setShowEmojiPicker(false)}
        >
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>絵文字を選択</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.emojiGrid}>
              {POPULAR_EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emojiButton}
                  onPress={() => handleEmojiPress(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Image Viewer */}
      <FullscreenImageViewer
        visible={imageViewerVisible}
        images={imageGallery}
        initialIndex={selectedImageIndex}
        onClose={() => setImageViewerVisible(false)}
      />

      {/* Message Menu Modal */}
      <MessageMenuModal
        visible={showUserMenu}
        onClose={() => setShowUserMenu(false)}
        messageId={selectedMessage?.id || ""}
        messageUserId={userId}
        messageUserName={userName}
        currentUserId={currentUserId || ""}
        onBlock={handleBlockUser}
        onReport={selectedMessage ? handleReportMessage : handleReportUser}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerUserInfo: {
    flex: 1,
  },
  headerMenuButton: {
    padding: Spacing.sm,
  },
  backContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIconImage: {
    width: 22,
    height: 22,
  },
  backLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    marginLeft: Spacing.xs,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  headerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
  },
  headerStatus: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.success,
  },
  headerStatusOffline: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.gray[500],
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary,
    borderTopRightRadius: 6,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: Colors.gray[100],
    borderTopLeftRadius: 6,
  },
  emojiMessage: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 2,
    overflow: "visible",
  },
  messageText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 21,
  },
  userMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.text.primary,
  },
  emojiText: {
    fontSize: 40,
    lineHeight: 44,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 3,
  },
  messageTimestamp: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.regular,
  },
  userTimestamp: {
    color: "rgba(255,255,255,0.8)",
  },
  otherTimestamp: {
    color: Colors.text.secondary,
  },
  mediaTimestamp: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.gray[400],
  },
  readIcon: {
    opacity: 0.8,
  },
  messageImage: {
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: 16,
  },
  messageVideoContainer: {
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mediaMessageBubble: {
    marginBottom: 6,
  },
  userMediaMessage: {
    alignSelf: "flex-end",
    marginRight: -2,
  },
  otherMediaMessage: {
    alignSelf: "flex-start",
    marginLeft: -2,
  },
  mediaFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 3,
    gap: 3,
  },
  messageVideo: {
    width: '100%',
    height: '100%',
  },
  inputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  menuSection: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.sm,
    marginBottom: 12,
  },
  expandedIconsContainer: {
    overflow: "hidden",
  },
  expandedIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconTouchable: {
    justifyContent: "center",
    alignItems: "center",
  },
  expandedIcon: {
    marginRight: 0,
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.gray[100],
    borderRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary,
    paddingVertical: Spacing.sm,
  },
  sendButtonFixed: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIconImage: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },
  emojiModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  emojiPickerContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "50%",
  },
  emojiPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emojiPickerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.md,
  },
  emojiButton: {
    width: width / 8,
    height: width / 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ChatScreen;


