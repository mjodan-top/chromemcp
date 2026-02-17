#!/usr/bin/env node
/**
 * Automated E2E Test for ChromeMCP
 * Tests browser control, screenshot, and image comparison
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Start HTTP server for test page
async function startHTTPServer() {
  log('\n📡 Starting HTTP server...', 'blue');

  const server = createServer((req, res) => {
    try {
      const filePath = join(__dirname, 'test-game.html');
      const content = readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end('Error loading test page');
    }
  });

  return new Promise((resolve) => {
    server.listen(8765, () => {
      log('✅ HTTP server running at http://localhost:8765', 'green');
      resolve(server);
    });
  });
}

// Run Core Package Tests
async function runCoreTests() {
  log('\n🧪 Running Core Package Tests...', 'blue');

  return new Promise((resolve, reject) => {
    const test = spawn('npm', ['test'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    test.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    test.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    test.on('close', (code) => {
      if (code === 0) {
        log('✅ Core tests passed', 'green');
        resolve(output);
      } else {
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
  });
}

// Run Browser Automation Test
async function runBrowserAutomationTest() {
  log('\n🌐 Running Browser Automation Test...', 'blue');

  // Dynamically import core module (use file:// URL for Windows compatibility)
  const corePath = 'file://' + join(PROJECT_ROOT, 'packages/core/dist/index.js').replace(/\\/g, '/');
  const { BrowserController, compareImages, setBaseline } = await import(corePath);

  const outputDir = join(__dirname, 'output');
  const baselineDir = join(__dirname, 'baselines');

  // Clean and create output directories
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true });
  }
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(baselineDir, { recursive: true });

  const controller = new BrowserController(outputDir);

  try {
    // Step 1: Launch browser
    log('Step 1: Launching browser...', 'yellow');
    await controller.launch({ headless: true, viewport: { width: 1280, height: 720 } });
    log('✅ Browser launched', 'green');

    // Step 2: Navigate to test page
    log('Step 2: Navigating to test page...', 'yellow');
    await controller.navigate('http://localhost:8765');
    await controller.waitForTimeout(1000); // Wait for page to load
    log('✅ Navigation complete', 'green');

    // Step 3: Take initial screenshot
    log('Step 3: Taking initial screenshot...', 'yellow');
    const screenshot1 = await controller.screenshot({ name: 'initial-state' });
    log(`✅ Screenshot saved: ${screenshot1.path}`, 'green');

    // Step 4: Get canvas info
    log('Step 4: Getting canvas info...', 'yellow');
    const canvasInfo = await controller.getCanvasInfo();
    log(`✅ Found ${canvasInfo.length} canvas element(s):`, 'green');
    console.log(JSON.stringify(canvasInfo, null, 2));

    // Step 5: Press SPACE to change color
    log('Step 5: Simulating SPACE key press...', 'yellow');
    await controller.press('Space');
    await controller.waitForTimeout(500);
    log('✅ Key press executed', 'green');

    // Step 6: Take second screenshot
    log('Step 6: Taking screenshot after color change...', 'yellow');
    const screenshot2 = await controller.screenshot({ name: 'after-space' });
    log(`✅ Screenshot saved: ${screenshot2.path}`, 'green');

    // Step 7: Compare screenshots (should be different)
    log('Step 7: Comparing screenshots (expecting differences)...', 'yellow');
    const comparison = await compareImages(
      screenshot1.path,
      screenshot2.path,
      { threshold: 0.1 }
    );
    log(`✅ Comparison complete:`, 'green');
    log(`   Match Score: ${comparison.matchScore.toFixed(4)}`, 'green');
    log(`   Passed: ${comparison.passed}`, comparison.passed ? 'green' : 'red');
    log(`   Diff saved: ${comparison.diffPath}`, 'green');

    // Step 8: Create baseline
    log('Step 8: Creating baseline from initial screenshot...', 'yellow');
    const baselinePath = setBaseline('game-initial', screenshot1.path, baselineDir);
    log(`✅ Baseline created: ${baselinePath}`, 'green');

    // Step 9: Move box with arrow keys and take screenshots
    log('Step 9: Testing arrow key movements...', 'yellow');
    await controller.press('ArrowRight');
    await controller.waitForTimeout(200);
    await controller.press('ArrowRight');
    await controller.waitForTimeout(200);
    await controller.press('ArrowDown');
    await controller.waitForTimeout(200);

    const screenshot3 = await controller.screenshot({ name: 'after-movement' });
    log(`✅ Movement screenshot saved: ${screenshot3.path}`, 'green');

    // Step 10: Close browser
    log('Step 10: Closing browser...', 'yellow');
    await controller.close();
    log('✅ Browser closed', 'green');

    return {
      screenshots: [screenshot1, screenshot2, screenshot3],
      comparison,
      baselinePath
    };

  } catch (error) {
    await controller.close().catch(() => {});
    throw error;
  }
}

// Main test runner
async function main() {
  log('🚀 ChromeMCP Automated Test Suite', 'blue');
  log('==================================', 'blue');

  const results = {
    coreTests: false,
    browserAutomation: false
  };

  let httpServer = null;

  try {
    // Start HTTP server
    httpServer = await startHTTPServer();

    // Run core tests
    await runCoreTests();
    results.coreTests = true;

    // Run browser automation test
    const automationResult = await runBrowserAutomationTest();
    results.browserAutomation = true;

    // Final summary
    log('\n📊 Test Summary', 'blue');
    log('==================================', 'blue');
    log(`✅ Core Package Tests: ${results.coreTests ? 'PASSED' : 'FAILED'}`, results.coreTests ? 'green' : 'red');
    log(`✅ Browser Automation: ${results.browserAutomation ? 'PASSED' : 'FAILED'}`, results.browserAutomation ? 'green' : 'red');
    log('\n📁 Output files:', 'blue');
    log(`   Screenshots: ${join(__dirname, 'output')}`, 'yellow');
    log(`   Baselines: ${join(__dirname, 'baselines')}`, 'yellow');
    log(`\n🎉 All tests completed successfully!`, 'green');

    process.exit(0);

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);

  } finally {
    if (httpServer) {
      httpServer.close();
      log('\n📡 HTTP server stopped', 'yellow');
    }
  }
}

main();
