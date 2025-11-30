import React, { useState, useRef, useCallback, memo } from "react";
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
import { Image as ExpoImage } from "expo-image";

import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";

const { width } = Dimensions.get("window");

interface ImageCarouselProps {
  images: string[];
  style?: any;
  onImagePress?: (index: number) => void;
  fullWidth?: boolean; // New prop for full-width images
  aspectRatio?: number; // Aspect ratio from post data (width/height)
}

// Fixed indicator height to prevent layout shifts
// marginTop (8px) + indicator height (8px) = 16px
const INDICATOR_ROW_HEIGHT = Spacing.sm + 8;

const ImageCarousel: React.FC<ImageCarouselProps> = memo(({
  images,
  style,
  onImagePress,
  fullWidth = false,
  aspectRatio: providedAspectRatio,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Whether to show indicators (2+ images)
  const hasMultipleImages = images.length > 1;

  // Calculate dimensions based on fullWidth prop
  const imageWidth = fullWidth ? width : (width - Spacing.md * 2) / 2;

  // Use provided aspect ratio, default to square (1:1) for old posts without ratio
  // This prevents layout shifts from dynamic detection during scroll
  const getImageHeight = () => {
    if (!fullWidth) {
      return imageWidth * 0.75; // 4:3 aspect ratio for non-fullWidth
    }

    // Use provided aspect ratio from post data if available
    if (providedAspectRatio !== undefined && providedAspectRatio > 0) {
      return imageWidth / providedAspectRatio;
    }

    // Default to square (1:1) for old posts without aspect_ratio
    // This prevents scroll hitching from layout shifts
    return imageWidth;
  };

  const imageHeight = getImageHeight();
  
  // Calculate total container height including indicators for multi-image posts
  // This prevents layout shifts when FlashList recycles items
  const containerHeight = hasMultipleImages 
    ? imageHeight + INDICATOR_ROW_HEIGHT 
    : imageHeight;

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
      <View style={[styles.container, { height: containerHeight }, style]}>
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
            placeholderContentFit="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: containerHeight }, style]}>
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
              placeholderContentFit="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Image indicators - always rendered with fixed height to prevent layout shifts */}
      {hasMultipleImages && (
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

      {/* Image counter - positioned absolutely, doesn't affect layout */}
      {hasMultipleImages && (
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
