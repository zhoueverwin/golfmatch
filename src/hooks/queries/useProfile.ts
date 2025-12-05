import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataProvider } from '../../services';
import { User, UserProfile } from '../../types/dataModels';

export const useProfile = (userId: string | undefined) => {
  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Clear CacheService cache to ensure fresh data
      // Must clear both user_* and user_profile_* caches as they're used in different places
      const { default: CacheService } = await import('../../services/cacheService');
      await CacheService.remove(`user_${userId}`);
      await CacheService.remove(`user_profile_${userId}`);

      // Use getUserProfile to get the nested UserProfile structure
      const response = await DataProvider.getUserProfile(userId);

      if (!response.success || response.error) {
        throw new Error(response.error || 'Failed to fetch profile');
      }

      return response.data as UserProfile;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - reduced for faster updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId, // Only run query if userId is provided
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// Hook for current user profile
export const useCurrentUserProfile = () => {
  const query = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      // Clear CacheService cache to ensure fresh data
      const { default: CacheService } = await import('../../services/cacheService');
      await CacheService.remove('current_user');

      const response = await DataProvider.getCurrentUser();

      if (!response.success || response.error) {
        throw new Error(response.error || 'Failed to fetch current user profile');
      }

      return response.data as User;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - reduced for faster updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// Mutation hook for updating profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const response = await DataProvider.updateUserProfile(userId, updates);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update profile');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch profile queries
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
};

