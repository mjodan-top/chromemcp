#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Installing Playwright browsers...');

try {
  execSync('npx playwright install chromium', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('Browsers installed successfully!');
} catch (error) {
  console.error('Failed to install browsers:', error);
  process.exit(1);
}
