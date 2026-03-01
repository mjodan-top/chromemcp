#!/usr/bin/env node
/**
 * ChromeMCP Wrapper Script
 * This script provides easy access to ChromeMCP functionality from any project
 *
 * Usage:
 *   node chromemcp-wrapper.mjs <command> [options]
 *
 * Commands:
 *   test <url>        Run automated test against URL
 *   dev <url>         Start development mode with MCP server
 *   compare <img1> <img2>  Compare two screenshots
 *   record <url>      Record browser interactions
 */

import { BrowserController, compareImages } from './packages/core/dist/index.js';
import { setBaseline } from './packages/core/dist/compare/index.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CHROMEMCP_ROOT = path.dirname(new URL(import.meta.url).pathname);

function showHelp() {
  console.log(`
ChromeMCP Wrapper - Browser Automation Testing

Usage:
  node chromemcp-wrapper.mjs <command> [options]

Commands:
  test <url>              Run automated test against URL
  dev <url>               Start development mode with MCP server
  compare <img1> <img2>   Compare two screenshots
  record <url>            Record browser interactions
  mcp                     Start MCP server

Examples:
  node chromemcp-wrapper.mjs test http://localhost:8080
  node chromemcp-wrapper.mjs dev http://localhost:3000
  node chromemcp-wrapper.mjs compare baseline.png current.png
  node chromemcp-wrapper.mjs mcp
`);
}

async function runTest(url) {
  console.log(`Running test against: ${url}`);

  const controller = new BrowserController();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'chromemcp-output', timestamp);

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    await controller.launch(url);
    console.log('Browser launched');

    // Initial screenshot
    const initialScreenshot = path.join(outputDir, '01-initial.png');
    await controller.screenshot(initialScreenshot);
    console.log(`Screenshot: ${initialScreenshot}`);

    // Wait for page to stabilize
    await controller.waitForTimeout(1000);

    // Get page info
    const pageInfo = await controller.executeScript(() => ({
      title: document.title,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }));
    console.log('Page info:', pageInfo);

    // Save test report
    const report = {
      url,
      timestamp,
      pageInfo,
      screenshots: [initialScreenshot],
      steps: [
        { action: 'navigate', url },
        { action: 'screenshot', file: initialScreenshot }
      ]
    };

    fs.writeFileSync(
      path.join(outputDir, 'report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`\nTest complete. Output: ${outputDir}`);
    return { success: true, outputDir };

  } catch (error) {
    console.error('Test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await controller.close();
  }
}

async function startDev(url) {
  console.log(`Starting dev mode for: ${url}`);
  const cliPath = path.join(CHROMEMCP_ROOT, 'packages/cli/dist/index.js');
  const proc = spawn('node', [cliPath, 'dev', url], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  proc.on('close', (code) => {
    process.exit(code);
  });
}

async function startMCP() {
  console.log('Starting ChromeMCP MCP Server...');
  const mcpPath = path.join(CHROMEMCP_ROOT, 'packages/mcp-server/dist/index.js');
  const proc = spawn('node', [mcpPath], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  proc.on('close', (code) => {
    process.exit(code);
  });
}

async function doImageComparison(img1, img2) {
  console.log(`Comparing: ${img1} vs ${img2}`);

  const outputDir = path.join(process.cwd(), 'chromemcp-output');
  fs.mkdirSync(outputDir, { recursive: true });

  const diffPath = path.join(outputDir, 'diff.png');

  const result = await compareImages(img1, img2, diffPath);

  console.log('\nComparison Result:');
  console.log(`  Match Score: ${(result.score * 100).toFixed(2)}%`);
  console.log(`  Diff Pixels: ${result.diffPixelCount}`);
  console.log(`  Diff Image: ${diffPath}`);
  console.log(`  Passed: ${result.passed}`);

  return result;
}

async function record(url) {
  console.log(`Starting recording for: ${url}`);
  const cliPath = path.join(CHROMEMCP_ROOT, 'packages/cli/dist/index.js');
  const proc = spawn('node', [cliPath, 'record', url], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  proc.on('close', (code) => {
    process.exit(code);
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'test':
      if (!args[1]) {
        console.error('Error: URL required');
        console.log('Usage: node chromemcp-wrapper.mjs test <url>');
        process.exit(1);
      }
      await runTest(args[1]);
      break;

    case 'dev':
      if (!args[1]) {
        console.error('Error: URL required');
        console.log('Usage: node chromemcp-wrapper.mjs dev <url>');
        process.exit(1);
      }
      await startDev(args[1]);
      break;

    case 'mcp':
      await startMCP();
      break;

    case 'compare':
      if (!args[1] || !args[2]) {
        console.error('Error: Two image paths required');
        console.log('Usage: node chromemcp-wrapper.mjs compare <img1> <img2>');
        process.exit(1);
      }
      await doImageComparison(args[1], args[2]);
      break;

    case 'record':
      if (!args[1]) {
        console.error('Error: URL required');
        console.log('Usage: node chromemcp-wrapper.mjs record <url>');
        process.exit(1);
      }
      await record(args[1]);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
