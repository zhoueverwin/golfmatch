#!/usr/bin/env node
/**
 * Helper script to identify StyleSheet definitions that need fontFamily added
 * Run this to see which files need updates
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const srcDir = path.join(__dirname, '../src');

// Find all TypeScript files
const files = glob.sync('**/*.tsx', { cwd: srcDir });

const filesNeedingUpdate = [];

files.forEach(file => {
  const filePath = path.join(srcDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has StyleSheet.create and text styles
  if (content.includes('StyleSheet.create')) {
    const hasFontSize = content.match(/fontSize:\s*(Typography\.fontSize|[\d]+)/);
    const hasFontWeight = content.match(/fontWeight:\s*(Typography\.fontWeight|["'\d]+)/);
    const hasFontFamily = content.includes('fontFamily:');
    
    if ((hasFontSize || hasFontWeight) && !hasFontFamily) {
      filesNeedingUpdate.push(file);
    }
  }
});

console.log(`Found ${filesNeedingUpdate.length} files that need fontFamily updates:\n`);
filesNeedingUpdate.forEach(file => console.log(`  - ${file}`));

console.log('\n✅ Files already updated (have fontFamily):');
const updatedFiles = files.filter(file => {
  const filePath = path.join(srcDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('fontFamily:');
});
updatedFiles.forEach(file => console.log(`  - ${file}`));

