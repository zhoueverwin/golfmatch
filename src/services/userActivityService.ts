import { UserListItem } from "../types/userActivity";
import { supabase } from "./supabase";
import { calculateAge } from "../utils/formatters";

/**
 * Service class for user activity operations (footprints and past likes)
 * Connects to Supabase database functions for real-time data
 */
export class UserActivityService {
  /**
   * Get footprints for a user (profile views)
   * Returns list of users who have viewed the given user's profile
   */
  static async getFootprints(userId: string): Promise<UserListItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_footprints', {
        target_user_id: userId
      });

      if (error) {
        console.error('[UserActivityService] Error fetching footprints:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform database response to UserListItem format
      // Calculate age dynamically from birth_date when available
      const footprints: UserListItem[] = data.map((item: any) => ({
        id: item.viewer_id,
        name: item.viewer_name || 'Unknown User',
        profileImage: item.viewer_profile_picture || '',
        age: item.viewer_birth_date ? calculateAge(item.viewer_birth_date) : (item.viewer_age || 0),
        birth_date: item.viewer_birth_date,
        location: item.viewer_prefecture || '',
        timestamp: item.viewed_at,
        type: 'footprint' as const,
        isNew: item.is_new ?? false,
      }));

      return footprints;
    } catch (error) {
      console.error('[UserActivityService] Exception in getFootprints:', error);
      return [];
    }
  }

  /**
   * Get past likes for a user (unreciprocated likes)
   * Returns list of users who liked the given user but were not liked back
   */
  static async getPastLikes(userId: string): Promise<UserListItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_past_likes', {
        target_user_id: userId
      });

      if (error) {
        console.error('[UserActivityService] Error fetching past likes:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform database response to UserListItem format
      // Calculate age dynamically from birth_date when available
      const pastLikes: UserListItem[] = data.map((item: any) => ({
        id: item.liker_id,
        name: item.liker_name || 'Unknown User',
        profileImage: item.liker_profile_picture || '',
        age: item.liker_birth_date ? calculateAge(item.liker_birth_date) : (item.liker_age || 0),
        birth_date: item.liker_birth_date,
        location: item.liker_prefecture || '',
        timestamp: item.liked_at,
        type: 'like' as const,
      }));

      return pastLikes;
    } catch (error) {
      console.error('[UserActivityService] Exception in getPastLikes:', error);
      return [];
    }
  }

  /**
   * Track a profile view
   * Records when a user views another user's profile
   * Automatically deduplicates views within 24 hours
   */
  static async trackProfileView(
    viewerId: string,
    viewedProfileId: string,
  ): Promise<boolean> {
    try {
      // Don't track self-views
      if (viewerId === viewedProfileId) {
        return false;
      }

      const { data, error } = await supabase.rpc('track_profile_view', {
        p_viewer_id: viewerId,
        p_viewed_profile_id: viewedProfileId
      });

      if (error) {
        console.error('[UserActivityService] Error tracking profile view:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('[UserActivityService] Exception in trackProfileView:', error);
      return false;
    }
  }

  /**
   * Get footprint count for a user
   * Returns the number of unique users who have viewed the profile
   */
  static async getFootprintCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_footprint_count', {
        target_user_id: userId
      });

      if (error) {
        console.error('[UserActivityService] Error fetching footprint count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('[UserActivityService] Exception in getFootprintCount:', error);
      return 0;
    }
  }

  /**
   * Get past likes count for a user
   * Returns the number of unreciprocated likes the user has received
   */
  static async getPastLikesCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_past_likes_count', {
        target_user_id: userId
      });

      if (error) {
        console.error('[UserActivityService] Error fetching past likes count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('[UserActivityService] Exception in getPastLikesCount:', error);
      return 0;
    }
  }

  /**
   * Mark footprints as viewed (all)
   * Updates the last_footprints_viewed_at timestamp for the user
   */
  static async markFootprintsViewed(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_footprints_viewed', {
        target_user_id: userId
      });

      if (error) {
        console.error('[UserActivityService] Error marking footprints viewed:', error);
      }
    } catch (error) {
      console.error('[UserActivityService] Exception in markFootprintsViewed:', error);
    }
  }

  /**
   * Mark a single footprint as viewed
   * Updates the viewed status for a specific footprint
   */
  static async markSingleFootprintViewed(userId: string, viewerId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_single_footprint_viewed', {
        target_user_id: userId,
        viewer_user_id: viewerId
      });

      if (error) {
        console.error('[UserActivityService] Error marking single footprint viewed:', error);
      }
    } catch (error) {
      console.error('[UserActivityService] Exception in markSingleFootprintViewed:', error);
    }
  }

  /**
   * Get new likes count for a user
   * Returns the number of likes received since last viewed
   */
  static async getNewLikesCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_new_likes_count', {
        target_user_id: userId
      });

      if (error) {
        console.error('[UserActivityService] Error fetching new likes count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('[UserActivityService] Exception in getNewLikesCount:', error);
      return 0;
    }
  }

  /**
   * Mark likes as viewed
   * Updates the last_likes_viewed_at timestamp for the user
   */
  static async markLikesViewed(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_likes_viewed', {
        target_user_id: userId
      });

      if (error) {
        console.error('[UserActivityService] Error marking likes viewed:', error);
      }
    } catch (error) {
      console.error('[UserActivityService] Exception in markLikesViewed:', error);
    }
  }
}

export default UserActivityService;
