import React, { useState, useRef, useEffect, memo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text,
  ActivityIndicator,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

interface VideoPlayerProps {
  videoUri: string;
  style?: any;
  onFullscreenRequest?: () => void;
  contentFit?: "contain" | "cover";
  aspectRatio?: number; // Default is 9/16 for portrait videos
}

// Helper function to validate video URI (exported for testing)
export const isValidVideoUri = (uri: string): boolean => {
  if (!uri || typeof uri !== "string") {
    return false;
  }

  // Must be a valid HTTP(S) URL or file:// URL
  const urlPattern =
    /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/;
  const filePattern = /^file:\/\/.+/;

  // Check if it's a valid HTTP(S) URL or file URL
  if (!urlPattern.test(uri) && !filePattern.test(uri)) {
    return false;
  }

  // Additional validation: URI should not be just the protocol
  if (uri === "http://" || uri === "https://" || uri === "file://") {
    return false;
  }

  return true;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUri,
  style,
  onFullscreenRequest,
  contentFit = "cover",
  aspectRatio = 9 / 16, // Default to portrait (9:16) for mobile-optimized videos
}) => {
  const [showControls, setShowControls] = useState(false);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isValidUri, setIsValidUri] = useState(true);
  
  // Validate URI first
  const validUri = isValidVideoUri(videoUri);
  
  // Create video player instance only with valid URI
  // Use a dummy URI for invalid cases to prevent errors
  const playerSource = validUri ? videoUri : "https://dummy-invalid-uri.local/video.mp4";
  const player = useVideoPlayer(playerSource, (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
  });

  // Validate URI on mount and when it changes
  useEffect(() => {
    const valid = isValidVideoUri(videoUri);
    setIsValidUri(valid);

    if (!valid) {
      console.error("Invalid video URI:", videoUri);
      setIsLoading(false);
      setHasError(true);
      // Don't interact with player for invalid URIs
    } else {
      setIsLoading(true);
      setHasError(false);
      // Replace with valid URI if needed
      if (player && validUri && playerSource !== videoUri) {
        try {
          player.replace(videoUri);
        } catch (error) {
          console.error("Failed to replace video source:", error);
          setHasError(true);
          setIsLoading(false);
        }
      }
    }
  }, [videoUri]);

  // Monitor player status for loading and finished states
  useEffect(() => {
    if (!player || !validUri) return; // Only listen if we have a valid URI

    const subscription = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        setIsLoading(false);
        setHasError(false);
      } else if (status.status === 'error') {
        // Only handle errors for valid URIs
        if (isValidVideoUri(videoUri)) {
          console.error("Video player error:", status.error);
          setIsLoading(false);
          setHasError(true);
          handleError(status.error);
        }
      }
    });

    const playbackSubscription = player.addListener('playingChange', (isPlaying) => {
      // Check if video has finished
      if (!isPlaying && player.currentTime >= player.duration - 0.1 && player.duration > 0) {
        setIsVideoFinished(true);
      }
    });

    return () => {
      subscription.remove();
      playbackSubscription.remove();
    };
  }, [player, validUri, videoUri]);

  // Cleanup video resources on unmount
  useEffect(() => {
    return () => {
      // Only cleanup for valid URIs
      if (player && validUri) {
        try {
          player.pause();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [player, validUri]);

  const handlePlayPause = () => {
    if (player && validUri) {
      try {
        const wasPlaying = player.playing;
        if (wasPlaying) {
          player.pause();
        } else {
          player.play();
          setIsVideoFinished(false);
        }
        // Show controls briefly after starting playback
        if (!wasPlaying) {
          setShowControls(true);
          setTimeout(() => setShowControls(false), 3000);
        }
      } catch (error) {
        console.error("Failed to play/pause video:", error);
      }
    }
  };

  const handlePlayAgain = () => {
    if (player && validUri) {
      try {
        player.currentTime = 0;
        player.play();
        setIsVideoFinished(false);
      } catch (error) {
        console.error("Failed to replay video:", error);
      }
    }
  };

  const handleVideoPress = () => {
    // Only show/hide controls on tap - do NOT toggle play/pause
    // User must use the play button to control playback
    if (player?.playing) {
      // If video is playing, show controls briefly so user can pause
      setShowControls(true);
      setTimeout(() => setShowControls(false), 3000);
    } else {
      // If video is not playing, toggle controls visibility
      setShowControls(prev => !prev);
    }
  };

  const handleError = (error: any) => {
    console.error("Video playback error:", error);
    setIsLoading(false);
    setHasError(true);

    let errorMessage = "動画の再生中にエラーが発生しました。";

    if (error && typeof error === "object") {
      if (error.code) {
        const errorCode = error.code;
        const errorDomain = error.domain;
        
        if (errorDomain === "NSURLErrorDomain") {
          switch (errorCode) {
            case -1001:
              errorMessage = "ネットワークタイムアウト: 動画の読み込みに時間がかかりすぎました。";
              break;
            case -1003:
              errorMessage = "ホストが見つかりません: 動画ファイルの場所にアクセスできません。";
              break;
            case -1004:
              errorMessage = "ホストに接続できません: 動画サーバーに接続できませんでした。";
              break;
            case -1005:
              errorMessage = "ネットワーク接続が切断されました: 動画の読み込み中に接続が切れました。";
              break;
            case -1009:
              errorMessage = "インターネット接続がありません: 動画を読み込むにはインターネット接続が必要です。";
              break;
            case -1011:
              errorMessage = "サーバーエラー: 動画ファイルにアクセスできません。";
              break;
            case -1015:
              errorMessage = "サポートされていないURL形式: 動画のURL形式が正しくありません。";
              break;
            case -1016:
              errorMessage = "サーバー応答の解析エラー: 動画ファイルの形式が正しくありません。";
              break;
            case -1020:
              errorMessage = "データ通信エラー: 動画の読み込みが許可されていません。";
              break;
            default:
              errorMessage = `ネットワークエラー: 動画を読み込めませんでした。 (コード: ${errorCode})`;
          }
        } else {
          switch (errorCode) {
            case "NETWORK_ERROR":
              errorMessage = "ネットワークエラー: 動画を読み込めませんでした。";
              break;
            case "MEDIA_ERROR":
              errorMessage = "メディアエラー: 動画ファイルが破損している可能性があります。";
              break;
            case "FORMAT_ERROR":
              errorMessage = "フォーマットエラー: サポートされていない動画形式です。";
              break;
            default:
              errorMessage = `動画再生エラー: ${error.message || "不明なエラー"}`;
          }
        }
      }
    }

    Alert.alert("動画再生エラー", errorMessage, [
      { text: "OK", style: "default" },
      {
        text: "再試行",
        style: "default",
        onPress: () => {
          setIsLoading(true);
          setHasError(false);
          if (player && validUri) {
            try {
              player.replace(videoUri);
            } catch (error) {
              console.error("Failed to retry video:", error);
              setHasError(true);
              setIsLoading(false);
            }
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { aspectRatio }, style]}>
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={handleVideoPress}
        activeOpacity={1}
      >
        {isValidUri ? (
          <VideoView
            style={styles.video}
            player={player}
            contentFit={contentFit}
            nativeControls={false}
          />
        ) : (
          <View style={styles.video} testID="video-error-placeholder" />
        )}

        {/* Custom Controls - Play/Pause only */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={player?.playing ? "pause" : "play"}
                size={32}
                color={Colors.white}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Play Again Button Overlay when video is finished */}
        {isVideoFinished && !showControls && (
          <View style={styles.playButtonOverlay}>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={handlePlayAgain}
            >
              <Ionicons name="refresh" size={40} color={Colors.white} />
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading Overlay */}
        {isLoading && !hasError && (
          <View style={styles.loadingOverlay} testID="video-loading-indicator">
            <ActivityIndicator size="large" color={Colors.white} />
            <Text style={styles.loadingText}>動画を読み込み中...</Text>
          </View>
        )}

        {/* Error Overlay */}
        {hasError && (
          <View style={styles.errorOverlay} testID="video-error-overlay">
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
            <Text style={styles.errorText}>
              {!isValidUri
                ? "動画を読み込めません\n無効な動画URLです"
                : "動画の読み込みに失敗しました"}
            </Text>
            {isValidUri && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setIsLoading(true);
                  setHasError(false);
                  if (player && validUri) {
                    try {
                      player.replace(videoUri);
                    } catch (error) {
                      console.error("Failed to retry video:", error);
                      setHasError(true);
                      setIsLoading(false);
                    }
                  }
                }}
                testID="video-retry-button"
              >
                <Text style={styles.retryButtonText}>再試行</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Play Button Overlay when video is not playing and not finished */}
        {!isLoading &&
          !hasError &&
          !player?.playing &&
          !showControls &&
          !isVideoFinished && (
            <View style={styles.playButtonOverlay}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
              >
                <Ionicons name="play" size={40} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    // aspectRatio is set dynamically via props
  },
  videoContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButton: {
    padding: Spacing.md,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 40,
    padding: Spacing.md,
  },
  playAgainButton: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  playAgainText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    marginTop: Spacing.xs,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    marginTop: Spacing.sm,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

// Memoize to prevent re-renders when parent updates (e.g., reaction count changes)
// Only re-render if video URI or aspect ratio changes
export default memo(VideoPlayer, (prevProps, nextProps) => {
  return (
    prevProps.videoUri === nextProps.videoUri &&
    prevProps.aspectRatio === nextProps.aspectRatio &&
    prevProps.contentFit === nextProps.contentFit
  );
});
