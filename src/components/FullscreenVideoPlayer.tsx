import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';

const { width, height } = Dimensions.get('window');

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

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if ('isPlaying' in status && status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleVideoPress = () => {
    setShowControls(!showControls);
  };

  const handleError = (error: string) => {
    console.error('Video playback error:', error);
    Alert.alert('動画再生エラー', '動画の再生中にエラーが発生しました。');
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
            onPlaybackStatusUpdate={setStatus}
            onError={(error) => handleError(error)}
          />
          
          {/* Close Button */}
          {showControls && (
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
            >
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
                  name={('isPlaying' in status && status.isPlaying) ? "pause" : "play"} 
                  size={48} 
                  color={Colors.white} 
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Play Button Overlay when video is not playing */}
          {!('isPlaying' in status && status.isPlaying) && !showControls && (
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: Spacing.sm,
    zIndex: 10,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    padding: Spacing.lg,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 50,
    padding: Spacing.lg,
  },
});

export default FullscreenVideoPlayer;