/**
 * RecruitmentFiltersModal Component
 *
 * Modal for filtering recruitment listings.
 * Features:
 * - Prefecture filter (grouped by region)
 * - Course type filter (IN/OUT/THROUGH)
 * - Date range filter
 * - Available slots only toggle
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import {
  RecruitmentFilters,
  CourseType,
  PREFECTURE_REGIONS,
  getCourseTypeLabel,
} from '../types/recruitment';

interface RecruitmentFiltersModalProps {
  visible: boolean;
  filters: RecruitmentFilters;
  onClose: () => void;
  onApply: (filters: RecruitmentFilters) => void;
}

const COURSE_TYPE_OPTIONS: CourseType[] = ['OUT', 'IN', 'THROUGH'];

const RecruitmentFiltersModal: React.FC<RecruitmentFiltersModalProps> = ({
  visible,
  filters,
  onClose,
  onApply,
}) => {
  const [tempFilters, setTempFilters] = useState<RecruitmentFilters>(filters);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  // Reset temp filters when modal opens
  useEffect(() => {
    if (visible) {
      setTempFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApply(tempFilters);
    onClose();
  };

  const handleClear = () => {
    setTempFilters({});
  };

  const updateFilter = <K extends keyof RecruitmentFilters>(
    key: K,
    value: RecruitmentFilters[K]
  ) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleRegion = (region: string) => {
    setExpandedRegion(prev => (prev === region ? null : region));
  };

  const hasActiveFilters =
    tempFilters.prefecture ||
    tempFilters.course_type ||
    tempFilters.has_slots;

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
          <Text style={styles.title}>絞り込み</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={[
              styles.clearButton,
              !hasActiveFilters && styles.clearButtonDisabled,
            ]}>
              クリア
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Available slots toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="people" size={20} color={Colors.primary} />
                <Text style={styles.toggleLabel}>空きがある募集のみ</Text>
              </View>
              <Switch
                value={tempFilters.has_slots || false}
                onValueChange={(value) => updateFilter('has_slots', value)}
                trackColor={{ false: Colors.gray[300], true: Colors.primaryLight }}
                thumbColor={tempFilters.has_slots ? Colors.primary : Colors.gray[100]}
              />
            </View>
          </View>

          {/* Course type filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>コースタイプ</Text>
            <View style={styles.courseTypeContainer}>
              {COURSE_TYPE_OPTIONS.map((type) => {
                const isSelected = tempFilters.course_type === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.courseTypeOption,
                      isSelected && styles.courseTypeOptionSelected,
                    ]}
                    onPress={() =>
                      updateFilter('course_type', isSelected ? undefined : type)
                    }
                  >
                    <Text style={[
                      styles.courseTypeText,
                      isSelected && styles.courseTypeTextSelected,
                    ]}>
                      {getCourseTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Prefecture filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>都道府県</Text>
            {tempFilters.prefecture && (
              <View style={styles.selectedPrefecture}>
                <Text style={styles.selectedPrefectureText}>
                  {tempFilters.prefecture}
                </Text>
                <TouchableOpacity
                  onPress={() => updateFilter('prefecture', undefined)}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
                </TouchableOpacity>
              </View>
            )}
            {PREFECTURE_REGIONS.map((regionData) => (
              <View key={regionData.region}>
                <TouchableOpacity
                  style={styles.regionHeader}
                  onPress={() => toggleRegion(regionData.region)}
                >
                  <Text style={styles.regionName}>{regionData.region}</Text>
                  <Ionicons
                    name={expandedRegion === regionData.region ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.gray[400]}
                  />
                </TouchableOpacity>
                {expandedRegion === regionData.region && (
                  <View style={styles.prefectureGrid}>
                    {regionData.prefectures.map((pref) => {
                      const isSelected = tempFilters.prefecture === pref;
                      return (
                        <TouchableOpacity
                          key={pref}
                          style={[
                            styles.prefectureChip,
                            isSelected && styles.prefectureChipSelected,
                          ]}
                          onPress={() =>
                            updateFilter('prefecture', isSelected ? undefined : pref)
                          }
                        >
                          <Text style={[
                            styles.prefectureChipText,
                            isSelected && styles.prefectureChipTextSelected,
                          ]}>
                            {pref}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Apply button */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>適用する</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
  clearButton: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primary,
  },
  clearButtonDisabled: {
    color: Colors.gray[400],
  },
  content: {
    flex: 1,
  },
  section: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  courseTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  courseTypeOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  courseTypeOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  courseTypeText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.gray[600],
  },
  courseTypeTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  selectedPrefecture: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  selectedPrefectureText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primary,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  regionName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.medium),
    color: Colors.text.primary,
  },
  prefectureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  prefectureChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
  },
  prefectureChipSelected: {
    backgroundColor: Colors.primary,
  },
  prefectureChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
  },
  prefectureChipTextSelected: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
  },
  actionButtons: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  },
});

export default RecruitmentFiltersModal;
