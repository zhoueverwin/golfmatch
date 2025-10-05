// User Interaction Service
// Manages user likes, passes, and super likes with proper state management

import { User, UserLike, InteractionType } from '../types/dataModels';
import DataProvider from './dataProvider';

export interface UserInteractionState {
  likedUsers: Set<string>;
  passedUsers: Set<string>;
  superLikedUsers: Set<string>;
  loading: boolean;
  error: string | null;
}

export class UserInteractionService {
  private static instance: UserInteractionService;
  private state: UserInteractionState = {
    likedUsers: new Set(),
    passedUsers: new Set(),
    superLikedUsers: new Set(),
    loading: false,
    error: null,
  };
  private listeners: Set<(state: UserInteractionState) => void> = new Set();

  private constructor() {}

  static getInstance(): UserInteractionService {
    if (!UserInteractionService.instance) {
      UserInteractionService.instance = new UserInteractionService();
    }
    return UserInteractionService.instance;
  }

  // Subscribe to state changes
  subscribe(listener: (state: UserInteractionState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Update state and notify listeners
  private updateState(updates: Partial<UserInteractionState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  // Load user interactions from data provider
  async loadUserInteractions(userId: string): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });

      const response = await DataProvider.getUserInteractions(userId);
      
      if (response.error) {
        this.updateState({ error: response.error, loading: false });
        return;
      }

      const interactions = response.data || [];
      const likedUsers = new Set<string>();
      const passedUsers = new Set<string>();
      const superLikedUsers = new Set<string>();

      interactions.forEach(interaction => {
        switch (interaction.type) {
          case 'like':
            likedUsers.add(interaction.liked_user_id);
            break;
          case 'pass':
            passedUsers.add(interaction.liked_user_id);
            break;
          case 'super_like':
            superLikedUsers.add(interaction.liked_user_id);
            break;
        }
      });

      this.updateState({
        likedUsers,
        passedUsers,
        superLikedUsers,
        loading: false,
        error: null,
      });
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  }

  // Like a user
  async likeUser(likerUserId: string, likedUserId: string): Promise<boolean> {
    try {
      this.updateState({ loading: true, error: null });

      const response = await DataProvider.likeUser(likerUserId, likedUserId);
      
      if (response.error) {
        this.updateState({ error: response.error, loading: false });
        return false;
      }

      // Update local state
      const newLikedUsers = new Set(this.state.likedUsers);
      newLikedUsers.add(likedUserId);
      
      // Remove from other sets if present
      const newPassedUsers = new Set(this.state.passedUsers);
      const newSuperLikedUsers = new Set(this.state.superLikedUsers);
      newPassedUsers.delete(likedUserId);
      newSuperLikedUsers.delete(likedUserId);

      this.updateState({
        likedUsers: newLikedUsers,
        passedUsers: newPassedUsers,
        superLikedUsers: newSuperLikedUsers,
        loading: false,
        error: null,
      });

      return true;
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
      return false;
    }
  }

  // Super like a user
  async superLikeUser(likerUserId: string, likedUserId: string): Promise<boolean> {
    try {
      this.updateState({ loading: true, error: null });

      const response = await DataProvider.superLikeUser(likerUserId, likedUserId);
      
      if (response.error) {
        this.updateState({ error: response.error, loading: false });
        return false;
      }

      // Update local state
      const newSuperLikedUsers = new Set(this.state.superLikedUsers);
      newSuperLikedUsers.add(likedUserId);
      
      // Remove from other sets if present
      const newLikedUsers = new Set(this.state.likedUsers);
      const newPassedUsers = new Set(this.state.passedUsers);
      newLikedUsers.delete(likedUserId);
      newPassedUsers.delete(likedUserId);

      this.updateState({
        likedUsers: newLikedUsers,
        passedUsers: newPassedUsers,
        superLikedUsers: newSuperLikedUsers,
        loading: false,
        error: null,
      });

      return true;
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
      return false;
    }
  }

  // Pass a user
  async passUser(likerUserId: string, likedUserId: string): Promise<boolean> {
    try {
      this.updateState({ loading: true, error: null });

      const response = await DataProvider.passUser(likerUserId, likedUserId);
      
      if (response.error) {
        this.updateState({ error: response.error, loading: false });
        return false;
      }

      // Update local state
      const newPassedUsers = new Set(this.state.passedUsers);
      newPassedUsers.add(likedUserId);
      
      // Remove from other sets if present
      const newLikedUsers = new Set(this.state.likedUsers);
      const newSuperLikedUsers = new Set(this.state.superLikedUsers);
      newLikedUsers.delete(likedUserId);
      newSuperLikedUsers.delete(likedUserId);

      this.updateState({
        likedUsers: newLikedUsers,
        passedUsers: newPassedUsers,
        superLikedUsers: newSuperLikedUsers,
        loading: false,
        error: null,
      });

      return true;
    } catch (error) {
      this.updateState({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
      return false;
    }
  }

  // Apply interaction state to users
  applyInteractionState(users: User[]): User[] {
    return users.map(user => {
      const isLiked = this.state.likedUsers.has(user.id);
      const isPassed = this.state.passedUsers.has(user.id);
      const isSuperLiked = this.state.superLikedUsers.has(user.id);
      
      let interactionType: InteractionType | undefined;
      if (isLiked) interactionType = 'like';
      else if (isPassed) interactionType = 'pass';
      else if (isSuperLiked) interactionType = 'super_like';

      return {
        ...user,
        isLiked,
        isPassed,
        isSuperLiked,
        interactionType,
      };
    });
  }

  // Get current state
  getState(): UserInteractionState {
    return { ...this.state };
  }

  // Check if user is liked
  isUserLiked(userId: string): boolean {
    return this.state.likedUsers.has(userId);
  }

  // Check if user is passed
  isUserPassed(userId: string): boolean {
    return this.state.passedUsers.has(userId);
  }

  // Check if user is super liked
  isUserSuperLiked(userId: string): boolean {
    return this.state.superLikedUsers.has(userId);
  }

  // Get interaction type for user
  getUserInteractionType(userId: string): InteractionType | null {
    if (this.state.likedUsers.has(userId)) return 'like';
    if (this.state.passedUsers.has(userId)) return 'pass';
    if (this.state.superLikedUsers.has(userId)) return 'super_like';
    return null;
  }

  // Clear error
  clearError(): void {
    this.updateState({ error: null });
  }
}

// Export singleton instance
export const userInteractionService = UserInteractionService.getInstance();
