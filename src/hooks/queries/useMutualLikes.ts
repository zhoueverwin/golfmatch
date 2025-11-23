import { useQuery, useQueries } from '@tanstack/react-query';
import { DataProvider } from '../../services';

// Hook for checking mutual likes for a single user pair
export const useMutualLikes = (currentUserId: string | undefined, targetUserId: string | undefined) => {
  const query = useQuery({
    queryKey: ['mutualLikes', currentUserId, targetUserId],
    queryFn: async () => {
      if (!currentUserId || !targetUserId) {
        return false;
      }

      const response = await DataProvider.checkMutualLikes(currentUserId, targetUserId);
      return response.success && response.data ? true : false;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - mutual likes don't change frequently
    gcTime: 30 * 60 * 1000,
    enabled: !!currentUserId && !!targetUserId,
  });

  return {
    hasMutualLikes: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

// Hook for batch checking mutual likes for multiple users
export const useBatchMutualLikes = (currentUserId: string | undefined, targetUserIds: string[]) => {
  // Remove duplicates to prevent duplicate queries warning
  const uniqueUserIds = Array.from(new Set(targetUserIds));
  
  const queries = useQueries({
    queries: uniqueUserIds.map((targetUserId) => ({
      queryKey: ['mutualLikes', currentUserId, targetUserId],
      queryFn: async () => {
        if (!currentUserId || !targetUserId) {
          return { userId: targetUserId, hasMutualLikes: false };
        }

        const response = await DataProvider.checkMutualLikes(currentUserId, targetUserId);
        return {
          userId: targetUserId,
          hasMutualLikes: response.success && response.data ? true : false,
        };
      },
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !!currentUserId && !!targetUserId,
    })),
  });

  // Convert array of query results to a map
  const mutualLikesMap: Record<string, boolean> = {};
  queries.forEach((query, index) => {
    if (query.data) {
      mutualLikesMap[uniqueUserIds[index]] = query.data.hasMutualLikes;
    }
  });

  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);

  return {
    mutualLikesMap,
    isLoading,
    isError,
  };
};

