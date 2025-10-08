// Centralized data provider for the application
// This will be easily replaceable with real API calls later

import { 
  User, 
  Post, 
  Message, 
  MessagePreview, 
  ConnectionItem, 
  SearchFilters,
  UserProfile,
  Availability,
  CalendarData,
  UserLike,
  UserInteraction,
  InteractionType,
  ServiceResponse,
  PaginatedServiceResponse
} from '../types/dataModels';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data storage
class MockDataStore {
  private userLikes: UserLike[] = [];
  private users: User[] = [
    {
      id: 'current_user',
      user_id: 'current_user',
      name: 'じょー',
      age: 25,
      gender: 'female',
      location: '東京都',
      prefecture: '東京都',
      golf_skill_level: 'intermediate',
      average_score: 95,
      bio: '現在のユーザーです。ゴルフを楽しんでいます！',
      profile_pictures: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'],
      is_verified: false,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '1',
      user_id: '1',
      name: 'Mii',
      age: 25,
      gender: 'female',
      location: '群馬県',
      prefecture: '群馬県',
      golf_skill_level: 'beginner',
      average_score: 120,
      bio: 'ゴルフ初心者です！一緒に楽しくプレイしましょう♪',
      profile_pictures: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'],
      is_verified: false,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: '2',
      name: 'Yuki',
      age: 28,
      gender: 'female',
      location: '千葉県',
      prefecture: '千葉県',
      golf_skill_level: 'intermediate',
      average_score: 95,
      bio: 'ゴルフ歴3年。一緒にラウンドしませんか？',
      profile_pictures: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'],
      is_verified: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      user_id: '3',
      name: 'Sakura',
      age: 23,
      gender: 'female',
      location: '東京都',
      prefecture: '東京都',
      golf_skill_level: 'beginner',
      average_score: 130,
      bio: '初めてのゴルフ！緊張するけど楽しみです♪',
      profile_pictures: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'],
      is_verified: false,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      user_id: '4',
      name: 'Aoi',
      age: 26,
      gender: 'female',
      location: '神奈川県',
      prefecture: '神奈川県',
      golf_skill_level: 'advanced',
      average_score: 85,
      bio: 'ゴルフ歴5年。上達したい方、一緒にプレイしましょう！',
      profile_pictures: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face'],
      is_verified: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  private posts: Post[] = [
    {
      id: 'current_user_post_1',
      user_id: 'current_user',
      user: this.users[0], // current_user is at index 0
      content: '今日は新しいゴルフクラブを試しました！ドライバーの飛距離が伸びて嬉しいです🏌️‍♀️',
      images: [
        'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1593111774240-d529f12cf4b8?w=400&h=400&fit=crop',
      ],
      videos: [],
      likes: 12,
      comments: 3,
      isLiked: false,
      isSuperLiked: false,
      timestamp: '2時間前',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'current_user_post_2',
      user_id: 'current_user',
      user: this.users[0], // current_user is at index 0
      content: '週末のゴルフ、誰か一緒にプレイしませんか？初心者でも大歓迎です！',
      images: [
        'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=400&h=400&fit=crop',
      ],
      videos: [],
      likes: 8,
      comments: 5,
      isLiked: true,
      isSuperLiked: false,
      timestamp: '1日前',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '1',
      user_id: '1',
      user: this.users[1], // Mii is at index 1
      content: '今日のラウンドは最高でした！天気も良くて、スコアも自己ベスト更新🎉',
      images: [
        'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1593111774240-d529f12cf4b8?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop',
      ],
      likes: 78,
      comments: 4,
      timestamp: '19時間前',
      isLiked: false,
      isSuperLiked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: '2',
      user: this.users[2], // Yuki is at index 2
      content: '新しいドライバーを試してみました！飛距離が20ヤード伸びた気がします😊',
      images: [
        'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1593111774240-d529f12cf4b8?w=400&h=400&fit=crop',
      ],
      likes: 45,
      comments: 2,
      timestamp: '1日前',
      isLiked: true,
      isSuperLiked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      user_id: '3',
      user: this.users[3], // Sakura is at index 3
      content: '初めてのゴルフ！緊張するけど楽しみです♪ 一緒にプレイしてくれる方いませんか？',
      images: [
        'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=400&h=400&fit=crop',
      ],
      likes: 23,
      comments: 8,
      timestamp: '2日前',
      isLiked: false,
      isSuperLiked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      user_id: '4',
      user: this.users[4], // Aoi is at index 4
      content: 'ゴルフ場の桜が満開でした🌸 こんな美しい景色の中でプレイできるなんて幸せです',
      images: [
        'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1593111774240-d529f12cf4b8?w=400&h=400&fit=crop',
      ],
      likes: 156,
      comments: 12,
      timestamp: '3日前',
      isLiked: true,
      isSuperLiked: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      user_id: '1',
      user: this.users[1], // Mii is at index 1
      content: 'パッティング練習中！コツをつかんできました💪',
      images: [
        'https://images.unsplash.com/photo-1587174486073-ae5e5cef1e30?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop',
      ],
      likes: 67,
      comments: 5,
      timestamp: '4日前',
      isLiked: false,
      isSuperLiked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  private messages: Message[] = [
    {
      id: '1',
      chat_id: 'chat_1',
      sender_id: '2',
      receiver_id: 'current_user',
      text: 'こんにちは！ゴルフ一緒にしませんか？',
      timestamp: '10:30',
      isFromUser: false,
      isRead: true,
      type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      chat_id: 'chat_1',
      sender_id: 'current_user',
      receiver_id: '2',
      text: 'こんにちは！ぜひ一緒にしましょう♪',
      timestamp: '10:32',
      isFromUser: true,
      isRead: true,
      type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      chat_id: 'chat_1',
      sender_id: '2',
      receiver_id: 'current_user',
      text: '今度の週末はどうですか？',
      timestamp: '10:33',
      isFromUser: false,
      isRead: true,
      type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      chat_id: 'chat_1',
      sender_id: 'current_user',
      receiver_id: '2',
      text: '週末は空いてます！どこかおすすめのコースありますか？',
      timestamp: '10:35',
      isFromUser: true,
      isRead: true,
      type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      chat_id: 'chat_1',
      sender_id: '2',
      receiver_id: 'current_user',
      text: '近くにいいコースがありますよ！',
      timestamp: '10:36',
      isFromUser: false,
      isRead: true,
      type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '6',
      chat_id: 'chat_1',
      sender_id: '2',
      receiver_id: 'current_user',
      text: '🔥',
      timestamp: '10:37',
      isFromUser: false,
      isRead: true,
      type: 'emoji',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '7',
      chat_id: 'chat_1',
      sender_id: 'current_user',
      receiver_id: '2',
      text: '楽しみです！',
      timestamp: '10:38',
      isFromUser: true,
      isRead: true,
      type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  private messagePreviews: MessagePreview[] = [
    {
      id: '1',
      userId: '2',
      name: 'Yuki',
      profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
      lastMessage: '近くにいいコースがありますよ！',
      timestamp: '10:36',
      isUnread: false,
      unreadCount: 0,
    },
    {
      id: '2',
      userId: '3',
      name: 'Sakura',
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
      lastMessage: '今度の週末はどうですか？',
      timestamp: '1日前',
      isUnread: true,
      unreadCount: 2,
    },
    {
      id: '3',
      userId: '4',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
      name: 'Aoi',
      lastMessage: 'ゴルフ一緒にしませんか？',
      timestamp: '2日前',
      isUnread: false,
      unreadCount: 0,
    },
  ];

  private connections: ConnectionItem[] = [
    {
      id: '1',
      type: 'like',
      profile: this.users[0],
      timestamp: '2時間前',
      isNew: true,
    },
    {
      id: '2',
      type: 'like',
      profile: this.users[1],
      timestamp: '5時間前',
      isNew: true,
    },
    {
      id: '3',
      type: 'match',
      profile: this.users[2],
      timestamp: '1日前',
      isNew: false,
    },
    {
      id: '4',
      type: 'match',
      profile: this.users[3],
      timestamp: '2日前',
      isNew: false,
    },
  ];

  private profileData: { [userId: string]: UserProfile } = {};

  constructor() {
    this.initializeProfileData();
  }

  private initializeProfileData() {
    this.profileData = {
      'current_user': {
        basic: {
          name: 'じょー',
          age: '20代後半',
          prefecture: '東京都',
          blood_type: 'A型',
          height: '160',
          body_type: '普通',
          smoking: '吸わない',
          favorite_club: 'アイアン',
          personality_type: 'ENFP - 広報運動家型',
        },
        golf: {
          experience: '3年',
          skill_level: 'intermediate',
          average_score: '95台',
          best_score: '88',
          transportation: '電車',
          play_fee: '割り勘',
          available_days: '週末',
          round_fee: '¥8000',
        },
        bio: 'じょーです。ゴルフを楽しんでいます！一緒にプレイしましょう♪',
        profile_pictures: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'],
        status: 'アクティブ',
        location: '東京都 20代後半',
      },
      '1': {
        basic: {
          name: 'Mii',
          age: '20代後半',
          prefecture: '群馬県',
          blood_type: 'A型',
          height: '153',
          body_type: '筋肉質',
          smoking: '吸わない',
          favorite_club: 'ドライバー',
          personality_type: 'ENFJ - 主人公型',
        },
        golf: {
          experience: '2年',
          skill_level: 'beginner',
          average_score: '100~110台',
          best_score: '93',
          transportation: 'その他',
          play_fee: '相手に出してほしい',
          available_days: '全日',
          round_fee: '¥14000',
        },
        bio: 'ゴルフとスノボと旅と美味しいご飯!\nエンジョイゴルファーです⛳\nよろしくお願いします😊\n最寄りから一本だったら電車で迎えます🚃\n10月中旬まで福岡います🙋‍♀️',
        profile_pictures: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'],
        status: 'アクティブ',
        location: '群馬県 20代後半',
      },
      // Add other users as needed
    };
  }

  private calendarData: { [userId: string]: { [key: string]: CalendarData } } = {
    'current_user': {
      '2025-10': {
        year: 2025,
        month: 10,
        days: [
          { id: 'current_user_1', user_id: 'current_user', date: '2025-10-01', is_available: true },
          { id: 'current_user_2', user_id: 'current_user', date: '2025-10-02', is_available: false },
          { id: 'current_user_3', user_id: 'current_user', date: '2025-10-03', is_available: true },
          { id: 'current_user_4', user_id: 'current_user', date: '2025-10-04', is_available: false },
          { id: 'current_user_5', user_id: 'current_user', date: '2025-10-05', is_available: true },
          { id: 'current_user_6', user_id: 'current_user', date: '2025-10-06', is_available: true },
          { id: 'current_user_7', user_id: 'current_user', date: '2025-10-07', is_available: false },
          { id: 'current_user_8', user_id: 'current_user', date: '2025-10-08', is_available: true },
          { id: 'current_user_9', user_id: 'current_user', date: '2025-10-09', is_available: false },
          { id: 'current_user_10', user_id: 'current_user', date: '2025-10-10', is_available: true },
          { id: 'current_user_11', user_id: 'current_user', date: '2025-10-11', is_available: true },
          { id: 'current_user_12', user_id: 'current_user', date: '2025-10-12', is_available: false },
          { id: 'current_user_13', user_id: 'current_user', date: '2025-10-13', is_available: true },
          { id: 'current_user_14', user_id: 'current_user', date: '2025-10-14', is_available: true },
          { id: 'current_user_15', user_id: 'current_user', date: '2025-10-15', is_available: false },
          { id: 'current_user_16', user_id: 'current_user', date: '2025-10-16', is_available: true },
          { id: 'current_user_17', user_id: 'current_user', date: '2025-10-17', is_available: false },
          { id: 'current_user_18', user_id: 'current_user', date: '2025-10-18', is_available: true },
          { id: 'current_user_19', user_id: 'current_user', date: '2025-10-19', is_available: true },
          { id: 'current_user_20', user_id: 'current_user', date: '2025-10-20', is_available: false },
          { id: 'current_user_21', user_id: 'current_user', date: '2025-10-21', is_available: true },
          { id: 'current_user_22', user_id: 'current_user', date: '2025-10-22', is_available: true },
          { id: 'current_user_23', user_id: 'current_user', date: '2025-10-23', is_available: false },
          { id: 'current_user_24', user_id: 'current_user', date: '2025-10-24', is_available: true },
          { id: 'current_user_25', user_id: 'current_user', date: '2025-10-25', is_available: true },
          { id: 'current_user_26', user_id: 'current_user', date: '2025-10-26', is_available: false },
          { id: 'current_user_27', user_id: 'current_user', date: '2025-10-27', is_available: true },
          { id: 'current_user_28', user_id: 'current_user', date: '2025-10-28', is_available: true },
          { id: 'current_user_29', user_id: 'current_user', date: '2025-10-29', is_available: false },
          { id: 'current_user_30', user_id: 'current_user', date: '2025-10-30', is_available: true },
          { id: 'current_user_31', user_id: 'current_user', date: '2025-10-31', is_available: true },
        ],
      },
      '2025-11': {
        year: 2025,
        month: 11,
        days: [
          { id: 'current_user_32', user_id: 'current_user', date: '2025-11-01', is_available: true },
          { id: 'current_user_33', user_id: 'current_user', date: '2025-11-02', is_available: false },
          { id: 'current_user_34', user_id: 'current_user', date: '2025-11-03', is_available: true },
          { id: 'current_user_35', user_id: 'current_user', date: '2025-11-04', is_available: true },
          { id: 'current_user_36', user_id: 'current_user', date: '2025-11-05', is_available: false },
          { id: 'current_user_37', user_id: 'current_user', date: '2025-11-06', is_available: true },
          { id: 'current_user_38', user_id: 'current_user', date: '2025-11-07', is_available: true },
          { id: 'current_user_39', user_id: 'current_user', date: '2025-11-08', is_available: false },
          { id: 'current_user_40', user_id: 'current_user', date: '2025-11-09', is_available: true },
          { id: 'current_user_41', user_id: 'current_user', date: '2025-11-10', is_available: true },
        ],
      },
    },
    '1': {
      '2025-10': {
        year: 2025,
        month: 10,
        days: [
          { id: '1', user_id: '1', date: '2025-10-05', is_available: false },
          { id: '2', user_id: '1', date: '2025-10-06', is_available: true },
          { id: '3', user_id: '1', date: '2025-10-07', is_available: false },
          { id: '4', user_id: '1', date: '2025-10-08', is_available: true },
          { id: '5', user_id: '1', date: '2025-10-09', is_available: false },
          { id: '6', user_id: '1', date: '2025-10-10', is_available: true },
          { id: '7', user_id: '1', date: '2025-10-11', is_available: false },
          { id: '8', user_id: '1', date: '2025-10-12', is_available: true },
          { id: '9', user_id: '1', date: '2025-10-13', is_available: true },
          { id: '10', user_id: '1', date: '2025-10-14', is_available: false },
          { id: '11', user_id: '1', date: '2025-10-15', is_available: true },
          { id: '12', user_id: '1', date: '2025-10-16', is_available: false },
          { id: '13', user_id: '1', date: '2025-10-17', is_available: true },
          { id: '14', user_id: '1', date: '2025-10-18', is_available: true },
          { id: '15', user_id: '1', date: '2025-10-19', is_available: false },
          { id: '16', user_id: '1', date: '2025-10-20', is_available: true },
          { id: '17', user_id: '1', date: '2025-10-21', is_available: false },
          { id: '18', user_id: '1', date: '2025-10-22', is_available: true },
          { id: '19', user_id: '1', date: '2025-10-23', is_available: true },
          { id: '20', user_id: '1', date: '2025-10-24', is_available: false },
          { id: '21', user_id: '1', date: '2025-10-25', is_available: true },
          { id: '22', user_id: '1', date: '2025-10-26', is_available: true },
          { id: '23', user_id: '1', date: '2025-10-27', is_available: false },
          { id: '24', user_id: '1', date: '2025-10-28', is_available: true },
          { id: '25', user_id: '1', date: '2025-10-29', is_available: false },
          { id: '26', user_id: '1', date: '2025-10-30', is_available: true },
          { id: '27', user_id: '1', date: '2025-10-31', is_available: true },
        ],
      },
      '2025-11': {
        year: 2025,
        month: 11,
        days: [
          { id: '28', user_id: '1', date: '2025-11-01', is_available: true },
          { id: '29', user_id: '1', date: '2025-11-02', is_available: false },
          { id: '30', user_id: '1', date: '2025-11-03', is_available: true },
          { id: '31', user_id: '1', date: '2025-11-04', is_available: false },
          { id: '32', user_id: '1', date: '2025-11-05', is_available: true },
          { id: '33', user_id: '1', date: '2025-11-06', is_available: true },
          { id: '34', user_id: '1', date: '2025-11-07', is_available: false },
          { id: '35', user_id: '1', date: '2025-11-08', is_available: true },
          { id: '36', user_id: '1', date: '2025-11-09', is_available: true },
          { id: '37', user_id: '1', date: '2025-11-10', is_available: false },
          { id: '38', user_id: '1', date: '2025-11-11', is_available: true },
          { id: '39', user_id: '1', date: '2025-11-12', is_available: false },
          { id: '40', user_id: '1', date: '2025-11-13', is_available: true },
          { id: '41', user_id: '1', date: '2025-11-14', is_available: true },
          { id: '42', user_id: '1', date: '2025-11-15', is_available: false },
          { id: '43', user_id: '1', date: '2025-11-16', is_available: true },
          { id: '44', user_id: '1', date: '2025-11-17', is_available: false },
          { id: '45', user_id: '1', date: '2025-11-18', is_available: true },
          { id: '46', user_id: '1', date: '2025-11-19', is_available: true },
          { id: '47', user_id: '1', date: '2025-11-20', is_available: false },
          { id: '48', user_id: '1', date: '2025-11-21', is_available: true },
          { id: '49', user_id: '1', date: '2025-11-22', is_available: true },
          { id: '50', user_id: '1', date: '2025-11-23', is_available: false },
          { id: '51', user_id: '1', date: '2025-11-24', is_available: true },
          { id: '52', user_id: '1', date: '2025-11-25', is_available: false },
          { id: '53', user_id: '1', date: '2025-11-26', is_available: true },
          { id: '54', user_id: '1', date: '2025-11-27', is_available: true },
          { id: '55', user_id: '1', date: '2025-11-28', is_available: false },
          { id: '56', user_id: '1', date: '2025-11-29', is_available: true },
          { id: '57', user_id: '1', date: '2025-11-30', is_available: true },
        ],
      },
    },
    '2': {
      '2025-10': {
        year: 2025,
        month: 10,
        days: [
        { id: '28', user_id: '2', date: '2025-10-05', is_available: true },
        { id: '29', user_id: '2', date: '2025-10-06', is_available: false },
        { id: '30', user_id: '2', date: '2025-10-07', is_available: true },
        { id: '31', user_id: '2', date: '2025-10-08', is_available: false },
        { id: '32', user_id: '2', date: '2025-10-09', is_available: true },
        { id: '33', user_id: '2', date: '2025-10-10', is_available: false },
        { id: '34', user_id: '2', date: '2025-10-11', is_available: true },
        { id: '35', user_id: '2', date: '2025-10-12', is_available: true },
        { id: '36', user_id: '2', date: '2025-10-13', is_available: false },
        { id: '37', user_id: '2', date: '2025-10-14', is_available: true },
        { id: '38', user_id: '2', date: '2025-10-15', is_available: false },
        { id: '39', user_id: '2', date: '2025-10-16', is_available: true },
        { id: '40', user_id: '2', date: '2025-10-17', is_available: false },
        { id: '41', user_id: '2', date: '2025-10-18', is_available: true },
        { id: '42', user_id: '2', date: '2025-10-19', is_available: true },
        { id: '43', user_id: '2', date: '2025-10-20', is_available: false },
        { id: '44', user_id: '2', date: '2025-10-21', is_available: true },
        { id: '45', user_id: '2', date: '2025-10-22', is_available: false },
        { id: '46', user_id: '2', date: '2025-10-23', is_available: true },
        { id: '47', user_id: '2', date: '2025-10-24', is_available: true },
        { id: '48', user_id: '2', date: '2025-10-25', is_available: false },
        { id: '49', user_id: '2', date: '2025-10-26', is_available: true },
        { id: '50', user_id: '2', date: '2025-10-27', is_available: false },
        { id: '51', user_id: '2', date: '2025-10-28', is_available: true },
        { id: '52', user_id: '2', date: '2025-10-29', is_available: true },
        { id: '53', user_id: '2', date: '2025-10-30', is_available: false },
        { id: '54', user_id: '2', date: '2025-10-31', is_available: true },
        ],
      },
    },
    '3': {
      '2025-10': {
        year: 2025,
        month: 10,
        days: [
        { id: '55', user_id: '3', date: '2025-10-05', is_available: false },
        { id: '56', user_id: '3', date: '2025-10-06', is_available: false },
        { id: '57', user_id: '3', date: '2025-10-07', is_available: false },
        { id: '58', user_id: '3', date: '2025-10-08', is_available: false },
        { id: '59', user_id: '3', date: '2025-10-09', is_available: false },
        { id: '60', user_id: '3', date: '2025-10-10', is_available: false },
        { id: '61', user_id: '3', date: '2025-10-11', is_available: false },
        { id: '62', user_id: '3', date: '2025-10-12', is_available: true },
        { id: '63', user_id: '3', date: '2025-10-13', is_available: true },
        { id: '64', user_id: '3', date: '2025-10-14', is_available: false },
        { id: '65', user_id: '3', date: '2025-10-15', is_available: false },
        { id: '66', user_id: '3', date: '2025-10-16', is_available: false },
        { id: '67', user_id: '3', date: '2025-10-17', is_available: false },
        { id: '68', user_id: '3', date: '2025-10-18', is_available: true },
        { id: '69', user_id: '3', date: '2025-10-19', is_available: true },
        { id: '70', user_id: '3', date: '2025-10-20', is_available: false },
        { id: '71', user_id: '3', date: '2025-10-21', is_available: false },
        { id: '72', user_id: '3', date: '2025-10-22', is_available: false },
        { id: '73', user_id: '3', date: '2025-10-23', is_available: false },
        { id: '74', user_id: '3', date: '2025-10-24', is_available: false },
        { id: '75', user_id: '3', date: '2025-10-25', is_available: true },
        { id: '76', user_id: '3', date: '2025-10-26', is_available: true },
        { id: '77', user_id: '3', date: '2025-10-27', is_available: false },
        { id: '78', user_id: '3', date: '2025-10-28', is_available: false },
        { id: '79', user_id: '3', date: '2025-10-29', is_available: false },
        { id: '80', user_id: '3', date: '2025-10-30', is_available: false },
        { id: '81', user_id: '3', date: '2025-10-31', is_available: true },
        ],
      },
    },
    '4': {
      '2025-10': {
        year: 2025,
        month: 10,
        days: [
        { id: '82', user_id: '4', date: '2025-10-05', is_available: true },
        { id: '83', user_id: '4', date: '2025-10-06', is_available: true },
        { id: '84', user_id: '4', date: '2025-10-07', is_available: false },
        { id: '85', user_id: '4', date: '2025-10-08', is_available: true },
        { id: '86', user_id: '4', date: '2025-10-09', is_available: true },
        { id: '87', user_id: '4', date: '2025-10-10', is_available: false },
        { id: '88', user_id: '4', date: '2025-10-11', is_available: true },
        { id: '89', user_id: '4', date: '2025-10-12', is_available: true },
        { id: '90', user_id: '4', date: '2025-10-13', is_available: false },
        { id: '91', user_id: '4', date: '2025-10-14', is_available: true },
        { id: '92', user_id: '4', date: '2025-10-15', is_available: true },
        { id: '93', user_id: '4', date: '2025-10-16', is_available: false },
        { id: '94', user_id: '4', date: '2025-10-17', is_available: true },
        { id: '95', user_id: '4', date: '2025-10-18', is_available: true },
        { id: '96', user_id: '4', date: '2025-10-19', is_available: false },
        { id: '97', user_id: '4', date: '2025-10-20', is_available: true },
        { id: '98', user_id: '4', date: '2025-10-21', is_available: true },
        { id: '99', user_id: '4', date: '2025-10-22', is_available: false },
        { id: '100', user_id: '4', date: '2025-10-23', is_available: true },
        { id: '101', user_id: '4', date: '2025-10-24', is_available: true },
        { id: '102', user_id: '4', date: '2025-10-25', is_available: false },
        { id: '103', user_id: '4', date: '2025-10-26', is_available: true },
        { id: '104', user_id: '4', date: '2025-10-27', is_available: true },
        { id: '105', user_id: '4', date: '2025-10-28', is_available: false },
        { id: '106', user_id: '4', date: '2025-10-29', is_available: true },
        { id: '107', user_id: '4', date: '2025-10-30', is_available: true },
        { id: '108', user_id: '4', date: '2025-10-31', is_available: false },
        ],
      },
    },
  };

  // Getters
  getUsers(): User[] {
    return [...this.users];
  }

  getPosts(): Post[] {
    return [...this.posts];
  }

  getMessages(chatId: string): Message[] {
    return this.messages.filter(msg => msg.chat_id === chatId);
  }

  getMessagePreviews(): MessagePreview[] {
    return [...this.messagePreviews];
  }

  getConnections(): ConnectionItem[] {
    return [...this.connections];
  }

  getCalendarData(userId: string, year?: number, month?: number): CalendarData | undefined {
    const userCalendarData = this.calendarData[userId];
    if (!userCalendarData) return undefined;
    
    if (year && month) {
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      return userCalendarData[key];
    }
    
    // Return first available month if no specific month requested
    const firstKey = Object.keys(userCalendarData)[0];
    return firstKey ? userCalendarData[firstKey] : undefined;
  }

  getUserById(id: string): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getPostById(id: string): Post | undefined {
    return this.posts.find(post => post.id === id);
  }

  addPost(post: Post): void {
    // Add to the beginning of the posts array (newest first)
    this.posts.unshift(post);
  }

  updatePost(postId: string, updates: Partial<Post>): Post | undefined {
    const postIndex = this.posts.findIndex(post => post.id === postId);
    if (postIndex === -1) return undefined;
    
    const updatedPost = {
      ...this.posts[postIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    this.posts[postIndex] = updatedPost;
    return updatedPost;
  }

  getProfileData(): { [userId: string]: UserProfile } {
    return this.profileData;
  }

  updateUserProfile(userId: string, profile: Partial<UserProfile>): void {
    // Update the profile data in the store
    if (this.profileData[userId]) {
      this.profileData[userId] = { ...this.profileData[userId], ...profile };
    }
  }

  // User Likes Methods
  addUserLike(userLike: UserLike): void {
    // Remove any existing interaction between these users
    this.userLikes = this.userLikes.filter(
      like => !(like.liker_user_id === userLike.liker_user_id && like.liked_user_id === userLike.liked_user_id)
    );
    // Add the new interaction
    this.userLikes.push(userLike);
  }

  getUserLikes(likerUserId: string): UserLike[] {
    return this.userLikes.filter(like => like.liker_user_id === likerUserId);
  }

  getUserLikedBy(likedUserId: string): UserLike[] {
    return this.userLikes.filter(like => like.liked_user_id === likedUserId);
  }

  getUserInteraction(likerUserId: string, likedUserId: string): UserLike | undefined {
    return this.userLikes.find(
      like => like.liker_user_id === likerUserId && like.liked_user_id === likedUserId
    );
  }

  getPassedUsers(likerUserId: string): string[] {
    return this.userLikes
      .filter(like => like.liker_user_id === likerUserId && like.type === 'pass')
      .map(like => like.liked_user_id);
  }

  getLikedUsers(likerUserId: string): string[] {
    return this.userLikes
      .filter(like => like.liker_user_id === likerUserId && (like.type === 'like' || like.type === 'super_like'))
      .map(like => like.liked_user_id);
  }

  getSuperLikedUsers(likerUserId: string): string[] {
    return this.userLikes
      .filter(like => like.liker_user_id === likerUserId && like.type === 'super_like')
      .map(like => like.liked_user_id);
  }

  // Apply interaction state to users
  applyInteractionState(users: User[], currentUserId: string): User[] {
    return users.map(user => {
      const interaction = this.getUserInteraction(currentUserId, user.id);
      if (interaction) {
        return {
          ...user,
          isLiked: interaction.type === 'like',
          isSuperLiked: interaction.type === 'super_like',
          isPassed: interaction.type === 'pass',
          interactionType: interaction.type,
        };
      }
      return user;
    });
  }
}

// Create singleton instance
const mockDataStore = new MockDataStore();

// Data Provider Class
export class DataProvider {
  // User Services
  static async getUsers(filters?: SearchFilters): Promise<ServiceResponse<User[]>> {
    try {
      await delay(500); // Simulate network delay
      
      let users = mockDataStore.getUsers();
      
      // Apply filters if provided
      if (filters) {
        users = users.filter(user => {
          if (filters.age_min && user.age < filters.age_min) return false;
          if (filters.age_max && user.age > filters.age_max) return false;
          if (filters.prefecture && user.prefecture !== filters.prefecture) return false;
          if (filters.golf_skill_level && user.golf_skill_level !== filters.golf_skill_level) return false;
          if (filters.average_score_min && (user.average_score || 0) < filters.average_score_min) return false;
          if (filters.average_score_max && (user.average_score || 0) > filters.average_score_max) return false;
          return true;
        });
      }
      
      return { data: users };
    } catch (_error) {
      return { error: 'Failed to fetch users' };
    }
  }

  static async getUserById(id: string): Promise<ServiceResponse<User>> {
    try {
      await delay(300);
      const user = mockDataStore.getUserById(id);
      
      if (!user) {
        return { error: 'User not found' };
      }
      
      return { data: user };
    } catch (_error) {
      return { error: 'Failed to fetch user' };
    }
  }

  // Post Services
  static async getPosts(page: number = 1, limit: number = 10): Promise<PaginatedServiceResponse<Post>> {
    try {
      await delay(400);
      const allPosts = mockDataStore.getPosts();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const posts = allPosts.slice(startIndex, endIndex);
      
      return {
        data: posts,
        pagination: {
          page,
          limit,
          total: allPosts.length,
          hasMore: endIndex < allPosts.length,
        },
      };
    } catch (_error) {
      return { error: 'Failed to fetch posts' };
    }
  }

  static async getRecommendedPosts(page: number = 1, limit: number = 10): Promise<PaginatedServiceResponse<Post>> {
    try {
      await delay(400);
      // For now, return all posts as recommended
      // In a real app, this would use an algorithm to recommend posts
      const allPosts = mockDataStore.getPosts();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const posts = allPosts.slice(startIndex, endIndex);
      
      return {
        data: posts,
        pagination: {
          page,
          limit,
          total: allPosts.length,
          hasMore: endIndex < allPosts.length,
        },
      };
    } catch (_error) {
      return { error: 'Failed to fetch recommended posts' };
    }
  }

  static async getFollowingPosts(page: number = 1, limit: number = 10): Promise<PaginatedServiceResponse<Post>> {
    try {
      await delay(400);
      // For now, return posts from users 2 and 4 as "following"
      // In a real app, this would filter by followed users
      const allPosts = mockDataStore.getPosts();
      const followingPosts = allPosts.filter(post => 
        post.user_id === '2' || post.user_id === '4'
      );
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const posts = followingPosts.slice(startIndex, endIndex);
      
      return {
        data: posts,
        pagination: {
          page,
          limit,
          total: followingPosts.length,
          hasMore: endIndex < followingPosts.length,
        },
      };
    } catch (_error) {
      return { error: 'Failed to fetch following posts' };
    }
  }

  static async getPostById(id: string): Promise<ServiceResponse<Post>> {
    try {
      await delay(300);
      const post = mockDataStore.getPostById(id);
      
      if (!post) {
        return { error: 'Post not found' };
      }
      
      return { data: post };
    } catch (_error) {
      return { error: 'Failed to fetch post' };
    }
  }

  static async getUserPosts(userId: string, page: number = 1, limit: number = 10): Promise<PaginatedServiceResponse<Post>> {
    try {
      await delay(400);
      const allPosts = mockDataStore.getPosts().filter(post => post.user_id === userId);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const posts = allPosts.slice(startIndex, endIndex);
      
      return {
        data: posts,
        pagination: {
          page,
          limit,
          total: allPosts.length,
          hasMore: endIndex < allPosts.length,
        },
      };
    } catch (_error) {
      return { error: 'Failed to fetch user posts' };
    }
  }

  // Message Services
  static async getMessages(chatId: string): Promise<ServiceResponse<Message[]>> {
    try {
      await delay(300);
      const messages = mockDataStore.getMessages(chatId);
      return { data: messages };
    } catch (_error) {
      return { error: 'Failed to fetch messages' };
    }
  }

  static async getMessagePreviews(): Promise<ServiceResponse<MessagePreview[]>> {
    try {
      await delay(300);
      const previews = mockDataStore.getMessagePreviews();
      return { data: previews };
    } catch (_error) {
      return { error: 'Failed to fetch message previews' };
    }
  }

  static async sendMessage(chatId: string, text: string, type: 'text' | 'image' | 'emoji' = 'text', imageUri?: string): Promise<ServiceResponse<Message>> {
    try {
      await delay(500);
      
      const newMessage: Message = {
        id: Date.now().toString(),
        chat_id: chatId,
        sender_id: 'current_user',
        receiver_id: 'other_user',
        text,
        timestamp: new Date().toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        isFromUser: true,
        isRead: false,
        type,
        imageUri,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // In a real app, this would be sent to the server
      // For now, we'll just return the message
      return { data: newMessage };
    } catch (_error) {
      return { error: 'Failed to send message' };
    }
  }

  // Connection Services
  static async getConnections(type?: 'like' | 'match'): Promise<ServiceResponse<ConnectionItem[]>> {
    try {
      await delay(300);
      let connections = mockDataStore.getConnections();
      
      if (type) {
        connections = connections.filter(conn => conn.type === type);
      }
      
      return { data: connections };
    } catch (_error) {
      return { error: 'Failed to fetch connections' };
    }
  }

  static async getConnectionStats(): Promise<ServiceResponse<{ likes: number; matches: number }>> {
    try {
      await delay(200);
      const connections = mockDataStore.getConnections();
      const likes = connections.filter(conn => conn.type === 'like').length;
      const matches = connections.filter(conn => conn.type === 'match').length;
      
      return { data: { likes, matches } };
    } catch (_error) {
      return { error: 'Failed to fetch connection stats' };
    }
  }

  // Profile Services
  static async getUserProfile(userId: string): Promise<ServiceResponse<UserProfile>> {
    try {
      await delay(300);
      const user = mockDataStore.getUserById(userId);
      
      if (!user) {
        return { error: 'User not found' };
      }
      
      // Get profile data from the store
      const profileData = mockDataStore.getProfileData();
      const userProfileData = profileData[userId] || profileData['current_user'];
      
      const profile: UserProfile = {
        basic: userProfileData.basic,
        golf: userProfileData.golf,
        bio: userProfileData.bio,
        profile_pictures: user.profile_pictures,
        status: userProfileData.status,
        location: userProfileData.location,
      };
      
      return { data: profile };
    } catch (_error) {
      return { error: 'Failed to fetch user profile' };
    }
  }

  static async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<ServiceResponse<UserProfile>> {
    try {
      await delay(800); // Simulate longer update time
      
      // Update the mock data store
      const user = mockDataStore.getUserById(userId);
      if (!user) {
        return { error: 'User not found' };
      }
      
      // Update the user's basic data
      if (profile.basic) {
        user.name = profile.basic.name;
        user.prefecture = profile.basic.prefecture;
        user.bio = profile.bio || user.bio;
        user.updated_at = new Date().toISOString();
      }
      
      // Update profile pictures
      if (profile.profile_pictures) {
        user.profile_pictures = profile.profile_pictures;
      }
      
      // Update the profile data in the store
      mockDataStore.updateUserProfile(userId, profile);
      
      // Return the updated profile
      const updatedProfile = await this.getUserProfile(userId);
      return updatedProfile;
    } catch (_error) {
      return { error: 'Failed to update user profile' };
    }
  }

  // Calendar Services
  static async getCalendarData(userId: string, year?: number, month?: number): Promise<ServiceResponse<CalendarData>> {
    try {
      await delay(300);
      const calendarData = mockDataStore.getCalendarData(userId, year, month);
      
      if (!calendarData) {
        // Return empty calendar data instead of error
        const emptyCalendarData: CalendarData = {
          year: year || 2025,
          month: month || 10,
          days: [],
        };
        return { data: emptyCalendarData };
      }
      
      return { data: calendarData };
    } catch (_error) {
      return { error: 'Failed to fetch calendar data' };
    }
  }

  static async updateAvailability(userId: string, date: string, isAvailable: boolean): Promise<ServiceResponse<Availability>> {
    try {
      await delay(500);
      
      // In a real app, this would update the database
      const availability: Availability = {
        id: Date.now().toString(),
        user_id: userId,
        date,
        is_available: isAvailable,
      };
      
      return { data: availability };
    } catch (_error) {
      return { error: 'Failed to update availability' };
    }
  }

  // Post Services
  static async createPost(postData: { text: string; images: string[]; videos: string[]; userId: string }): Promise<ServiceResponse<Post>> {
    try {
      await delay(800);
      
      // Get user data for the post
      const user = mockDataStore.getUserById(postData.userId);
      if (!user) {
        return { error: 'User not found' };
      }
      
      // Create new post
      const newPost: Post = {
        id: Date.now().toString(),
        user_id: postData.userId,
        user: user,
        content: postData.text,
        images: postData.images,
        videos: postData.videos,
        likes: 0,
        comments: 0,
        isLiked: false,
        isSuperLiked: false,
        timestamp: new Date().toLocaleDateString('ja-JP', { 
          month: 'numeric', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Add to mock data store
      mockDataStore.addPost(newPost);
      
      return { data: newPost };
    } catch (_error) {
      return { error: 'Failed to create post' };
    }
  }

  static async updatePost(postId: string, updates: { text?: string; images?: string[]; videos?: string[] }): Promise<ServiceResponse<Post>> {
    try {
      await delay(500);
      
      const updatedPost = mockDataStore.updatePost(postId, {
        ...updates,
        timestamp: new Date().toLocaleDateString('ja-JP', { 
          month: 'numeric', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
      });
      
      if (!updatedPost) {
        return { error: 'Post not found' };
      }
      
      return { data: updatedPost };
    } catch (_error) {
      return { error: 'Failed to update post' };
    }
  }

  // Availability methods
  static async getUserAvailability(userId: string, year: number, month: number): Promise<ServiceResponse<Availability[]>> {
    try {
      await delay(500);
      
      // Mock availability data
      const mockAvailability: Availability[] = [
        {
          id: '1',
          user_id: userId,
          date: `${year}-${month.toString().padStart(2, '0')}-15`,
          is_available: true,
          time_slots: ['09:00', '14:00'],
          notes: '午前と午後可能'
        },
        {
          id: '2',
          user_id: userId,
          date: `${year}-${month.toString().padStart(2, '0')}-20`,
          is_available: true,
          time_slots: ['10:00'],
          notes: '午前のみ'
        }
      ];
      
      return { data: mockAvailability };
    } catch (_error) {
      return { error: 'Failed to load availability' };
    }
  }

  static async updateUserAvailability(userId: string, year: number, month: number, availabilityData: Partial<Availability>[]): Promise<ServiceResponse<boolean>> {
    try {
      await delay(800);
      
      // Mock update - in real app, this would update the database
      console.log('Updating availability for user:', userId, 'year:', year, 'month:', month, 'data:', availabilityData);
      
      return { data: true };
    } catch (_error) {
      return { error: 'Failed to update availability' };
    }
  }

  // User Interaction Services
  static async likeUser(likerUserId: string, likedUserId: string): Promise<ServiceResponse<UserLike>> {
    try {
      // Input validation
      if (!likerUserId || !likedUserId) {
        return { error: 'Invalid user IDs provided' };
      }

      if (likerUserId === likedUserId) {
        return { error: 'Cannot like yourself' };
      }

      await delay(500);
      
      // Check if users exist
      const liker = mockDataStore.getUserById(likerUserId);
      const liked = mockDataStore.getUserById(likedUserId);
      
      if (!liker) {
        return { error: `Liker user not found: ${likerUserId}` };
      }
      
      if (!liked) {
        return { error: `Liked user not found: ${likedUserId}` };
      }
      
      // Create new like interaction
      const userLike: UserLike = {
        id: Date.now().toString(),
        liker_user_id: likerUserId,
        liked_user_id: likedUserId,
        type: 'like',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      mockDataStore.addUserLike(userLike);
      
      return { data: userLike };
    } catch (error) {
      console.error('Error in likeUser:', error);
      return { error: 'Failed to like user' };
    }
  }

  static async superLikeUser(likerUserId: string, likedUserId: string): Promise<ServiceResponse<UserLike>> {
    try {
      // Input validation
      if (!likerUserId || !likedUserId) {
        return { error: 'Invalid user IDs provided' };
      }

      if (likerUserId === likedUserId) {
        return { error: 'Cannot super like yourself' };
      }

      await delay(500);
      
      // Check if users exist
      const liker = mockDataStore.getUserById(likerUserId);
      const liked = mockDataStore.getUserById(likedUserId);
      
      if (!liker) {
        return { error: `Liker user not found: ${likerUserId}` };
      }
      
      if (!liked) {
        return { error: `Liked user not found: ${likedUserId}` };
      }
      
      // Create new super like interaction
      const userLike: UserLike = {
        id: Date.now().toString(),
        liker_user_id: likerUserId,
        liked_user_id: likedUserId,
        type: 'super_like',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      mockDataStore.addUserLike(userLike);
      
      return { data: userLike };
    } catch (error) {
      console.error('Error in superLikeUser:', error);
      return { error: 'Failed to super like user' };
    }
  }

  static async passUser(likerUserId: string, likedUserId: string): Promise<ServiceResponse<UserLike>> {
    try {
      // Input validation
      if (!likerUserId || !likedUserId) {
        return { error: 'Invalid user IDs provided' };
      }

      if (likerUserId === likedUserId) {
        return { error: 'Cannot pass yourself' };
      }

      await delay(500);
      
      // Check if users exist
      const liker = mockDataStore.getUserById(likerUserId);
      const liked = mockDataStore.getUserById(likedUserId);
      
      if (!liker) {
        return { error: `Liker user not found: ${likerUserId}` };
      }
      
      if (!liked) {
        return { error: `Liked user not found: ${likedUserId}` };
      }
      
      // Create new pass interaction
      const userLike: UserLike = {
        id: Date.now().toString(),
        liker_user_id: likerUserId,
        liked_user_id: likedUserId,
        type: 'pass',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      mockDataStore.addUserLike(userLike);
      
      return { data: userLike };
    } catch (error) {
      console.error('Error in passUser:', error);
      return { error: 'Failed to pass user' };
    }
  }

  static async getUserInteractions(userId: string): Promise<ServiceResponse<UserLike[]>> {
    try {
      // Input validation
      if (!userId) {
        return { error: 'Invalid user ID provided' };
      }

      await delay(300);
      
      const interactions = mockDataStore.getUserLikes(userId);
      
      return { data: interactions };
    } catch (error) {
      console.error('Error in getUserInteractions:', error);
      return { error: 'Failed to fetch user interactions' };
    }
  }

  static async getReceivedLikes(userId: string): Promise<ServiceResponse<UserLike[]>> {
    try {
      // Input validation
      if (!userId) {
        return { error: 'Invalid user ID provided' };
      }

      await delay(300);
      
      const receivedLikes = mockDataStore.getUserLikedBy(userId);
      
      return { data: receivedLikes };
    } catch (error) {
      console.error('Error in getReceivedLikes:', error);
      return { error: 'Failed to fetch received likes' };
    }
  }

  static async getRecommendedUsers(userId: string, limit: number = 10): Promise<ServiceResponse<User[]>> {
    try {
      // Input validation
      if (!userId) {
        return { error: 'Invalid user ID provided' };
      }

      if (limit < 0 || limit > 100) {
        return { error: 'Invalid limit provided. Must be between 0 and 100' };
      }

      await delay(500);
      
      // Get all users except current user
      let users = mockDataStore.getUsers().filter(user => user.id !== userId);
      
      // Get passed users to exclude them
      const passedUsers = mockDataStore.getPassedUsers(userId);
      users = users.filter(user => !passedUsers.includes(user.id));
      
      // Apply interaction state
      users = mockDataStore.applyInteractionState(users, userId);
      
      // Limit results
      users = users.slice(0, limit);
      
      return { data: users };
    } catch (error) {
      console.error('Error in getRecommendedUsers:', error);
      return { error: 'Failed to fetch recommended users' };
    }
  }

  static async getMutualLikes(userId: string): Promise<ServiceResponse<User[]>> {
    try {
      // Input validation
      if (!userId) {
        return { error: 'Invalid user ID provided' };
      }

      await delay(300);
      
      // Get users that the current user has liked
      const likedUserIds = mockDataStore.getLikedUsers(userId);
      
      // Get users who have liked the current user
      const receivedLikes = mockDataStore.getUserLikedBy(userId);
      const mutualLikeUserIds = receivedLikes
        .filter(like => likedUserIds.includes(like.liker_user_id))
        .map(like => like.liker_user_id);
      
      // Get user objects
      const mutualUsers = mutualLikeUserIds
        .map(id => mockDataStore.getUserById(id))
        .filter((user): user is User => user !== undefined);
      
      // Apply interaction state
      const usersWithState = mockDataStore.applyInteractionState(mutualUsers, userId);
      
      return { data: usersWithState };
    } catch (error) {
      console.error('Error in getMutualLikes:', error);
      return { error: 'Failed to fetch mutual likes' };
    }
  }
}

// Export default instance
export default DataProvider;
