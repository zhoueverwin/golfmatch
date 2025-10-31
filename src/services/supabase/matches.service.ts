import { supabase } from "../supabase";
import {
  UserLike,
  InteractionType,
  ServiceResponse,
} from "../../types/dataModels";

export class MatchesService {
  async likeUser(
    likerUserId: string,
    likedUserId: string,
    type: InteractionType = "like",
  ): Promise<ServiceResponse<{ matched: boolean }>> {
    try {
      // Derive liker from current auth session to satisfy RLS (profiles.user_id = auth.uid())
      let actualLikerUserId = likerUserId;
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUserId = authData?.user?.id;
        if (authUserId) {
          // Map auth user -> profile UUID
          const { data: selfProfile, error: selfErr } = await supabase
            .from("profiles")
            .select("id, user_id")
            .eq("user_id", authUserId)
            .single();
          if (!selfErr && selfProfile?.id) {
            actualLikerUserId = selfProfile.id;
          }
        }
      } catch (_e) {
        // Ignore; fallback to provided likerUserId
      }

      // Then resolve the user IDs (handle legacy IDs for liked user / fallback cases)
      // Note: if actualLikerUserId is not a UUID, attempt legacy_id mapping
      let actualLikedUserId = likedUserId;

      // If actualLikerUserId is not a UUID, try to find it by legacy_id
      if (
        !actualLikerUserId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        const { data: likerProfile, error: likerError } = await supabase
          .from("profiles")
          .select("id")
          .eq("legacy_id", actualLikerUserId)
          .single();

        if (likerError || !likerProfile) {
          return {
            success: false,
            error: `Liker user not found: ${actualLikerUserId}`,
          };
        }

        actualLikerUserId = likerProfile.id;
      }

      // If likedUserId is not a UUID, try to find it by legacy_id
      if (
        !likedUserId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        const { data: likedProfile, error: likedError } = await supabase
          .from("profiles")
          .select("id")
          .eq("legacy_id", likedUserId)
          .single();

        if (likedError || !likedProfile) {
          return {
            success: false,
            error: `Liked user not found: ${likedUserId}`,
          };
        }

        actualLikedUserId = likedProfile.id;
      }

      console.log("[likeUser] auth-mapped liker:", actualLikerUserId, "liked:", actualLikedUserId, "type:", type);
      const { error } = await supabase.from("user_likes").upsert(
        {
          liker_user_id: actualLikerUserId,
          liked_user_id: actualLikedUserId,
          type,
          is_active: true,
          deleted_at: null,
        },
        {
          onConflict: "liker_user_id,liked_user_id",
          ignoreDuplicates: false, // Update if exists
        }
      );

      if (error) {
        console.error("[likeUser] upsert error:", error);
        throw error;
      }

      const { data: mutualLike } = await supabase
        .from("user_likes")
        .select("*")
        .eq("liker_user_id", actualLikedUserId)
        .eq("liked_user_id", actualLikerUserId)
        .eq("type", "like")
        .eq("is_active", true)
        .single();

      const matched = !!mutualLike;

      if (matched) {
        const [id1, id2] = [actualLikerUserId, actualLikedUserId].sort();
        // Try to create a match; ignore unique conflicts
        const { error: matchError } = await supabase.from("matches").insert({
          user1_id: id1,
          user2_id: id2,
          is_active: true,
          matched_at: new Date().toISOString(),
          seen_by_user1: false,
          seen_by_user2: false,
        });
        if (matchError && matchError.code !== "23505") {
          // Unique violation code in Postgres; ignore
          console.warn("Failed to insert match:", matchError.message);
        }
      }

      return {
        success: true,
        data: { matched },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to like user",
        data: { matched: false },
      };
    }
  }

  async undoLike(
    likerUserId: string,
    likedUserId: string,
  ): Promise<ServiceResponse<void>> {
    try {
      // Resolve legacy IDs
      let actualLikerUserId = likerUserId;
      let actualLikedUserId = likedUserId;
      if (
        !likerUserId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        const { data: likerProfile, error: likerError } = await supabase
          .from("profiles")
          .select("id")
          .eq("legacy_id", likerUserId)
          .single();
        if (likerError || !likerProfile)
          return {
            success: false,
            error: `Liker user not found: ${likerUserId}`,
          };
        actualLikerUserId = likerProfile.id;
      }
      if (
        !likedUserId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        const { data: likedProfile, error: likedError } = await supabase
          .from("profiles")
          .select("id")
          .eq("legacy_id", likedUserId)
          .single();
        if (likedError || !likedProfile)
          return {
            success: false,
            error: `Liked user not found: ${likedUserId}`,
          };
        actualLikedUserId = likedProfile.id;
      }

      const { error } = await supabase
        .from("user_likes")
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq("liker_user_id", actualLikerUserId)
        .eq("liked_user_id", actualLikedUserId)
        .eq("type", "like");
      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to undo like" };
    }
  }

  async unlikeUser(
    likerUserId: string,
    likedUserId: string,
  ): Promise<ServiceResponse<void>> {
    return this.undoLike(likerUserId, likedUserId);
  }

  async getUserLikes(userId: string): Promise<ServiceResponse<UserLike[]>> {
    try {
      // First, try to resolve the user ID (handle legacy IDs)
      let actualUserId = userId;

      // If userId is not a UUID, try to find it by legacy_id
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
          return {
            success: false,
            error: `User not found: ${userId}`,
            data: [],
          };
        }

        actualUserId = profile.id;
      }

      const { data, error } = await supabase
        .from("user_likes")
        .select("*")
        .eq("liker_user_id", actualUserId);

      if (error) throw error;

      return {
        success: true,
        data: data as UserLike[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch user likes",
        data: [],
      };
    }
  }

  async getMatches(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          user1:profiles!matches_user1_id_fkey(*),
          user2:profiles!matches_user2_id_fkey(*)
        `,
        )
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq("is_active", true)
        .order("matched_at", { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch matches",
        data: [],
      };
    }
  }

  async checkMatch(
    user1Id: string,
    user2Id: string,
  ): Promise<ServiceResponse<boolean>> {
    try {
      const [id1, id2] = [user1Id, user2Id].sort();

      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("user1_id", id1)
        .eq("user2_id", id2)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return {
        success: true,
        data: !!data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to check match",
        data: false,
      };
    }
  }

  /**
   * Check if two users have mutual likes (both liked each other)
   */
  async checkMutualLikes(
    user1Id: string,
    user2Id: string,
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Check if user1 liked user2
      const { data: like1, error: error1 } = await supabase
        .from("user_likes")
        .select("*")
        .eq("liker_user_id", user1Id)
        .eq("liked_user_id", user2Id)
        .eq("is_active", true)
        .in("type", ["like", "super_like"])
        .single();

      if (error1 && error1.code !== "PGRST116") {
        throw error1;
      }

      // Check if user2 liked user1
      const { data: like2, error: error2 } = await supabase
        .from("user_likes")
        .select("*")
        .eq("liker_user_id", user2Id)
        .eq("liked_user_id", user1Id)
        .eq("is_active", true)
        .in("type", ["like", "super_like"])
        .single();

      if (error2 && error2.code !== "PGRST116") {
        throw error2;
      }

      const hasMutualLikes = !!(like1 && like2);

      return {
        success: true,
        data: hasMutualLikes,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to check mutual likes",
        data: false,
      };
    }
  }

  async getLikesReceived(userId: string): Promise<ServiceResponse<UserLike[]>> {
    try {
      // First, try to resolve the user ID (handle legacy IDs)
      let actualUserId = userId;

      // If userId is not a UUID, try to find it by legacy_id
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
          return {
            success: false,
            error: `User not found: ${userId}`,
            data: [],
          };
        }

        actualUserId = profile.id;
      }

      const { data, error } = await supabase
        .from("user_likes")
        .select(
          `
          *,
          liker:profiles!user_likes_liker_user_id_fkey(*)
        `,
        )
        .eq("liked_user_id", actualUserId)
        .in("type", ["like", "super_like"]);

      if (error) throw error;

      return {
        success: true,
        data: data as UserLike[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch received likes",
        data: [],
      };
    }
  }

  /**
   * Get unseen matches for a user (matches where popup hasn't been shown yet)
   */
  async getUnseenMatches(
    userId: string,
  ): Promise<ServiceResponse<any[]>> {
    try {
      // Resolve legacy IDs
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
          return {
            success: false,
            error: `User not found: ${userId}`,
            data: [],
          };
        }

        actualUserId = profile.id;
      }

      // Query matches where user is participant and hasn't seen the popup
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          user1:profiles!matches_user1_id_fkey(id, name, profile_pictures),
          user2:profiles!matches_user2_id_fkey(id, name, profile_pictures)
        `,
        )
        .or(`user1_id.eq.${actualUserId},user2_id.eq.${actualUserId}`)
        .eq("is_active", true)
        .order("matched_at", { ascending: false });

      if (error) throw error;

      // Filter to only return matches where this user hasn't seen the popup
      const unseenMatches = (data || []).filter((match) => {
        if (match.user1_id === actualUserId) {
          return !match.seen_by_user1;
        } else if (match.user2_id === actualUserId) {
          return !match.seen_by_user2;
        }
        return false;
      });

      return {
        success: true,
        data: unseenMatches,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch unseen matches",
        data: [],
      };
    }
  }

  /**
   * Mark a match as seen by a specific user
   */
  async markMatchAsSeen(
    matchId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    try {
      // Resolve legacy IDs
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
          return {
            success: false,
            error: `User not found: ${userId}`,
          };
        }

        actualUserId = profile.id;
      }

      // Get the match to determine which user field to update
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .eq("id", matchId)
        .single();

      if (matchError || !match) {
        return {
          success: false,
          error: `Match not found: ${matchId}`,
        };
      }

      // Update the appropriate seen flag
      const updateField =
        match.user1_id === actualUserId ? "seen_by_user1" : "seen_by_user2";
      const { error: updateError } = await supabase
        .from("matches")
        .update({ [updateField]: true })
        .eq("id", matchId);

      if (updateError) throw updateError;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to mark match as seen",
      };
    }
  }

  subscribeToMatches(userId: string, callback: (match: any) => void) {
    const subscription = supabase
      .channel(`matches:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `user1_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("matches")
            .select(
              `
              *,
              user1:profiles!matches_user1_id_fkey(*),
              user2:profiles!matches_user2_id_fkey(*)
            `,
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `user2_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("matches")
            .select(
              `
              *,
              user1:profiles!matches_user1_id_fkey(*),
              user2:profiles!matches_user2_id_fkey(*)
            `,
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const matchesService = new MatchesService();
