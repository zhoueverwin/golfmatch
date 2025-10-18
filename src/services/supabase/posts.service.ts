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

      const { data, error, count } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
          { count: "exact" },
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
          hasMore: (count || 0) > page * limit,
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

      const { data, error, count } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:profiles!posts_user_id_fkey(*)
        `,
          { count: "exact" },
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
          hasMore: (count || 0) > page * limit,
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
    type: "like" | "super_like" = "like",
  ): Promise<ServiceResponse<void>> {
    try {
      const { error: likeError } = await supabase.from("post_likes").upsert({
        post_id: postId,
        user_id: userId,
        type,
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
}

export const postsService = new PostsService();
