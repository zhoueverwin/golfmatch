import React, { useState, useRef } from "react";
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
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";
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
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | {}>({});
  const [showControls, setShowControls] = useState(true);
  const [isVideoFinished, setIsVideoFinished] = useState(false);

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

    // Check if video has finished playing
    if ("didJustFinish" in playbackStatus && playbackStatus.didJustFinish) {
      setIsVideoFinished(true);
    }
  };

  const handleVideoPress = () => {
    setShowControls(!showControls);
  };

  const handleError = (error: any) => {
    console.error("Video playback error:", error);

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
            case -1003: // NSURLErrorCannotFindHost
            case -1004: // NSURLErrorCannotConnectToHost
            case -1005: // NSURLErrorNetworkConnectionLost
            case -1009: // NSURLErrorNotConnectedToInternet
              errorMessage = "ネットワークエラー: 動画を読み込めませんでした。";
              break;
            case -1011: // NSURLErrorBadServerResponse
            case -1015: // NSURLErrorUnsupportedURLScheme
            case -1016: // NSURLErrorCannotParseResponse
              errorMessage = "サーバーエラー: 動画ファイルにアクセスできません。";
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
          if (videoRef.current) {
            videoRef.current.loadAsync({ uri: videoUri });
          }
        },
      },
      { text: "閉じる", style: "cancel", onPress: handleClose },
    ]);
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pauseAsync();
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
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: videoUri }}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => handleError(error)}
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
                  name={
                    "isPlaying" in status && status.isPlaying ? "pause" : "play"
                  }
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
          {!("isPlaying" in status && status.isPlaying) &&
            !showControls &&
            !isVideoFinished && (
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
