import React, { useState } from "react";
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
import { FilterModalProps, SearchFilters } from "../types";
import AgeDecadeSelector from "./AgeDecadeSelector";
import PrefectureSelector from "./PrefectureSelector";
import SkillLevelSelector from "./SkillLevelSelector";
import ScoreSelector from "./ScoreSelector";
import LastLoginSelector from "./LastLoginSelector";
import {
  getPrefectureLabel,
  getSkillLevelLabel,
  getAgeDecadesLabel,
  getScoreLabel,
  getLastLoginLabel,
} from "../constants/filterOptions";

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  
  // Modal visibility states
  const [showAgeSelector, setShowAgeSelector] = useState(false);
  const [showPrefectureSelector, setShowPrefectureSelector] = useState(false);
  const [showSkillLevelSelector, setShowSkillLevelSelector] = useState(false);
  const [showScoreSelector, setShowScoreSelector] = useState(false);
  const [showLastLoginSelector, setShowLastLoginSelector] = useState(false);

  // Update filters when initialFilters changes
  React.useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleClear = () => {
    setFilters({});
  };

  const handleApply = () => {
    onApply(filters);
  };

  // Handler functions for each filter
  const handleAgeDecadeChange = (decades: number[]) => {
    setFilters({ ...filters, age_decades: decades });
  };

  const handlePrefectureChange = (prefecture: string | undefined) => {
    setFilters({ ...filters, prefecture });
  };

  const handleSkillLevelChange = (skillLevel: string | undefined) => {
    setFilters({ ...filters, golf_skill_level: skillLevel });
  };

  const handleScoreChange = (score: number | undefined) => {
    setFilters({ ...filters, average_score_max: score });
  };

  const handleLastLoginChange = (days: number | null | undefined) => {
    setFilters({ ...filters, last_login_days: days });
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null;
  }).length;

  const FilterItem = ({
    icon,
    title,
    value,
    onPress,
  }: {
    icon: string;
    title: string;
    value: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.filterItem} onPress={onPress}>
      <View style={styles.filterItemLeft}>
        <Ionicons name={icon as any} size={20} color={Colors.gray[600]} />
        <Text style={styles.filterItemTitle}>{title}</Text>
      </View>
      <View style={styles.filterItemRight}>
        <Text style={styles.filterItemValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>こだわり条件</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearButton}>クリア</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Age Decade Filter */}
          <FilterItem
            icon="calendar-outline"
            title="年齢"
            value={getAgeDecadesLabel(filters.age_decades)}
            onPress={() => setShowAgeSelector(true)}
          />

          {/* Prefecture Filter */}
          <FilterItem
            icon="location-outline"
            title="居住地"
            value={getPrefectureLabel(filters.prefecture)}
            onPress={() => setShowPrefectureSelector(true)}
          />

          {/* Skill Level Filter */}
          <FilterItem
            icon="golf-outline"
            title="ゴルフレベル"
            value={getSkillLevelLabel(filters.golf_skill_level)}
            onPress={() => setShowSkillLevelSelector(true)}
          />

          {/* Average Score Filter */}
          <FilterItem
            icon="stats-chart-outline"
            title="平均スコア (以下)"
            value={getScoreLabel(filters.average_score_max)}
            onPress={() => setShowScoreSelector(true)}
          />

          {/* Last Login Filter */}
          <FilterItem
            icon="time-outline"
            title="最終ログイン"
            value={getLastLoginLabel(filters.last_login_days)}
            onPress={() => setShowLastLoginSelector(true)}
          />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.applyButton]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>
              {activeFilterCount > 0
                ? `${activeFilterCount}件の条件を適用`
                : "条件を適用"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Filter Selector Modals */}
      <AgeDecadeSelector
        visible={showAgeSelector}
        selectedDecades={filters.age_decades || []}
        onClose={() => setShowAgeSelector(false)}
        onApply={handleAgeDecadeChange}
      />
      <PrefectureSelector
        visible={showPrefectureSelector}
        selectedPrefecture={filters.prefecture}
        onClose={() => setShowPrefectureSelector(false)}
        onApply={handlePrefectureChange}
      />
      <SkillLevelSelector
        visible={showSkillLevelSelector}
        selectedSkillLevel={filters.golf_skill_level}
        onClose={() => setShowSkillLevelSelector(false)}
        onApply={handleSkillLevelChange}
      />
      <ScoreSelector
        visible={showScoreSelector}
        selectedScore={filters.average_score_max}
        onClose={() => setShowScoreSelector(false)}
        onApply={handleScoreChange}
      />
      <LastLoginSelector
        visible={showLastLoginSelector}
        selectedDays={filters.last_login_days}
        onClose={() => setShowLastLoginSelector(false)}
        onApply={handleLastLoginChange}
      />
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
  },
  filterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  filterItemTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  filterItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterItemValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  actionButtons: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  applyButton: {
    backgroundColor: Colors.primary,
  },
  applyButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  closeButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
  },
});

export default FilterModal;
