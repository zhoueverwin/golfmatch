// Core data models for the application

export interface User {
  id: string;
  legacy_id: string;
  user_id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  location: string;
  prefecture: string;
  golf_skill_level: "ビギナー" | "中級者" | "上級者" | "プロ";
  average_score?: number;
  bio?: string;
  profile_pictures: string[];
  is_verified: boolean;
  last_login: string;
  blood_type?: string;
  height?: string;
  body_type?: string;
  smoking?: string;
  favorite_club?: string;
  personality_type?: string;
  golf_experience?: string;
  best_score?: string;
  transportation?: string;
  play_fee?: string;
  available_days?: string;
  round_fee?: string;
  created_at: string;
  updated_at: string;
  // Interaction state (for UI)
  isLiked?: boolean;
  isSuperLiked?: boolean;
  isPassed?: boolean;
  interactionType?: InteractionType;
}

export interface Post {
  id: string;
  user_id: string;
  user: User;
  content: string;
  images: string[];
  videos?: string[];
  likes: number; // DEPRECATED: Use reactions_count for new functionality
  reactions_count?: number; // New: Total reaction count (thumbs-up)
  comments: number;
  timestamp: string;
  isLiked: boolean; // DEPRECATED: Use hasReacted for new functionality
  isSuperLiked: boolean; // DEPRECATED: Removed from UI
  hasReacted?: boolean; // New: Whether current user has reacted (thumbs-up)
  created_at: string;
  updated_at: string;
}

// Post reactions are simple thumbs-up (no type needed)
export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

// Reaction types for posts (simplified to just thumbs-up)
export type ReactionType = 'nice' | 'good_job' | 'helpful' | 'inspiring';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  timestamp: string;
  isFromUser: boolean;
  isRead: boolean;
  type: "text" | "image" | "emoji" | "video";
  imageUri?: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  participants: string[]; // User IDs
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessagePreview {
  id: string;
  userId: string;
  name: string;
  profileImage: string;
  lastMessage: string;
  timestamp: string;
  isUnread: boolean;
  unreadCount: number;
}

export interface ConnectionItem {
  id: string;
  type: "like" | "match";
  profile: User;
  timestamp: string;
  isNew?: boolean;
}

export interface SearchFilters {
  // Age filtering by decade (e.g., [20, 30] for 20代 and 30代)
  age_decades?: number[];
  // Converted age range (computed from age_decades)
  age_min?: number;
  age_max?: number;
  // Single prefecture selection
  prefecture?: string;
  // Single skill level selection
  golf_skill_level?: string;
  // Maximum average score (show users with score ≤ this value)
  average_score_max?: number;
  // Last login within X days
  last_login_days?: number | null;
}

export interface UserProfile {
  basic: {
    name: string;
    age: string;
    gender?: string;
    prefecture: string;
    location?: string;
    blood_type: string;
    height: string;
    body_type: string;
    smoking: string;
    favorite_club?: string;
    personality_type?: string;
  };
  golf: {
    experience: string;
    skill_level: string;
    average_score: string;
    best_score?: string;
    transportation: string;
    play_fee: string;
    available_days: string;
    round_fee?: string;
  };
  bio: string;
  profile_pictures: string[];
  status?: {
    is_verified: boolean;
    last_login: string;
  };
  location?: {
    prefecture: string;
    transportation: string;
    play_fee: string;
    available_days: string;
    round_fee: string;
  };
}

export interface Availability {
  id: string;
  user_id: string;
  date: string;
  is_available: boolean;
  time_slots?: string[];
  notes?: string;
}

export interface CalendarData {
  year: number;
  month: number;
  days: Availability[];
}

// User Interaction Types
export type InteractionType = "like" | "super_like" | "pass";

export interface UserLike {
  id: string;
  liker_user_id: string;
  liked_user_id: string;
  type: InteractionType;
  created_at: string;
  updated_at: string;
}

export interface UserInteraction {
  userId: string;
  type: InteractionType;
  timestamp: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  success: boolean;
  message?: string;
  error?: string;
}

// Service response types
export interface ServiceResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  loading?: boolean;
}

export interface PaginatedServiceResponse<T> {
  success?: boolean;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasMore: boolean;
  };
  error?: string;
  loading?: boolean;
}

// Contact Inquiry Types
export interface ContactReply {
  id: string;
  inquiry_id: string;
  reply_message: string;
  from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

export interface ContactInquiry {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'pending' | 'replied' | 'closed';
  created_at: string;
  replied_at: string | null;
  updated_at: string;
  replies?: ContactReply[];
  unread_reply_count?: number;
}
