export default {
  expo: {
    name: "Golfmatch",
    slug: "golfmatch",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    // Explicitly enable Hermes for better performance in release builds
    jsEngine: "hermes",
    scheme: "Golfmatch",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zhoueverwin.golfmatchapp",
      infoPlist: {
        UIBackgroundModes: [
          "remote-notification"
        ],
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "Golfmatchでは、投稿作成時に写真や動画を撮影したり、本人確認のために身分証明書を撮影する際にカメラを使用します。例：ゴルフラウンドの写真を撮影して投稿に追加できます。",
        NSPhotoLibraryUsageDescription: "Golfmatchでは、投稿作成時に既存の写真や動画を選択したり、プロフィール画像を設定する際にフォトライブラリを使用します。例：カメラロールからゴルフ写真を選んで投稿に追加できます。",
        NSMicrophoneUsageDescription: "Golfmatchでは、投稿用の動画を撮影する際に音声を録音するためにマイクを使用します。例：ゴルフスイングの動画を音声付きで撮影できます。",
        NSUserNotificationsUsageDescription: "マッチング成立、新しいメッセージ、いいねなどの通知をお届けするために使用します。例：新しいマッチングが成立した際にお知らせします。"
      },
      buildNumber: "2"
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
          imageWidth: 600
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
          photosPermission: "Golfmatchでは、投稿作成時に既存の写真や動画を選択したり、プロフィール画像を設定する際にフォトライブラリを使用します。例：カメラロールからゴルフ写真を選んで投稿に追加できます。",
          cameraPermission: "Golfmatchでは、投稿作成時に写真や動画を撮影したり、本人確認のために身分証明書を撮影する際にカメラを使用します。例：ゴルフラウンドの写真を撮影して投稿に追加できます。",
          microphonePermission: "Golfmatchでは、投稿用の動画を撮影する際に音声を録音するためにマイクを使用します。例：ゴルフスイングの動画を音声付きで撮影できます。"
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Golfmatchでは、投稿作成時に写真や動画を撮影したり、本人確認のために身分証明書を撮影する際にカメラを使用します。例：ゴルフラウンドの写真を撮影して投稿に追加できます。",
          microphonePermission: "Golfmatchでは、投稿用の動画を撮影する際に音声を録音するためにマイクを使用します。例：ゴルフスイングの動画を音声付きで撮影できます。",
          recordAudioAndroid: true
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Golfmatchでは、撮影した写真や動画をデバイスに保存する際にフォトライブラリへの書き込みを使用します。例：投稿用に撮影した写真をカメラロールに保存できます。",
          savePhotosPermission: "Golfmatchでは、撮影した写真や動画をデバイスに保存する際にフォトライブラリへの書き込みを使用します。例：投稿用に撮影した写真をカメラロールに保存できます。",
          isAccessMediaLocationEnabled: true
        }
      ],
      "react-native-compressor"
    ],
    notification: {
      icon: "./assets/icon.png",
      color: "#4A90E2",
      androidMode: "default",
      androidCollapsedTitle: "新しい通知"
    }
  }
};

