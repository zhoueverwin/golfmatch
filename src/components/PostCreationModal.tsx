import React, { useState, useRef, useCallback, useMemo } from "react";
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
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Animated,
  PanResponder,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "../contexts/AuthContext";
import { storageService } from "../services/storageService";
import { supabase } from "../services/supabase";
import { membershipService } from "../services/membershipService";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

const { width, height } = Dimensions.get("window");
const GALLERY_ITEM_SIZE = width / 4;

// Aspect ratio options for Instagram-style posts
type AspectRatioType = "square" | "portrait" | "landscape";

interface AspectRatioOption {
  type: AspectRatioType;
  label: string;
  ratio: number;
  outputWidth: number;
  outputHeight: number;
}

const ASPECT_RATIOS: AspectRatioOption[] = [
  { type: "square", label: "1:1", ratio: 1, outputWidth: 1080, outputHeight: 1080 },
  { type: "portrait", label: "4:5", ratio: 4 / 5, outputWidth: 1080, outputHeight: 1350 },
  { type: "landscape", label: "1.91:1", ratio: 1.91, outputWidth: 1080, outputHeight: 566 },
];

// Video aspect ratio options (similar to images)
const VIDEO_ASPECT_RATIOS: AspectRatioOption[] = [
  { type: "square", label: "1:1", ratio: 1, outputWidth: 1080, outputHeight: 1080 },
  { type: "portrait", label: "4:5", ratio: 4 / 5, outputWidth: 1080, outputHeight: 1350 },
  { type: "landscape", label: "1.91:1", ratio: 1.91, outputWidth: 1080, outputHeight: 566 },
];

// Media type for gallery selection
type MediaType = "image" | "video";

interface PostCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onPublish: (postData: {
    text: string;
    images: string[];
    videos: string[];
    aspectRatio?: number;
  }) => void;
  editingPost?: {
    text: string;
    images: string[];
    videos: string[];
  } | null;
}

interface CroppedImage {
  uri: string;
  aspectRatio: AspectRatioOption;
}

interface GalleryAsset {
  id: string;
  uri: string;
  width: number;
  height: number;
  mediaType: MediaType;
  duration?: number; // Duration in seconds for videos
  thumbnail?: string; // Thumbnail URI for videos
}

// View modes for the modal
type ViewMode = "compose" | "gallery" | "crop" | "videoCrop";

const PostCreationModal: React.FC<PostCreationModalProps> = ({
  visible,
  onClose,
  onPublish,
  editingPost,
}) => {
  const { profileId } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // Compose view state
  const [text, setText] = useState(editingPost?.text || "");
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);
  const [videos, setVideos] = useState<string[]>(editingPost?.videos || []);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("compose");

  // Gallery view state
  const [galleryAssets, setGalleryAssets] = useState<GalleryAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<GalleryAsset[]>([]); // Multi-select support
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatioOption>(ASPECT_RATIOS[1]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [galleryMediaType, setGalleryMediaType] = useState<MediaType>("image"); // Toggle between image/video gallery

  // Crop view state
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  const [currentCropIndex, setCurrentCropIndex] = useState(0); // Current image being cropped
  const [panOffsetsPerImage, setPanOffsetsPerImage] = useState<{ x: number; y: number }[]>([]); // Store pan offsets for each image

  // Video crop state
  const [selectedVideo, setSelectedVideo] = useState<GalleryAsset | null>(null);
  const [videoLocalUri, setVideoLocalUri] = useState<string | null>(null); // Local URI for video upload
  const [videoPanOffset, setVideoPanOffset] = useState({ x: 0, y: 0 });
  const [selectedVideoAspectRatio, setSelectedVideoAspectRatio] = useState<AspectRatioOption>(VIDEO_ASPECT_RATIOS[1]); // Default to 4:5 portrait

  // Animated values for pan gesture (using React Native's built-in Animated)
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const panOffset = useRef({ x: 0, y: 0 });
  const maxPanBounds = useRef({ x: 0, y: 0 });

  // Get current asset being cropped
  const currentCropAsset = selectedAssets[currentCropIndex] || null;

  const images = croppedImages.map(img => img.uri);

  // Reset form when editingPost changes
  React.useEffect(() => {
    if (editingPost) {
      setText(editingPost.text || "");
      setCroppedImages(editingPost.images.map(uri => ({
        uri,
        aspectRatio: ASPECT_RATIOS[1],
      })));
      setVideos(editingPost.videos || []);
    }
  }, [editingPost]);

  // Reset view mode when modal closes
  React.useEffect(() => {
    if (!visible) {
      setViewMode("compose");
      setSelectedAssets([]);
      setGalleryAssets([]);
      setEndCursor(undefined);
      setHasNextPage(true);
      setCurrentCropIndex(0);
      setPanOffsetsPerImage([]);
      setGalleryMediaType("image");
      setSelectedVideo(null);
      setVideoLocalUri(null);
      setVideoPanOffset({ x: 0, y: 0 });
      setSelectedVideoAspectRatio(VIDEO_ASPECT_RATIOS[1]); // Reset to default 4:5
    }
  }, [visible]);

  // Get local URI for video (needed for upload)
  const getVideoLocalUri = async (assetId: string): Promise<string | null> => {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
      return assetInfo.localUri || assetInfo.uri;
    } catch (error) {
      console.error("Error getting video local URI:", error);
      return null;
    }
  };

  // Load gallery when entering gallery view
  const loadGallery = async (mediaType: MediaType = galleryMediaType) => {
    try {
      setIsLoadingGallery(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === "granted");

      if (status === "granted") {
        const mediaResult = await MediaLibrary.getAssetsAsync({
          mediaType: mediaType === "video" ? MediaLibrary.MediaType.video : MediaLibrary.MediaType.photo,
          first: 50,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        // ExpoImage can handle MediaLibrary URIs directly (same as images)
        const assets: GalleryAsset[] = mediaResult.assets.map((asset) => ({
          id: asset.id,
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          mediaType: mediaType,
          duration: asset.duration,
        }));

        setGalleryAssets(assets);
        setEndCursor(mediaResult.endCursor);
        setHasNextPage(mediaResult.hasNextPage);
        // Don't auto-select - let user choose
      }
    } catch (error) {
      console.error("Error loading gallery:", error);
      Alert.alert("エラー", mediaType === "video" ? "動画の読み込みに失敗しました。" : "写真の読み込みに失敗しました。");
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const loadMoreGallery = async () => {
    if (!hasNextPage || isLoadingGallery || !endCursor) return;

    try {
      setIsLoadingGallery(true);
      const mediaResult = await MediaLibrary.getAssetsAsync({
        mediaType: galleryMediaType === "video" ? MediaLibrary.MediaType.video : MediaLibrary.MediaType.photo,
        first: 50,
        after: endCursor,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      // ExpoImage can handle MediaLibrary URIs directly (same as images)
      const newAssets: GalleryAsset[] = mediaResult.assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mediaType: galleryMediaType,
        duration: asset.duration,
      }));

      setGalleryAssets(prev => [...prev, ...newAssets]);
      setEndCursor(mediaResult.endCursor);
      setHasNextPage(mediaResult.hasNextPage);
    } catch (error) {
      console.error("Error loading more gallery:", error);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  // Switch between image and video gallery
  const handleSwitchMediaType = (mediaType: MediaType) => {
    if (mediaType !== galleryMediaType) {
      setGalleryMediaType(mediaType);
      setSelectedAssets([]);
      setSelectedVideo(null);
      setGalleryAssets([]);
      setEndCursor(undefined);
      setHasNextPage(true);
      loadGallery(mediaType);
    }
  };

  const handleOpenGallery = () => {
    if (videos.length > 0) {
      Alert.alert(
        "メディア制限",
        "動画が選択されています。画像と動画は同時に投稿できません。",
      );
      return;
    }

    if (croppedImages.length >= 5) {
      Alert.alert("画像制限", "一度に投稿できる画像は5枚までです。");
      return;
    }

    setGalleryMediaType("image");
    setViewMode("gallery");
    loadGallery("image");
  };

  const handleOpenVideoGallery = () => {
    if (croppedImages.length > 0) {
      Alert.alert(
        "メディア制限",
        "画像が選択されています。画像と動画は同時に投稿できません。",
      );
      return;
    }

    if (videos.length >= 1) {
      Alert.alert("動画制限", "一度に投稿できる動画は1つまでです。");
      return;
    }

    setGalleryMediaType("video");
    setViewMode("gallery");
    loadGallery("video");
  };

  // Multi-select handler - toggle selection (for images) or single select (for videos)
  const handleSelectAsset = (asset: GalleryAsset) => {
    if (galleryMediaType === "video") {
      // Single selection for videos
      if (selectedVideo?.id === asset.id) {
        setSelectedVideo(null);
      } else {
        setSelectedVideo(asset);
      }
    } else {
      // Multi-selection for images
      const maxSelectable = 5 - croppedImages.length;
      const existingIndex = selectedAssets.findIndex(a => a.id === asset.id);

      if (existingIndex >= 0) {
        setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
      } else {
        if (selectedAssets.length < maxSelectable) {
          setSelectedAssets(prev => [...prev, asset]);
        } else {
          Alert.alert("画像制限", `一度に選択できる画像は${maxSelectable}枚までです。`);
        }
      }
    }
  };

  const handleProceedToCrop = () => {
    if (galleryMediaType === "video" && selectedVideo) {
      // Video preview view (using ExpoImage like images)
      panX.setValue(0);
      panY.setValue(0);
      panOffset.current = { x: 0, y: 0 };
      setVideoPanOffset({ x: 0, y: 0 });

      // Calculate max pan for video
      const layout = getVideoCropLayout();
      maxPanBounds.current = { x: layout.maxPanX, y: layout.maxPanY };

      setViewMode("videoCrop");
    } else if (selectedAssets.length > 0) {
      // Image crop view
      setPanOffsetsPerImage(selectedAssets.map(() => ({ x: 0, y: 0 })));
      setCurrentCropIndex(0);

      panX.setValue(0);
      panY.setValue(0);
      panOffset.current = { x: 0, y: 0 };

      const layout = getCropImageLayoutForAsset(selectedAssets[0]);
      maxPanBounds.current = { x: layout.maxPanX, y: layout.maxPanY };

      setViewMode("crop");
    }
  };

  // Calculate the scaled image dimensions for crop (for a specific asset)
  const getCropImageLayoutForAsset = (asset: GalleryAsset | null) => {
    if (!asset || !asset.width || !asset.height) {
      return { imageWidth: 0, imageHeight: 0, cropAreaWidth: 0, cropAreaHeight: 0, maxPanX: 0, maxPanY: 0 };
    }

    const previewDims = getPreviewDimensions();
    const sourceRatio = asset.width / asset.height;
    const targetRatio = selectedAspectRatio.ratio;

    // The crop area dimensions (fixed frame)
    const cropAreaWidth = previewDims.width;
    const cropAreaHeight = previewDims.height;

    // Calculate scaled image dimensions to fill crop area while allowing panning
    let imageWidth: number;
    let imageHeight: number;

    if (sourceRatio > targetRatio) {
      // Image is wider than crop area - scale to match height, allow horizontal pan
      imageHeight = cropAreaHeight;
      imageWidth = cropAreaHeight * sourceRatio;
    } else {
      // Image is taller than crop area - scale to match width, allow vertical pan
      imageWidth = cropAreaWidth;
      imageHeight = cropAreaWidth / sourceRatio;
    }

    // Maximum pan distance
    const maxPanX = Math.max(0, (imageWidth - cropAreaWidth) / 2);
    const maxPanY = Math.max(0, (imageHeight - cropAreaHeight) / 2);

    return {
      imageWidth,
      imageHeight,
      cropAreaWidth,
      cropAreaHeight,
      maxPanX,
      maxPanY
    };
  };

  // Calculate the scaled image dimensions for crop (current asset)
  const getCropImageLayout = () => {
    return getCropImageLayoutForAsset(currentCropAsset);
  };

  // Calculate video preview dimensions based on selected aspect ratio
  // For gallery view, we want a smaller preview; for crop view, we want larger
  const getVideoPreviewDimensions = (forCropView: boolean = false) => {
    const maxWidth = width;
    // Use more height for crop view, less for gallery preview
    // Leave room for header, info bar, and instructions
    const maxHeight = forCropView ? height * 0.50 : height * 0.28;
    const ratio = selectedVideoAspectRatio.ratio;

    let previewWidth: number;
    let previewHeight: number;

    if (ratio >= 1) {
      // Landscape or square - constrain by width
      previewWidth = forCropView ? maxWidth * 0.9 : maxWidth * 0.8;
      previewHeight = previewWidth / ratio;

      if (previewHeight > maxHeight) {
        previewHeight = maxHeight;
        previewWidth = previewHeight * ratio;
      }
    } else {
      // Portrait - constrain by height
      previewHeight = maxHeight;
      previewWidth = previewHeight * ratio;

      if (previewWidth > maxWidth * 0.95) {
        previewWidth = maxWidth * 0.95;
        previewHeight = previewWidth / ratio;
      }
    }

    return { width: previewWidth, height: previewHeight };
  };

  // Calculate video crop layout
  const getVideoCropLayout = () => {
    if (!selectedVideo || !selectedVideo.width || !selectedVideo.height) {
      return { videoWidth: 0, videoHeight: 0, cropAreaWidth: 0, cropAreaHeight: 0, maxPanX: 0, maxPanY: 0 };
    }

    const previewDims = getVideoPreviewDimensions(true); // Use larger dimensions for crop view
    const sourceRatio = selectedVideo.width / selectedVideo.height;
    const targetRatio = selectedVideoAspectRatio.ratio; // Use selected aspect ratio

    const cropAreaWidth = previewDims.width;
    const cropAreaHeight = previewDims.height;

    let videoWidth: number;
    let videoHeight: number;

    // Always scale video larger than crop area to allow panning
    // Use a minimum scale factor of 1.15 to ensure there's always room to pan
    const minScaleFactor = 1.15;

    if (sourceRatio > targetRatio) {
      // Video is wider - scale to match height, allow horizontal pan
      videoHeight = cropAreaHeight * minScaleFactor;
      videoWidth = videoHeight * sourceRatio;
    } else if (sourceRatio < targetRatio) {
      // Video is taller - scale to match width, allow vertical pan
      videoWidth = cropAreaWidth * minScaleFactor;
      videoHeight = videoWidth / sourceRatio;
    } else {
      // Video matches target ratio exactly - still scale up to allow some adjustment
      videoWidth = cropAreaWidth * minScaleFactor;
      videoHeight = cropAreaHeight * minScaleFactor;
    }

    const maxPanX = Math.max(0, (videoWidth - cropAreaWidth) / 2);
    const maxPanY = Math.max(0, (videoHeight - cropAreaHeight) / 2);

    return {
      videoWidth,
      videoHeight,
      cropAreaWidth,
      cropAreaHeight,
      maxPanX,
      maxPanY
    };
  };

  // Save current pan offset before switching images
  const saveCurrentPanOffset = () => {
    setPanOffsetsPerImage(prev => {
      const updated = [...prev];
      updated[currentCropIndex] = { ...panOffset.current };
      return updated;
    });
  };

  // Navigate to previous image in crop view
  const handlePrevImage = () => {
    if (currentCropIndex > 0) {
      saveCurrentPanOffset();
      const newIndex = currentCropIndex - 1;
      setCurrentCropIndex(newIndex);

      // Restore pan offset for the new image
      const savedOffset = panOffsetsPerImage[newIndex] || { x: 0, y: 0 };
      panOffset.current = { ...savedOffset };
      panX.setValue(savedOffset.x);
      panY.setValue(savedOffset.y);

      // Update max pan bounds for the new image
      const layout = getCropImageLayoutForAsset(selectedAssets[newIndex]);
      maxPanBounds.current = { x: layout.maxPanX, y: layout.maxPanY };
    }
  };

  // Navigate to next image in crop view
  const handleNextImage = () => {
    if (currentCropIndex < selectedAssets.length - 1) {
      saveCurrentPanOffset();
      const newIndex = currentCropIndex + 1;
      setCurrentCropIndex(newIndex);

      // Restore pan offset for the new image
      const savedOffset = panOffsetsPerImage[newIndex] || { x: 0, y: 0 };
      panOffset.current = { ...savedOffset };
      panX.setValue(savedOffset.x);
      panY.setValue(savedOffset.y);

      // Update max pan bounds for the new image
      const layout = getCropImageLayoutForAsset(selectedAssets[newIndex]);
      maxPanBounds.current = { x: layout.maxPanX, y: layout.maxPanY };
    }
  };

  // Crop all selected images and add them
  const handleCropAndAdd = async () => {
    if (selectedAssets.length === 0) return;

    setIsProcessingCrop(true);

    // Save the current pan offset first
    saveCurrentPanOffset();

    try {
      const croppedResults: CroppedImage[] = [];

      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i];
        if (!asset.width || !asset.height) continue;

        const layout = getCropImageLayoutForAsset(asset);
        const sourceRatio = asset.width / asset.height;
        const targetRatio = selectedAspectRatio.ratio;

        // Calculate crop dimensions in original image coordinates
        let cropWidth: number;
        let cropHeight: number;

        if (sourceRatio > targetRatio) {
          cropHeight = asset.height;
          cropWidth = cropHeight * targetRatio;
        } else {
          cropWidth = asset.width;
          cropHeight = cropWidth / targetRatio;
        }

        // Get pan offset for this image
        const imagePanOffset = panOffsetsPerImage[i] || { x: 0, y: 0 };
        const scale = layout.imageWidth / asset.width;
        const panOffsetXInOriginal = -imagePanOffset.x / scale;
        const panOffsetYInOriginal = -imagePanOffset.y / scale;

        let originX = (asset.width - cropWidth) / 2 + panOffsetXInOriginal;
        let originY = (asset.height - cropHeight) / 2 + panOffsetYInOriginal;

        originX = Math.max(0, Math.min(asset.width - cropWidth, originX));
        originY = Math.max(0, Math.min(asset.height - cropHeight, originY));

        console.log(`Crop params for image ${i + 1}:`, {
          originalSize: { width: asset.width, height: asset.height },
          cropSize: { width: cropWidth, height: cropHeight },
          origin: { x: originX, y: originY },
          panOffset: imagePanOffset,
          scale
        });

        const manipulationResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [
            {
              crop: {
                originX: Math.round(originX),
                originY: Math.round(originY),
                width: Math.round(cropWidth),
                height: Math.round(cropHeight),
              },
            },
            {
              resize: {
                width: selectedAspectRatio.outputWidth,
                height: selectedAspectRatio.outputHeight,
              },
            },
          ],
          {
            compress: 0.9,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        croppedResults.push({
          uri: manipulationResult.uri,
          aspectRatio: selectedAspectRatio,
        });
      }

      setCroppedImages(prev => [...prev, ...croppedResults].slice(0, 5));

      setViewMode("compose");
      setSelectedAssets([]);
      setCurrentCropIndex(0);
      setPanOffsetsPerImage([]);
    } catch (error) {
      console.error("Error cropping images:", error);
      Alert.alert("エラー", "画像の処理に失敗しました。");
    } finally {
      setIsProcessingCrop(false);
    }
  };

  // Process video: add to compose view
  // Note: Video compression will be handled during upload by the server
  const handleVideoCropAndAdd = async () => {
    if (!selectedVideo) return;

    setIsProcessingCrop(true);

    try {
      // Try to get local URI for upload
      let videoUri = selectedVideo.uri;
      const localUri = await getVideoLocalUri(selectedVideo.id);
      if (localUri) {
        videoUri = localUri;
      }

      // Clean up the URI - remove iOS metadata hash fragment (e.g., #YnBsaXN0...)
      // This fragment is added by iOS for immersive mode recommendations but corrupts the upload path
      const cleanVideoUri = videoUri.split('#')[0];

      console.log("Adding video:", {
        uri: cleanVideoUri,
        originalUri: selectedVideo.uri,
        originalSize: { width: selectedVideo.width, height: selectedVideo.height },
        targetSize: { width: selectedVideoAspectRatio.outputWidth, height: selectedVideoAspectRatio.outputHeight },
      });

      // Use the cleaned URI for upload - compression/resizing will be handled server-side
      setVideos([cleanVideoUri]);
      setViewMode("compose");
      setSelectedVideo(null);
      setVideoLocalUri(null);
      setVideoPanOffset({ x: 0, y: 0 });
    } catch (error) {
      console.error("Error processing video:", error);
      Alert.alert("エラー", "動画の処理に失敗しました。");
    } finally {
      setIsProcessingCrop(false);
    }
  };

  const handleBackFromGallery = () => {
    setViewMode("compose");
    setSelectedAssets([]);
    setSelectedVideo(null);
  };

  const handleBackFromCrop = () => {
    setViewMode("gallery");
    setCurrentCropIndex(0);
    setPanOffsetsPerImage([]);
  };

  const handleBackFromVideoCrop = () => {
    setViewMode("gallery");
    setVideoLocalUri(null);
    setVideoPanOffset({ x: 0, y: 0 });
  };

  // Legacy video picker - now redirects to gallery
  const handleVideoPicker = () => {
    handleOpenVideoGallery();
  };

  const removeImage = (index: number) => {
    setCroppedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const isValidVideoUri = (uri: string): boolean => {
    if (!uri || typeof uri !== "string" || uri.trim() === "") return false;
    const urlPattern = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/;
    const filePattern = /^file:\/\/.+/;
    return urlPattern.test(uri) || filePattern.test(uri);
  };

  const handlePublish = async () => {
    if (!text.trim() && images.length === 0 && videos.length === 0) {
      Alert.alert("投稿内容が必要", "テキスト、画像、または動画のいずれかを入力してください。");
      return;
    }

    const currentUserId = profileId || process.env.EXPO_PUBLIC_TEST_USER_ID;
    if (!currentUserId) {
      Alert.alert("エラー", "ログインしてください。");
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_verified, gender')
        .eq('id', currentUserId)
        .single();

      if (error || !profile) {
        Alert.alert("エラー", "ユーザー情報の取得に失敗しました。");
        return;
      }

      if (!profile.is_verified) {
        Alert.alert(
          "本人確認が必要です",
          "投稿するには本人確認（KYC認証）が必要です。マイページから本人確認を完了してください。",
          [
            { text: "キャンセル", style: "cancel" },
            {
              text: "本人確認へ",
              onPress: () => {
                onClose();
                navigation.navigate("KycVerification");
              },
            },
          ]
        );
        return;
      }

      if (profile.gender !== "female") {
        const membershipResponse = await membershipService.getMembershipInfo(currentUserId);
        const hasActiveMembership = membershipResponse.success &&
                                   membershipResponse.data &&
                                   membershipResponse.data.is_active;

        if (!hasActiveMembership) {
          Alert.alert(
            "有料メンバーシップが必要です",
            "投稿するには有料メンバーシップへの登録が必要です。",
            [
              { text: "キャンセル", style: "cancel" },
              {
                text: "メンバーシップへ",
                onPress: () => {
                  onClose();
                  navigation.navigate("Store");
                },
              },
            ]
          );
          return;
        }
      }
    } catch (error) {
      console.error("Error checking verification:", error);
      Alert.alert("エラー", "認証状態の確認に失敗しました。");
      return;
    }

    const invalidVideos = videos.filter((video) => !isValidVideoUri(video));
    if (invalidVideos.length > 0) {
      Alert.alert("動画エラー", "無効な動画ファイルが含まれています。別の動画を選択してください。");
      return;
    }

    setIsPublishing(true);
    setUploadProgress("");

    try {
      let uploadedImageUrls: string[] = [];
      let uploadedVideoUrls: string[] = [];

      if (images.length > 0) {
        const localImages = images.filter((img) => img.startsWith("file://"));
        const remoteImages = images.filter((img) => !img.startsWith("file://"));

        if (localImages.length > 0) {
          setUploadProgress(`画像をアップロード中... (0/${localImages.length})`);

          for (let i = 0; i < localImages.length; i++) {
            const { url, error } = await storageService.uploadFile(
              localImages[i],
              currentUserId,
              "image"
            );

            if (error) {
              Alert.alert("アップロードエラー", `画像${i + 1}のアップロードに失敗しました。`);
              setIsPublishing(false);
              setUploadProgress("");
              return;
            }

            if (url) uploadedImageUrls.push(url);
            setUploadProgress(`画像をアップロード中... (${i + 1}/${localImages.length})`);
          }
        }

        uploadedImageUrls = [...uploadedImageUrls, ...remoteImages];
      }

      if (videos.length > 0) {
        const videoUri = videos[0];

        if (videoUri.startsWith("file://")) {
          setUploadProgress("動画をアップロード中...");

          const { url, error } = await storageService.uploadVideo(videoUri, currentUserId);

          if (error) {
            Alert.alert("アップロードエラー", "動画のアップロードに失敗しました。");
            setIsPublishing(false);
            setUploadProgress("");
            return;
          }

          if (url) uploadedVideoUrls = [url];
        } else {
          uploadedVideoUrls = videos;
        }
      }

      setUploadProgress("投稿を作成中...");

      // Determine aspect ratio: use video aspect ratio if video exists, otherwise image aspect ratio
      const mediaAspectRatio = uploadedVideoUrls.length > 0
        ? selectedVideoAspectRatio.ratio
        : uploadedImageUrls.length > 0
          ? selectedAspectRatio.ratio
          : undefined;

      await onPublish({
        text: text.trim(),
        images: uploadedImageUrls,
        videos: uploadedVideoUrls,
        aspectRatio: mediaAspectRatio,
      });

      if (!editingPost) {
        setText("");
        setCroppedImages([]);
        setVideos([]);
      }

      setUploadProgress("");
      onClose();
    } catch (error) {
      console.error("Error publishing post:", error);
      Alert.alert("エラー", "投稿の公開中にエラーが発生しました。");
    } finally {
      setIsPublishing(false);
      setUploadProgress("");
    }
  };

  const handleClose = () => {
    const hasChanges = editingPost
      ? text !== editingPost.text ||
        JSON.stringify(images) !== JSON.stringify(editingPost.images) ||
        JSON.stringify(videos) !== JSON.stringify(editingPost.videos)
      : text.trim() || images.length > 0 || videos.length > 0;

    if (hasChanges) {
      Alert.alert(
        editingPost ? "編集を破棄" : "下書きを破棄",
        editingPost
          ? "変更内容が破棄されます。よろしいですか？"
          : "投稿内容が破棄されます。よろしいですか？",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "破棄",
            style: "destructive",
            onPress: () => {
              if (!editingPost) {
                setText("");
                setCroppedImages([]);
                setVideos([]);
              }
              onClose();
            },
          },
        ],
      );
    } else {
      onClose();
    }
  };

  // Calculate preview dimensions based on aspect ratio
  const getPreviewDimensions = () => {
    const maxWidth = width;
    const maxHeight = height * 0.4;
    const ratio = selectedAspectRatio.ratio;

    let previewWidth = maxWidth;
    let previewHeight = maxWidth / ratio;

    if (previewHeight > maxHeight) {
      previewHeight = maxHeight;
      previewWidth = maxHeight * ratio;
    }

    return { width: previewWidth, height: previewHeight };
  };

  // Render Gallery Item
  const renderGalleryItem = ({ item }: { item: GalleryAsset }) => {
    const selectionIndex = selectedAssets.findIndex(a => a.id === item.id);
    const isSelected = selectionIndex >= 0;
    const isAlreadyAdded = images.includes(item.uri);

    return (
      <TouchableOpacity
        style={[styles.galleryItem, isSelected && styles.galleryItemSelected]}
        onPress={() => handleSelectAsset(item)}
        disabled={isAlreadyAdded}
        activeOpacity={0.7}
      >
        <ExpoImage
          source={{ uri: item.uri }}
          style={styles.galleryImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <View style={styles.selectionNumber}>
              <Text style={styles.selectionNumberText}>{selectionIndex + 1}</Text>
            </View>
          </View>
        )}
        {isAlreadyAdded && (
          <View style={styles.addedOverlay}>
            <Text style={styles.addedText}>追加済み</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render Aspect Ratio Button
  const renderAspectRatioButton = (option: AspectRatioOption) => {
    const isSelected = selectedAspectRatio.type === option.type;

    return (
      <TouchableOpacity
        key={option.type}
        style={[styles.aspectRatioButton, isSelected && styles.aspectRatioButtonSelected]}
        onPress={() => setSelectedAspectRatio(option)}
      >
        <View style={[
          styles.aspectRatioPreview,
          {
            aspectRatio: option.ratio,
            width: option.type === "landscape" ? 28 : option.type === "portrait" ? 16 : 20,
          },
        ]} />
        <Text style={[styles.aspectRatioLabel, isSelected && styles.aspectRatioLabelSelected]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render Compose View
  const renderComposeView = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {editingPost ? "投稿を編集" : "新しい投稿"}
          </Text>

          <TouchableOpacity
            onPress={handlePublish}
            style={[
              styles.publishButton,
              !text.trim() && images.length === 0 && videos.length === 0 && styles.publishButtonDisabled,
            ]}
            disabled={isPublishing || (!text.trim() && images.length === 0 && videos.length === 0)}
          >
            <Text style={[
              styles.publishText,
              !text.trim() && images.length === 0 && videos.length === 0 && styles.publishTextDisabled,
            ]}>
              {isPublishing ? "公開中..." : editingPost ? "更新" : "公開"}
            </Text>
          </TouchableOpacity>
        </View>

        {uploadProgress ? (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        ) : null}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

          {(croppedImages.length > 0 || videos.length > 0) && (
            <View style={styles.mediaPreview}>
              {croppedImages.map((img, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Image source={{ uri: img.uri }} style={styles.mediaImage} />
                  <View style={styles.aspectRatioBadge}>
                    <Text style={styles.aspectRatioBadgeText}>{img.aspectRatio.label}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
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
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeVideo(index)}>
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.mediaButtons}>
            <TouchableOpacity
              style={[styles.mediaButton, videos.length > 0 && styles.mediaButtonDisabled]}
              onPress={handleOpenGallery}
              disabled={videos.length > 0}
            >
              <Ionicons name="image-outline" size={24} color={videos.length > 0 ? Colors.gray[400] : Colors.primary} />
              <Text style={[styles.mediaButtonText, videos.length > 0 && styles.mediaButtonTextDisabled]}>
                写真 {croppedImages.length > 0 && `(${croppedImages.length}/5)`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mediaButton, (croppedImages.length > 0 || videos.length >= 1) && styles.mediaButtonDisabled]}
              onPress={handleVideoPicker}
              disabled={croppedImages.length > 0 || videos.length >= 1}
            >
              <Ionicons
                name="videocam-outline"
                size={24}
                color={croppedImages.length > 0 || videos.length >= 1 ? Colors.gray[400] : Colors.primary}
              />
              <Text style={[
                styles.mediaButtonText,
                (croppedImages.length > 0 || videos.length >= 1) && styles.mediaButtonTextDisabled,
              ]}>
                動画 {videos.length >= 1 && "(1/1)"}
              </Text>
            </TouchableOpacity>
          </View>

          {croppedImages.length === 0 && videos.length === 0 && (
            <View style={styles.aspectRatioGuide}>
              <Text style={styles.guideTitle}>サイズのガイド</Text>
              <View style={styles.guideItems}>
                <View style={styles.guideItem}>
                  <View style={[styles.guidePreviewBox, { aspectRatio: 1 }]} />
                  <Text style={styles.guideLabel}>1:1 正方形</Text>
                  <Text style={styles.guideSize}>1080×1080</Text>
                </View>
                <View style={styles.guideItem}>
                  <View style={[styles.guidePreviewBox, { aspectRatio: 4/5 }]} />
                  <Text style={styles.guideLabel}>4:5 縦長</Text>
                  <Text style={styles.guideSize}>1080×1350</Text>
                </View>
                <View style={styles.guideItem}>
                  <View style={[styles.guidePreviewBox, { aspectRatio: 1.91 }]} />
                  <Text style={styles.guideLabel}>1.91:1 横長</Text>
                  <Text style={styles.guideSize}>1080×566</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );

  // Format duration for display (mm:ss)
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Render Gallery View
  const renderGalleryView = () => {
    const previewDimensions = galleryMediaType === "video" ? getVideoPreviewDimensions() : getPreviewDimensions();
    const firstSelectedAsset = selectedAssets[0] || null;
    const maxSelectable = 5 - croppedImages.length;
    const isVideoMode = galleryMediaType === "video";
    const hasSelection = isVideoMode ? !!selectedVideo : selectedAssets.length > 0;

    return (
      <View style={[styles.galleryContainer, { paddingTop: insets.top }]}>
        <View style={styles.galleryHeader}>
          <TouchableOpacity onPress={handleBackFromGallery} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>

          <Text style={styles.galleryHeaderTitle}>
            {isVideoMode
              ? "動画を選択"
              : `写真を選択 ${selectedAssets.length > 0 ? `(${selectedAssets.length}/${maxSelectable})` : ""}`
            }
          </Text>

          <TouchableOpacity
            onPress={handleProceedToCrop}
            style={[styles.nextButton, !hasSelection && styles.nextButtonDisabled]}
            disabled={!hasSelection}
          >
            <Text style={[styles.nextButtonText, !hasSelection && styles.nextButtonTextDisabled]}>
              次へ
            </Text>
          </TouchableOpacity>
        </View>

        {hasPermission === false ? (
          <View style={styles.permissionDenied}>
            <Ionicons name="images-outline" size={64} color={Colors.gray[400]} />
            <Text style={styles.permissionText}>メディアライブラリへのアクセス権限が必要です</Text>
            <Text style={styles.permissionSubtext}>設定アプリから権限を許可してください</Text>
          </View>
        ) : (
          <>
            <View style={[
              styles.previewContainer,
              // Use smaller height for video mode to leave more room for gallery
              isVideoMode && { height: height * 0.32 }
            ]}>
              {isVideoMode && selectedVideo ? (
                <View style={[styles.previewWrapper, previewDimensions]}>
                  {/* Use ExpoImage for video preview - it handles MediaLibrary URIs */}
                  <ExpoImage
                    source={{ uri: selectedVideo.uri }}
                    style={styles.previewImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.videoDurationBadge}>
                    <Ionicons name="play" size={12} color={Colors.white} />
                    <Text style={styles.videoDurationText}>{formatDuration(selectedVideo.duration)}</Text>
                  </View>
                  {/* Play icon overlay */}
                  <View style={styles.videoPlayOverlay}>
                    <Ionicons name="play-circle" size={64} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                </View>
              ) : !isVideoMode && firstSelectedAsset ? (
                <View style={[styles.previewWrapper, previewDimensions]}>
                  <ExpoImage
                    source={{ uri: firstSelectedAsset.uri }}
                    style={styles.previewImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  {selectedAssets.length > 1 && (
                    <View style={styles.multiSelectBadge}>
                      <Text style={styles.multiSelectBadgeText}>+{selectedAssets.length - 1}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.noPreview}>
                  <Ionicons name={isVideoMode ? "videocam-outline" : "images-outline"} size={48} color={Colors.gray[600]} />
                  <Text style={styles.noPreviewText}>
                    {isVideoMode ? "動画を選択してください" : "写真を選択してください"}
                  </Text>
                  <Text style={styles.noPreviewSubtext}>
                    {isVideoMode
                      ? `${selectedVideoAspectRatio.label}サイズ（${selectedVideoAspectRatio.outputWidth}×${selectedVideoAspectRatio.outputHeight}）に変換`
                      : `最大${maxSelectable}枚まで選択できます`}
                  </Text>
                </View>
              )}
            </View>

            {/* Aspect ratio selector - for both images and videos */}
            <View style={styles.aspectRatioSelectorContainer}>
              <Text style={styles.aspectRatioSelectorTitle}>アスペクト比</Text>
              <View style={styles.aspectRatioSelectorOptions}>
                {isVideoMode
                  ? VIDEO_ASPECT_RATIOS.map((option) => (
                      <TouchableOpacity
                        key={option.type}
                        style={[
                          styles.aspectRatioButton,
                          selectedVideoAspectRatio.type === option.type && styles.aspectRatioButtonSelected,
                        ]}
                        onPress={() => setSelectedVideoAspectRatio(option)}
                      >
                        <View style={[
                          styles.aspectRatioPreview,
                          {
                            aspectRatio: option.ratio,
                            width: option.type === "landscape" ? 28 : option.type === "portrait" ? 16 : 20,
                          },
                        ]} />
                        <Text style={[
                          styles.aspectRatioLabel,
                          selectedVideoAspectRatio.type === option.type && styles.aspectRatioLabelSelected,
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))
                  : ASPECT_RATIOS.map(renderAspectRatioButton)
                }
              </View>
            </View>

            <View style={styles.galleryGrid}>
              <FlatList
                data={galleryAssets}
                renderItem={({ item }) => {
                  const isSelected = isVideoMode
                    ? selectedVideo?.id === item.id
                    : selectedAssets.findIndex(a => a.id === item.id) >= 0;
                  const selectionIndex = isVideoMode ? -1 : selectedAssets.findIndex(a => a.id === item.id);
                  const isAlreadyAdded = !isVideoMode && images.includes(item.uri);

                  return (
                    <TouchableOpacity
                      style={[styles.galleryItem, isSelected && styles.galleryItemSelected]}
                      onPress={() => handleSelectAsset(item)}
                      disabled={isAlreadyAdded}
                      activeOpacity={0.7}
                    >
                      <ExpoImage
                        source={{ uri: item.uri }}
                        style={styles.galleryImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                      {/* Video duration overlay */}
                      {item.mediaType === "video" && item.duration && (
                        <View style={styles.galleryVideoDuration}>
                          <Text style={styles.galleryVideoDurationText}>{formatDuration(item.duration)}</Text>
                        </View>
                      )}
                      {/* Selection indicator */}
                      {isSelected && (
                        <View style={styles.selectedOverlay}>
                          {isVideoMode ? (
                            <Ionicons name="checkmark-circle" size={28} color={Colors.white} />
                          ) : (
                            <View style={styles.selectionNumber}>
                              <Text style={styles.selectionNumberText}>{selectionIndex + 1}</Text>
                            </View>
                          )}
                        </View>
                      )}
                      {isAlreadyAdded && (
                        <View style={styles.addedOverlay}>
                          <Text style={styles.addedText}>追加済み</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item.id}
                numColumns={4}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMoreGallery}
                onEndReachedThreshold={0.5}
                // Performance optimizations
                removeClippedSubviews={true}
                maxToRenderPerBatch={12}
                windowSize={5}
                initialNumToRender={16}
                getItemLayout={(_, index) => ({
                  length: GALLERY_ITEM_SIZE,
                  offset: GALLERY_ITEM_SIZE * Math.floor(index / 4),
                  index,
                })}
                ListFooterComponent={
                  isLoadingGallery ? (
                    <View style={styles.loadingFooter}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  !isLoadingGallery ? (
                    <View style={styles.emptyGallery}>
                      <Text style={styles.emptyText}>{isVideoMode ? "動画がありません" : "写真がありません"}</Text>
                    </View>
                  ) : null
                }
              />
            </View>
          </>
        )}
      </View>
    );
  };

  // PanResponder for crop view - uses React Native's built-in Animated
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Store the current offset when gesture starts
        panX.setOffset(panOffset.current.x);
        panY.setOffset(panOffset.current.y);
        panX.setValue(0);
        panY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate clamped values
        const maxX = maxPanBounds.current.x;
        const maxY = maxPanBounds.current.y;

        const newX = Math.max(-maxX, Math.min(maxX, panOffset.current.x + gestureState.dx));
        const newY = Math.max(-maxY, Math.min(maxY, panOffset.current.y + gestureState.dy));

        // Update animated values (subtract offset since it's already applied)
        panX.setValue(newX - panOffset.current.x);
        panY.setValue(newY - panOffset.current.y);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Flatten the offset into the base value
        panX.flattenOffset();
        panY.flattenOffset();

        // Store final position for next gesture
        const maxX = maxPanBounds.current.x;
        const maxY = maxPanBounds.current.y;

        panOffset.current = {
          x: Math.max(-maxX, Math.min(maxX, panOffset.current.x + gestureState.dx)),
          y: Math.max(-maxY, Math.min(maxY, panOffset.current.y + gestureState.dy)),
        };

        // Set the animated values to the clamped position
        panX.setValue(panOffset.current.x);
        panY.setValue(panOffset.current.y);
      },
    })
  ).current;

  // Render Crop View
  const renderCropView = () => {
    const previewDimensions = getPreviewDimensions();
    const layout = getCropImageLayout();
    const totalImages = selectedAssets.length;
    const canGoPrev = currentCropIndex > 0;
    const canGoNext = currentCropIndex < totalImages - 1;

    return (
      <View style={[styles.galleryContainer, { paddingTop: insets.top }]}>
        <View style={styles.galleryHeader}>
          <TouchableOpacity onPress={handleBackFromCrop} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={28} color={Colors.white} />
          </TouchableOpacity>

          <Text style={styles.galleryHeaderTitle}>切り抜き</Text>

          <TouchableOpacity
            onPress={handleCropAndAdd}
            style={[styles.nextButton, isProcessingCrop && styles.nextButtonDisabled]}
            disabled={isProcessingCrop}
          >
            {isProcessingCrop ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.nextButtonText}>完了</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cropPreviewContainer}>
          {currentCropAsset && (
            <View style={[styles.cropPreviewWrapper, previewDimensions]}>
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.cropImageContainer,
                  {
                    width: layout.imageWidth,
                    height: layout.imageHeight,
                    // Center the image initially within the crop area
                    left: (layout.cropAreaWidth - layout.imageWidth) / 2,
                    top: (layout.cropAreaHeight - layout.imageHeight) / 2,
                    transform: [
                      { translateX: panX },
                      { translateY: panY },
                    ],
                  },
                ]}
              >
                <ExpoImage
                  source={{ uri: currentCropAsset.uri }}
                  style={{
                    width: layout.imageWidth,
                    height: layout.imageHeight,
                  }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </Animated.View>
              {/* Crop frame overlay - shows the area that will be kept */}
              <View style={styles.cropFrame} pointerEvents="none">
                <View style={styles.gridContainer}>
                  <View style={[styles.gridLineH, { top: "33.33%" }]} />
                  <View style={[styles.gridLineH, { top: "66.66%" }]} />
                  <View style={[styles.gridLineV, { left: "33.33%" }]} />
                  <View style={[styles.gridLineV, { left: "66.66%" }]} />
                </View>
              </View>

              {/* Navigation arrows for multiple images */}
              {totalImages > 1 && (
                <>
                  {canGoPrev && (
                    <TouchableOpacity
                      style={[styles.cropNavButton, styles.cropNavButtonLeft]}
                      onPress={handlePrevImage}
                    >
                      <Ionicons name="chevron-back" size={32} color={Colors.white} />
                    </TouchableOpacity>
                  )}
                  {canGoNext && (
                    <TouchableOpacity
                      style={[styles.cropNavButton, styles.cropNavButtonRight]}
                      onPress={handleNextImage}
                    >
                      <Ionicons name="chevron-forward" size={32} color={Colors.white} />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Image counter indicator */}
        {totalImages > 1 && (
          <View style={styles.cropImageCounter}>
            <Text style={styles.cropImageCounterText}>
              {currentCropIndex + 1} / {totalImages}
            </Text>
          </View>
        )}

        <View style={styles.cropInfoContainer}>
          <View style={styles.cropAspectRatioInfo}>
            <View style={[
              styles.cropAspectRatioPreview,
              {
                aspectRatio: selectedAspectRatio.ratio,
                width: selectedAspectRatio.type === "landscape" ? 24 : selectedAspectRatio.type === "portrait" ? 14 : 18,
              },
            ]} />
            <Text style={styles.cropAspectRatioText}>{selectedAspectRatio.label}</Text>
          </View>
          <Text style={styles.cropOutputInfo}>
            出力: {selectedAspectRatio.outputWidth} × {selectedAspectRatio.outputHeight} px
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.cropInstructions}>
          {layout.maxPanX > 0 || layout.maxPanY > 0 ? (
            <>
              <Text style={styles.cropInstructionsText}>
                画像をドラッグして切り抜き位置を調整できます
              </Text>
              {selectedAssets.length > 1 && (
                <Text style={styles.cropInstructionsSubtext}>
                  左右の矢印で他の画像に移動できます
                </Text>
              )}
            </>
          ) : (
            <>
              <View style={styles.perfectFitBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.perfectFitText}>サイズぴったり</Text>
              </View>
              <Text style={styles.cropInstructionsSubtext}>
                画像は選択したサイズに最適化されています
              </Text>
              {selectedAssets.length > 1 && (
                <Text style={styles.cropInstructionsSubtext}>
                  左右の矢印で他の画像に移動できます
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // Render Video Crop View
  const renderVideoCropView = () => {
    const previewDimensions = getVideoPreviewDimensions(true); // Use crop view dimensions
    const layout = getVideoCropLayout();

    return (
      <View style={[styles.galleryContainer, { paddingTop: insets.top }]}>
        <View style={styles.galleryHeader}>
          <TouchableOpacity onPress={handleBackFromVideoCrop} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={28} color={Colors.white} />
          </TouchableOpacity>

          <Text style={styles.galleryHeaderTitle}>動画プレビュー</Text>

          <TouchableOpacity
            onPress={handleVideoCropAndAdd}
            style={[styles.nextButton, isProcessingCrop && styles.nextButtonDisabled]}
            disabled={isProcessingCrop}
          >
            {isProcessingCrop ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.nextButtonText}>完了</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cropPreviewContainer}>
          {selectedVideo && (
            <View style={[styles.cropPreviewWrapper, previewDimensions]}>
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.cropImageContainer,
                  {
                    width: layout.videoWidth,
                    height: layout.videoHeight,
                    left: (layout.cropAreaWidth - layout.videoWidth) / 2,
                    top: (layout.cropAreaHeight - layout.videoHeight) / 2,
                    transform: [
                      { translateX: panX },
                      { translateY: panY },
                    ],
                  },
                ]}
              >
                {/* Use ExpoImage for video preview (same as images) */}
                <ExpoImage
                  source={{ uri: selectedVideo.uri }}
                  style={{
                    width: layout.videoWidth,
                    height: layout.videoHeight,
                  }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                {/* Video play icon overlay */}
                <View style={styles.videoPreviewPlayIcon}>
                  <Ionicons name="play-circle" size={72} color="rgba(255, 255, 255, 0.8)" />
                </View>
              </Animated.View>
              {/* Crop frame overlay */}
              <View style={styles.cropFrame} pointerEvents="none">
                <View style={styles.gridContainer}>
                  <View style={[styles.gridLineH, { top: "33.33%" }]} />
                  <View style={[styles.gridLineH, { top: "66.66%" }]} />
                  <View style={[styles.gridLineV, { left: "33.33%" }]} />
                  <View style={[styles.gridLineV, { left: "66.66%" }]} />
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.cropInfoContainer}>
          <View style={styles.cropAspectRatioInfo}>
            <View style={[
              styles.cropAspectRatioPreview,
              {
                aspectRatio: selectedVideoAspectRatio.ratio,
                width: selectedVideoAspectRatio.type === "landscape" ? 24 : selectedVideoAspectRatio.type === "portrait" ? 14 : 18,
              }
            ]} />
            <Text style={styles.cropAspectRatioText}>{selectedVideoAspectRatio.label}</Text>
          </View>
          <Text style={styles.cropOutputInfo}>
            出力: {selectedVideoAspectRatio.outputWidth} × {selectedVideoAspectRatio.outputHeight} px
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.cropInstructions}>
          <Text style={styles.cropInstructionsText}>
            動画をドラッグして切り抜き位置を調整
          </Text>
          <Text style={styles.cropInstructionsSubtext}>
            完了をタップして動画を追加
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      {viewMode === "compose" && renderComposeView()}
      {viewMode === "gallery" && renderGalleryView()}
      {viewMode === "crop" && renderCropView()}
      {viewMode === "videoCrop" && renderVideoCropView()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    padding: Spacing.xs,
    minWidth: 44,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
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
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
  publishTextDisabled: {
    color: Colors.gray[500],
  },
  progressContainer: {
    backgroundColor: Colors.primary + "15",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    textAlign: "center",
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
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    textAlign: "right",
    marginTop: Spacing.xs,
  },
  mediaPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  mediaItem: {
    position: "relative",
    width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
    height: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
  },
  aspectRatioBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aspectRatioBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  videoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    marginTop: Spacing.xs,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  mediaButtons: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  mediaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  mediaButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.primary,
  },
  mediaButtonDisabled: {
    backgroundColor: Colors.gray[100],
  },
  mediaButtonTextDisabled: {
    color: Colors.gray[400],
  },
  aspectRatioGuide: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  guideTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  guideItems: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  guideItem: {
    alignItems: "center",
  },
  guidePreviewBox: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    borderColor: Colors.gray[400],
    borderRadius: 4,
    marginBottom: 4,
  },
  guideLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  guideSize: {
    fontSize: 10,
    color: Colors.gray[500],
  },

  // Gallery View Styles
  galleryContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  galleryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.black,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[800],
  },
  galleryHeaderTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 60,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: Colors.gray[700],
  },
  nextButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
  nextButtonTextDisabled: {
    color: Colors.gray[500],
  },
  previewContainer: {
    height: height * 0.4,
    backgroundColor: Colors.gray[900],
    justifyContent: "center",
    alignItems: "center",
  },
  previewWrapper: {
    overflow: "hidden",
    backgroundColor: Colors.black,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  noPreview: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  aspectRatioSelectorContainer: {
    backgroundColor: Colors.gray[900],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[800],
  },
  aspectRatioSelectorTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[400],
    marginBottom: Spacing.xs,
  },
  aspectRatioSelectorOptions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: Spacing.md,
  },
  aspectRatioButton: {
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray[800],
  },
  aspectRatioButtonSelected: {
    backgroundColor: Colors.primary,
  },
  aspectRatioPreview: {
    height: 20,
    borderWidth: 1.5,
    borderColor: Colors.white,
    borderRadius: 2,
    marginBottom: 4,
  },
  aspectRatioLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[400],
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
  },
  aspectRatioLabelSelected: {
    color: Colors.white,
  },
  galleryGrid: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  galleryItem: {
    width: GALLERY_ITEM_SIZE,
    height: GALLERY_ITEM_SIZE,
    padding: 1,
  },
  galleryItemSelected: {
    opacity: 0.7,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  selectedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    margin: 1,
  },
  addedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    margin: 1,
  },
  addedText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
  },
  loadingFooter: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  emptyGallery: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[500],
  },
  permissionDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  permissionText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
    textAlign: "center",
    marginTop: Spacing.md,
  },
  permissionSubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[400],
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  // Crop View Styles
  cropPreviewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.gray[900],
  },
  cropPreviewWrapper: {
    overflow: "hidden",
    backgroundColor: Colors.black,
    position: "relative",
  },
  cropPreviewImage: {
    width: "100%",
    height: "100%",
  },
  cropFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  gridContainer: {
    flex: 1,
    position: "relative",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  cropInfoContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.gray[900],
    borderTopWidth: 1,
    borderTopColor: Colors.gray[800],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cropAspectRatioInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.gray[800],
    borderRadius: BorderRadius.md,
  },
  cropAspectRatioPreview: {
    height: 18,
    borderWidth: 1.5,
    borderColor: Colors.white,
    borderRadius: 2,
  },
  cropAspectRatioText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
  },
  cropOutputInfo: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[400],
  },
  cropImageContainer: {
    position: "absolute",
  },
  cropInstructions: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl * 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.black,
    alignItems: "center",
  },
  cropInstructionsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[400],
  },
  cropInstructionsSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[500],
    marginTop: Spacing.xs,
  },
  // Selection number badge for multi-select
  selectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  selectionNumberText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.white,
  },
  // Multi-select badge in preview
  multiSelectBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  multiSelectBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
  // No preview state
  noPreviewText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[400],
    marginTop: Spacing.md,
  },
  noPreviewSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    marginTop: Spacing.xs,
  },
  // Crop navigation buttons
  cropNavButton: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cropNavButtonLeft: {
    left: Spacing.sm,
  },
  cropNavButtonRight: {
    right: Spacing.sm,
  },
  // Image counter indicator
  cropImageCounter: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.gray[900],
    alignItems: "center",
  },
  cropImageCounterText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
  // Video-related styles
  videoDurationBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoDurationText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
  },
  galleryVideoDuration: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  galleryVideoDurationText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
  },
  videoInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.gray[900],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[800],
  },
  videoInfoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[400],
  },
  videoPlayOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPreviewPlayIcon: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  perfectFitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  perfectFitText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: "#22c55e",
  },
});

export default PostCreationModal;
