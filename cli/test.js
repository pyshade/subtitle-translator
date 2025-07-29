#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Subtitle Translator CLI...\n');

// Test 1: Help command
console.log('1. Testing help command...');
try {
  const helpOutput = execSync('node cli/index.js --help', { encoding: 'utf8' });
  console.log('✅ Help command works');
} catch (error) {
  console.log('❌ Help command failed:', error.message);
}

// Test 2: List methods
console.log('\n2. Testing list-methods command...');
try {
  const methodsOutput = execSync('node cli/index.js list-methods', { encoding: 'utf8' });
  console.log('✅ List methods works');
} catch (error) {
  console.log('❌ List methods failed:', error.message);
}

// Test 3: Detect format
console.log('\n3. Testing detect command...');
try {
  const detectOutput = execSync('node cli/index.js detect cli/examples/test.srt', { encoding: 'utf8' });
  console.log('✅ Detect command works');
  console.log(detectOutput);
} catch (error) {
  console.log('❌ Detect command failed:', error.message);
}

// Test 4: Config generation
console.log('\n4. Testing config generation...');
try {
  const configOutput = execSync('node cli/index.js config -o test-config.json', { encoding: 'utf8' });
  console.log('✅ Config generation works');
  
  // Clean up
  if (fs.existsSync('test-config.json')) {
    fs.unlinkSync('test-config.json');
  }
} catch (error) {
  console.log('❌ Config generation failed:', error.message);
}

// Test 5: Dry run translation
console.log('\n5. Testing dry-run translation...');
try {
  const dryRunOutput = execSync('node cli/index.js translate cli/examples/test.srt --dry-run -t it', { encoding: 'utf8' });
  console.log('✅ Dry-run translation works');
} catch (error) {
  console.log('❌ Dry-run translation failed:', error.message);
}

console.log('\n🎉 CLI testing completed!');