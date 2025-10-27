import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  PanResponder,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { ToastNotification, NotificationType } from '../types/notifications';

interface NotificationToastProps {
  notification: ToastNotification;
  onDismiss: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after duration
    const duration = notification.duration || 4000;
    const timer = setTimeout(() => {
      dismissAnimation();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismissAnimation = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  // Pan responder for swipe up to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          dismissAnimation();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (notification.type) {
      case 'message':
        return 'chatbubble';
      case 'like':
        return 'heart';
      case 'post_reaction':
        return 'thumbs-up';
      case 'match':
        return 'flash';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (): string => {
    switch (notification.type) {
      case 'message':
        return Colors.primary;
      case 'like':
        return '#E94B67';
      case 'post_reaction':
        return '#4CAF50';
      case 'match':
        return '#FF6B35';
      default:
        return Colors.primary;
    }
  };

  const handlePress = () => {
    if (notification.onPress) {
      notification.onPress();
      dismissAnimation();
    } else {
      // Just dismiss if no handler provided
      dismissAnimation();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {notification.avatarUrl ? (
          <Image
            source={{ uri: notification.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
            <Ionicons name={getIcon()} size={24} color={getIconColor()} />
          </View>
        )}

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissAnimation}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={Colors.gray[500]} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});

export default NotificationToast;

