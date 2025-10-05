// User activity data models for tracking footprints and likes

export type UserSummary = {
  id: string;             // Unique user ID
  name: string;           // Display name
  profileImage: string;   // URL to profile picture
  age?: number;           // User age
  location?: string;      // User location
};

export type FootprintEntry = {
  viewer: UserSummary;    // User who viewed the profile
  viewedAt: string;       // ISO timestamp of the view
};

export type LikeEntry = {
  liker: UserSummary;     // User who liked the profile
  likedAt: string;        // ISO timestamp of the like
};

export type UserActivity = {
  userId: string;                // The profile owner
  footprints: FootprintEntry[];  // List of all profile visitors
  pastLikes: LikeEntry[];        // List of all users who liked profile
};

// Modal/List display types
export type UserListItem = {
  id: string;
  name: string;
  profileImage: string;
  age?: number;
  location?: string;
  timestamp: string;
  type: 'footprint' | 'like';
};

