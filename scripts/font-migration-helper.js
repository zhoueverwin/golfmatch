/**
 * Script to help update StyleSheet definitions with fontFamily
 * This is a helper script - review changes before applying
 */

// Pattern to find and replace:
// 1. Find styles with fontSize but no fontFamily
// 2. Add fontFamily based on fontWeight

// For files with fontWeight, use:
// fontFamily: Typography.getFontFamily(fontWeight)

// For files with only fontSize (no fontWeight), use:
// fontFamily: Typography.fontFamily.regular

// Run this in your editor with Find & Replace:
// 
// Pattern 1: Add fontFamily after fontWeight (Typography.fontWeight.*)
// Find: (fontWeight: Typography\.fontWeight\.(normal|medium|semibold|bold)),
// Replace: $1,\n    fontFamily: Typography.getFontFamily(Typography.fontWeight.$2),

// Pattern 2: Add fontFamily after fontWeight (string values)
// Find: (fontWeight: "(400|500|600|700|bold)"),
// Replace: $1,\n    fontFamily: Typography.getFontFamily("$2"),

// Pattern 3: Add fontFamily for styles with only fontSize (no fontWeight)
// This requires manual review - add after fontSize line:
// fontFamily: Typography.fontFamily.regular,

console.log('Font migration helper - use Find & Replace patterns above');

