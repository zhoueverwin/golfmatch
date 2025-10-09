import { supabase } from '../supabase';
import { User, SearchFilters, ServiceResponse, PaginatedServiceResponse } from '../../types/dataModels';

export class ProfilesService {
  async getProfile(userId: string): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as User,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch profile',
      };
    }
  }

  async getProfileByLegacyId(legacyId: string): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('legacy_id', legacyId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as User,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch profile',
      };
    }
  }

  async searchProfiles(
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedServiceResponse<User[]>> {
    try {
      let query = supabase.from('profiles').select('*', { count: 'exact' });

      if (filters.prefecture) {
        query = query.eq('prefecture', filters.prefecture);
      }

      if (filters.skill_level && filters.skill_level.length > 0) {
        query = query.in('golf_skill_level', filters.skill_level);
      }

      if (filters.age_min !== undefined) {
        query = query.gte('age', filters.age_min);
      }

      if (filters.age_max !== undefined) {
        query = query.lte('age', filters.age_max);
      }

      if (filters.gender) {
        query = query.eq('gender', filters.gender);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data as User[],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search profiles',
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as User,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update profile',
      };
    }
  }

  async getCurrentUserProfile(): Promise<ServiceResponse<User>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'No authenticated user',
        };
      }

      return this.getProfile(user.id);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch current user profile',
      };
    }
  }

  subscribeToProfile(userId: string, callback: (profile: User) => void) {
    const subscription = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as User);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const profilesService = new ProfilesService();
