import React from 'react';
import {
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Shadows } from '../constants/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  shadow?: 'small' | 'medium' | 'large' | 'none';
  padding?: 'none' | 'small' | 'medium' | 'large';
  backgroundColor?: string;
  borderRadius?: number;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  shadow = 'medium',
  padding = 'medium',
  backgroundColor = Colors.white,
  borderRadius = BorderRadius.lg,
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return Spacing.sm;
      case 'large':
        return Spacing.lg;
      default:
        return Spacing.md;
    }
  };

  const getShadow = () => {
    if (shadow === 'none') return {};
    return Shadows[shadow];
  };

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderRadius,
    padding: getPadding(),
    ...getShadow(),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
};

export default Card;
