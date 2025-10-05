import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { RootStackParamList } from '../types';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isFromUser: boolean;
  isRead: boolean;
  type: 'text' | 'image' | 'emoji';
  imageUri?: string;
}

const { width } = Dimensions.get('window');

// Popular emojis for quick selection
const POPULAR_EMOJIS = [
  '😀', '😂', '😍', '🥰', '😘', '😊', '😉', '😎',
  '🤔', '😮', '😢', '😭', '😡', '🤯', '😱', '🥳',
  '👍', '👎', '❤️', '💕', '🔥', '💯', '✨', '🎉',
  '🏌️‍♀️', '⛳', '🏆', '🎯', '💪', '🌟', '💎', '🚀'
];

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { userId, userName, userImage } = route.params;
  const flatListRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    loadMessages();
    requestPermissions();
  }, [userId]);

  const requestPermissions = async () => {
    // Request media library permissions
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaPermission.status !== 'granted') {
      Alert.alert('フォトライブラリの許可が必要です', '写真を選択するには許可が必要です。');
    }
  };

  const loadMessages = async () => {
    // Mock messages data
    const mockMessages: Message[] = [
      {
        id: '1',
        text: 'こんにちは！ゴルフ一緒にしませんか？',
        timestamp: '10:30',
        isFromUser: false,
        isRead: true,
        type: 'text',
      },
      {
        id: '2',
        text: 'こんにちは！ぜひ一緒にしましょう♪',
        timestamp: '10:32',
        isFromUser: true,
        isRead: true,
        type: 'text',
      },
      {
        id: '3',
        text: '今度の週末はどうですか？',
        timestamp: '10:33',
        isFromUser: false,
        isRead: true,
        type: 'text',
      },
      {
        id: '4',
        text: '週末は空いてます！どこかおすすめのコースありますか？',
        timestamp: '10:35',
        isFromUser: true,
        isRead: true,
        type: 'text',
      },
      {
        id: '5',
        text: '近くにいいコースがありますよ！',
        timestamp: '10:36',
        isFromUser: false,
        isRead: true,
        type: 'text',
      },
      {
        id: '6',
        text: '🔥',
        timestamp: '10:37',
        isFromUser: false,
        isRead: true,
        type: 'emoji',
      },
      {
        id: '7',
        text: '楽しみです！',
        timestamp: '10:38',
        isFromUser: true,
        isRead: true,
        type: 'text',
      },
    ];

    setMessages(mockMessages);
  };

  const sendMessage = async (text?: string, imageUri?: string) => {
    const messageText = text || newMessage.trim();
    if (!messageText && !imageUri) return;

    const message: Message = {
      id: Date.now().toString(),
      text: messageText,
      timestamp: new Date().toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      isFromUser: true,
      isRead: false,
      type: imageUri ? 'image' : 'text',
      imageUri,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      // Simulate auto-reply
      const autoReply: Message = {
        id: (Date.now() + 1).toString(),
        text: imageUri ? '素敵な写真ですね！' : 'ありがとうございます！',
        timestamp: new Date().toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        isFromUser: false,
        isRead: true,
        type: 'text',
      };
      setMessages(prev => [...prev, autoReply]);
    }, 2000);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCameraPress = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendMessage('', result.assets[0].uri);
      }
    } catch (_error) {
      Alert.alert('エラー', 'カメラの起動に失敗しました。');
    }
  };

  const handleImagePickerPress = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendMessage('', result.assets[0].uri);
      }
    } catch (_error) {
      Alert.alert('エラー', '画像の選択に失敗しました。');
    }
  };

  const handleEmojiPress = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleMore = () => {
    Alert.alert('その他', 'この機能は近日実装予定です');
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isFromUser ? styles.userMessageContainer : styles.otherMessageContainer
    ]}>
      {!item.isFromUser && (
        <Image
          source={{ uri: userImage }}
          style={styles.messageAvatar}
        />
      )}
      
      <View style={[
        styles.messageBubble,
        item.isFromUser ? styles.userMessageBubble : styles.otherMessageBubble
      ]}>
        {item.type === 'image' && item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={[
            styles.messageText,
            item.isFromUser ? styles.userMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
        )}
        
        <View style={styles.messageFooter}>
          <Text style={[
            styles.timestamp,
            item.isFromUser ? styles.userTimestamp : styles.otherTimestamp
          ]}>
            {item.timestamp}
          </Text>
          {item.isFromUser && (
            <Ionicons
              name={item.isRead ? 'checkmark-done' : 'checkmark'}
              size={12}
              color={item.isRead ? Colors.primary : Colors.gray[400]}
              style={styles.readIcon}
            />
          )}
        </View>
      </View>
    </View>
  );

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.otherMessageContainer]}>
      <Image
        source={{ uri: userImage }}
        style={styles.messageAvatar}
      />
      <View style={[styles.messageBubble, styles.otherMessageBubble]}>
        <View style={styles.typingIndicator}>
          <View style={[styles.typingDot, styles.typingDot1]} />
          <View style={[styles.typingDot, styles.typingDot2]} />
          <View style={[styles.typingDot, styles.typingDot3]} />
        </View>
      </View>
    </View>
  );

  const renderEmojiPicker = () => (
    <Modal
      visible={showEmojiPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEmojiPicker(false)}
    >
      <View style={styles.emojiPickerOverlay}>
        <View style={styles.emojiPickerContainer}>
          <View style={styles.emojiPickerHeader}>
            <Text style={styles.emojiPickerTitle}>絵文字</Text>
            <TouchableOpacity
              style={styles.emojiPickerClose}
              onPress={() => setShowEmojiPicker(false)}
            >
              <Ionicons name="close" size={24} color={Colors.gray[600]} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.emojiGrid} showsVerticalScrollIndicator={false}>
            <View style={styles.emojiRow}>
              {POPULAR_EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emojiButton}
                  onPress={() => handleEmojiPress(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => navigation.navigate('Profile', { userId })}
            accessibilityRole="button"
            accessibilityLabel={`${userName}のプロフィールを見る`}
          >
            <Image
              source={{ uri: userImage }}
              style={styles.headerAvatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.statusContainer}>
                <View style={styles.onlineIndicator} />
                <Text style={styles.statusText}>オンライン</Text>
              </View>
            </View>
          </TouchableOpacity>
          
        </View>

        {/* Messages */}
        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isTyping ? renderTypingIndicator : null}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </View>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.cameraButton} onPress={handleCameraPress}>
              <Ionicons name="camera" size={24} color={Colors.primary} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="メッセージを入力..."
              placeholderTextColor={Colors.gray[400]}
              multiline
              maxLength={1000}
            />
            
            <View style={styles.inputActions}>
              <TouchableOpacity style={styles.inputAction} onPress={handleImagePickerPress}>
                <Ionicons name="image" size={20} color={Colors.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.inputAction} 
                onPress={() => setShowEmojiPicker(true)}
              >
                <Ionicons name="happy" size={20} color={Colors.gray[600]} />
              </TouchableOpacity>
            </View>
          </View>
          
          {newMessage.trim() && (
            <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage()}>
              <Ionicons name="send" size={20} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Emoji Picker Modal */}
      {renderEmojiPicker()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  userMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.gray[100],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  userMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.text.primary,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
  },
  userTimestamp: {
    color: Colors.white + 'CC',
  },
  otherTimestamp: {
    color: Colors.text.tertiary,
  },
  readIcon: {
    marginLeft: Spacing.xs,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray[400],
    marginHorizontal: 2,
  },
  typingDot1: {
    // Animation delay handled by component logic
  },
  typingDot2: {
    // Animation delay handled by component logic
  },
  typingDot3: {
    // Animation delay handled by component logic
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    minHeight: 60,
  },
  inputBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    minHeight: 44,
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    textAlignVertical: 'center',
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputAction: {
    padding: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  emojiPickerContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '50%',
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emojiPickerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  emojiPickerClose: {
    padding: Spacing.sm,
  },
  emojiGrid: {
    padding: Spacing.md,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: (width - Spacing.md * 4) / 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emojiText: {
    fontSize: 24,
  },
});

export default ChatScreen;