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
  PaginatedServiceResponse,
  ContactInquiry,
  ContactReply,
} from "../types/dataModels";
import { ProfilesService } from "./supabase/profiles.service";
import { PostsService } from "./supabase/posts.service";
import { MatchesService } from "./supabase/matches.service";
import { MessagesService } from "./supabase/messages.service";
import { AvailabilityService } from "./supabase/availability.service";
import { ContactInquiriesService } from "./supabase/contact-inquiries.service";
import { supabase } from "./supabase";

// Create service instances
const profilesService = new ProfilesService();
const postsService = new PostsService();
const matchesService = new MatchesService();
const messagesService = new MessagesService();
const availabilityService = new AvailabilityService();
const contactInquiriesService = new ContactInquiriesService();
import CacheService from "./cacheService";

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
  config: RetryConfig = {},
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
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

class SupabaseDataProvider {
  private async fetchProfileByColumn(
    column: "id" | "legacy_id" | "user_id",
    value: string,
  ): Promise<{ id: string; gender: User["gender"] | null } | null> {
    if (!value) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, gender")
      .eq(column, value)
      .maybeSingle();

    if (error) {
      console.error(
        `[SupabaseDataProvider] Failed to fetch profile by ${column}:`,
        error.message,
      );
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      gender: (data.gender ?? null) as User["gender"] | null,
    };
  }

  private async resolveProfileContext(
    userId?: string,
  ): Promise<{ id: string; gender: User["gender"] | null } | null> {
    const candidateIds: string[] = [];

    if (userId) {
      candidateIds.push(userId.trim());
    }

    // Always attempt to use currently authenticated user when not explicitly provided
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      const authUserId = data?.user?.id;
      if (authUserId) {
        candidateIds.push(authUserId.trim());
      }
    }

    for (const candidate of candidateIds) {
      if (!candidate) continue;

      // Try direct profile ID
      const directProfile = await this.fetchProfileByColumn("id", candidate);
      if (directProfile) return directProfile;

      // Try legacy ID mapping
      const legacyProfile = await this.fetchProfileByColumn(
        "legacy_id",
        candidate,
      );
      if (legacyProfile) return legacyProfile;

      // Try auth user ID mapping (profiles.user_id)
      const authProfile = await this.fetchProfileByColumn("user_id", candidate);
      if (authProfile) return authProfile;
    }

    return null;
  }

  private getOppositeGender(
    gender?: User["gender"] | null,
  ): User["gender"] | null {
    if (gender === "male") return "female";
    if (gender === "female") return "male";
    return null;
  }

  private async prepareViewerContext(userId?: string): Promise<{
    profileId: string | null;
    gender: User["gender"] | null;
    oppositeGender: User["gender"] | null;
  }> {
    const profile = await this.resolveProfileContext(userId);

    if (!profile) {
      return { profileId: null, gender: null, oppositeGender: null };
    }

    const oppositeGender = this.getOppositeGender(profile.gender);

    return {
      profileId: profile.id,
      gender: profile.gender ?? null,
      oppositeGender,
    };
  }

  // ============================================================================
  // USER PROFILES
  // ============================================================================

  async getCurrentUser(): Promise<ServiceResponse<User>> {
    return withRetry(async () => {
      const result = await profilesService.getCurrentUserProfile();

      if (result.success && result.data) {
        // Cache the current user
        await CacheService.set("current_user", result.data);
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
    limit: number = 20,
  ): Promise<PaginatedServiceResponse<User[]>> {
    return withRetry(async () => {
      const { oppositeGender } = await this.prepareViewerContext();

      const appliedFilters: SearchFilters = {
        ...(filters || {}),
      };

      if (oppositeGender && !appliedFilters.gender) {
        appliedFilters.gender = oppositeGender;
      }

      const result = await profilesService.searchProfiles(
        appliedFilters,
        page,
        limit,
      );

      if (result.success && result.data) {
        // Cache individual users
        for (const user of result.data as User[]) {
          await CacheService.set(`user_${user.id}`, user);
          await CacheService.set(`user_${user.user_id}`, user);
          await CacheService.set(`user_${user.legacy_id}`, user);
        }
      }

      return result;
    });
  }

  // ============================================================================
  // POSTS
  // ============================================================================

  async getPosts(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedServiceResponse<Post[]>> {
    return withRetry(async () => {
      const result = await postsService.getPosts(page, limit);

      if (result.success && result.data) {
        // Cache posts
        for (const post of result.data as Post[]) {
          await CacheService.set(`post_${post.id}`, post);
        }
      }

      return result;
    });
  }

  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedServiceResponse<Post[]>> {
    return withRetry(async () => {
      const result = await postsService.getUserPosts(userId, page, limit);

      if (result.success && result.data) {
        // Cache posts
        for (const post of result.data as Post[]) {
          await CacheService.set(`post_${post.id}`, post);
        }
      }

      return result;
    });
  }

  async createPost(
    userId: string,
    content: string,
    images?: string[],
    videos?: string[],
  ): Promise<ServiceResponse<Post>> {
    return withRetry(async () => {
      // First, resolve the user ID (handle legacy IDs)
      let actualUserId = userId;
      if (
        !userId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("legacy_id", userId)
          .single();

        if (profileError || !profile) {
          return { success: false, error: `User not found: ${userId}` };
        }

        actualUserId = profile.id;
      }

      const result = await postsService.createPost(
        actualUserId,
        content,
        images,
        videos,
      );

      if (result.success && result.data) {
        // Cache the new post
        if (result.data) {
          await CacheService.set(`post_${result.data.id}`, result.data);
        }
      }

      return result;
    });
  }

  async likePost(
    postId: string,
    userId: string,
    type: "like" | "super_like" = "like",
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await postsService.likePost(postId, userId);
    });
  }

  async unlikePost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
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
    type: InteractionType = "like",
  ): Promise<ServiceResponse<{ matched: boolean }>> {
    return withRetry(async () => {
      const result = await matchesService.likeUser(
        likerUserId,
        likedUserId,
        type,
      );

      if (result.success && result.data?.matched) {
        // Clear cache for both users to refresh their match status
        await CacheService.remove(`user_${likerUserId}`);
        await CacheService.remove(`user_${likedUserId}`);
      }

      return result;
    });
  }

  async superLikeUser(
    userId: string,
    targetUserId: string,
  ): Promise<ServiceResponse<any>> {
    return withRetry(async () => {
      const result = await matchesService.likeUser(
        userId,
        targetUserId,
        "super_like",
      );

      if (result.success && result.data?.matched) {
        // Clear cache for both users to refresh their match status
        await CacheService.remove(`user_${userId}`);
        await CacheService.remove(`user_${targetUserId}`);
      }

      return result;
    });
  }

  async passUser(
    userId: string,
    targetUserId: string,
  ): Promise<ServiceResponse<any>> {
    return withRetry(async () => {
      const result = await matchesService.likeUser(
        userId,
        targetUserId,
        "pass",
      );

      if (result.success) {
        // Clear cache for both users to refresh their interaction status
        await CacheService.remove(`user_${userId}`);
        await CacheService.remove(`user_${targetUserId}`);
      }

      return result;
    });
  }

  async undoLike(
    likerUserId: string,
    likedUserId: string,
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await matchesService.undoLike(likerUserId, likedUserId);
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

  async checkMatch(
    user1Id: string,
    user2Id: string,
  ): Promise<ServiceResponse<boolean>> {
    return withRetry(async () => {
      return await matchesService.checkMatch(user1Id, user2Id);
    });
  }

  async checkMutualLikes(
    user1Id: string,
    user2Id: string,
  ): Promise<ServiceResponse<boolean>> {
    return withRetry(async () => {
        return await matchesService.checkMutualLikes(user1Id, user2Id); 
    });
  }

  async getUnseenMatches(userId: string): Promise<ServiceResponse<any[]>> {
    return withRetry(async () => {
      return await matchesService.getUnseenMatches(userId);
    });
  }

  async markMatchAsSeen(
    matchId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await matchesService.markMatchAsSeen(matchId, userId);
    });
  }

  // ============================================================================
  // CONTACT INQUIRIES
  // ============================================================================

  async getContactInquiries(
    userId: string,
  ): Promise<ServiceResponse<ContactInquiry[]>> {
    return withRetry(async () => {
      return await contactInquiriesService.getContactInquiries(userId);
    });
  }

  async getContactInquiry(
    inquiryId: string,
  ): Promise<ServiceResponse<ContactInquiry>> {
    return withRetry(async () => {
      return await contactInquiriesService.getContactInquiry(inquiryId);
    });
  }

  async markReplyAsRead(replyId: string): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await contactInquiriesService.markReplyAsRead(replyId);
    });
  }

  async markAllRepliesAsRead(
    inquiryId: string,
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await contactInquiriesService.markAllRepliesAsRead(inquiryId);
    });
  }

  async createContactInquiry(
    userId: string,
    subject: string,
    message: string,
    inquiryType?: string,
  ): Promise<ServiceResponse<ContactInquiry>> {
    return withRetry(async () => {
      return await contactInquiriesService.createContactInquiry(
        userId,
        subject,
        message,
        inquiryType,
      );
    });
  }

  async getLikesReceived(userId: string): Promise<ServiceResponse<UserLike[]>> {
    return withRetry(async () => {
      return await matchesService.getLikesReceived(userId);
    });
  }

  // Alias for getLikesReceived
  async getReceivedLikes(userId: string): Promise<ServiceResponse<UserLike[]>> {
    return this.getLikesReceived(userId);
  }

  /**
   * Get count of likes received by a user
   * Counts active likes where liked_user_id = userId AND type = 'like' AND is_active = true
   */
  async getLikesReceivedCount(userId: string): Promise<ServiceResponse<number>> {
    return withRetry(async () => {
      const { count, error } = await supabase
        .from("user_likes")
        .select("*", { count: "exact", head: true })
        .eq("liked_user_id", userId)
        .eq("type", "like")
        .eq("is_active", true);

      if (error) {
        console.error("[SupabaseDataProvider] Error getting likes count:", error);
        return {
          success: false,
          error: error.message || "Failed to get likes count",
        };
      }

      return {
        success: true,
        data: count || 0,
      };
    });
  }

  async unlikeUser(
    likerUserId: string,
    likedUserId: string,
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      const result = await matchesService.unlikeUser(likerUserId, likedUserId);

      if (result.success) {
        // Clear cache for both users to refresh their interaction status
        await CacheService.remove(`user_${likerUserId}`);
        await CacheService.remove(`user_${likedUserId}`);
      }

      return result;
    });
  }

  async getUserByEmail(email: string): Promise<ServiceResponse<User>> {
    return withRetry(async () => {
      return await profilesService.getProfileByEmail(email);
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
    type: "text" | "image" | "emoji" | "video" = "text",
    imageUri?: string,
  ): Promise<ServiceResponse<Message>> {
    return withRetry(async () => {
      const result = await messagesService.sendMessage(
        chatId,
        senderId,
        receiverId,
        text,
        type,
        imageUri,
      );

      if (result.success && result.data) {
        // Clear message cache to force refresh
        await CacheService.remove(`messages_${chatId}`);
      }

      return result;
    });
  }

  async markAsRead(messageId: string): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      return await messagesService.markAsRead(messageId);
    });
  }

  async getMessagePreviews(
    userId: string,
  ): Promise<ServiceResponse<MessagePreview[]>> {
    return withRetry(async () => {
      const result = await messagesService.getMessagePreviews(userId);

      if (result.success && result.data) {
        // Cache message previews
        await CacheService.set(`message_previews_${userId}`, result.data);
      }

      return result;
    });
  }

  async getOrCreateChat(
    matchId: string,
    participants: string[],
  ): Promise<ServiceResponse<string>> {
    return withRetry(async () => {
      return await messagesService.getOrCreateChat(matchId, participants);
    });
  }

  async getOrCreateChatBetweenUsers(
    user1Id: string,
    user2Id: string,
    matchId?: string,
  ): Promise<ServiceResponse<string>> {
    return withRetry(async () => {
      return await messagesService.getOrCreateChatBetweenUsers(user1Id, user2Id, matchId);
    });
  }

  // ============================================================================
  // AVAILABILITY/CALENDAR
  // ============================================================================

  async getUserAvailability(
    userId: string,
    month: number,
    year: number,
  ): Promise<ServiceResponse<CalendarData>> {
    return withRetry(async () => {
      const result = await availabilityService.getUserAvailability(
        userId,
        month,
        year,
      );

      if (result.success && result.data) {
        // Cache calendar data
        await CacheService.set(
          `calendar_${userId}_${year}_${month}`,
          result.data,
        );
      }

      return result;
    });
  }

  async setAvailability(
    userId: string,
    date: string,
    isAvailable: boolean,
    timeSlots?: string[],
    notes?: string,
  ): Promise<ServiceResponse<Availability>> {
    return withRetry(async () => {
      const result = await availabilityService.setAvailability(
        userId,
        date,
        isAvailable,
        timeSlots,
        notes,
      );

      if (result.success && result.data) {
        // Clear calendar cache to force refresh
        const dateObj = new Date(date);
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        await CacheService.remove(`calendar_${userId}_${year}_${month}`);
      }

      return result;
    });
  }

  async deleteAvailability(
    userId: string,
    date: string,
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      const result = await availabilityService.deleteAvailability(userId, date);

      if (result.success) {
        // Clear calendar cache to force refresh
        const dateObj = new Date(date);
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        await CacheService.remove(`calendar_${userId}_${year}_${month}`);
      }

      return result;
    });
  }

  async updateUserAvailability(
    userId: string,
    year: number,
    month: number,
    availabilityData: Partial<Availability>[],
  ): Promise<ServiceResponse<boolean>> {
    return withRetry(async () => {
      const result = await availabilityService.updateUserAvailability(
        userId,
        year,
        month,
        availabilityData,
      );

      if (result.success) {
        // Clear calendar cache to force refresh
        await CacheService.remove(`calendar_${userId}_${year}_${month}`);
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

  subscribeToAvailability(
    userId: string,
    callback: (availability: Availability) => void,
  ) {
    return availabilityService.subscribeToAvailability(userId, callback);
  }

  // ============================================================================
  // POST RECOMMENDATIONS
  // ============================================================================

  async getRecommendedPosts(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedServiceResponse<Post[]>> {
    return withRetry(async () => {
      // Get current user ID
      const currentUser = await this.getCurrentUser();
      if (!currentUser.success || !currentUser.data) {
        return { 
          success: false, 
          error: "No authenticated user",
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false,
          }
        };
      }

      const currentUserId = currentUser.data.id;

      // Get recommended posts (excludes current user's posts)
      const result = await postsService.getRecommendedPosts(currentUserId, page, limit);

      if (result.success && result.data) {
        // Enrich posts with reaction information
        const enrichedPosts = await this.enrichPostsWithReactions(result.data as Post[], currentUserId);
        
        // Cache posts
        for (const post of enrichedPosts) {
          await CacheService.set(`post_${post.id}`, post);
        }

        return {
          ...result,
          data: enrichedPosts,
        };
      }

      return result;
    });
  }

  async getFollowingPosts(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedServiceResponse<Post[]>> {
    return withRetry(async () => {
      // Get current user ID
      const currentUser = await this.getCurrentUser();
      if (!currentUser.success || !currentUser.data) {
        return { 
          success: false, 
          error: "No authenticated user",
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false,
          }
        };
      }

      const currentUserId = currentUser.data.id;

      // Get following posts (includes current user's posts + liked users' posts)
      const result = await postsService.getFollowingPosts(currentUserId, page, limit);

      if (result.success && result.data) {
        // Enrich posts with reaction information
        const enrichedPosts = await this.enrichPostsWithReactions(result.data as Post[], currentUserId);
        
        // Cache posts
        for (const post of enrichedPosts) {
          await CacheService.set(`post_${post.id}`, post);
        }

        return {
          ...result,
          data: enrichedPosts,
        };
      }

      return result;
    });
  }

  /**
   * Enrich posts with user's reaction information
   */
  private async enrichPostsWithReactions(posts: Post[], userId: string): Promise<Post[]> {
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        // Get user's reaction if any
        const reactionResult = await postsService.getUserReaction(post.id, userId);
        
        return {
          ...post,
          // Keep legacy fields for backward compatibility
          likes: post.reactions_count || post.likes || 0,
          isLiked: !!reactionResult.data,
          // New fields
          reactions_count: post.reactions_count || 0,
          hasReacted: !!reactionResult.data,
        };
      })
    );

    return enrichedPosts;
  }

  /**
   * React to a post (thumbs-up)
   */
  async reactToPost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      const result = await postsService.reactToPost(postId, userId);
      
      if (result.success) {
        // Clear post cache to force refresh
        await CacheService.remove(`post_${postId}`);
      }

      return result;
    });
  }

  /**
   * Remove reaction from a post
   */
  async unreactToPost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      const result = await postsService.unreactToPost(postId, userId);
      
      if (result.success) {
        // Clear post cache to force refresh
        await CacheService.remove(`post_${postId}`);
      }

      return result;
    });
  }

  // ============================================================================
  // USER RECOMMENDATIONS
  // ============================================================================

  async getRecommendedUsers(
    userId: string,
    limit: number = 10,
  ): Promise<ServiceResponse<User[]>> {
    return withRetry(async () => {
      if (!userId) {
        return { success: false, error: "Invalid user ID provided" };
      }

      if (limit <= 0 || limit > 100) {
        return {
          success: false,
          error: "Invalid limit provided. Must be between 0 and 100",
        };
      }

      const { profileId: actualUserId, oppositeGender } =
        await this.prepareViewerContext(userId);

      if (!actualUserId) {
        return { success: false, error: `User not found: ${userId}` };
      }

      // Get users that the current user hasn't interacted with
      const { data: userLikes, error: likesError } = await supabase
        .from("user_likes")
        .select("liked_user_id")
        .eq("liker_user_id", actualUserId);

      if (likesError) {
        return { success: false, error: likesError.message };
      }

      const exclusionIds = new Set<string>();
      (userLikes || []).forEach((like) => {
        if (like?.liked_user_id) {
          exclusionIds.add(like.liked_user_id);
        }
      });
      exclusionIds.add(actualUserId);

      // Get recommended users (excluding interacted users)
      let query = supabase.from("profiles").select("*");

      if (oppositeGender) {
        query = query.eq("gender", oppositeGender);
      }

      exclusionIds.forEach((excludedId) => {
        if (excludedId) {
          query = query.neq("id", excludedId);
        }
      });

      const { data: users, error } = await query.limit(limit);

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
      const cached = await CacheService.get<UserProfile>(
        `user_profile_${userId}`,
      );
      if (cached) {
        return { success: true, data: cached };
      }

      // Get user data (this handles legacy ID mapping)
      const userResult = await this.getUser(userId);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: "User not found" };
      }

      const user = userResult.data;

      // Create UserProfile from User data
      const userProfile: UserProfile = {
        basic: {
          name: user.name,
          age: user.age?.toString() || "0",
          gender: user.gender,
          prefecture: user.prefecture,
          location: user.location,
          blood_type: user.blood_type || "",
          height: user.height || "",
          body_type: user.body_type || "",
          smoking: user.smoking || "",
          favorite_club: user.favorite_club,
          personality_type: user.personality_type,
        },
        golf: {
          skill_level: user.golf_skill_level,
          average_score: user.average_score?.toString() || "0",
          experience: user.golf_experience || "",
          best_score: user.best_score || "",
          transportation: user.transportation || "",
          play_fee: user.play_fee || "",
          available_days: user.available_days || "",
          round_fee: user.round_fee || "",
        },
        bio: user.bio || "",
        profile_pictures: user.profile_pictures,
        status: {
          is_verified: user.is_verified,
          last_login: user.last_login,
        },
        location: {
          prefecture: user.prefecture,
          transportation: user.transportation || "",
          play_fee: user.play_fee || "",
          available_days: user.available_days || "",
          round_fee: user.round_fee || "",
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

  async updateUserProfile(
    userId: string,
    profile: Partial<UserProfile>,
  ): Promise<ServiceResponse<UserProfile>> {
    return withRetry(async () => {
      console.log("📝 updateUserProfile called with userId:", userId);
      
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("❌ Auth error:", authError?.message || "No user");
        return {
          success: false,
          error: "User not authenticated. Please log in again.",
        };
      }
      
      console.log("✅ Authenticated user ID:", user.id);
      
      // Resolve the actual user ID (handle legacy IDs)
      let actualUserId = userId;
      
      // If userId is a legacy ID or "current_user", use authenticated user's ID
      if (userId === "current_user" || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        actualUserId = user.id;
        console.log("🔄 Resolved userId to authenticated user:", actualUserId);
      }
      
      // Verify the userId matches the authenticated user (security check)
      if (actualUserId !== user.id) {
        console.error("❌ Security error: Cannot update another user's profile");
        return {
          success: false,
          error: "Cannot update another user's profile",
        };
      }
      
      // Convert UserProfile to User updates
      const updates: Partial<User> = {};

      if (profile.basic) {
        if (profile.basic.name) updates.name = profile.basic.name;
        if (profile.basic.age) updates.age = Number(profile.basic.age);
        if (profile.basic.gender) updates.gender = profile.basic.gender as User["gender"];
        if (profile.basic.prefecture) updates.prefecture = profile.basic.prefecture;
        if (profile.basic.location) updates.location = profile.basic.location;
        if (profile.basic.blood_type) updates.blood_type = profile.basic.blood_type;
        if (profile.basic.height) updates.height = profile.basic.height;
        if (profile.basic.body_type) updates.body_type = profile.basic.body_type;
        if (profile.basic.smoking) updates.smoking = profile.basic.smoking;
        if (profile.basic.favorite_club) updates.favorite_club = profile.basic.favorite_club;
        if (profile.basic.personality_type) updates.personality_type = profile.basic.personality_type;
      }

      if (profile.golf) {
        if (profile.golf.skill_level) {
          updates.golf_skill_level = profile.golf.skill_level as User["golf_skill_level"];
        }
        if (profile.golf.average_score) {
          updates.average_score = Number(profile.golf.average_score);
        }
        if (profile.golf.experience) updates.golf_experience = profile.golf.experience;
        if (profile.golf.best_score) updates.best_score = profile.golf.best_score;
        if (profile.golf.transportation) updates.transportation = profile.golf.transportation;
        if (profile.golf.play_fee) updates.play_fee = profile.golf.play_fee;
        if (profile.golf.available_days) updates.available_days = profile.golf.available_days;
        if (profile.golf.round_fee) updates.round_fee = profile.golf.round_fee;
      }

      if (typeof profile.bio === "string") {
        updates.bio = profile.bio;
      }

      if (profile.profile_pictures) {
        updates.profile_pictures = profile.profile_pictures;
      }

      if (profile.status) {
        if (profile.status.is_verified !== undefined) {
          updates.is_verified = profile.status.is_verified;
        }
        if (profile.status.last_login) {
          updates.last_login = profile.status.last_login;
        }
      }

      console.log("📊 Updates to apply:", Object.keys(updates).join(", "));

      // Update the user
      const result = await profilesService.updateProfile(actualUserId, updates);

      if (!result.success) {
        console.error("❌ Profile update failed:", result.error);
        return {
          success: false,
          error: result.error || "Failed to update profile",
        };
      }

      console.log("✅ Profile updated successfully");

      // Clear cache
      await CacheService.remove(`user_${actualUserId}`);
      await CacheService.remove(`user_profile_${actualUserId}`);

      // Get updated profile
      return await this.getUserProfile(actualUserId);
    });
  }

  /**
   * Get user's online status and last active timestamp
   * @param userId - The user's profile ID (UUID)
   * @returns Object with isOnline boolean and lastActiveAt timestamp
   */
  async getUserOnlineStatus(userId: string): Promise<ServiceResponse<{ isOnline: boolean; lastActiveAt: string | null }>> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("last_active_at")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[SupabaseDataProvider] Error fetching online status:", error);
        return {
          success: false,
          error: error.message || "Failed to fetch online status",
        };
      }

      const lastActiveAt = data?.last_active_at || null;
      const now = new Date();
      const lastActiveDate = lastActiveAt ? new Date(lastActiveAt) : null;
      
      // Consider user online if active within last 5 minutes
      // Timestamps are stored in UTC, compare them directly (milliseconds are timezone-independent)
      const isOnline = lastActiveDate 
        ? (now.getTime() - lastActiveDate.getTime()) < 5 * 60 * 1000 
        : false;

      return {
        success: true,
        data: {
          isOnline,
          lastActiveAt,
        },
      };
    });
  }

  // ============================================================================
  // ADDITIONAL METHODS FOR COMPATIBILITY
  // ============================================================================

  async getUsers(filters?: SearchFilters, sortBy: "registration" | "recommended" = "recommended"): Promise<ServiceResponse<User[]>> {
    return withRetry(async () => {
      const { oppositeGender } = await this.prepareViewerContext();
      const appliedFilters: SearchFilters = {
        ...(filters || {}),
      };

      if (oppositeGender && !appliedFilters.gender) {
        appliedFilters.gender = oppositeGender;
      }

      const result = await profilesService.searchProfiles(
        appliedFilters,
        1,
        100,
        sortBy,
      );
      return {
        success: result.success,
        data: result.data as User[] | undefined,
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
        .from("posts")
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
        )
        .eq("legacy_id", id)
        .single();

      if (error && error.code !== "PGRST116") {
        // If not found by legacy ID, try by UUID
        const { data: postByUuid, error: uuidError } = await supabase
          .from("posts")
          .select(
            `
            *,
            user:profiles!posts_user_id_fkey(*)
          `,
          )
          .eq("id", id)
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

      return { success: false, error: "Post not found" };
    });
  }

  async getMessages(chatId: string): Promise<ServiceResponse<Message[]>> {
    return this.getChatMessages(chatId);
  }

  async getCurrentUserMessagePreviews(): Promise<
    ServiceResponse<MessagePreview[]>
  > {
    // Wrapper: derive userId from current session and call primary method
    const current = await this.getCurrentUser();
    if (!current.success || !current.data)
      return { success: false, error: "No authenticated user" };
    return this.getMessagePreviews(current.data!.id);
  }

  // duplicate sendMessage overload removed

  async getConnections(
    type?: "like" | "match",
  ): Promise<ServiceResponse<ConnectionItem[]>> {
    return withRetry(async () => {
      // Get current user first
      const currentUserResult = await this.getCurrentUser();
      if (!currentUserResult.success || !currentUserResult.data) {
        return { success: false, error: "No authenticated user" };
      }

      if (type === "match") {
        const matchesResult = await this.getMatches(currentUserResult.data!.id);
        if (!matchesResult.success || !matchesResult.data) {
          return { success: false, error: matchesResult.error };
        }

        const connections: ConnectionItem[] = (matchesResult.data || []).map(
          (match: any) => ({
            id: match.id,
            type: "match",
            profile:
              match.user1_id === currentUserResult.data!.id
                ? match.user2
                : match.user1,
            timestamp: match.matched_at,
          }),
        );

        return { success: true, data: connections };
      } else {
        const likesResult = await this.getLikesReceived(
          currentUserResult.data!.id,
        );
        if (!likesResult.success || !likesResult.data) {
          return { success: false, error: likesResult.error };
        }

        const connections: ConnectionItem[] = (likesResult.data || []).map(
          (like: any) => ({
            id: like.id,
            type: "like",
            profile: like.liker,
            timestamp: like.created_at,
          }),
        );

        return { success: true, data: connections };
      }
    });
  }

  async getConnectionStats(): Promise<
    ServiceResponse<{ likes: number; matches: number }>
  > {
    return withRetry(async () => {
      // Get current user first
      const currentUserResult = await this.getCurrentUser();
      if (!currentUserResult.success || !currentUserResult.data) {
        return { success: false, error: "No authenticated user" };
      }

      const [likesResult, matchesResult] = await Promise.all([
        this.getLikesReceived(currentUserResult.data!.id),
        this.getMatches(currentUserResult.data!.id),
      ]);

      return {
        success: true,
        data: {
          likes:
            likesResult.success && likesResult.data
              ? likesResult.data.length
              : 0,
          matches:
            matchesResult.success && matchesResult.data
              ? matchesResult.data.length
              : 0,
        },
      };
    });
  }

  async getCalendarData(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<ServiceResponse<CalendarData>> {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    return this.getUserAvailability(userId, currentMonth, currentYear);
  }

  async updateAvailability(
    userId: string,
    date: string,
    isAvailable: boolean,
  ): Promise<ServiceResponse<Availability>> {
    return this.setAvailability(userId, date, isAvailable);
  }

  async createPostWithData(postData: {
    text: string;
    images: string[];
    videos: string[];
    userId: string;
  }): Promise<ServiceResponse<Post>> {
    return this.createPost(
      postData.userId,
      postData.text,
      postData.images,
      postData.videos,
    );
  }

  async updatePost(
    postId: string,
    updates: { text?: string; images?: string[]; videos?: string[] },
  ): Promise<ServiceResponse<Post>> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from("posts")
        .update({
          content: updates.text,
          images: updates.images,
          videos: updates.videos,
        })
        .eq("id", postId)
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
        )
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

  async deletePost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    return withRetry(async () => {
      const result = await postsService.deletePost(postId, userId);
      
      if (result.success) {
        // Remove from cache
        await CacheService.remove(`post_${postId}`);
      }
      
      return result;
    });
  }

  async getUserInteractions(
    userId: string,
  ): Promise<ServiceResponse<UserLike[]>> {
    return this.getUserLikes(userId);
  }

  async getMutualLikes(userId: string): Promise<ServiceResponse<User[]>> {
    return withRetry(async () => {
      // Get users that the current user has liked
      const likedResult = await this.getUserLikes(userId);
      if (!likedResult.success) {
        return { success: false, error: likedResult.error };
      }

      const likedUserIds = (likedResult.data || []).map(
        (like) => like.liked_user_id,
      );

      // Get users who have liked the current user back
      const receivedLikesResult = await this.getLikesReceived(userId);
      if (!receivedLikesResult.success) {
        return { success: false, error: receivedLikesResult.error };
      }

      const mutualUserIds = (receivedLikesResult.data || [])
        .filter((like) => likedUserIds.includes(like.liker_user_id))
        .map((like) => like.liker_user_id);

      // Get user details for mutual likes
      const { data: users, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", mutualUserIds);

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
    await CacheService.remove(`user_${userId}`);
    await CacheService.remove(`user_profile_${userId}`);
    await CacheService.remove(`matches_${userId}`);
    await CacheService.remove(`message_previews_${userId}`);

    // Clear calendar cache for all months (approximate)
    for (let year = 2024; year <= 2026; year++) {
      for (let month = 1; month <= 12; month++) {
        await CacheService.remove(`calendar_${userId}_${year}_${month}`);
      }
    }
  }
}

// Export singleton instance
export const supabaseDataProvider = new SupabaseDataProvider();
export default supabaseDataProvider;
