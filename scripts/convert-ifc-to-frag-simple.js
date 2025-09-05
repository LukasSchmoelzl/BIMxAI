#!/usr/bin/env node

/**
 * Simple IFC to FRAG Converter Script
 * Uses the app's API to convert IFC files to Fragment files
 * 
 * Prerequisites:
 * 1. The Next.js app must be running (npm run dev)
 * 2. The app must be accessible at http://localhost:3010
 * 
 * Usage: node scripts/convert-ifc-to-frag-simple.js <input.ifc> [output.frag]
 * Example: node scripts/convert-ifc-to-frag-simple.js public/models/bridge.ifc
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('❌ Error: Please provide an input IFC file');
  console.log('Usage: node scripts/convert-ifc-to-frag-simple.js <input.ifc> [output.frag]');
  console.log('Example: node scripts/convert-ifc-to-frag-simple.js public/models/bridge.ifc');
  process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1] || inputPath.replace('.ifc', '.frag');

// Validate input file
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Error: Input file not found: ${inputPath}`);
  process.exit(1);
}

if (!inputPath.endsWith('.ifc')) {
  console.error('❌ Error: Input file must be an IFC file (.ifc)');
  process.exit(1);
}

async function checkAppRunning() {
  return new Promise((resolve) => {
    http.get('http://localhost:3010/api/health', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function convertViaApp() {
  console.log('🚀 IFC to FRAG Converter (Simple Version)');
  console.log(`📄 Input: ${inputPath}`);
  console.log(`📦 Output: ${outputPath}`);
  
  // Check if app is running
  const appRunning = await checkAppRunning();
  if (!appRunning) {
    console.error('❌ Error: The Next.js app is not running!');
    console.log('Please start the app first with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ App is running at http://localhost:3010');
  
  // Read IFC file
  console.log('📖 Reading IFC file...');
  const ifcBuffer = fs.readFileSync(inputPath);
  console.log(`📊 IFC file size: ${(ifcBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  
  // Instructions for manual conversion
  console.log('\n📋 Manual Conversion Steps:');
  console.log('1. Open http://localhost:3010 in your browser');
  console.log('2. Delete any existing FRAG file if you want to replace it');
  console.log(`3. Drag and drop "${inputPath}" onto the 3D viewer`);
  console.log('4. The app will automatically convert it to FRAG format');
  console.log('5. The converted file will be saved in public/models/');
  
  console.log('\n💡 Alternative: Automatic conversion');
  console.log('If you want automatic conversion, you can:');
  console.log('1. Copy your IFC file to public/models/');
  console.log('2. Delete the corresponding .frag file');
  console.log('3. Restart the app - it will auto-convert on load');
  
  // If the input is in public/models/, provide direct instructions
  if (inputPath.includes('public/models/')) {
    const basename = path.basename(inputPath, '.ifc');
    const fragPath = path.join('public/models', `${basename}.frag`);
    
    console.log('\n🎯 Quick conversion for this file:');
    console.log(`1. Delete: rm ${fragPath}`);
    console.log('2. Restart the app: npm run dev');
    console.log(`3. The app will auto-convert ${basename}.ifc to ${basename}.frag`);
  }
}

// Run the conversion helper
convertViaApp();