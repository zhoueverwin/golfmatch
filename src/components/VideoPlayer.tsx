import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text,
  ActivityIndicator,
} from "react-native";
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

interface VideoPlayerProps {
  videoUri: string;
  style?: any;
  onFullscreenRequest?: () => void;
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
}) => {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | {}>({});
  const [showControls, setShowControls] = useState(false);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isValidUri, setIsValidUri] = useState(true);

  // Validate URI on mount and when it changes
  useEffect(() => {
    const valid = isValidVideoUri(videoUri);
    setIsValidUri(valid);

    if (!valid) {
      console.error("Invalid video URI:", videoUri);
      setIsLoading(false);
      setHasError(true);
    } else {
      setIsLoading(true);
      setHasError(false);
    }
  }, [videoUri]);

  // Cleanup video resources on unmount
  useEffect(() => {
    return () => {
      // Stop video playback when component unmounts
      if (videoRef.current) {
        videoRef.current.stopAsync().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if ("isPlaying" in status && status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
        setIsVideoFinished(false); // Reset finished state when playing
      }
    }
  };

  const handlePlayAgain = async () => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(0); // Reset to beginning
      await videoRef.current.playAsync();
      setIsVideoFinished(false);
    }
  };

  const handlePlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);

    // Handle loading state
    if ("isLoaded" in playbackStatus && playbackStatus.isLoaded) {
      setIsLoading(false);
      setHasError(false);
    }

    // Check if video has finished playing
    if ("didJustFinish" in playbackStatus && playbackStatus.didJustFinish) {
      setIsVideoFinished(true);
    }
  };

  const handleVideoPress = () => {
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000); // Hide controls after 3 seconds
  };

  const handleError = (error: any) => {
    console.error("Video playback error:", error);
    setIsLoading(false);
    setHasError(true);

    // More detailed error handling
    let errorMessage = "動画の再生中にエラーが発生しました。";

    if (error && typeof error === "object") {
      if (error.error && error.error.code) {
        const errorCode = error.error.code;
        const errorDomain = error.error.domain;
        
        // Handle NSURLErrorDomain errors (iOS network errors)
        if (errorDomain === "NSURLErrorDomain") {
          switch (errorCode) {
            case -1001: // NSURLErrorTimedOut
              errorMessage = "ネットワークタイムアウト: 動画の読み込みに時間がかかりすぎました。";
              break;
            case -1003: // NSURLErrorCannotFindHost
              errorMessage = "ホストが見つかりません: 動画ファイルの場所にアクセスできません。";
              break;
            case -1004: // NSURLErrorCannotConnectToHost
              errorMessage = "ホストに接続できません: 動画サーバーに接続できませんでした。";
              break;
            case -1005: // NSURLErrorNetworkConnectionLost
              errorMessage = "ネットワーク接続が切断されました: 動画の読み込み中に接続が切れました。";
              break;
            case -1009: // NSURLErrorNotConnectedToInternet
              errorMessage = "インターネット接続がありません: 動画を読み込むにはインターネット接続が必要です。";
              break;
            case -1011: // NSURLErrorBadServerResponse
              errorMessage = "サーバーエラー: 動画ファイルにアクセスできません。";
              break;
            case -1015: // NSURLErrorUnsupportedURLScheme
              errorMessage = "サポートされていないURL形式: 動画のURL形式が正しくありません。";
              break;
            case -1016: // NSURLErrorCannotParseResponse
              errorMessage = "サーバー応答の解析エラー: 動画ファイルの形式が正しくありません。";
              break;
            case -1020: // NSURLErrorDataNotAllowed
              errorMessage = "データ通信エラー: 動画の読み込みが許可されていません。";
              break;
            default:
              errorMessage = `ネットワークエラー: 動画を読み込めませんでした。 (コード: ${errorCode})`;
          }
        } else {
          // Handle other error types
          switch (errorCode) {
            case "NETWORK_ERROR":
              errorMessage = "ネットワークエラー: 動画を読み込めませんでした。";
              break;
            case "MEDIA_ERROR":
              errorMessage =
                "メディアエラー: 動画ファイルが破損している可能性があります。";
              break;
            case "FORMAT_ERROR":
              errorMessage =
                "フォーマットエラー: サポートされていない動画形式です。";
              break;
            default:
              errorMessage = `動画再生エラー: ${error.error.message || "不明なエラー"}`;
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
          // Retry loading the video
          setIsLoading(true);
          setHasError(false);
          if (videoRef.current) {
            videoRef.current.loadAsync({ uri: videoUri });
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={handleVideoPress}
        activeOpacity={1}
      >
        {isValidUri ? (
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: videoUri }}
            useNativeControls={false}
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => handleError(error)}
          />
        ) : (
          <View style={styles.video} testID="video-error-placeholder" />
        )}

        {/* Custom Controls */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={
                  "isPlaying" in status && status.isPlaying ? "pause" : "play"
                }
                size={32}
                color={Colors.white}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => onFullscreenRequest && onFullscreenRequest()}
            >
              <Ionicons name="expand" size={32} color={Colors.white} />
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
                  if (videoRef.current) {
                    videoRef.current
                      .loadAsync({ uri: videoUri })
                      .catch((error) => {
                        console.error("Retry failed:", error);
                        setHasError(true);
                        setIsLoading(false);
                      });
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
          !("isPlaying" in status && status.isPlaying) &&
          !showControls &&
          !isVideoFinished && (
            <View style={styles.playButtonOverlay}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => onFullscreenRequest && onFullscreenRequest()}
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
    aspectRatio: 16 / 9,
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

export default VideoPlayer;
