import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import StandardHeader from '../components/StandardHeader';
import Button from '../components/Button';
import { validateKycImage } from '../utils/imageValidator';
import { kycService } from '../services/kycService';
import { KycStatus } from '../types/dataModels';

type KycVerificationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'KycVerification'
>;

interface PhotoState {
  uri: string | null;
  uploading: boolean;
  uploaded: boolean;
  storageUrl: string | null;
}

const KycVerificationScreen: React.FC = () => {
  const navigation = useNavigation<KycVerificationScreenNavigationProp>();
  const { profileId } = useAuth();

  const [idPhoto, setIdPhoto] = useState<PhotoState>({
    uri: null,
    uploading: false,
    uploaded: false,
    storageUrl: null,
  });

  const [selfiePhoto, setSelfiePhoto] = useState<PhotoState>({
    uri: null,
    uploading: false,
    uploaded: false,
    storageUrl: null,
  });

  const [idSelfiePhoto, setIdSelfiePhoto] = useState<PhotoState>({
    uri: null,
    uploading: false,
    uploaded: false,
    storageUrl: null,
  });

  const [kycStatus, setKycStatus] = useState<KycStatus>('not_started');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId] = useState(`submission_${Date.now()}`);

  useEffect(() => {
    loadKycStatus();
  }, []);

  const loadKycStatus = async () => {
    if (!profileId) return;
    
    setLoading(true);
    try {
      const status = await kycService.getKycStatus(profileId);
      setKycStatus(status);

      // Load latest submission if exists
      const latestSubmission = await kycService.getLatestSubmission(profileId);
      if (latestSubmission) {
        // Could display submission info here if needed
      }
    } catch (error) {
      console.error('Error loading KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'カメラ権限が必要です',
        'カメラへのアクセスが拒否されました。設定を確認してください。'
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'ライブラリ権限が必要です',
        'ファイルへのアクセスが拒否されました。設定を確認してください。'
      );
      return false;
    }
    return true;
  };

  const handleCameraCapture = async (
    photoType: 'id' | 'selfie' | 'idSelfie'
  ) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSelected(result.assets[0], photoType);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('エラー', '写真の撮影に失敗しました。');
    }
  };

  const handleFileSelect = async (
    photoType: 'id' | 'selfie' | 'idSelfie'
  ) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSelected(result.assets[0], photoType);
      }
    } catch (error) {
      console.error('File select error:', error);
      Alert.alert('エラー', 'ファイルの選択に失敗しました。');
    }
  };

  const handleImageSelected = async (
    asset: ImagePicker.ImagePickerAsset,
    photoType: 'id' | 'selfie' | 'idSelfie'
  ) => {
    // Validate image
    const validation = await validateKycImage({
      uri: asset.uri,
      type: asset.mimeType,
      size: asset.fileSize,
    });

    if (!validation.ok) {
      Alert.alert('画像エラー', validation.message);
      return;
    }

    // Set photo state and upload
    const setPhotoState =
      photoType === 'id'
        ? setIdPhoto
        : photoType === 'selfie'
        ? setSelfiePhoto
        : setIdSelfiePhoto;

    setPhotoState({
      uri: asset.uri,
      uploading: true,
      uploaded: false,
      storageUrl: null,
    });

    // Upload to storage
    await uploadPhoto(asset.uri, photoType);
  };

  const uploadPhoto = async (
    uri: string,
    photoType: 'id' | 'selfie' | 'idSelfie'
  ) => {
    if (!profileId) return;

    try {
      const imageType =
        photoType === 'id'
          ? 'id_photo'
          : photoType === 'selfie'
          ? 'selfie'
          : 'id_selfie';

      const { url, error } = await kycService.uploadKycImage(
        uri,
        profileId,
        submissionId,
        imageType
      );

      const setPhotoState =
        photoType === 'id'
          ? setIdPhoto
          : photoType === 'selfie'
          ? setSelfiePhoto
          : setIdSelfiePhoto;

      if (error) {
        Alert.alert(
          'アップロードエラー',
          'アップロードに失敗しました。ネットワークを確認してください。'
        );
        setPhotoState({
          uri,
          uploading: false,
          uploaded: false,
          storageUrl: null,
        });
        return;
      }

      setPhotoState({
        uri,
        uploading: false,
        uploaded: true,
        storageUrl: url,
      });
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('エラー', 'アップロードに失敗しました。');
    }
  };

  const handleDeletePhoto = (photoType: 'id' | 'selfie' | 'idSelfie') => {
    const setPhotoState =
      photoType === 'id'
        ? setIdPhoto
        : photoType === 'selfie'
        ? setSelfiePhoto
        : setIdSelfiePhoto;

    setPhotoState({
      uri: null,
      uploading: false,
      uploaded: false,
      storageUrl: null,
    });
  };

  const handleSubmit = async () => {
    if (
      !profileId ||
      !idPhoto.storageUrl ||
      !selfiePhoto.storageUrl ||
      !idSelfiePhoto.storageUrl
    ) {
      Alert.alert('エラー', '3点すべての写真を提出してください。');
      return;
    }

    setSubmitting(true);

    try {
      const result = await kycService.createSubmission(
        profileId,
        idPhoto.storageUrl,
        selfiePhoto.storageUrl,
        idSelfiePhoto.storageUrl
      );

      if (result.success) {
        Alert.alert(
          '申請完了',
          '本人確認の申請を受け付けました。結果は24-48時間以内にお知らせします。',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('エラー', result.error || '申請に失敗しました。');
      }
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('エラー', '申請に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    idPhoto.uploaded && selfiePhoto.uploaded && idSelfiePhoto.uploaded;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StandardHeader
          title="本人確認認証"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StandardHeader
        title="本人確認認証"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Card */}
        {kycStatus !== 'not_started' && (
          <View style={styles.statusCard}>
            <View style={styles.statusContent}>
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={
                  kycStatus === 'approved'
                    ? Colors.success
                    : kycStatus === 'pending_review'
                    ? Colors.primary
                    : Colors.error
                }
              />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>ステータス</Text>
                <Text
                  style={[
                    styles.statusValue,
                    kycStatus === 'approved' && styles.statusApproved,
                    kycStatus === 'pending_review' && styles.statusPending,
                    (kycStatus === 'retry' || kycStatus === 'rejected') &&
                      styles.statusError,
                  ]}
                >
                  {kycStatus === 'approved'
                    ? '認証済み'
                    : kycStatus === 'pending_review'
                    ? '審査中'
                    : kycStatus === 'retry'
                    ? '再提出必要'
                    : '未認証'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>本人確認について</Text>
          <Text style={styles.instructionText}>
            以下の3点の写真を撮影してご提出ください：
          </Text>
          <Text style={styles.instructionText}>
            1. 顔写真付き公的身分証明書{'\n'}
            2. 本人の顔写真（セルフィー）{'\n'}
            3. 身分証を持った状態の自撮り写真
          </Text>
        </View>

        {/* Step 1: ID Photo */}
        <PhotoCaptureCard
          title="身分証の写し"
          subtitle="運転免許証、パスポート、マイナンバーカード、在留カード"
          instructions={[
            '書類全体が写るように撮影してください',
            '明るい自然光の下で撮影してください',
            'ぼやけないように注意してください',
            '加工・編集はしないでください',
          ]}
          photo={idPhoto}
          onCameraPress={() => handleCameraCapture('id')}
          onFilePress={() => handleFileSelect('id')}
          onDeletePress={() => handleDeletePhoto('id')}
        />

        {/* Step 2: Selfie */}
        <PhotoCaptureCard
          title="セルフィー"
          subtitle="本人の顔写真"
          instructions={[
            'カメラに正面を向いてください',
            '明るい場所で撮影してください',
            'サングラスや帽子は外してください',
            'フィルターは使用しないでください',
          ]}
          photo={selfiePhoto}
          onCameraPress={() => handleCameraCapture('selfie')}
          onFilePress={() => handleFileSelect('selfie')}
          onDeletePress={() => handleDeletePhoto('selfie')}
        />

        {/* Step 3: ID with Selfie */}
        <PhotoCaptureCard
          title="身分証と自撮り"
          subtitle="身分証を持った状態の自撮り"
          instructions={[
            '身分証を顔の横に持ってください',
            '顔と身分証の両方が鮮明に写るようにしてください',
            'カメラに正面を向いてください',
            '身分証の文字が読めるようにしてください',
          ]}
          photo={idSelfiePhoto}
          onCameraPress={() => handleCameraCapture('idSelfie')}
          onFilePress={() => handleFileSelect('idSelfie')}
          onDeletePress={() => handleDeletePhoto('idSelfie')}
        />

        {/* Submit Button */}
        <Button
          title={submitting ? '申請中...' : '本人確認を申請する'}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

interface PhotoCaptureCardProps {
  title: string;
  subtitle: string;
  instructions: string[];
  photo: PhotoState;
  onCameraPress: () => void;
  onFilePress: () => void;
  onDeletePress: () => void;
}

const PhotoCaptureCard: React.FC<PhotoCaptureCardProps> = ({
  title,
  subtitle,
  instructions,
  photo,
  onCameraPress,
  onFilePress,
  onDeletePress,
}) => {
  return (
    <View style={styles.photoCard}>
      <View style={styles.photoCardHeader}>
        <Ionicons name="camera" size={24} color={Colors.primary} />
        <View style={styles.photoCardTitleContainer}>
          <Text style={styles.photoCardTitle}>{title}</Text>
          <Text style={styles.photoCardSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.instructionsContainer}>
        {instructions.map((instruction, index) => (
          <Text key={index} style={styles.instructionItem}>
            • {instruction}
          </Text>
        ))}
      </View>

      {/* Image Preview */}
      <View style={styles.imagePreviewContainer}>
        {photo.uri ? (
          <Image source={{ uri: photo.uri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={Colors.gray[400]} />
            <Text style={styles.placeholderText}>写真なし</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!photo.uri && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onFilePress}
              disabled={photo.uploading}
            >
              <Ionicons name="folder-open" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>ファイル選択</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={onCameraPress}
              disabled={photo.uploading}
            >
              <Ionicons name="camera" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>カメラで撮影</Text>
            </TouchableOpacity>
          </>
        )}

        {photo.uri && (
          <>
            {photo.uploading && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.uploadingText}>アップロード中...</Text>
              </View>
            )}

            {photo.uploaded && (
              <View style={styles.uploadedContainer}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.uploadedText}>アップロード完了</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onDeletePress}
              disabled={photo.uploading}
            >
              <Ionicons name="trash" size={20} color={Colors.error} />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>削除</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  statusTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
  },
  statusApproved: {
    color: Colors.success,
  },
  statusPending: {
    color: Colors.primary,
  },
  statusError: {
    color: Colors.error,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  instructionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  photoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  photoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoCardTitleContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  photoCardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
  },
  photoCardSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  instructionsContainer: {
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  instructionItem: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  imagePreviewContainer: {
    marginBottom: Spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.sm,
    resizeMode: 'contain',
    backgroundColor: Colors.gray[100],
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[400],
    marginTop: Spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  deleteButton: {
    borderColor: Colors.error,
  },
  deleteButtonText: {
    color: Colors.error,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  uploadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  uploadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  uploadedText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
});

export default KycVerificationScreen;
