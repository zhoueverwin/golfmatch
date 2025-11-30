import React, { useState, useEffect, memo, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

// Production error logging - silent, no user-facing alerts
const logVideoError = (message: string, error?: any) => {
  if (__DEV__) {
    console.error(`[VideoPlayer] ${message}`, error);
  }
  // In production, errors are silently logged without user notification
  // Could be extended to send to analytics/crash reporting service
};

interface VideoPlayerProps {
  videoUri: string;
  style?: any;
  onFullscreenRequest?: () => void;
  contentFit?: "contain" | "cover";
  aspectRatio?: number; // Default is 9/16 for portrait videos
  isActive?: boolean; // Whether the video is visible/active (controls auto-pause when scrolled out of view)
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
  isActive = true, // Default to active
}) => {
  const [showControls, setShowControls] = useState(false);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isValidUri, setIsValidUri] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isMounted, setIsMounted] = useState(true);

  // Maximum retry attempts before giving up silently
  const MAX_RETRIES = 2;

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

  // Track mounted state to prevent state updates after unmount
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Safe state setter that checks if component is still mounted
  const safeSetState = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean) => {
    if (isMounted) {
      // Use InteractionManager to prevent UI freezes
      InteractionManager.runAfterInteractions(() => {
        setter(value);
      });
    }
  }, [isMounted]);

  // Silent auto-retry handler for production stability - MUST be defined before useEffects that use it
  const handleSilentRetry = useCallback(() => {
    if (!isMounted || !player || !validUri) return;

    if (retryCount < MAX_RETRIES) {
      logVideoError(`Auto-retrying video (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      setHasError(false);

      // Delay retry to prevent rapid consecutive failures
      setTimeout(() => {
        if (isMounted && player) {
          try {
            player.replace(videoUri);
          } catch (error) {
            logVideoError("Silent retry failed", error);
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
          }
        }
      }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s
    } else {
      // Max retries reached - show error state silently without popup
      logVideoError(`Max retries (${MAX_RETRIES}) reached for video`, videoUri);
      if (isMounted) {
        setHasError(true);
        setIsLoading(false);
      }
    }
  }, [isMounted, player, validUri, videoUri, retryCount, MAX_RETRIES]);

  // Loading timeout to prevent indefinite loading state (15 seconds)
  useEffect(() => {
    if (!isLoading) return;

    const loadingTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        logVideoError("Video loading timeout exceeded");
        // Don't show error immediately - attempt silent retry first
        handleSilentRetry();
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [isLoading, isMounted, handleSilentRetry]);

  // Validate URI on mount and when it changes
  useEffect(() => {
    const valid = isValidVideoUri(videoUri);
    setIsValidUri(valid);

    if (!valid) {
      logVideoError("Invalid video URI", videoUri);
      setIsLoading(false);
      setHasError(true);
      // Don't interact with player for invalid URIs
    } else {
      setIsLoading(true);
      setHasError(false);
      setRetryCount(0);
      // Replace with valid URI if needed
      if (player && validUri && playerSource !== videoUri) {
        try {
          player.replace(videoUri);
        } catch (error) {
          logVideoError("Failed to replace video source", error);
          safeSetState(setHasError, true);
          safeSetState(setIsLoading, false);
        }
      }
    }
  }, [videoUri]);

  // Monitor player status for loading and finished states
  useEffect(() => {
    if (!player || !validUri) return; // Only listen if we have a valid URI

    const subscription = player.addListener('statusChange', (status) => {
      if (!isMounted) return;

      if (status.status === 'readyToPlay') {
        setIsLoading(false);
        setHasError(false);
        setRetryCount(0); // Reset retry count on success
      } else if (status.status === 'error') {
        // Handle errors silently - no user-facing alerts in production
        logVideoError("Video player status error", status.error);

        // Attempt silent auto-retry
        handleSilentRetry();
      }
    });

    const playbackSubscription = player.addListener('playingChange', (isPlaying) => {
      if (!isMounted) return;

      // Check if video has finished
      if (!isPlaying && player.currentTime >= player.duration - 0.1 && player.duration > 0) {
        setIsVideoFinished(true);
      }
    });

    return () => {
      subscription.remove();
      playbackSubscription.remove();
    };
  }, [player, validUri, videoUri, isMounted, handleSilentRetry]);

  // Pause video when scrolled out of view (isActive becomes false)
  useEffect(() => {
    if (!player || !validUri) return;

    if (!isActive && player.playing) {
      try {
        player.pause();
      } catch (error) {
        // Ignore pause errors
      }
    }
  }, [isActive, player, validUri]);

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

  // Manual retry handler for user-initiated retries (via retry button in UI)
  const handleManualRetry = useCallback(() => {
    if (!isMounted || !player || !validUri) return;

    logVideoError("User initiated manual retry");
    setRetryCount(0); // Reset retry count for manual retry
    setIsLoading(true);
    setHasError(false);

    // Use InteractionManager to prevent UI freeze during retry
    InteractionManager.runAfterInteractions(() => {
      if (isMounted && player) {
        try {
          player.replace(videoUri);
        } catch (error) {
          logVideoError("Manual retry failed", error);
          if (isMounted) {
            setHasError(true);
            setIsLoading(false);
          }
        }
      }
    });
  }, [isMounted, player, validUri, videoUri]);

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

        {/* Error Overlay - Silent, no popup alerts */}
        {hasError && (
          <View style={styles.errorOverlay} testID="video-error-overlay">
            <Ionicons name="videocam-off-outline" size={40} color={Colors.gray[400]} />
            <Text style={styles.errorText}>
              {!isValidUri
                ? "動画を表示できません"
                : "動画の読み込みに失敗しました"}
            </Text>
            {isValidUri && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleManualRetry}
                testID="video-retry-button"
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color={Colors.white} style={{ marginRight: 4 }} />
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
  // Error overlay - subtle, non-intrusive design
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.gray[300],
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray[600],
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minWidth: 100,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
  },
});

// Memoize to prevent re-renders when parent updates (e.g., reaction count changes)
// Only re-render if video URI, aspect ratio, or isActive changes
export default memo(VideoPlayer, (prevProps, nextProps) => {
  return (
    prevProps.videoUri === nextProps.videoUri &&
    prevProps.aspectRatio === nextProps.aspectRatio &&
    prevProps.contentFit === nextProps.contentFit &&
    prevProps.isActive === nextProps.isActive
  );
});
