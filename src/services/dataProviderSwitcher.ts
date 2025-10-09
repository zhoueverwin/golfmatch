// Data Provider Switcher
// Allows switching between mock DataProvider and Supabase DataProvider
// This enables gradual migration and A/B testing

import { 
  User, 
  Post, 
  Message, 
  MessagePreview, 
  ConnectionItem, 
  SearchFilters,
  UserProfile,
  Availability,
  CalendarData,
  UserLike,
  UserInteraction,
  InteractionType,
  ServiceResponse,
  PaginatedServiceResponse
} from '../types/dataModels';

// Import both data providers
import DataProvider from './dataProvider';
import supabaseDataProvider from './supabaseDataProvider';

// Configuration
interface DataProviderConfig {
  useSupabase: boolean;
  fallbackToMock: boolean;
}

const DEFAULT_CONFIG: DataProviderConfig = {
  useSupabase: true, // Set to true to use Supabase, false for mock data
  fallbackToMock: true, // Fallback to mock data if Supabase fails
};

class DataProviderSwitcher {
  private config: DataProviderConfig;
  private currentProvider: any;

  constructor(config: DataProviderConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.currentProvider = config.useSupabase ? supabaseDataProvider : DataProvider;
  }

  // Update configuration
  setConfig(config: Partial<DataProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.currentProvider = this.config.useSupabase ? supabaseDataProvider : DataProvider;
  }

  // Get current configuration
  getConfig(): DataProviderConfig {
    return { ...this.config };
  }

  // Check if using Supabase
  isUsingSupabase(): boolean {
    return this.config.useSupabase;
  }

  // ============================================================================
  // USER PROFILES
  // ============================================================================

  async getCurrentUser(): Promise<ServiceResponse<User>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getCurrentUser();
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getCurrentUser failed, falling back to mock:', error);
          return await DataProvider.getCurrentUser();
        }
        throw error;
      }
    }
    return await this.currentProvider.getCurrentUser();
  }

  async getUser(userId: string): Promise<ServiceResponse<User>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getUser(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUser failed, falling back to mock:', error);
          return await DataProvider.getUser(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUser(userId);
  }

  async searchUsers(
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedServiceResponse<User[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.searchUsers(filters, page, limit);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase searchUsers failed, falling back to mock:', error);
          return await DataProvider.searchUsers(filters, page, limit);
        }
        throw error;
      }
    }
    return await this.currentProvider.searchUsers(filters, page, limit);
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<ServiceResponse<User>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.updateUserProfile(userId, updates);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase updateUserProfile failed, falling back to mock:', error);
          return await DataProvider.updateUserProfile(userId, updates);
        }
        throw error;
      }
    }
    return await this.currentProvider.updateUserProfile(userId, updates);
  }

  // ============================================================================
  // POSTS
  // ============================================================================

  async getPosts(page: number = 1, limit: number = 20): Promise<PaginatedServiceResponse<Post[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getPosts(page, limit);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getPosts failed, falling back to mock:', error);
          return await DataProvider.getPosts(page, limit);
        }
        throw error;
      }
    }
    return await this.currentProvider.getPosts(page, limit);
  }

  async getUserPosts(userId: string, page: number = 1, limit: number = 20): Promise<PaginatedServiceResponse<Post>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getUserPosts(userId, page, limit);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUserPosts failed, falling back to mock:', error);
          return await DataProvider.getUserPosts(userId, page, limit);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUserPosts(userId, page, limit);
  }

  async createPost(
    userId: string, 
    content: string, 
    images?: string[], 
    videos?: string[]
  ): Promise<ServiceResponse<Post>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.createPost(userId, content, images, videos);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase createPost failed, falling back to mock:', error);
          return await DataProvider.createPost(userId, content, images, videos);
        }
        throw error;
      }
    }
    return await this.currentProvider.createPost(userId, content, images, videos);
  }

  async likePost(postId: string, userId: string, type: 'like' | 'super_like' = 'like'): Promise<ServiceResponse<void>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.likePost(postId, userId, type);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase likePost failed, falling back to mock:', error);
          return await DataProvider.likePost(postId, userId, type);
        }
        throw error;
      }
    }
    return await this.currentProvider.likePost(postId, userId, type);
  }

  async unlikePost(postId: string, userId: string): Promise<ServiceResponse<void>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.unlikePost(postId, userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase unlikePost failed, falling back to mock:', error);
          return await DataProvider.unlikePost(postId, userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.unlikePost(postId, userId);
  }

  async getPostLikes(postId: string): Promise<ServiceResponse<string[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getPostLikes(postId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getPostLikes failed, falling back to mock:', error);
          return await DataProvider.getPostLikes(postId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getPostLikes(postId);
  }

  // ============================================================================
  // USER INTERACTIONS (LIKES/MATCHES)
  // ============================================================================

  async likeUser(
    likerUserId: string,
    likedUserId: string,
    type: InteractionType = 'like'
  ): Promise<ServiceResponse<{ matched: boolean }>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.likeUser(likerUserId, likedUserId, type);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase likeUser failed, falling back to mock:', error);
          return await DataProvider.likeUser(likerUserId, likedUserId, type);
        }
        throw error;
      }
    }
    return await this.currentProvider.likeUser(likerUserId, likedUserId, type);
  }

  async getUserLikes(userId: string): Promise<ServiceResponse<UserLike[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getUserLikes(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUserLikes failed, falling back to mock:', error);
          return await DataProvider.getUserLikes(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUserLikes(userId);
  }

  async getMatches(userId: string): Promise<ServiceResponse<any[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getMatches(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getMatches failed, falling back to mock:', error);
          return await DataProvider.getMatches(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getMatches(userId);
  }

  async checkMatch(user1Id: string, user2Id: string): Promise<ServiceResponse<boolean>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.checkMatch(user1Id, user2Id);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase checkMatch failed, falling back to mock:', error);
          return await DataProvider.checkMatch(user1Id, user2Id);
        }
        throw error;
      }
    }
    return await this.currentProvider.checkMatch(user1Id, user2Id);
  }

  async getLikesReceived(userId: string): Promise<ServiceResponse<UserLike[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getLikesReceived(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getLikesReceived failed, falling back to mock:', error);
          return await DataProvider.getLikesReceived(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getLikesReceived(userId);
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  async getChatMessages(chatId: string): Promise<ServiceResponse<Message[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getChatMessages(chatId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getChatMessages failed, falling back to mock:', error);
          return await DataProvider.getChatMessages(chatId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getChatMessages(chatId);
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    text: string,
    type: 'text' | 'image' | 'emoji' | 'video' = 'text',
    imageUri?: string
  ): Promise<ServiceResponse<Message>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.sendMessage(chatId, senderId, receiverId, text, type, imageUri);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase sendMessage failed, falling back to mock:', error);
          return await DataProvider.sendMessage(chatId, senderId, receiverId, text, type, imageUri);
        }
        throw error;
      }
    }
    return await this.currentProvider.sendMessage(chatId, senderId, receiverId, text, type, imageUri);
  }

  async markAsRead(messageId: string): Promise<ServiceResponse<void>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.markAsRead(messageId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase markAsRead failed, falling back to mock:', error);
          return await DataProvider.markAsRead(messageId);
        }
        throw error;
      }
    }
    return await this.currentProvider.markAsRead(messageId);
  }

  async getMessagePreviews(userId: string): Promise<ServiceResponse<MessagePreview[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getMessagePreviews(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getMessagePreviews failed, falling back to mock:', error);
          return await DataProvider.getMessagePreviews(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getMessagePreviews(userId);
  }

  async getOrCreateChat(matchId: string, participants: string[]): Promise<ServiceResponse<string>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getOrCreateChat(matchId, participants);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getOrCreateChat failed, falling back to mock:', error);
          return await DataProvider.getOrCreateChat(matchId, participants);
        }
        throw error;
      }
    }
    return await this.currentProvider.getOrCreateChat(matchId, participants);
  }

  // ============================================================================
  // AVAILABILITY/CALENDAR
  // ============================================================================

  async getUserAvailability(userId: string, year: number, month: number): Promise<ServiceResponse<Availability[]>> {
    if (this.config.useSupabase) {
      try {
        // Use the entries API for Supabase provider (returns Availability[])
        return await this.currentProvider.getUserAvailabilityEntries(userId, year, month);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUserAvailability failed, falling back to mock:', error);
          return await DataProvider.getUserAvailability(userId, year, month);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUserAvailability(userId, year, month);
  }

  async setAvailability(
    userId: string,
    date: string,
    isAvailable: boolean,
    timeSlots?: string[],
    notes?: string
  ): Promise<ServiceResponse<Availability>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.setAvailability(userId, date, isAvailable, timeSlots, notes);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase setAvailability failed, falling back to mock:', error);
          return await DataProvider.setAvailability(userId, date, isAvailable, timeSlots, notes);
        }
        throw error;
      }
    }
    return await this.currentProvider.setAvailability(userId, date, isAvailable, timeSlots, notes);
  }

  async deleteAvailability(userId: string, date: string): Promise<ServiceResponse<void>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.deleteAvailability(userId, date);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase deleteAvailability failed, falling back to mock:', error);
          return await DataProvider.deleteAvailability(userId, date);
        }
        throw error;
      }
    }
    return await this.currentProvider.deleteAvailability(userId, date);
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToProfile(userId: string, callback: (profile: User) => void) {
    if (this.config.useSupabase) {
      try {
        return this.currentProvider.subscribeToProfile(userId, callback);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase subscribeToProfile failed, falling back to mock:', error);
          return DataProvider.subscribeToProfile(userId, callback);
        }
        throw error;
      }
    }
    return this.currentProvider.subscribeToProfile(userId, callback);
  }

  subscribeToPosts(callback: (post: Post) => void) {
    if (this.config.useSupabase) {
      try {
        return this.currentProvider.subscribeToPosts(callback);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase subscribeToPosts failed, falling back to mock:', error);
          return DataProvider.subscribeToPosts(callback);
        }
        throw error;
      }
    }
    return this.currentProvider.subscribeToPosts(callback);
  }

  subscribeToMatches(userId: string, callback: (match: any) => void) {
    if (this.config.useSupabase) {
      try {
        return this.currentProvider.subscribeToMatches(userId, callback);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase subscribeToMatches failed, falling back to mock:', error);
          return DataProvider.subscribeToMatches(userId, callback);
        }
        throw error;
      }
    }
    return this.currentProvider.subscribeToMatches(userId, callback);
  }

  subscribeToChat(chatId: string, callback: (message: Message) => void) {
    if (this.config.useSupabase) {
      try {
        return this.currentProvider.subscribeToChat(chatId, callback);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase subscribeToChat failed, falling back to mock:', error);
          return DataProvider.subscribeToChat(chatId, callback);
        }
        throw error;
      }
    }
    return this.currentProvider.subscribeToChat(chatId, callback);
  }

  subscribeToAvailability(userId: string, callback: (availability: Availability) => void) {
    if (this.config.useSupabase) {
      try {
        return this.currentProvider.subscribeToAvailability(userId, callback);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase subscribeToAvailability failed, falling back to mock:', error);
          return DataProvider.subscribeToAvailability(userId, callback);
        }
        throw error;
      }
    }
    return this.currentProvider.subscribeToAvailability(userId, callback);
  }

  // ============================================================================
  // POST RECOMMENDATIONS
  // ============================================================================

  async getRecommendedPosts(page: number = 1, limit: number = 10): Promise<PaginatedServiceResponse<Post>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getRecommendedPosts(page, limit);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getRecommendedPosts failed, falling back to mock:', error);
          return await DataProvider.getRecommendedPosts(page, limit);
        }
        throw error;
      }
    }
    return await this.currentProvider.getRecommendedPosts(page, limit);
  }

  async getFollowingPosts(page: number = 1, limit: number = 10): Promise<PaginatedServiceResponse<Post>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getFollowingPosts(page, limit);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getFollowingPosts failed, falling back to mock:', error);
          return await DataProvider.getFollowingPosts(page, limit);
        }
        throw error;
      }
    }
    return await this.currentProvider.getFollowingPosts(page, limit);
  }

  // ============================================================================
  // USER RECOMMENDATIONS
  // ============================================================================

  async getRecommendedUsers(userId: string, limit: number = 10): Promise<ServiceResponse<User[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getRecommendedUsers(userId, limit);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getRecommendedUsers failed, falling back to mock:', error);
          return await DataProvider.getRecommendedUsers(userId, limit);
        }
        throw error;
      }
    }
    return await this.currentProvider.getRecommendedUsers(userId, limit);
  }

  // ============================================================================
  // USER PROFILE (EXTENDED)
  // ============================================================================

  async getUserProfile(userId: string): Promise<ServiceResponse<UserProfile>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getUserProfile(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUserProfile failed, falling back to mock:', error);
          return await DataProvider.getUserProfile(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUserProfile(userId);
  }

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<ServiceResponse<UserProfile>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.updateUserProfile(userId, profile);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase updateUserProfile failed, falling back to mock:', error);
          return await DataProvider.updateUserProfile(userId, profile);
        }
        throw error;
      }
    }
    return await this.currentProvider.updateUserProfile(userId, profile);
  }

  // ============================================================================
  // ADDITIONAL METHODS FOR COMPATIBILITY
  // ============================================================================

  async getUsers(filters?: SearchFilters): Promise<ServiceResponse<User[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getUsers(filters);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUsers failed, falling back to mock:', error);
          return await DataProvider.getUsers(filters);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUsers(filters);
  }

  async getUserById(id: string): Promise<ServiceResponse<User>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getUserById(id);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUserById failed, falling back to mock:', error);
          return await DataProvider.getUserById(id);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUserById(id);
  }

  async getPostById(id: string): Promise<ServiceResponse<Post>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getPostById(id);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getPostById failed, falling back to mock:', error);
          return await DataProvider.getPostById(id);
        }
        throw error;
      }
    }
    return await this.currentProvider.getPostById(id);
  }

  async getMessages(chatId: string): Promise<ServiceResponse<Message[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getMessages(chatId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getMessages failed, falling back to mock:', error);
          return await DataProvider.getMessages(chatId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getMessages(chatId);
  }

  async getMessagePreviews(): Promise<ServiceResponse<MessagePreview[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getMessagePreviews();
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getMessagePreviews failed, falling back to mock:', error);
          return await DataProvider.getMessagePreviews();
        }
        throw error;
      }
    }
    return await this.currentProvider.getMessagePreviews();
  }

  async sendMessage(
    chatId: string, 
    text: string, 
    type: 'text' | 'image' | 'emoji' = 'text', 
    imageUri?: string
  ): Promise<ServiceResponse<Message>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.sendMessage(chatId, text, type, imageUri);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase sendMessage failed, falling back to mock:', error);
          return await DataProvider.sendMessage(chatId, text, type, imageUri);
        }
        throw error;
      }
    }
    return await this.currentProvider.sendMessage(chatId, text, type, imageUri);
  }

  async getConnections(type?: 'like' | 'match'): Promise<ServiceResponse<ConnectionItem[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getConnections(type);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getConnections failed, falling back to mock:', error);
          return await DataProvider.getConnections(type);
        }
        throw error;
      }
    }
    return await this.currentProvider.getConnections(type);
  }

  async getConnectionStats(): Promise<ServiceResponse<{ likes: number; matches: number }>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getConnectionStats();
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getConnectionStats failed, falling back to mock:', error);
          return await DataProvider.getConnectionStats();
        }
        throw error;
      }
    }
    return await this.currentProvider.getConnectionStats();
  }

  async getCalendarData(userId: string, year?: number, month?: number): Promise<ServiceResponse<CalendarData>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getCalendarData(userId, year, month);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getCalendarData failed, falling back to mock:', error);
          return await DataProvider.getCalendarData(userId, year, month);
        }
        throw error;
      }
    }
    return await this.currentProvider.getCalendarData(userId, year, month);
  }

  async updateAvailability(userId: string, date: string, isAvailable: boolean): Promise<ServiceResponse<Availability>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.updateAvailability(userId, date, isAvailable);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase updateAvailability failed, falling back to mock:', error);
          return await DataProvider.updateAvailability(userId, date, isAvailable);
        }
        throw error;
      }
    }
    return await this.currentProvider.updateAvailability(userId, date, isAvailable);
  }

  async createPost(postData: { text: string; images: string[]; videos: string[]; userId: string }): Promise<ServiceResponse<Post>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.createPostWithData(postData);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase createPost failed, falling back to mock:', error);
          return await DataProvider.createPost(postData);
        }
        throw error;
      }
    }
    return await this.currentProvider.createPostWithData(postData);
  }

  async updatePost(postId: string, updates: { text?: string; images?: string[]; videos?: string[] }): Promise<ServiceResponse<Post>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.updatePost(postId, updates);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase updatePost failed, falling back to mock:', error);
          return await DataProvider.updatePost(postId, updates);
        }
        throw error;
      }
    }
    return await this.currentProvider.updatePost(postId, updates);
  }

  async getUserAvailability(userId: string, year: number, month: number): Promise<ServiceResponse<Availability[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getUserAvailability(userId, year, month);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUserAvailability failed, falling back to mock:', error);
          return await DataProvider.getUserAvailability(userId, year, month);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUserAvailability(userId, year, month);
  }

  async updateUserAvailability(userId: string, year: number, month: number, availabilityData: Partial<Availability>[]): Promise<ServiceResponse<boolean>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.updateUserAvailability(userId, year, month, availabilityData);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase updateUserAvailability failed, falling back to mock:', error);
          return await DataProvider.updateUserAvailability(userId, year, month, availabilityData);
        }
        throw error;
      }
    }
    return await this.currentProvider.updateUserAvailability(userId, year, month, availabilityData);
  }

  async getUserInteractions(userId: string): Promise<ServiceResponse<UserLike[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getUserInteractions(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getUserInteractions failed, falling back to mock:', error);
          return await DataProvider.getUserInteractions(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getUserInteractions(userId);
  }

  async getReceivedLikes(userId: string): Promise<ServiceResponse<UserLike[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getReceivedLikes(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getReceivedLikes failed, falling back to mock:', error);
          return await DataProvider.getReceivedLikes(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getReceivedLikes(userId);
  }

  async getMutualLikes(userId: string): Promise<ServiceResponse<User[]>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.getMutualLikes(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase getMutualLikes failed, falling back to mock:', error);
          return await DataProvider.getMutualLikes(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.getMutualLikes(userId);
  }

  async superLikeUser(likerUserId: string, likedUserId: string): Promise<ServiceResponse<UserLike>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.superLikeUser(likerUserId, likedUserId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase superLikeUser failed, falling back to mock:', error);
          return await DataProvider.superLikeUser(likerUserId, likedUserId);
        }
        throw error;
      }
    }
    return await this.currentProvider.superLikeUser(likerUserId, likedUserId);
  }

  async passUser(likerUserId: string, likedUserId: string): Promise<ServiceResponse<UserLike>> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.passUser(likerUserId, likedUserId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase passUser failed, falling back to mock:', error);
          return await DataProvider.passUser(likerUserId, likedUserId);
        }
        throw error;
      }
    }
    return await this.currentProvider.passUser(likerUserId, likedUserId);
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  async clearCache(): Promise<void> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.clearCache();
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase clearCache failed, falling back to mock:', error);
          return await DataProvider.clearCache();
        }
        throw error;
      }
    }
    return await this.currentProvider.clearCache();
  }

  async clearUserCache(userId: string): Promise<void> {
    if (this.config.useSupabase) {
      try {
        return await this.currentProvider.clearUserCache(userId);
      } catch (error) {
        if (this.config.fallbackToMock) {
          console.warn('Supabase clearUserCache failed, falling back to mock:', error);
          return await DataProvider.clearUserCache(userId);
        }
        throw error;
      }
    }
    return await this.currentProvider.clearUserCache(userId);
  }
}

// Export singleton instance
export const dataProviderSwitcher = new DataProviderSwitcher();
export default dataProviderSwitcher;
