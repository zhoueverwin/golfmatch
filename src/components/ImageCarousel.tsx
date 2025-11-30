import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Text,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Image as ExpoImage, ImageLoadEventData } from "expo-image";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

const { width } = Dimensions.get("window");

// Standard aspect ratios used in post creation
const ASPECT_RATIOS = {
  square: 1,        // 1:1 (1080x1080)
  portrait: 4 / 5,  // 4:5 (1080x1350)
  landscape: 1.91,  // 1.91:1 (1080x566)
};

interface ImageCarouselProps {
  images: string[];
  style?: any;
  onImagePress?: (index: number) => void;
  fullWidth?: boolean; // New prop for full-width images
  aspectRatio?: number; // Aspect ratio from post data (width/height)
}

const ImageCarousel: React.FC<ImageCarouselProps> = memo(({
  images,
  style,
  onImagePress,
  fullWidth = false,
  aspectRatio: providedAspectRatio,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<number | null>(null);

  // Reset detected aspect ratio when images change
  useEffect(() => {
    setDetectedAspectRatio(null);
  }, [images]);

  // Calculate dimensions based on fullWidth prop and detected aspect ratio
  const imageWidth = fullWidth ? width : (width - Spacing.md * 2) / 2;

  // Use provided aspect ratio first, then detected, otherwise default to square for fullWidth
  const getImageHeight = () => {
    if (!fullWidth) {
      return imageWidth * 0.75; // 4:3 aspect ratio for non-fullWidth
    }

    // Use provided aspect ratio from post data if available
    if (providedAspectRatio !== undefined && providedAspectRatio > 0) {
      return imageWidth / providedAspectRatio;
    }

    // Fall back to detected aspect ratio from loaded image
    if (detectedAspectRatio !== null) {
      return imageWidth / detectedAspectRatio;
    }

    // Default to square while loading
    return imageWidth;
  };

  const imageHeight = getImageHeight();

  // Handle image load to detect aspect ratio - memoized
  const handleImageLoad = useCallback((event: ImageLoadEventData) => {
    if (event.source) {
      const { width: imgWidth, height: imgHeight } = event.source;
      if (imgWidth && imgHeight) {
        const ratio = imgWidth / imgHeight;
        // Snap to closest standard aspect ratio for consistency
        if (ratio > 1.5) {
          setDetectedAspectRatio(ASPECT_RATIOS.landscape);
        } else if (ratio < 0.9) {
          setDetectedAspectRatio(ASPECT_RATIOS.portrait);
        } else {
          setDetectedAspectRatio(ASPECT_RATIOS.square);
        }
      }
    }
  }, []);

  // Memoized scroll handler to prevent recreation on each render
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / imageWidth);
    setCurrentIndex(index);
  }, [imageWidth]);

  const scrollToIndex = useCallback((index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * imageWidth,
      animated: true,
    });
  }, [imageWidth]);

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity onPress={() => onImagePress?.(0)} activeOpacity={0.9}>
          <ExpoImage
            source={{ uri: images[0] }}
            style={[
              {
                width: imageWidth,
                height: imageHeight,
                borderRadius: fullWidth ? 0 : BorderRadius.md,
              }
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            onLoad={fullWidth ? handleImageLoad : undefined}
          />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={[styles.scrollView, fullWidth && { borderRadius: 0 }]}
      >
        {images.map((image, index) => (
          <TouchableOpacity
            key={image}
            style={{ width: imageWidth, height: imageHeight }}
            onPress={() => onImagePress?.(index)}
            activeOpacity={0.9}
          >
            <ExpoImage
              source={{ uri: image }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: fullWidth ? 0 : BorderRadius.md,
              }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              onLoad={fullWidth && index === 0 ? handleImageLoad : undefined}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Image indicators */}
      {images.length > 1 && (
        <View style={styles.indicators}>
          {images.map((image, index) => (
            <TouchableOpacity
              key={`indicator-${image}`}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator,
              ]}
              onPress={() => scrollToIndex(index)}
            />
          ))}
        </View>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.fullWidth === nextProps.fullWidth &&
    prevProps.aspectRatio === nextProps.aspectRatio &&
    prevProps.images.length === nextProps.images.length &&
    prevProps.images.every((img, i) => img === nextProps.images[i])
  );
});

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  scrollView: {
    borderRadius: BorderRadius.md,
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray[300],
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: Colors.primary,
  },
  counter: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  counterText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Typography.getFontFamily("600"),
  },
});

export default ImageCarousel;
