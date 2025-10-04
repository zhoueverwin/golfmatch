import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing, BorderRadius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { CalendarData } from '../types/dataModels';

const { width } = Dimensions.get('window');
const calendarWidth = width - Spacing.md * 2;
const dayWidth = calendarWidth / 7;

interface GolfCalendarProps {
  calendarData: CalendarData;
  onDatePress?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
  currentYear?: number;
  currentMonth?: number;
}

const GolfCalendar: React.FC<GolfCalendarProps> = ({ calendarData, onDatePress, onMonthChange, currentYear, currentMonth }) => {
  const { year, month, days } = calendarData;
  
  // Get current date for navigation limits
  const now = new Date();
  const currentYearValue = currentYear || now.getFullYear();
  const currentMonthValue = currentMonth || now.getMonth() + 1;
  
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];
  
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  
  const handlePreviousMonth = () => {
    let newYear = year;
    let newMonth = month - 1;
    
    if (newMonth < 1) {
      newMonth = 12;
      newYear = year - 1;
    }
    
    // Check if we're within 3 months before current month
    const currentDate = new Date(currentYearValue, currentMonthValue - 1);
    const newDate = new Date(newYear, newMonth - 1);
    const monthsDiff = (currentDate.getFullYear() - newDate.getFullYear()) * 12 + (currentDate.getMonth() - newDate.getMonth());
    
    if (monthsDiff <= 3) {
      onMonthChange?.(newYear, newMonth);
    }
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = month + 1;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear = year + 1;
    }
    
    // Check if we're within 3 months after current month
    const currentDate = new Date(currentYearValue, currentMonthValue - 1);
    const newDate = new Date(newYear, newMonth - 1);
    const monthsDiff = (newDate.getFullYear() - currentDate.getFullYear()) * 12 + (newDate.getMonth() - currentDate.getMonth());
    
    if (monthsDiff <= 3) {
      onMonthChange?.(newYear, newMonth);
    }
  };
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const availability = days.find(d => d.date === dateString);
    
    // Determine status: available (○), not decided (–), not available (×)
    let status: 'available' | 'not_decided' | 'not_available' = 'not_decided';
    if (availability) {
      status = availability.is_available ? 'available' : 'not_available';
    }
    
    calendarDays.push({
      day,
      date: dateString,
      status,
    });
  }
  
  const renderDay = (dayData: any, index: number) => {
    if (!dayData) {
      return <View key={index} style={styles.emptyDay} />;
    }
    
    const { day, status } = dayData;
    
    const getStatusIndicator = () => {
      switch (status) {
        case 'available':
          return <Text style={styles.statusIndicator}>○</Text>;
        case 'not_available':
          return <Text style={styles.statusIndicator}>×</Text>;
        case 'not_decided':
        default:
          return <Text style={styles.statusIndicator}>–</Text>;
      }
    };
    
    const getStatusColor = () => {
      switch (status) {
        case 'available':
          return Colors.primary;
        case 'not_available':
          return Colors.error;
        case 'not_decided':
        default:
          return Colors.gray[400];
      }
    };
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          status === 'available' && styles.availableDay,
        ]}
        onPress={() => onDatePress?.(dayData.date)}
      >
        <Text style={[
          styles.dayText,
          status === 'available' && styles.availableDayText,
        ]}>
          {day}
        </Text>
        <Text style={[styles.statusIndicator, { color: getStatusColor() }]}>
          {getStatusIndicator().props.children}
        </Text>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        
        <Text style={styles.monthTitle}>
          {year}年{monthNames[month - 1]}
        </Text>
        
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.dayNamesRow}>
        {dayNames.map((dayName, index) => (
          <View key={index} style={styles.dayNameCell}>
            <Text style={styles.dayNameText}>{dayName}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.calendarGrid}>
        {calendarDays.map((dayData, index) => renderDay(dayData, index))}
      </View>
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={[styles.legendSymbol, { color: Colors.primary }]}>○</Text>
          <Text style={styles.legendText}>可能</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.legendSymbol, { color: Colors.gray[400] }]}>–</Text>
          <Text style={styles.legendText}>未定</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.legendSymbol, { color: Colors.error }]}>×</Text>
          <Text style={styles.legendText}>不可</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navButton: {
    padding: Spacing.sm,
  },
  monthTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dayNameCell: {
    width: dayWidth,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  dayNameText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.gray[600],
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  dayCell: {
    width: dayWidth,
    height: dayWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyDay: {
    width: dayWidth,
    height: dayWidth,
  },
  dayText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.gray[400],
  },
  availableDay: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.sm,
  },
  availableDayText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    fontSize: 12,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  legendText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
  },
});

export default GolfCalendar;
