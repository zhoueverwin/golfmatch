// Re-export data models for convenience
export * from "./dataModels";
export * from "./auth";
import { User, SearchFilters } from "./dataModels";

// Matching and Likes Types
export interface Like {
  id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  last_message_at?: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "emoji";
  created_at: string;
  read_at?: string;
}

// Feed/Post Types
export interface Post {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

// Filter Types - using SearchFilters from dataModels.ts

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: { chatId: string; userId: string; userName: string; userImage: string };
  Profile: { userId: string };
  EditProfile: undefined;
  Settings: undefined;
  CalendarEdit: undefined;
  LinkAccount: undefined;
  TestAccountSetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Connections: undefined;
  Messages: undefined;
  MyPage: undefined;
};

// Component Props Types
export interface ProfileCardProps {
  profile: User;
  onLike: (userId: string) => void;
  onPass: (userId: string) => void;
  onSuperLike?: (userId: string) => void;
  onViewProfile: (userId: string) => void;
}

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}
