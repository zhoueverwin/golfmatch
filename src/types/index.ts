// User and Profile Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  location: string;
  prefecture: string;
  golf_skill_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  average_score?: number;
  bio?: string;
  profile_pictures: string[];
  is_verified: boolean;
  last_login: string;
  created_at: string;
  updated_at: string;
}

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
  message_type: 'text' | 'image' | 'emoji';
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

// Filter Types
export interface SearchFilters {
  age_min?: number;
  age_max?: number;
  gender?: 'male' | 'female' | 'all';
  prefecture?: string[];
  skill_level?: string[];
  average_score_max?: number;
  last_login_days?: number;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: { matchId: string; otherUserId: string };
  Profile: { userId: string };
  EditProfile: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Search: undefined;
  Likes: undefined;
  Matching: undefined;
  Messages: undefined;
  MyPage: undefined;
};

// Component Props Types
export interface ProfileCardProps {
  profile: Profile;
  onLike: (userId: string) => void;
  onPass: (userId: string) => void;
  onViewProfile: (userId: string) => void;
}

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}
