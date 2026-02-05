/**
 * React Query hooks for Golf Course search
 *
 * Provides:
 * - Course search with debouncing
 * - Popular courses query
 * - Single course query
 */

import { useQuery } from '@tanstack/react-query';
import { golfCourseService } from '../../services/golfCourseService';
import { GolfCourse } from '../../types';

// Query key factory
export const golfCourseKeys = {
  all: ['golfCourses'] as const,
  search: (query: string, prefecture?: string) => [...golfCourseKeys.all, 'search', query, prefecture] as const,
  detail: (id: string) => [...golfCourseKeys.all, 'detail', id] as const,
  popular: (prefecture?: string) => [...golfCourseKeys.all, 'popular', prefecture] as const,
};

interface UseSearchCoursesOptions {
  query: string;
  prefecture?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for searching golf courses
 *
 * Searches local database first, then Rakuten GORA API if needed.
 * Results are cached for future searches.
 *
 * @example
 * ```tsx
 * const { courses, isLoading } = useSearchCourses({
 *   query: 'Tokyo',
 *   prefecture: '東京',
 * });
 * ```
 */
export const useSearchCourses = ({
  query,
  prefecture,
  limit = 20,
  enabled = true,
}: UseSearchCoursesOptions) => {
  const result = useQuery({
    queryKey: golfCourseKeys.search(query, prefecture),
    queryFn: async () => {
      const response = await golfCourseService.searchCourses(query, prefecture, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search courses');
      }
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - course data doesn't change often
    gcTime: 60 * 60 * 1000, // 1 hour
    // Only search if query has at least 2 characters (or filtering by prefecture)
    enabled: enabled && (query.length >= 2 || !!prefecture),
    // Don't refetch on focus/reconnect since data is fairly static
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    courses: result.data || [],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  };
};

/**
 * Hook for fetching a single course by ID
 */
export const useCourse = (courseId: string, enabled = true) => {
  return useQuery({
    queryKey: golfCourseKeys.detail(courseId),
    queryFn: async () => {
      const response = await golfCourseService.getCourse(courseId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch course');
      }
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    enabled: !!courseId && enabled,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching popular courses
 *
 * Returns courses sorted by rating (evaluation).
 */
export const usePopularCourses = (prefecture?: string, limit = 10, enabled = true) => {
  const result = useQuery({
    queryKey: golfCourseKeys.popular(prefecture),
    queryFn: async () => {
      const response = await golfCourseService.getPopularCourses(prefecture, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch popular courses');
      }
      return response.data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    enabled,
    refetchOnWindowFocus: false,
  });

  return {
    courses: result.data || [],
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
  };
};
