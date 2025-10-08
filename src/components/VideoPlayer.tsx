import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';

interface VideoPlayerProps {
  videoUri: string;
  style?: any;
  onFullscreenRequest?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUri, style, onFullscreenRequest }) => {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | {}>({});
  const [showControls, setShowControls] = useState(false);

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
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000); // Hide controls after 3 seconds
  };

  const handleError = (error: string) => {
    console.error('Video playback error:', error);
    Alert.alert('動画再生エラー', '動画の再生中にエラーが発生しました。');
  };

  return (
    <View style={[styles.container, style]}>
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
          resizeMode={ResizeMode.COVER}
          isLooping={false}
          onPlaybackStatusUpdate={setStatus}
          onError={(error) => handleError(error)}
        />
        
        {/* Custom Controls */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={handlePlayPause}
            >
              <Ionicons 
                name={('isPlaying' in status && status.isPlaying) ? "pause" : "play"} 
                size={32} 
                color={Colors.white} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => onFullscreenRequest && onFullscreenRequest()}
            >
              <Ionicons 
                name="expand" 
                size={32} 
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
    width: '100%',
    aspectRatio: 16/9,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    padding: Spacing.md,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 40,
    padding: Spacing.md,
  },
});

export default VideoPlayer;