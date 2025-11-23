import { supabase } from "../supabase";
import {
  Post,
  ServiceResponse,
  PaginatedServiceResponse,
} from "../../types/dataModels";

export class PostsService {
  async getPosts(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedServiceResponse<Post[]>> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Use "planned" count for better performance (exact count is slow for large tables)
      const { data, error, count } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
          { count: "planned" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        success: true,
        data: data as Post[],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: data && data.length === limit, // Simpler hasMore check
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch posts",
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedServiceResponse<Post[]>> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

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
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          };
        }

        actualUserId = profile.id;
      }

      // Use "planned" count for better performance (exact count is slow for large tables)
      const { data, error, count } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
          { count: "planned" },
        )
        .eq("user_id", actualUserId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        success: true,
        data: data as Post[],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: data && data.length === limit, // Simpler hasMore check
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch user posts",
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  async createPost(
    userId: string,
    content: string,
    images?: string[],
    videos?: string[],
  ): Promise<ServiceResponse<Post>> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content,
          images: images || [],
          videos: videos || [],
          likes_count: 0,
          comments_count: 0,
        })
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
        )
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as Post,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create post",
      };
    }
  }

  async likePost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    try {
      const { error: likeError } = await supabase.from("post_likes").upsert({
        post_id: postId,
        user_id: userId,
        type: "like",
      });

      if (likeError) throw likeError;

      const { error: updateError } = await supabase.rpc(
        "increment_post_likes",
        {
          post_id: postId,
        },
      );

      if (updateError) throw updateError;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to like post",
      };
    }
  }

  async unlikePost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    try {
      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .match({ post_id: postId, user_id: userId });

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase.rpc(
        "decrement_post_likes",
        {
          post_id: postId,
        },
      );

      if (updateError) throw updateError;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to unlike post",
      };
    }
  }

  async getPostLikes(postId: string): Promise<ServiceResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", postId);

      if (error) throw error;

      return {
        success: true,
        data: data.map((like) => like.user_id),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch post likes",
        data: [],
      };
    }
  }

  subscribeToPosts(callback: (post: Post) => void) {
    const subscription = supabase
      .channel("posts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        async (payload) => {
          const { data } = await supabase
            .from("posts")
            .select(
              `
              *,
              user:profiles!posts_user_id_fkey(*)
            `,
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            callback(data as Post);
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Get posts from users that the current user has liked (following)
   * Also includes the current user's own posts
   */
  async getFollowingPosts(
    currentUserId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedServiceResponse<Post[]>> {
    try {
      // Get users that current user has liked
      const { data: likedUsers, error: likesError } = await supabase
        .from("user_likes")
        .select("liked_user_id")
        .eq("liker_user_id", currentUserId)
        .in("type", ["like", "super_like"]);

      if (likesError) throw likesError;

      // Create array of user IDs (liked users + current user)
      const userIds = [
        currentUserId,
        ...(likedUsers?.map((like) => like.liked_user_id) || []),
      ];

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Use "planned" count for better performance (exact count is slow for large tables)
      const { data, error, count } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
          { count: "planned" },
        )
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        success: true,
        data: data as Post[],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: data && data.length === limit, // Simpler hasMore check
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch following posts",
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  /**
   * Get recommended posts (excludes current user's posts)
   */
  async getRecommendedPosts(
    currentUserId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedServiceResponse<Post[]>> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Use "planned" count for better performance (exact count is slow for large tables)
      const { data, error, count } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
          { count: "planned" },
        )
        .neq("user_id", currentUserId) // Exclude current user
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        success: true,
        data: data as Post[],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: data && data.length === limit, // Simpler hasMore check
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch recommended posts",
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  /**
   * Add a reaction (thumbs-up) to a post
   */
  async reactToPost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    try {
      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from("post_reactions")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      if (existingReaction) {
        // Already reacted, so remove it (toggle off)
        return await this.unreactToPost(postId, userId);
      } else {
        // Add new reaction (thumbs-up)
        const { error } = await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: userId,
        });

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to react to post",
      };
    }
  }

  /**
   * Remove a reaction from a post
   */
  async unreactToPost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to remove reaction",
      };
    }
  }

  /**
   * Check if user has reacted to a post
   */
  async getUserReaction(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from("post_reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      return {
        success: true,
        data: !!data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get user reaction",
        data: false,
      };
    }
  }

  /**
   * Delete a post (only by the post owner)
   */
  async deletePost(
    postId: string,
    userId: string,
  ): Promise<ServiceResponse<void>> {
    try {
      // First verify the user owns this post
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("user_id, images, videos")
        .eq("id", postId)
        .single();

      if (fetchError) {
        return {
          success: false,
          error: "Post not found",
        };
      }

      if (post.user_id !== userId) {
        return {
          success: false,
          error: "You can only delete your own posts",
        };
      }

      // Delete associated media files from storage if they exist
      const storageService = (await import("../storageService")).default;
      const mediaUrls = [...(post.images || []), ...(post.videos || [])];
      
      for (const mediaUrl of mediaUrls) {
        if (mediaUrl) {
          await storageService.deleteFile(mediaUrl);
        }
      }

      // Delete the post from database (this will cascade delete reactions and comments)
      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId); // Double-check ownership

      if (deleteError) throw deleteError;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to delete post",
      };
    }
  }
}

export const postsService = new PostsService();
