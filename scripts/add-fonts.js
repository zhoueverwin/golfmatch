#!/usr/bin/env node
/**
 * Script to add fontFamily to StyleSheet definitions
 * This helps migrate all components to use Noto Sans JP fonts
 */

const fs = require('fs');
const path = require('path');

const Typography = {
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
};

function getFontFamilyForWeight(fontWeight) {
  if (!fontWeight) return "Typography.fontFamily.regular";
  
  const weight = fontWeight.toString();
  switch (weight) {
    case "400":
    case Typography.fontWeight.normal:
      return "Typography.fontFamily.regular";
    case "500":
    case Typography.fontWeight.medium:
      return "Typography.fontFamily.medium";
    case "600":
    case Typography.fontWeight.semibold:
      return "Typography.fontFamily.semibold";
    case "700":
    case Typography.fontWeight.bold:
      return "Typography.fontFamily.bold";
    default:
      return "Typography.fontFamily.regular";
  }
}

// This is a helper script - actual migration will be done manually
// to ensure correctness

console.log('Font migration helper script');
console.log('Please review each file and add fontFamily manually');


