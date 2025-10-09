import { supabase } from '../supabase';
import { UserLike, InteractionType, ServiceResponse } from '../../types/dataModels';

export class MatchesService {
  async likeUser(
    likerUserId: string,
    likedUserId: string,
    type: InteractionType = 'like'
  ): Promise<ServiceResponse<{ matched: boolean }>> {
    try {
      const { error } = await supabase
        .from('user_likes')
        .upsert({
          liker_user_id: likerUserId,
          liked_user_id: likedUserId,
          type,
        });

      if (error) throw error;

      const { data: mutualLike } = await supabase
        .from('user_likes')
        .select('*')
        .eq('liker_user_id', likedUserId)
        .eq('liked_user_id', likerUserId)
        .in('type', ['like', 'super_like'])
        .single();

      const matched = !!mutualLike;

      return {
        success: true,
        data: { matched },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to like user',
        data: { matched: false },
      };
    }
  }

  async getUserLikes(userId: string): Promise<ServiceResponse<UserLike[]>> {
    try {
      // First, try to resolve the user ID (handle legacy IDs)
      let actualUserId = userId;
      
      // If userId is not a UUID, try to find it by legacy_id
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
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
        
        actualUserId = profile.id;
      }

      const { data, error } = await supabase
        .from('user_likes')
        .select('*')
        .eq('liker_user_id', actualUserId);

      if (error) throw error;

      return {
        success: true,
        data: data as UserLike[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user likes',
        data: [],
      };
    }
  }

  async getMatches(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          user1:profiles!matches_user1_id_fkey(*),
          user2:profiles!matches_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('is_active', true)
        .order('matched_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch matches',
        data: [],
      };
    }
  }

  async checkMatch(user1Id: string, user2Id: string): Promise<ServiceResponse<boolean>> {
    try {
      const [id1, id2] = [user1Id, user2Id].sort();
      
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('user1_id', id1)
        .eq('user2_id', id2)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        success: true,
        data: !!data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check match',
        data: false,
      };
    }
  }

  async getLikesReceived(userId: string): Promise<ServiceResponse<UserLike[]>> {
    try {
      // First, try to resolve the user ID (handle legacy IDs)
      let actualUserId = userId;
      
      // If userId is not a UUID, try to find it by legacy_id
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
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
        
        actualUserId = profile.id;
      }

      const { data, error } = await supabase
        .from('user_likes')
        .select(`
          *,
          liker:profiles!user_likes_liker_user_id_fkey(*)
        `)
        .eq('liked_user_id', actualUserId)
        .in('type', ['like', 'super_like']);

      if (error) throw error;

      return {
        success: true,
        data: data as UserLike[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch received likes',
        data: [],
      };
    }
  }

  subscribeToMatches(userId: string, callback: (match: any) => void) {
    const subscription = supabase
      .channel(`matches:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('matches')
            .select(`
              *,
              user1:profiles!matches_user1_id_fkey(*),
              user2:profiles!matches_user2_id_fkey(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user2_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('matches')
            .select(`
              *,
              user1:profiles!matches_user1_id_fkey(*),
              user2:profiles!matches_user2_id_fkey(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const matchesService = new MatchesService();
