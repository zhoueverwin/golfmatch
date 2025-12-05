import { supabase } from "../supabase";
import {
  User,
  SearchFilters,
  ServiceResponse,
  PaginatedServiceResponse,
} from "../../types/dataModels";
import { AGE_DECADES } from "../../constants/filterOptions";

export class ProfilesService {
  async getProfile(userId: string): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as User,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch profile",
      };
    }
  }

  async getProfileByLegacyId(legacyId: string): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("legacy_id", legacyId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as User,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch profile",
      };
    }
  }

  async getProfileByEmail(email: string): Promise<ServiceResponse<User>> {
    try {
      // First get the auth user by email
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;
      
      const authUser = authUsers.users.find(u => u.email === email);
      
      if (!authUser) {
        return {
          success: false,
          error: `User with email ${email} not found`,
        };
      }

      // Now get the profile using user_id
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as User,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch profile by email",
      };
    }
  }

  async searchProfiles(
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: "registration" | "recommended" = "recommended",
  ): Promise<PaginatedServiceResponse<User[]>> {
    try {
      let query = supabase.from("profiles").select("*", { count: "exact" });

      // Prefecture filter
      if (filters.prefecture) {
        query = query.eq("prefecture", filters.prefecture);
      }

      // Golf skill level filter
      if (filters.golf_skill_level) {
        query = query.eq("golf_skill_level", filters.golf_skill_level);
      }

      // Gender filter (used to enforce opposite-gender matching)
      if (filters.gender) {
        query = query.eq("gender", filters.gender);
      }

      // Age decade filter - handle multiple decades correctly
      if (filters.age_decades && filters.age_decades.length > 0) {
        // If only one decade selected, use simple range
        if (filters.age_decades.length === 1) {
          const decade = filters.age_decades[0];
          const decadeOption = AGE_DECADES.find((d) => d.value === decade);
          if (decadeOption) {
            query = query.gte("age", decadeOption.ageMin).lte("age", decadeOption.ageMax);
          }
        } else {
          // Multiple decades selected - use .or() to match any of the selected decades
          // Format: .or("(age.gte.20,age.lte.29),(age.gte.30,age.lte.39)")
          const orConditions = filters.age_decades
            .map((decade) => {
              const decadeOption = AGE_DECADES.find((d) => d.value === decade);
              if (decadeOption) {
                // Group each age range with parentheses
                return `(age.gte.${decadeOption.ageMin},age.lte.${decadeOption.ageMax})`;
              }
              return null;
            })
            .filter((condition): condition is string => condition !== null);
          
          if (orConditions.length > 0) {
            query = query.or(orConditions.join(","));
          }
        }
      }

      // Average score filter (maximum)
      if (filters.average_score_max !== undefined) {
        query = query.lte("average_score", filters.average_score_max);
      }

      // Last login filter (days)
      if (filters.last_login_days !== undefined && filters.last_login_days !== null) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filters.last_login_days);
        query = query.gte("last_login", cutoffDate.toISOString());
      }

      // Sorting: by registration date (newest first) for "登録順" tab
      if (sortBy === "registration") {
        query = query.order("created_at", { ascending: false });
      }
      // For "recommended", no explicit ordering is needed (database default or custom logic)

      // Pagination
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
          hasMore: (count || 0) > page * limit,
        },
      };
    } catch (error: any) {
      console.error("❌ searchProfiles error:", error);
      return {
        success: false,
        error: error.message || "Failed to search profiles",
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
   * Get intelligent recommendations using scoring algorithm
   * Replaces simple exclusion-based recommendations with multi-factor scoring
   * @param userId - Current user ID
   * @param limit - Number of results to return
   * @param offset - Pagination offset
   * @returns Ranked list of recommended users with scores
   */
  async getIntelligentRecommendations(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedServiceResponse<User[]>> {
    try {
      console.log(`[ProfilesService] Getting intelligent recommendations for user ${userId}`);

      // Call PostgreSQL RPC function
      const { data, error } = await supabase.rpc('get_intelligent_recommendations', {
        p_current_user_id: userId,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        console.error('[ProfilesService] RPC error:', error);
        console.warn('[ProfilesService] RPC function not deployed yet - this is expected until database migration is run');

        // Temporary fallback: return empty array until migration is deployed
        return {
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        };
      }

      const users: User[] = (data || []) as User[];

      console.log(`[ProfilesService] Retrieved ${users.length} intelligent recommendations`);

      return {
        success: true,
        data: users,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: users.length,
          totalPages: 1,
          hasMore: users.length === limit,
        },
      };
    } catch (error: any) {
      console.error('[ProfilesService] Error in getIntelligentRecommendations:', error);

      // Fallback: Return empty array instead of failing
      return {
        success: false,
        error: error.message || 'Failed to fetch intelligent recommendations',
        data: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  async updateProfile(
    userId: string,
    updates: Partial<User>,
  ): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
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
        error: error.message || "Failed to update profile",
      };
    }
  }

  async getCurrentUserProfile(): Promise<ServiceResponse<User>> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: "No authenticated user",
        };
      }

      return this.getProfile(user.id);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch current user profile",
      };
    }
  }

  subscribeToProfile(userId: string, callback: (profile: User) => void) {
    const subscription = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as User);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Batch fetch multiple users by IDs
   * Much more efficient than fetching one by one
   */
  async getUsersByIds(userIds: string[]): Promise<ServiceResponse<User[]>> {
    try {
      if (userIds.length === 0) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .rpc('get_users_by_ids', { p_user_ids: userIds });

      if (error) throw error;

      return {
        success: true,
        data: (data || []) as User[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch users",
        data: [],
      };
    }
  }

  /**
   * Batch check online status for multiple users
   */
  async getUsersOnlineStatus(userIds: string[]): Promise<ServiceResponse<Map<string, boolean>>> {
    try {
      if (userIds.length === 0) {
        return { success: true, data: new Map() };
      }

      const { data, error } = await supabase
        .rpc('get_users_online_status', { p_user_ids: userIds });

      if (error) throw error;

      const statusMap = new Map<string, boolean>();
      for (const row of data || []) {
        statusMap.set(row.user_id, row.is_online);
      }

      return {
        success: true,
        data: statusMap,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch online status",
        data: new Map(),
      };
    }
  }
}

export const profilesService = new ProfilesService();
