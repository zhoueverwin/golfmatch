export default {
  expo: {
    name: "golfmatch",
    slug: "golfmatch",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    // newArchEnabled: false, // Removed - let Expo handle this automatically
    scheme: "golfmatch",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zhoueverwin.golfmatchapp",
      infoPlist: {
        UIBackgroundModes: [
          "remote-notification"
        ],
        ITSAppUsesNonExemptEncryption: false
      },
      buildNumber: "1"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.zhoueverwin.golfmatchapp"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // Environment variables will be available via Constants.expoConfig.extra
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: "3449867b-e6b3-45f2-8569-47389c202518"
      }
    },
    owner: "zhoueverwin",
    plugins: [
      [
        "expo-splash-screen",
        {
          backgroundColor: "#21B2AA",
          image: "./assets/images/Icons/GolfMatch-1024.png",
          imageWidth: 800
        }
      ],
      "expo-video",
      [
        "@react-native-google-signin/google-signin",
        {
          // REVERSED_CLIENT_ID derived from iOS Client ID:
          // 986630263277-4n44sucemnougkvqotdksvbjcis3vivt.apps.googleusercontent.com
          iosUrlScheme: "com.googleusercontent.apps.986630263277-4n44sucemnougkvqotdksvbjcis3vivt"
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#4A90E2",
          iosDisplayInForeground: true
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "golfmatchアプリがあなたの写真ライブラリにアクセスすることを許可してください",
          cameraPermission: "golfmatchアプリがカメラにアクセスすることを許可してください",
          microphonePermission: "golfmatchアプリがマイクにアクセスすることを許可してください"
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "golfmatchアプリがカメラにアクセスすることを許可してください",
          microphonePermission: "golfmatchアプリがマイクにアクセスすることを許可してください",
          recordAudioAndroid: true
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "golfmatchアプリがあなたの写真を保存することを許可してください",
          savePhotosPermission: "golfmatchアプリがあなたの写真を保存することを許可してください",
          isAccessMediaLocationEnabled: true
        }
      ]
    ],
    notification: {
      icon: "./assets/icon.png",
      color: "#4A90E2",
      androidMode: "default",
      androidCollapsedTitle: "新しい通知"
    }
  }
};

