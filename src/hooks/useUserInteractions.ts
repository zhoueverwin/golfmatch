// React hook for user interactions
// Provides easy access to user interaction state and methods

import { useState, useEffect, useCallback } from 'react';
import { User, InteractionType } from '../types/dataModels';
import { userInteractionService, UserInteractionState } from '../services/userInteractionService';

export const useUserInteractions = (userId: string) => {
  const [state, setState] = useState<UserInteractionState>(userInteractionService.getState());

  useEffect(() => {
    // Load initial interactions
    userInteractionService.loadUserInteractions(userId);

    // Subscribe to state changes
    const unsubscribe = userInteractionService.subscribe(setState);

    return unsubscribe;
  }, [userId]);

  const likeUser = useCallback(async (likedUserId: string): Promise<boolean> => {
    return await userInteractionService.likeUser(userId, likedUserId);
  }, [userId]);

  const superLikeUser = useCallback(async (likedUserId: string): Promise<boolean> => {
    return await userInteractionService.superLikeUser(userId, likedUserId);
  }, [userId]);

  const passUser = useCallback(async (likedUserId: string): Promise<boolean> => {
    return await userInteractionService.passUser(userId, likedUserId);
  }, [userId]);

  const applyInteractionState = useCallback((users: User[]): User[] => {
    return userInteractionService.applyInteractionState(users);
  }, []);

  const isUserLiked = useCallback((targetUserId: string): boolean => {
    return userInteractionService.isUserLiked(targetUserId);
  }, []);

  const isUserPassed = useCallback((targetUserId: string): boolean => {
    return userInteractionService.isUserPassed(targetUserId);
  }, []);

  const isUserSuperLiked = useCallback((targetUserId: string): boolean => {
    return userInteractionService.isUserSuperLiked(targetUserId);
  }, []);

  const getUserInteractionType = useCallback((targetUserId: string): InteractionType | null => {
    return userInteractionService.getUserInteractionType(targetUserId);
  }, []);

  const clearError = useCallback(() => {
    userInteractionService.clearError();
  }, []);

  return {
    // State
    loading: state.loading,
    error: state.error,
    likedUsers: state.likedUsers,
    passedUsers: state.passedUsers,
    superLikedUsers: state.superLikedUsers,
    
    // Methods
    likeUser,
    superLikeUser,
    passUser,
    applyInteractionState,
    isUserLiked,
    isUserPassed,
    isUserSuperLiked,
    getUserInteractionType,
    clearError,
  };
};
