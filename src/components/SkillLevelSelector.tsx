import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Spacing, BorderRadius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { SKILL_LEVELS } from "../constants/filterOptions";

interface SkillLevelSelectorProps {
  visible: boolean;
  selectedSkillLevel: string | undefined;
  onClose: () => void;
  onApply: (skillLevel: string | undefined) => void;
}

const SkillLevelSelector: React.FC<SkillLevelSelectorProps> = ({
  visible,
  selectedSkillLevel,
  onClose,
  onApply,
}) => {
  const [tempSelected, setTempSelected] = React.useState<string | undefined>(
    selectedSkillLevel
  );

  React.useEffect(() => {
    setTempSelected(selectedSkillLevel);
  }, [selectedSkillLevel, visible]);

  const handleApply = () => {
    onApply(tempSelected);
    onClose();
  };

  const handleClear = () => {
    setTempSelected(undefined);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.gray[600]} />
          </TouchableOpacity>
          <Text style={styles.title}>ゴルフレベル</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearButton}>クリア</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {SKILL_LEVELS.map((skill) => {
            const isSelected = tempSelected === skill.value;
            return (
              <TouchableOpacity
                key={skill.value}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => setTempSelected(skill.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {skill.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>適用</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  clearButton: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.white,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  optionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  actionButtons: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

export default SkillLevelSelector;

