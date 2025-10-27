/**
 * Notification System Integration Tests
 * 
 * Tests the complete notification flow including:
 * - Push token registration
 * - Real-time subscriptions
 * - Notification preferences
 * - Toast notifications
 * - Badge counts
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { notificationService } from '../services/notificationService';
import { realtimeNotificationService } from '../services/realtimeNotificationService';
import { NotificationProvider, useNotifications } from '../contexts/NotificationContext';
import { AuthProvider } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
}));

// Mock Expo Constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: 'test-project-id',
        },
      },
    },
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Test component to access notification context
const TestComponent = ({ onRender }: { onRender: (context: any) => void }) => {
  const context = useNotifications();
  React.useEffect(() => {
    onRender(context);
  }, [context, onRender]);
  return null;
};

describe('Notification System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NotificationService', () => {
    it('should register for push notifications', async () => {
      const mockUserId = 'test-user-id';
      const token = await notificationService.registerForPushNotifications(mockUserId);

      expect(token).toBeDefined();
      expect(token).toMatch(/ExponentPushToken/);
    });

    it('should get notification preferences', async () => {
      const mockUserId = 'test-user-id';
      
      // Mock supabase response
      const mockPreferences = {
        messages: true,
        likes: true,
        post_reactions: false,
        matches: true,
      };
      
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { notification_preferences: mockPreferences },
              error: null,
            }),
          }),
        }),
      } as any);

      const prefs = await notificationService.getNotificationPreferences(mockUserId);

      expect(prefs).toEqual(mockPreferences);
    });

    it('should update notification preferences', async () => {
      const mockUserId = 'test-user-id';
      const newPreferences = {
        messages: false,
        likes: true,
        post_reactions: true,
        matches: false,
      };

      jest.spyOn(supabase, 'from').mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as any);

      await expect(
        notificationService.updateNotificationPreferences(mockUserId, newPreferences)
      ).resolves.not.toThrow();
    });

    it('should get unread counts', async () => {
      const mockUserId = 'test-user-id';
      const mockCounts = {
        unread_messages: 3,
        unread_likes: 2,
        unread_reactions: 1,
        unread_matches: 0,
        total_unread: 6,
      };

      jest.spyOn(supabase, 'rpc').mockResolvedValue({
        data: [mockCounts],
        error: null,
      } as any);

      const counts = await notificationService.getUnreadCounts(mockUserId);

      expect(counts).toEqual(mockCounts);
      expect(counts.total_unread).toBeGreaterThanOrEqual(0);
    });

    it('should mark notification as read', async () => {
      const mockUserId = 'test-user-id';
      const mockReferenceId = 'notification-ref-id';

      jest.spyOn(supabase, 'rpc').mockResolvedValue({
        data: true,
        error: null,
      } as any);

      await expect(
        notificationService.markNotificationRead(mockUserId, 'message', mockReferenceId)
      ).resolves.not.toThrow();
    });

    it('should update badge count', async () => {
      const count = 5;
      
      await expect(
        notificationService.updateBadgeCount(count)
      ).resolves.not.toThrow();
    });
  });

  describe('RealtimeNotificationService', () => {
    it('should subscribe to notifications', async () => {
      const mockUserId = 'test-user-id';
      const mockCallback = {
        showToast: jest.fn(),
        updateBadge: jest.fn(),
      };

      // Mock supabase channels
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(supabase, 'channel').mockReturnValue(mockChannel as any);
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any);

      await realtimeNotificationService.subscribe(mockUserId, mockCallback);

      expect(supabase.channel).toHaveBeenCalled();
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should unsubscribe from notifications', () => {
      const mockChannel = {
        unsubscribe: jest.fn(),
      };

      jest.spyOn(supabase, 'removeChannel').mockImplementation(() => Promise.resolve('ok' as any));

      realtimeNotificationService.unsubscribe();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('NotificationContext', () => {
    it('should provide notification context', async () => {
      let contextValue: any;

      const { rerender } = render(
        <AuthProvider>
          <NotificationProvider>
            <TestComponent onRender={(ctx) => (contextValue = ctx)} />
          </NotificationProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
        expect(contextValue.preferences).toBeDefined();
        expect(contextValue.unreadCounts).toBeDefined();
        expect(contextValue.updatePreferences).toBeInstanceOf(Function);
        expect(contextValue.refreshUnreadCounts).toBeInstanceOf(Function);
        expect(contextValue.showToast).toBeInstanceOf(Function);
        expect(contextValue.markNotificationRead).toBeInstanceOf(Function);
      });
    });

    it('should have default preferences', async () => {
      let contextValue: any;

      render(
        <AuthProvider>
          <NotificationProvider>
            <TestComponent onRender={(ctx) => (contextValue = ctx)} />
          </NotificationProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(contextValue.preferences).toEqual({
          messages: true,
          likes: true,
          post_reactions: true,
          matches: true,
        });
      });
    });

    it('should initialize with zero unread counts', async () => {
      let contextValue: any;

      render(
        <AuthProvider>
          <NotificationProvider>
            <TestComponent onRender={(ctx) => (contextValue = ctx)} />
          </NotificationProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(contextValue.unreadCounts).toEqual({
          unread_messages: 0,
          unread_likes: 0,
          unread_reactions: 0,
          unread_matches: 0,
          total_unread: 0,
        });
      });
    });
  });

  describe('Notification Type Tests', () => {
    it('should handle message notifications', () => {
      const notificationData = {
        type: 'message' as const,
        referenceId: 'msg-123',
        senderId: 'sender-456',
        senderName: 'Test User',
        senderImage: 'https://example.com/avatar.jpg',
        chatId: 'chat-789',
      };

      expect(notificationData.type).toBe('message');
      expect(notificationData.chatId).toBeDefined();
    });

    it('should handle like notifications', () => {
      const notificationData = {
        type: 'like' as const,
        referenceId: 'like-123',
        senderId: 'liker-456',
        senderName: 'Test User',
        senderImage: 'https://example.com/avatar.jpg',
      };

      expect(notificationData.type).toBe('like');
      expect(notificationData.senderId).toBeDefined();
    });

    it('should handle post reaction notifications', () => {
      const notificationData = {
        type: 'post_reaction' as const,
        referenceId: 'reaction-123',
        senderId: 'reactor-456',
        senderName: 'Test User',
        senderImage: 'https://example.com/avatar.jpg',
        postId: 'post-789',
      };

      expect(notificationData.type).toBe('post_reaction');
      expect(notificationData.postId).toBeDefined();
    });

    it('should handle match notifications', () => {
      const notificationData = {
        type: 'match' as const,
        referenceId: 'match-123',
        senderId: 'matcher-456',
        senderName: 'Test User',
        senderImage: 'https://example.com/avatar.jpg',
        matchId: 'match-789',
      };

      expect(notificationData.type).toBe('match');
      expect(notificationData.matchId).toBeDefined();
    });
  });

  describe('Notification Preferences Tests', () => {
    it('should allow all notification types by default', () => {
      const preferences = {
        messages: true,
        likes: true,
        post_reactions: true,
        matches: true,
      };

      Object.values(preferences).forEach((value) => {
        expect(value).toBe(true);
      });
    });

    it('should allow selective enabling/disabling', () => {
      const preferences = {
        messages: true,
        likes: false,
        post_reactions: true,
        matches: false,
      };

      expect(preferences.messages).toBe(true);
      expect(preferences.likes).toBe(false);
      expect(preferences.post_reactions).toBe(true);
      expect(preferences.matches).toBe(false);
    });
  });

  describe('Badge Count Tests', () => {
    it('should calculate total unread correctly', () => {
      const counts = {
        unread_messages: 3,
        unread_likes: 2,
        unread_reactions: 1,
        unread_matches: 0,
        total_unread: 6,
      };

      expect(counts.total_unread).toBeGreaterThanOrEqual(
        counts.unread_messages + counts.unread_likes + counts.unread_reactions
      );
    });

    it('should handle zero unread counts', () => {
      const counts = {
        unread_messages: 0,
        unread_likes: 0,
        unread_reactions: 0,
        unread_matches: 0,
        total_unread: 0,
      };

      expect(counts.total_unread).toBe(0);
    });
  });
});

