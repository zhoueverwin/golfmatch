import {
  UserActivity,
  FootprintEntry,
  LikeEntry,
  UserSummary,
  UserListItem,
} from "../types/userActivity";
import { DataProvider } from "./";

// Mock database for user activities
class UserActivityStore {
  private activities: Record<string, UserActivity> = {};

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize current user activity with some mock data
    this.activities["current_user"] = {
      userId: "current_user",
      footprints: [
        {
          viewer: {
            id: "1",
            name: "Mii",
            profileImage:
              "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
            age: 25,
            location: "群馬県",
          },
          viewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        },
        {
          viewer: {
            id: "2",
            name: "Yuki",
            profileImage:
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
            age: 28,
            location: "千葉県",
          },
          viewedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        },
        {
          viewer: {
            id: "3",
            name: "Sakura",
            profileImage:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
            age: 23,
            location: "東京都",
          },
          viewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        },
      ],
      pastLikes: [
        {
          liker: {
            id: "1",
            name: "Mii",
            profileImage:
              "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
            age: 25,
            location: "群馬県",
          },
          likedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        },
        {
          liker: {
            id: "2",
            name: "Yuki",
            profileImage:
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
            age: 28,
            location: "千葉県",
          },
          likedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        },
        {
          liker: {
            id: "4",
            name: "Aoi",
            profileImage:
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
            age: 26,
            location: "神奈川県",
          },
          likedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        },
      ],
    };
  }

  // Initialize a user activity record
  initUserActivity(userId: string): UserActivity {
    if (!this.activities[userId]) {
      this.activities[userId] = { userId, footprints: [], pastLikes: [] };
    }
    return this.activities[userId];
  }

  // Add footprint
  addFootprint(userId: string, viewer: UserSummary): void {
    const activity = this.initUserActivity(userId);
    activity.footprints.unshift({ viewer, viewedAt: new Date().toISOString() });
  }

  // Add past like
  addLike(userId: string, liker: UserSummary): void {
    const activity = this.initUserActivity(userId);
    activity.pastLikes.unshift({ liker, likedAt: new Date().toISOString() });
  }

  // Retrieve footprints
  getFootprints(userId: string): FootprintEntry[] {
    const activity = this.initUserActivity(userId);
    return activity.footprints;
  }

  // Retrieve past likes
  getPastLikes(userId: string): LikeEntry[] {
    const activity = this.initUserActivity(userId);
    return activity.pastLikes;
  }

  // Get footprints as user list items
  getFootprintsAsList(userId: string): UserListItem[] {
    const footprints = this.getFootprints(userId);
    return footprints.map((footprint) => ({
      id: footprint.viewer.id,
      name: footprint.viewer.name,
      profileImage: footprint.viewer.profileImage,
      age: footprint.viewer.age,
      location: footprint.viewer.location,
      timestamp: footprint.viewedAt,
      type: "footprint" as const,
    }));
  }

  // Get past likes as user list items
  getPastLikesAsList(userId: string): UserListItem[] {
    const likes = this.getPastLikes(userId);
    return likes.map((like) => ({
      id: like.liker.id,
      name: like.liker.name,
      profileImage: like.liker.profileImage,
      age: like.liker.age,
      location: like.liker.location,
      timestamp: like.likedAt,
      type: "like" as const,
    }));
  }
}

// Create singleton instance
const userActivityStore = new UserActivityStore();

// Service class for user activity operations
export class UserActivityService {
  // Simulate network delay
  private static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get footprints for a user
  static async getFootprints(userId: string): Promise<UserListItem[]> {
    await this.delay(300);
    return userActivityStore.getFootprintsAsList(userId);
  }

  // Get past likes for a user
  static async getPastLikes(userId: string): Promise<UserListItem[]> {
    await this.delay(300);
    return userActivityStore.getPastLikesAsList(userId);
  }

  // Add a footprint (when someone views a profile)
  static async addFootprint(
    userId: string,
    viewer: UserSummary,
  ): Promise<void> {
    await this.delay(100);
    userActivityStore.addFootprint(userId, viewer);
  }

  // Add a like (when someone likes a profile)
  static async addLike(userId: string, liker: UserSummary): Promise<void> {
    await this.delay(100);
    userActivityStore.addLike(userId, liker);
  }

  // Get footprint count
  static async getFootprintCount(userId: string): Promise<number> {
    await this.delay(100);
    return userActivityStore.getFootprints(userId).length;
  }

  // Get past likes count
  static async getPastLikesCount(userId: string): Promise<number> {
    await this.delay(100);
    return userActivityStore.getPastLikes(userId).length;
  }
}

export default UserActivityService;
