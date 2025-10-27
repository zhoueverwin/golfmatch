import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  Text,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

const { width, height } = Dimensions.get("window");

interface FullscreenVideoPlayerProps {
  visible: boolean;
  videoUri: string;
  onClose: () => void;
}

const FullscreenVideoPlayer: React.FC<FullscreenVideoPlayerProps> = ({
  visible,
  videoUri,
  onClose,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  
  // Create video player instance with autoplay
  // Only play if we have a valid video URI
  const player = useVideoPlayer(videoUri || "https://dummy-invalid-uri.local/video.mp4", (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
    // Only autoplay if videoUri is valid
    if (videoUri && visible) {
      player.play();
    }
  });

  // Monitor player status for finished state
  useEffect(() => {
    if (!player || !videoUri) return;

    const subscription = player.addListener('statusChange', (status) => {
      if (status.status === 'error') {
        console.error("Video player error:", status.error);
        handleError(status.error);
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
  }, [player, videoUri]);
  
  // Handle visibility changes - play when modal opens
  useEffect(() => {
    if (visible && player && videoUri) {
      try {
        player.play();
      } catch (error) {
        console.error("Failed to play video:", error);
      }
    } else if (!visible && player && videoUri) {
      try {
        player.pause();
      } catch (error) {
        // Ignore pause errors when modal closes
      }
    }
  }, [visible, player, videoUri]);

  const handlePlayPause = () => {
    if (player && videoUri) {
      try {
        if (player.playing) {
          player.pause();
        } else {
          player.play();
          setIsVideoFinished(false);
        }
      } catch (error) {
        console.error("Failed to play/pause video:", error);
      }
    }
  };

  const handlePlayAgain = () => {
    if (player && videoUri) {
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
    setShowControls(!showControls);
  };

  const handleError = (error: any) => {
    console.error("Video playback error:", error);

    let errorMessage = "動画の再生中にエラーが発生しました。";

    if (error && typeof error === "object") {
      if (error.code) {
        const errorCode = error.code;
        const errorDomain = error.domain;
        
        if (errorDomain === "NSURLErrorDomain") {
          switch (errorCode) {
            case -1001:
            case -1003:
            case -1004:
            case -1005:
            case -1009:
              errorMessage = "ネットワークエラー: 動画を読み込めませんでした。";
              break;
            case -1011:
            case -1015:
            case -1016:
              errorMessage = "サーバーエラー: 動画ファイルにアクセスできません。";
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
          if (player && videoUri) {
            try {
              player.replace(videoUri);
            } catch (error) {
              console.error("Failed to retry video:", error);
            }
          }
        },
      },
      { text: "閉じる", style: "cancel", onPress: handleClose },
    ]);
  };

  const handleClose = () => {
    if (player && videoUri) {
      try {
        player.pause();
      } catch (error) {
        // Ignore pause error on close
      }
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar hidden />
      <SafeAreaView style={styles.container}>
        {/* Video Container */}
        <TouchableOpacity
          style={styles.videoContainer}
          onPress={handleVideoPress}
          activeOpacity={1}
        >
          <VideoView
            style={styles.video}
            player={player}
            contentFit="contain"
            nativeControls={false}
          />

          {/* Close Button */}
          {showControls && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
          )}

          {/* Play/Pause Controls */}
          {showControls && (
            <View style={styles.controlsOverlay}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePlayPause}
              >
                <Ionicons
                  name={player?.playing ? "pause" : "play"}
                  size={48}
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
                <Ionicons name="refresh" size={60} color={Colors.white} />
                <Text style={styles.playAgainText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Play Button Overlay when video is not playing and not finished */}
          {!player?.playing && !showControls && !isVideoFinished && (
            <View style={styles.playButtonOverlay}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
              >
                <Ionicons name="play" size={60} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: width,
    height: height,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: Spacing.sm,
    zIndex: 10,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButton: {
    padding: Spacing.lg,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 50,
    padding: Spacing.lg,
  },
  playAgainButton: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 160,
  },
  playAgainText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    marginTop: Spacing.sm,
  },
});

export default FullscreenVideoPlayer;
