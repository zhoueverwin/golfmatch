import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataProvider } from '../../services';
import { User } from '../../types/dataModels';

export const useProfile = (userId: string | undefined) => {
  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await DataProvider.getUserById(userId);

      if (!response.success || response.error) {
        throw new Error(response.error || 'Failed to fetch profile');
      }

      return response.data as User;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - profiles change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
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
      const response = await DataProvider.getCurrentUser();

      if (!response.success || response.error) {
        throw new Error(response.error || 'Failed to fetch current user profile');
      }

      return response.data as User;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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

