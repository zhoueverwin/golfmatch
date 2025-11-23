import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Text,
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
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  style,
  onImagePress,
  fullWidth = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Calculate dimensions based on fullWidth prop
  const imageWidth = fullWidth ? width : (width - Spacing.md * 2) / 2;
  const imageHeight = fullWidth ? width * 1.0 : imageWidth * 0.75; // Full-width: 1:1 (square), regular: 4:3 aspect ratio

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / imageWidth);
    setCurrentIndex(index);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * imageWidth,
      animated: true,
    });
  };

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
            transition={200}
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
            key={index}
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
              transition={200}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Image indicators */}
      {images.length > 1 && (
        <View style={styles.indicators}>
          {images.map((_, index) => (
            <TouchableOpacity
              key={index}
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
};

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
