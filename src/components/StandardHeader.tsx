import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';

interface StandardHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  backButtonColor?: string;
}

const StandardHeader: React.FC<StandardHeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
  backgroundColor = Colors.white,
  titleColor = Colors.text.primary,
  backButtonColor = Colors.text.primary,
}) => {
  return (
    <View style={[styles.header, { backgroundColor }]}>
      <View style={styles.leftSection}>
        {showBackButton ? (
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={backButtonColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.centerSection}>
        <Text style={[styles.headerTitle, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {rightComponent || <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    minHeight: 56,
  },
  leftSection: {
    width: 40,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  rightSection: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
    height: 24,
  },
});

export default StandardHeader;
