import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';

const { width } = Dimensions.get('window');

interface PostCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onPublish: (postData: { text: string; images: string[]; videos: string[] }) => void;
  editingPost?: {
    text: string;
    images: string[];
    videos: string[];
  } | null;
}

const PostCreationModal: React.FC<PostCreationModalProps> = ({
  visible,
  onClose,
  onPublish,
  editingPost,
}) => {
  const [text, setText] = useState(editingPost?.text || '');
  const [images, setImages] = useState<string[]>(editingPost?.images || []);
  const [videos, setVideos] = useState<string[]>(editingPost?.videos || []);

  // Reset form when editingPost changes
  React.useEffect(() => {
    if (editingPost) {
      setText(editingPost.text || '');
      setImages(editingPost.images || []);
      setVideos(editingPost.videos || []);
    }
  }, [editingPost]);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleImagePicker = async () => {
    try {
      // Check if videos are already selected
      if (videos.length > 0) {
        Alert.alert('メディア制限', '動画が選択されています。画像と動画は同時に投稿できません。');
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('権限が必要', '写真ライブラリへのアクセス権限が必要です。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
      }
    } catch (_error) {
      console.error('Error picking images:', _error);
      Alert.alert('エラー', '画像の選択中にエラーが発生しました。');
    }
  };

  const handleVideoPicker = async () => {
    try {
      // Check if images are already selected
      if (images.length > 0) {
        Alert.alert('メディア制限', '画像が選択されています。画像と動画は同時に投稿できません。');
        return;
      }

      // Check if a video is already selected
      if (videos.length >= 1) {
        Alert.alert('動画制限', '一度に投稿できる動画は1つまでです。');
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('権限が必要', '動画ライブラリへのアクセス権限が必要です。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false, // Only allow single selection
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Only take the first video
        const videoUri = result.assets[0].uri;
        setVideos([videoUri]); // Replace with single video
      }
    } catch (_error) {
      console.error('Error picking videos:', _error);
      Alert.alert('エラー', '動画の選択中にエラーが発生しました。');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!text.trim() && images.length === 0 && videos.length === 0) {
      Alert.alert('投稿内容が必要', 'テキスト、画像、または動画のいずれかを入力してください。');
      return;
    }

    setIsPublishing(true);
    
    try {
      await onPublish({
        text: text.trim(),
        images,
        videos,
      });
      
      // Reset form
      if (!editingPost) {
        setText('');
        setImages([]);
        setVideos([]);
      }
      onClose();
    } catch (_error) {
      console.error('Error publishing post:', _error);
      Alert.alert('エラー', '投稿の公開中にエラーが発生しました。');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    const hasChanges = editingPost 
      ? (text !== editingPost.text || 
         JSON.stringify(images) !== JSON.stringify(editingPost.images) ||
         JSON.stringify(videos) !== JSON.stringify(editingPost.videos))
      : (text.trim() || images.length > 0 || videos.length > 0);

    if (hasChanges) {
      Alert.alert(
        editingPost ? '編集を破棄' : '下書きを破棄',
        editingPost ? '変更内容が破棄されます。よろしいですか？' : '投稿内容が破棄されます。よろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '破棄', 
            style: 'destructive',
            onPress: () => {
              if (!editingPost) {
                setText('');
                setImages([]);
                setVideos([]);
              }
              onClose();
            }
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{editingPost ? '投稿を編集' : '新しい投稿'}</Text>
          
          <TouchableOpacity 
            onPress={handlePublish}
            style={[styles.publishButton, (!text.trim() && images.length === 0 && videos.length === 0) && styles.publishButtonDisabled]}
            disabled={isPublishing || (!text.trim() && images.length === 0 && videos.length === 0)}
          >
            <Text style={[styles.publishText, (!text.trim() && images.length === 0 && videos.length === 0) && styles.publishTextDisabled]}>
              {isPublishing ? (editingPost ? '更新中...' : '公開中...') : (editingPost ? '更新' : '公開')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Text Input */}
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="何をシェアしますか？"
              placeholderTextColor={Colors.gray[400]}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{text.length}/1000</Text>
          </View>

          {/* Media Preview */}
          {(images.length > 0 || videos.length > 0) && (
            <View style={styles.mediaPreview}>
              {images.map((image, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Image source={{ uri: image }} style={styles.mediaImage} />
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              
              {videos.map((video, index) => (
                <View key={`video-${index}`} style={styles.mediaItem}>
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="play-circle" size={40} color={Colors.primary} />
                    <Text style={styles.videoText}>動画</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeVideo(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Media Selection Buttons */}
          <View style={styles.mediaButtons}>
            <TouchableOpacity 
              style={[styles.mediaButton, videos.length > 0 && styles.mediaButtonDisabled]} 
              onPress={handleImagePicker}
              disabled={videos.length > 0}
            >
              <Ionicons 
                name="image-outline" 
                size={24} 
                color={videos.length > 0 ? Colors.gray[400] : Colors.primary} 
              />
              <Text style={[styles.mediaButtonText, videos.length > 0 && styles.mediaButtonTextDisabled]}>
                写真
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.mediaButton, (images.length > 0 || videos.length >= 1) && styles.mediaButtonDisabled]} 
              onPress={handleVideoPicker}
              disabled={images.length > 0 || videos.length >= 1}
            >
              <Ionicons 
                name="videocam-outline" 
                size={24} 
                color={(images.length > 0 || videos.length >= 1) ? Colors.gray[400] : Colors.primary} 
              />
              <Text style={[styles.mediaButtonText, (images.length > 0 || videos.length >= 1) && styles.mediaButtonTextDisabled]}>
                動画 {videos.length >= 1 && '(1/1)'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  publishButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  publishButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  publishText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  publishTextDisabled: {
    color: Colors.gray[500],
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  textInputContainer: {
    marginTop: Spacing.md,
  },
  textInput: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  mediaPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  mediaItem: {
    position: 'relative',
    width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
    height: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    marginTop: Spacing.xs,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  mediaButtons: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  mediaButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primary,
  },
  mediaButtonDisabled: {
    backgroundColor: Colors.gray[100],
  },
  mediaButtonTextDisabled: {
    color: Colors.gray[400],
  },
});

export default PostCreationModal;
