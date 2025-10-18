import React from "react";
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../constants/colors";
import { Spacing, BorderRadius, Dimensions } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { Shadows } from "../constants/spacing";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.lg,
      ...Shadows.small,
    };

    // Size styles
    switch (size) {
      case "small":
        baseStyle.height = Dimensions.buttonHeightSmall;
        baseStyle.paddingHorizontal = Spacing.md;
        break;
      case "large":
        baseStyle.height = Dimensions.buttonHeightLarge;
        baseStyle.paddingHorizontal = Spacing.xl;
        break;
      default:
        baseStyle.height = Dimensions.buttonHeight;
        baseStyle.paddingHorizontal = Spacing.lg;
    }

    // Variant styles
    switch (variant) {
      case "primary":
        baseStyle.backgroundColor = disabled
          ? Colors.gray[300]
          : Colors.primary;
        break;
      case "secondary":
        baseStyle.backgroundColor = disabled
          ? Colors.gray[200]
          : Colors.gray[100];
        break;
      case "outline":
        baseStyle.backgroundColor = "transparent";
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = disabled ? Colors.gray[300] : Colors.primary;
        break;
      case "ghost":
        baseStyle.backgroundColor = "transparent";
        baseStyle.shadowOpacity = 0;
        baseStyle.elevation = 0;
        break;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = "100%";
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: Typography.fontWeight.semibold,
      textAlign: "center",
    };

    // Size styles
    switch (size) {
      case "small":
        baseStyle.fontSize = Typography.fontSize.sm;
        break;
      case "large":
        baseStyle.fontSize = Typography.fontSize.lg;
        break;
      default:
        baseStyle.fontSize = Typography.fontSize.base;
    }

    // Variant styles
    switch (variant) {
      case "primary":
        baseStyle.color = disabled ? Colors.gray[500] : Colors.white;
        break;
      case "secondary":
        baseStyle.color = disabled ? Colors.gray[500] : Colors.text.primary;
        break;
      case "outline":
        baseStyle.color = disabled ? Colors.gray[400] : Colors.primary;
        break;
      case "ghost":
        baseStyle.color = disabled ? Colors.gray[400] : Colors.primary;
        break;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? Colors.white : Colors.primary}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;
