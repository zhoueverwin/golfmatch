// Supabase Data Provider - Replaces the mock DataProvider with real Supabase backend
// Maintains the same interface as the original DataProvider for seamless migration

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
import { ProfilesService } from './supabase/profiles.service';
import { PostsService } from './supabase/posts.service';
import { MatchesService } from './supabase/matches.service';
import { MessagesService } from './supabase/messages.service';
import { AvailabilityService } from './supabase/availability.service';
import { supabase } from './supabase';

// Create service instances
const profilesService = new ProfilesService();
const postsService = new PostsService();
const matchesService = new MatchesService();
const messagesService = new MessagesService();
const availabilityService = new AvailabilityService();
import CacheService from './cacheService';

// Retry configuration
interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Retry helper function with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, initialDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

class SupabaseDataProvider {

  // ============================================================================
  // USER PROFILES
  // ============================================================================

  async getCurrentUser(): Promise<ServiceResponse<User>> {
    return withRetry(async () => {
      const result = await profilesService.getCurrentUserProfile();
      
      if (result.success && result.data) {
        // Cache the current user
        await CacheService.set('current_user', result.data);
      }
      
      return result;
    });
  }

  async getUser(userId: string): Promise<ServiceResponse<User>> {
    return withRetry(async () => {
      // Try cache first
      const cached = await CacheService.get<User>(`user_${userId}`);
      if (cached) {
        return { success: true, data: cached };
      }

      // Try by legacy ID first (for backward compatibility)
      let result = await profilesService.getProfileByLegacyId(userId);
      
      // If not found by legacy ID, try by UUID
      if (!result.success) {
        result = await profilesService.getProfile(userId);
      }

      if (result.success && result.data) {
        await CacheService.set(`user_${userId}`, result.data);
      }

      return result;
    });
  }

  async searchUsers(
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedServiceResponse<User[]>> {
    return withRetry(async () => {
      const result = await profilesService.searchProfiles(filters, page, limit);
      
      if (result.success && result.data) {
        // Cache individual users
        for (const user of result.data) {
          await CacheService.set(`user_${user.id}`, user);
          await CacheService.set(`user_${user.user_id}`, user);
          await CacheService.set(`user_${user.legacy_id}`, user);
        }
      }

      return result;
    });
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<ServiceResponse<User>> {
    return withRetry(async () => {
      const result = await profilesService.updateProfile(userId, updates);
      
      if (result.success && result.data) {
        // Update cache
        await CacheService.set(`user_${userId}`, result.data);
        await CacheService.set(`user_${result.data.user_id}`, result.data);
        await CacheService.set(`user_${result.data.legacy_id}`, result.data);
      }

      return result;
    });
  }

  // ============================================================================
  // POSTS
  // ============================================================================

  async getPosts(page: number = 1, limit: number = 20): Promise<PaginatedServiceResponse<Post[]>> {
    return withRetry(async () => {
      const result = await postsService.getPosts(page, limit);
      
      if (result.success && result.data) {
        // Cache posts
        for (const post of result.data) {
          await CacheService.set(`post_${post.id}`, post);
          if (post.legacy_id) {
            await CacheService.set(`post_${post.legacy_id}`, post);
          }
        }
      }

      return result;
    });
  }

  async getUserPosts(userId: string, page: number = 1, limit: number = 20): Promise<PaginatedServiceResponse<Post>> {
    return withRetry(async () => {
      const result = await postsService.getUserPosts(userId, page, limit);
      
      if (result.success && result.data) {
        // Cache posts
        for (const post of result.data) {
          await CacheService.set(`post_${post.id}`, post);
          if (post.legacy_id) {
            await CacheService.set(`post_${post.legacy_id}`, post);
          }
        }
      }

      return result;
    });
  }

  async createPost(
    userId: string, 
    content: string, 
    images?: string[], 
    videos?: string[]
  ): Promise<ServiceResponse<Post>> {
    return withRetry(async () => {
      const result = await postsService.createPost(userId, content, images, videos);
      
      if (result.success && result.data) {
        // Cache the new post
        await CacheService.set(`post_${result.data.id}`, result.data);
        if (result.data.legacy_id) {
          await CacheService.set(`post_${result.data.legacy_id}`, result.data);
        }
      }

      return result;
    });
  }

  async likePost(postId: string, userId: string, type: 'like' | 'super_like' = 'like'): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await postsService.likePost(postId, userId, type);
    });
  }

  async unlikePost(postId: string, userId: string): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await postsService.unlikePost(postId, userId);
    });
  }

  async getPostLikes(postId: string): Promise<ServiceResponse<string[]>> {
    return withRetry(async () => {
      return await postsService.getPostLikes(postId);
    });
  }

  // ============================================================================
  // USER INTERACTIONS (LIKES/MATCHES)
  // ============================================================================

  async likeUser(
    likerUserId: string,
    likedUserId: string,
    type: InteractionType = 'like'
  ): Promise<ServiceResponse<{ matched: boolean }>> {
    return withRetry(async () => {
      const result = await matchesService.likeUser(likerUserId, likedUserId, type);
      
      if (result.success && result.data?.matched) {
        // Clear cache for both users to refresh their match status
        await CacheService.delete(`user_${likerUserId}`);
        await CacheService.delete(`user_${likedUserId}`);
      }

      return result;
    });
  }

  async getUserLikes(userId: string): Promise<ServiceResponse<UserLike[]>> {
    return withRetry(async () => {
      return await matchesService.getUserLikes(userId);
    });
  }

  async getMatches(userId: string): Promise<ServiceResponse<any[]>> {
    return withRetry(async () => {
      const result = await matchesService.getMatches(userId);
      
      if (result.success && result.data) {
        // Cache matches
        await CacheService.set(`matches_${userId}`, result.data);
      }

      return result;
    });
  }

  async checkMatch(user1Id: string, user2Id: string): Promise<ServiceResponse<boolean>> {
    return withRetry(async () => {
      return await matchesService.checkMatch(user1Id, user2Id);
    });
  }

  async getLikesReceived(userId: string): Promise<ServiceResponse<UserLike[]>> {
    return withRetry(async () => {
      return await matchesService.getLikesReceived(userId);
    });
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  async getChatMessages(chatId: string): Promise<ServiceResponse<Message[]>> {
    return withRetry(async () => {
      const result = await messagesService.getChatMessages(chatId);
      
      if (result.success && result.data) {
        // Cache messages
        await CacheService.set(`messages_${chatId}`, result.data);
      }

      return result;
    });
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    text: string,
    type: 'text' | 'image' | 'emoji' | 'video' = 'text',
    imageUri?: string
  ): Promise<ServiceResponse<Message>> {
    return withRetry(async () => {
      const result = await messagesService.sendMessage(chatId, senderId, receiverId, text, type, imageUri);
      
      if (result.success && result.data) {
        // Clear message cache to force refresh
        await CacheService.delete(`messages_${chatId}`);
      }

      return result;
    });
  }

  async markAsRead(messageId: string): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await messagesService.markAsRead(messageId);
    });
  }

  async getMessagePreviews(userId: string): Promise<ServiceResponse<MessagePreview[]>> {
    return withRetry(async () => {
      const result = await messagesService.getMessagePreviews(userId);
      
      if (result.success && result.data) {
        // Cache message previews
        await CacheService.set(`message_previews_${userId}`, result.data);
      }

      return result;
    });
  }

  async getOrCreateChat(matchId: string, participants: string[]): Promise<ServiceResponse<string>> {
    return withRetry(async () => {
      return await messagesService.getOrCreateChat(matchId, participants);
    });
  }

  // ============================================================================
  // AVAILABILITY/CALENDAR
  // ============================================================================

  async getUserAvailability(userId: string, month: number, year: number): Promise<ServiceResponse<CalendarData>> {
    return withRetry(async () => {
      const result = await availabilityService.getUserAvailability(userId, month, year);
      
      if (result.success && result.data) {
        // Cache calendar data
        await CacheService.set(`calendar_${userId}_${year}_${month}`, result.data);
      }

      return result;
    });
  }

  async setAvailability(
    userId: string,
    date: string,
    isAvailable: boolean,
    timeSlots?: string[],
    notes?: string
  ): Promise<ServiceResponse<Availability>> {
    return withRetry(async () => {
      const result = await availabilityService.setAvailability(userId, date, isAvailable, timeSlots, notes);
      
      if (result.success && result.data) {
        // Clear calendar cache to force refresh
        const dateObj = new Date(date);
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        await CacheService.delete(`calendar_${userId}_${year}_${month}`);
      }

      return result;
    });
  }

  async deleteAvailability(userId: string, date: string): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      const result = await availabilityService.deleteAvailability(userId, date);
      
      if (result.success) {
        // Clear calendar cache to force refresh
        const dateObj = new Date(date);
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        await CacheService.delete(`calendar_${userId}_${year}_${month}`);
      }

      return result;
    });
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToProfile(userId: string, callback: (profile: User) => void) {
    return profilesService.subscribeToProfile(userId, callback);
  }

  subscribeToPosts(callback: (post: Post) => void) {
    return postsService.subscribeToPosts(callback);
  }

  subscribeToMatches(userId: string, callback: (match: any) => void) {
    return matchesService.subscribeToMatches(userId, callback);
  }

  subscribeToChat(chatId: string, callback: (message: Message) => void) {
    return messagesService.subscribeToChat(chatId, callback);
  }

  subscribeToAvailability(userId: string, callback: (availability: Availability) => void) {
    return availabilityService.subscribeToAvailability(userId, callback);
  }

  // ============================================================================
  // POST RECOMMENDATIONS
  // ============================================================================

  async getRecommendedPosts(page: number = 1, limit: number = 10): Promise<PaginatedServiceResponse<Post>> {
    return withRetry(async () => {
      // For now, return all posts as recommended posts
      // In a real app, this would use recommendation algorithms
      const result = await postsService.getPosts(page, limit);
      
      if (result.success && result.data) {
        // Cache posts
        for (const post of result.data) {
          await CacheService.set(`post_${post.id}`, post);
          if (post.legacy_id) {
            await CacheService.set(`post_${post.legacy_id}`, post);
          }
        }
      }

      return result;
    });
  }

  async getFollowingPosts(page: number = 1, limit: number = 10): Promise<PaginatedServiceResponse<Post>> {
    return withRetry(async () => {
      // For now, return all posts as following posts
      // In a real app, this would filter by users the current user follows
      const result = await postsService.getPosts(page, limit);
      
      if (result.success && result.data) {
        // Cache posts
        for (const post of result.data) {
          await CacheService.set(`post_${post.id}`, post);
          if (post.legacy_id) {
            await CacheService.set(`post_${post.legacy_id}`, post);
          }
        }
      }

      return result;
    });
  }

  // ============================================================================
  // USER RECOMMENDATIONS
  // ============================================================================

  async getRecommendedUsers(userId: string, limit: number = 10): Promise<ServiceResponse<User[]>> {
    return withRetry(async () => {
      if (!userId) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      if (limit < 0 || limit > 100) {
        return { success: false, error: 'Invalid limit provided. Must be between 0 and 100' };
      }

      // Get users that the current user hasn't interacted with
      const { data: userLikes, error: likesError } = await supabase
        .from('user_likes')
        .select('liked_user_id')
        .eq('liker_user_id', userId);

      if (likesError) {
        return { success: false, error: likesError.message };
      }

      const interactedUserIds = userLikes?.map(like => like.liked_user_id) || [];
      interactedUserIds.push(userId); // Exclude current user

      // Get recommended users (excluding interacted users)
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${interactedUserIds.join(',')})`)
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: users as User[],
      };
    });
  }

  // ============================================================================
  // USER PROFILE (EXTENDED)
  // ============================================================================

  async getUserProfile(userId: string): Promise<ServiceResponse<UserProfile>> {
    return withRetry(async () => {
      // Try cache first
      const cached = await CacheService.get<UserProfile>(`user_profile_${userId}`);
      if (cached) {
        return { success: true, data: cached };
      }

      // Get user data (this handles legacy ID mapping)
      const userResult = await this.getUser(userId);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.data;

      // Create UserProfile from User data
      const userProfile: UserProfile = {
        basic: {
          name: user.name,
          age: user.age?.toString() || '0',
          gender: user.gender,
          prefecture: user.prefecture,
          location: user.location,
          blood_type: user.blood_type || '',
          height: user.height || '',
          body_type: user.body_type || '',
          smoking: user.smoking || '',
          favorite_club: user.favorite_club,
          personality_type: user.personality_type,
        },
        golf: {
          skill_level: user.golf_skill_level,
          average_score: user.average_score?.toString() || '0',
          experience: user.golf_experience || '',
          best_score: user.best_score || '',
          transportation: user.transportation || '',
          play_fee: user.play_fee || '',
          available_days: user.available_days || '',
          round_fee: user.round_fee || '',
        },
        bio: user.bio || '',
        profile_pictures: user.profile_pictures,
        status: {
          is_verified: user.is_verified,
          last_login: user.last_login,
        },
        location: {
          prefecture: user.prefecture,
          transportation: user.transportation || '',
          play_fee: user.play_fee || '',
          available_days: user.available_days || '',
          round_fee: user.round_fee || '',
        },
      };

      // Cache the profile
      await CacheService.set(`user_profile_${userId}`, userProfile);

      return {
        success: true,
        data: userProfile,
      };
    });
  }

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<ServiceResponse<UserProfile>> {
    return withRetry(async () => {
      // Convert UserProfile to User updates
      const updates: Partial<User> = {};

      if (profile.basic) {
        updates.name = profile.basic.name;
        updates.age = profile.basic.age;
        updates.gender = profile.basic.gender;
        updates.prefecture = profile.basic.prefecture;
        updates.location = profile.basic.location;
      }

      if (profile.golf) {
        updates.golf_skill_level = profile.golf.skill_level;
        updates.average_score = profile.golf.average_score;
        updates.golf_experience = profile.golf.experience;
        updates.best_score = profile.golf.best_score;
        updates.favorite_club = profile.golf.favorite_club;
      }

      if (profile.bio) {
        updates.bio = profile.bio.bio;
        updates.blood_type = profile.bio.blood_type;
        updates.height = profile.bio.height;
        updates.body_type = profile.bio.body_type;
        updates.smoking = profile.bio.smoking;
        updates.personality_type = profile.bio.personality_type;
      }

      if (profile.profile_pictures) {
        updates.profile_pictures = profile.profile_pictures;
      }

      if (profile.status) {
        updates.is_verified = profile.status.is_verified;
        updates.last_login = profile.status.last_login;
      }

      if (profile.location) {
        updates.prefecture = profile.location.prefecture;
        updates.transportation = profile.location.transportation;
        updates.play_fee = profile.location.play_fee;
        updates.available_days = profile.location.available_days;
        updates.round_fee = profile.location.round_fee;
      }

      // Update the user
      const result = await profilesService.updateProfile(userId, updates);
      
      if (result.success && result.data) {
        // Clear cache
        await CacheService.delete(`user_${userId}`);
        await CacheService.delete(`user_profile_${userId}`);
        
        // Get updated profile
        return await this.getUserProfile(userId);
      }

      return result as any;
    });
  }

  // ============================================================================
  // ADDITIONAL METHODS FOR COMPATIBILITY
  // ============================================================================

  async getUsers(filters?: SearchFilters): Promise<ServiceResponse<User[]>> {
    return withRetry(async () => {
      const result = await profilesService.searchProfiles(filters || {}, 1, 100);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    });
  }

  async getUserById(id: string): Promise<ServiceResponse<User>> {
    return this.getUser(id);
  }

  async getPostById(id: string): Promise<ServiceResponse<Post>> {
    return withRetry(async () => {
      // Try cache first
      const cached = await CacheService.get<Post>(`post_${id}`);
      if (cached) {
        return { success: true, data: cached };
      }

      // Try by legacy ID first
      const { data: post, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles!posts_user_id_fkey(*)
        `)
        .eq('legacy_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // If not found by legacy ID, try by UUID
        const { data: postByUuid, error: uuidError } = await supabase
          .from('posts')
          .select(`
            *,
            user:profiles!posts_user_id_fkey(*)
          `)
          .eq('id', id)
          .single();

        if (uuidError) {
          return { success: false, error: uuidError.message };
        }

        await CacheService.set(`post_${id}`, postByUuid);
        return { success: true, data: postByUuid as Post };
      }

      if (post) {
        await CacheService.set(`post_${id}`, post);
        return { success: true, data: post as Post };
      }

      return { success: false, error: 'Post not found' };
    });
  }

  async getMessages(chatId: string): Promise<ServiceResponse<Message[]>> {
    return this.getChatMessages(chatId);
  }

  async getMessagePreviews(): Promise<ServiceResponse<MessagePreview[]>> {
    return withRetry(async () => {
      // Get current user first
      const currentUserResult = await this.getCurrentUser();
      if (!currentUserResult.success || !currentUserResult.data) {
        return { success: false, error: 'No authenticated user' };
      }

      return await messagesService.getMessagePreviews(currentUserResult.data.id);
    });
  }

  async sendMessage(
    chatId: string, 
    text: string, 
    type: 'text' | 'image' | 'emoji' = 'text', 
    imageUri?: string
  ): Promise<ServiceResponse<Message>> {
    return withRetry(async () => {
      // Get current user first
      const currentUserResult = await this.getCurrentUser();
      if (!currentUserResult.success || !currentUserResult.data) {
        return { success: false, error: 'No authenticated user' };
      }

      // For now, we'll need to determine the receiver_id
      // This is a simplified implementation - in a real app, you'd get this from the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('participants')
        .eq('id', chatId)
        .single();

      if (chatError || !chat) {
        return { success: false, error: 'Chat not found' };
      }

      const participants = chat.participants as string[];
      const receiverId = participants.find(id => id !== currentUserResult.data!.id);

      if (!receiverId) {
        return { success: false, error: 'Receiver not found' };
      }

      return await messagesService.sendMessage(chatId, currentUserResult.data.id, receiverId, text, type, imageUri);
    });
  }

  async getConnections(type?: 'like' | 'match'): Promise<ServiceResponse<ConnectionItem[]>> {
    return withRetry(async () => {
      // Get current user first
      const currentUserResult = await this.getCurrentUser();
      if (!currentUserResult.success || !currentUserResult.data) {
        return { success: false, error: 'No authenticated user' };
      }

      if (type === 'match') {
        const matchesResult = await this.getMatches(currentUserResult.data.id);
        if (!matchesResult.success) {
          return { success: false, error: matchesResult.error };
        }

        const connections: ConnectionItem[] = matchesResult.data.map((match: any) => ({
          id: match.id,
          user_id: match.user1_id === currentUserResult.data!.id ? match.user2_id : match.user1_id,
          user_name: match.user1_id === currentUserResult.data!.id ? match.user2?.name : match.user1?.name,
          avatar: match.user1_id === currentUserResult.data!.id ? match.user2?.profile_pictures?.[0] : match.user1?.profile_pictures?.[0],
          type: 'match',
          timestamp: match.matched_at,
        }));

        return { success: true, data: connections };
      } else {
        const likesResult = await this.getLikesReceived(currentUserResult.data.id);
        if (!likesResult.success) {
          return { success: false, error: likesResult.error };
        }

        const connections: ConnectionItem[] = likesResult.data.map((like: any) => ({
          id: like.id,
          user_id: like.liker_user_id,
          user_name: like.liker?.name,
          avatar: like.liker?.profile_pictures?.[0],
          type: 'like',
          timestamp: like.created_at,
        }));

        return { success: true, data: connections };
      }
    });
  }

  async getConnectionStats(): Promise<ServiceResponse<{ likes: number; matches: number }>> {
    return withRetry(async () => {
      // Get current user first
      const currentUserResult = await this.getCurrentUser();
      if (!currentUserResult.success || !currentUserResult.data) {
        return { success: false, error: 'No authenticated user' };
      }

      const [likesResult, matchesResult] = await Promise.all([
        this.getLikesReceived(currentUserResult.data.id),
        this.getMatches(currentUserResult.data.id),
      ]);

      return {
        success: true,
        data: {
          likes: likesResult.success ? likesResult.data.length : 0,
          matches: matchesResult.success ? matchesResult.data.length : 0,
        },
      };
    });
  }

  async getCalendarData(userId: string, year?: number, month?: number): Promise<ServiceResponse<CalendarData>> {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;
    
    // Fetch raw availability entries and map them into CalendarData shape
    const availabilityResult = await this.getUserAvailability(userId, currentYear, currentMonth);
    if (!availabilityResult.success) {
      return {
        success: false,
        error: availabilityResult.error,
      } as ServiceResponse<CalendarData>;
    }

    return {
      success: true,
      data: {
        year: currentYear,
        month: currentMonth,
        days: availabilityResult.data || [],
      },
    };
  }

  async updateAvailability(userId: string, date: string, isAvailable: boolean): Promise<ServiceResponse<Availability>> {
    return this.setAvailability(userId, date, isAvailable);
  }

  async createPostWithData(postData: { text: string; images: string[]; videos: string[]; userId: string }): Promise<ServiceResponse<Post>> {
    return this.createPost(postData.userId, postData.text, postData.images, postData.videos);
  }

  async updatePost(postId: string, updates: { text?: string; images?: string[]; videos?: string[] }): Promise<ServiceResponse<Post>> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('posts')
        .update({
          content: updates.text,
          images: updates.images,
          videos: updates.videos,
        })
        .eq('id', postId)
        .select(`
          *,
          user:profiles!posts_user_id_fkey(*)
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update cache
      await CacheService.set(`post_${postId}`, data);
      if (data.legacy_id) {
        await CacheService.set(`post_${data.legacy_id}`, data);
      }

      return { success: true, data: data as Post };
    });
  }

  async getUserAvailability(userId: string, year: number, month: number): Promise<ServiceResponse<Availability[]>> {
    return withRetry(async () => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Resolve legacy (non-UUID) IDs to actual UUIDs
      let actualUserId = userId;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('legacy_id', userId)
          .single();

        if (profileError || !profile) {
          return {
            success: false,
            error: `User not found: ${userId}`,
            data: [],
          };
        }

        actualUserId = (profile as any).id as string;
      }

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', actualUserId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: (data || []) as Availability[] };
    });
  }

  async updateUserAvailability(userId: string, year: number, month: number, availabilityData: Partial<Availability>[]): Promise<ServiceResponse<boolean>> {
    return withRetry(async () => {
      try {
        for (const availability of availabilityData) {
          if (availability.date) {
            await this.setAvailability(
              userId,
              availability.date,
              availability.is_available || false,
              availability.time_slots,
              availability.notes
            );
          }
        }
        return { success: true, data: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
  }

  async getUserInteractions(userId: string): Promise<ServiceResponse<UserLike[]>> {
    return this.getUserLikes(userId);
  }

  async getReceivedLikes(userId: string): Promise<ServiceResponse<UserLike[]>> {
    return this.getLikesReceived(userId);
  }

  async getMutualLikes(userId: string): Promise<ServiceResponse<User[]>> {
    return withRetry(async () => {
      // Get users that the current user has liked
      const likedResult = await this.getUserLikes(userId);
      if (!likedResult.success) {
        return { success: false, error: likedResult.error };
      }

      const likedUserIds = likedResult.data.map(like => like.liked_user_id);

      // Get users who have liked the current user back
      const receivedLikesResult = await this.getLikesReceived(userId);
      if (!receivedLikesResult.success) {
        return { success: false, error: receivedLikesResult.error };
      }

      const mutualUserIds = receivedLikesResult.data
        .filter(like => likedUserIds.includes(like.liker_user_id))
        .map(like => like.liker_user_id);

      // Get user details for mutual likes
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', mutualUserIds);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: users as User[] };
    });
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  async clearCache(): Promise<void> {
    await CacheService.clear();
  }

  async clearUserCache(userId: string): Promise<void> {
    await CacheService.delete(`user_${userId}`);
    await CacheService.delete(`user_profile_${userId}`);
    await CacheService.delete(`matches_${userId}`);
    await CacheService.delete(`message_previews_${userId}`);
    
    // Clear calendar cache for all months (approximate)
    for (let year = 2024; year <= 2026; year++) {
      for (let month = 1; month <= 12; month++) {
        await CacheService.delete(`calendar_${userId}_${year}_${month}`);
      }
    }
  }
}

// Export singleton instance
export const supabaseDataProvider = new SupabaseDataProvider();
export default supabaseDataProvider;
