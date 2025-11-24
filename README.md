# Development Guide
Appleの「4.3 Spam」リジェクト対策として重要なのは、他の類似アプリとの差別化・独自機能、飽和カテゴリでの差別化、そしてテンプレート的なUIや機能を避けることです。​

主な4.3 Spamリジェクト対策
オリジナル機能追加

類似したマッチング機能だけでなく、独自の出会い体験や新規性のある機能（たとえばAIマッチング・特定コミュニティ向け独自マッチングなど）を強調し、サービスの独自価値をアプリ説明にも反映する。​

UI・デザイン差別化

添付画像・Figmaデザインやアイコン、細かい機能UIまで、業界の定番とは違うキー要素を明示的に加える。ありふれたテンプレートや市販キットをそのまま使うと危険です。​

アプリのコンセプトを明確に

複数アプリでバンドルIDだけ違う場合は「全バリエーションを一つのアプリ内で提供（例：地域・属性切り替えはアプリ内課金や設定で）」という設計が推奨されています。​

ミッション・パッションを強調

審査対応メールで他アプリとの差・開発者の思い・社会的価値を説明することで許可されるケースも報告されています。​

NGパターン（リジェクトされる例）
単なるテンプレート流用

内容が違うだけで機能・UIがほぼ同じ

分社化して同一コンセプトのアプリを複数提出

飽和ジャンル（マッチング、占い等）で差別化ポイントが弱い

具体的な対策事例
新しいマッチング形式や検索方法の開発

デザイン・ブランドイメージの見直し

あくまで「既存サービスにない独自性」をストア説明文・メタデータに記載

審査で指摘されたら、上記差別化策をしっかりアピール・説明

根本的には「ユニークで高品質な体験を提供」と「ありふれたアプリの量産はNG」がAppleの基本方針です。​


## Running the Development Server

### Start Expo Development Server

Due to macOS permission restrictions on system temp directories, we need to use a custom temp directory when running Expo commands.

```bash
cd /Users/miho/golfmatch
export TMPDIR="$HOME/.metro-tmp"
npx expo start --clear
```

Or in one line:

```bash
cd /Users/miho/golfmatch && export TMPDIR="$HOME/.metro-tmp" && npx expo start --clear
```

### Run on iOS Device

To run the app on a physical iOS device:

```bash
cd /Users/miho/golfmatch
export TMPDIR="$HOME/.metro-tmp"
npx expo run:ios --device
```

Or in one line:

```bash
cd /Users/miho/golfmatch && export TMPDIR="$HOME/.metro-tmp" && npx expo run:ios --device
```

### Run on iOS Simulator

```bash
cd /Users/miho/golfmatch && export TMPDIR="$HOME/.metro-tmp" && npx expo run:ios
```

## Permission Issues

### Why do we need custom TMPDIR?

After macOS reboots or system updates, the system's temporary directory (`/var/folders/`) may have restricted permissions due to System Integrity Protection (SIP). This causes `EACCES: permission denied` errors when Metro bundler and Expo CLI try to write cache files.

### Solution

The `metro.config.js` file has been configured to automatically set `TMPDIR` to `~/.metro-tmp` for Metro bundler. However, when running Expo CLI commands directly (like `expo run:ios`), you need to manually set the environment variable before running the command.

### Creating the temp directory

The temp directory is automatically created, but if you need to create it manually:

```bash
mkdir -p ~/.metro-tmp
```

## Git Workflow

### Check Status

```bash
git status
```

### Stage Changes

```bash
git add <file>
```

Or stage all changes:

```bash
git add .
```

### Commit Changes

```bash
git commit -m "Your commit message"
```

### View Recent Commits

```bash
git log --oneline -n 5
```

## Common Issues

### Metro Cache Errors

If you see cache-related errors, clear the cache:

```bash
export TMPDIR="$HOME/.metro-tmp" && npx expo start --clear
```

### CocoaPods Issues

If you encounter CocoaPods errors:

```bash
cd ios
pod install
cd ..
```

### Node Modules Issues

If you have dependency issues, try reinstalling:

```bash
rm -rf node_modules
npm install
```

## Environment Variables

The project uses environment variables stored in `.env` file:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

These are automatically loaded when running Expo commands.

## Testing on Expo Go

1. Install Expo Go app on your iOS/Android device
2. Run `export TMPDIR="$HOME/.metro-tmp" && npx expo start`
3. Scan the QR code with your device camera (iOS) or Expo Go app (Android)

## Building for Production

### iOS Build

First, do:
```bash
npx expo prebuild --clean 
```
This command will create a new Xcode project in the `ios` directory. Then, you can build the app using:
```bash
export TMPDIR="$HOME/.metro-tmp"
eas build --platform ios
```

### Android Build

```bash
export TMPDIR="$HOME/.metro-tmp"
eas build --platform android
```

## Useful Commands

### Kill Expo Process

If Expo is stuck or you need to restart:

```bash
pkill -f "expo start"
```

### Check Running Processes

```bash
ps aux | grep expo
```

### Clear All Caches

```bash
rm -rf ~/.metro-tmp
rm -rf ~/.metro-cache
export TMPDIR="$HOME/.metro-tmp" && npx expo start --clear
```

