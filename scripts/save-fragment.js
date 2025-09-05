#!/usr/bin/env node

/**
 * Save Fragment Script
 * Converts the API route functionality into a standalone script
 * 
 * Usage: node scripts/save-fragment.js <filename> <input-path>
 * Example: node scripts/save-fragment.js my-model.frag ./temp/model.frag
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function saveFragment(filename, inputPath) {
  try {
    // Validate filename
    if (!filename || !filename.endsWith('.frag')) {
      console.error('❌ Error: Invalid filename. Must end with .frag');
      process.exit(1);
    }

    // Validate input file exists
    if (!inputPath) {
      console.error('❌ Error: Input path is required');
      console.log('Usage: node scripts/save-fragment.js <filename> <input-path>');
      process.exit(1);
    }

    const inputExists = await fs.access(inputPath).then(() => true).catch(() => false);
    if (!inputExists) {
      console.error(`❌ Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }

    // Read the input file
    console.log(`📖 Reading input file: ${inputPath}`);
    const data = await fs.readFile(inputPath);

    // Define output path
    const publicDir = path.join(__dirname, '..', 'public', 'models');
    const outputPath = path.join(publicDir, filename);

    // Ensure the directory exists
    await fs.mkdir(publicDir, { recursive: true });

    // Save the file
    console.log(`💾 Saving fragment to: ${outputPath}`);
    await fs.writeFile(outputPath, data);

    console.log(`✅ Success: Fragment saved as ${filename}`);
    console.log(`📁 Location: ${outputPath}`);
    console.log(`🌐 Web path: /models/${filename}`);

  } catch (error) {
    console.error('❌ Error saving fragment:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('❌ Error: Invalid number of arguments');
  console.log('Usage: node scripts/save-fragment.js <filename> <input-path>');
  console.log('Example: node scripts/save-fragment.js my-model.frag ./temp/model.frag');
  process.exit(1);
}

const [filename, inputPath] = args;

// Run the script
saveFragment(filename, inputPath); 