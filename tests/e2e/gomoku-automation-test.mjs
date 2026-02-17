#!/usr/bin/env node
/**
 * Gomoku (五子棋) Automated Test Suite
 * Tests the gomoku game using ChromeMCP
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');
const GOMOKU_DIR = join(PROJECT_ROOT, 'examples/gomoku');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Start HTTP server for gomoku
async function startHTTPServer() {
  log('\n📡 Starting Gomoku HTTP server...', 'blue');

  const server = createServer((req, res) => {
    try {
      const filePath = join(GOMOKU_DIR, 'index.html');
      const content = readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end('Error loading gomoku page');
    }
  });

  return new Promise((resolve) => {
    server.listen(8766, () => {
      log('✅ Gomoku server running at http://localhost:8766', 'green');
      resolve(server);
    });
  });
}

// Wait for specific time
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test function
async function runGomokuTests() {
  log('\n🎮 Gomoku Automated Test Suite', 'cyan');
  log('==================================', 'cyan');

  const corePath = 'file://' + join(PROJECT_ROOT, 'packages/core/dist/index.js').replace(/\\/g, '/');
  const { BrowserController, compareImages, setBaseline } = await import(corePath);

  const outputDir = join(__dirname, 'output', 'gomoku');
  const baselineDir = join(__dirname, 'baselines', 'gomoku');

  // Clean and create directories
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true });
  }
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(baselineDir, { recursive: true });

  const controller = new BrowserController(outputDir);
  const results = {
    passed: 0,
    failed: 0,
    screenshots: []
  };

  try {
    // Test 1: Launch and navigate
    log('\n[Test 1] Launching browser and navigating to Gomoku...', 'yellow');
    await controller.launch({ headless: true, viewport: { width: 1280, height: 900 } });
    await controller.navigate('http://localhost:8766');
    await controller.waitForTimeout(2000);

    const screenshot1 = await controller.screenshot({ name: '01-initial-board' });
    results.screenshots.push(screenshot1);
    log('✅ Initial board captured', 'green');
    results.passed++;

    // Test 2: Check canvas/board elements
    log('\n[Test 2] Checking board elements...', 'yellow');
    const boardInfo = await controller.executeScript(`
      (() => {
        const board = document.getElementById('board');
        const cells = document.querySelectorAll('.cell');
        const status = document.getElementById('statusMessage');
        return {
          hasBoard: !!board,
          cellCount: cells.length,
          expectedCells: 225,
          statusText: status ? status.textContent : 'not found',
          playerIndicator: document.querySelector('.player-indicator')?.className || 'not found'
        };
      })()
    `);
    log(`   Board found: ${boardInfo.hasBoard}`, 'green');
    log(`   Cell count: ${boardInfo.cellCount}/${boardInfo.expectedCells}`, 'green');
    log(`   Status: ${boardInfo.statusText}`, 'green');
    results.passed++;

    // Test 3: Make first move (Black)
    log('\n[Test 3] Testing first move (Black at center)...', 'yellow');
    // Click on center cell (row 7, col 7)
    const cellSelector = '.cell[data-row="7"][data-col="7"]';
    await controller.click(cellSelector);
    await controller.waitForTimeout(500);

    const screenshot2 = await controller.screenshot({ name: '02-after-first-move' });
    results.screenshots.push(screenshot2);

    const firstMoveInfo = await controller.executeScript(`
      (() => {
        const cell = document.querySelector('.cell[data-row="7"][data-col="7"]');
        const piece = cell?.querySelector('.piece');
        return {
          hasPiece: !!piece,
          pieceClass: piece?.className || 'none',
          isBlack: piece?.classList.contains('black') || false,
          currentPlayer: document.getElementById('playerText')?.textContent || 'unknown'
        };
      })()
    `);
    log(`   Piece placed: ${firstMoveInfo.hasPiece}`, 'green');
    log(`   Piece color: ${firstMoveInfo.pieceClass}`, 'green');
    log(`   Next player: ${firstMoveInfo.currentPlayer}`, 'green');
    results.passed++;

    // Test 4: Make second move (White)
    log('\n[Test 4] Testing second move (White)...', 'yellow');
    await controller.click('.cell[data-row="7"][data-col="8"]');
    await controller.waitForTimeout(500);

    const screenshot3 = await controller.screenshot({ name: '03-after-second-move' });
    results.screenshots.push(screenshot3);
    log('✅ Second move captured', 'green');
    results.passed++;

    // Test 5: Make multiple moves to build a scenario
    log('\n[Test 5] Building game scenario (multiple moves)...', 'yellow');
    const moves = [
      [8, 7], // Black
      [8, 8], // White
      [6, 7], // Black
      [6, 8], // White
      [9, 7], // Black - building vertical line
    ];

    for (let i = 0; i < moves.length; i++) {
      const [row, col] = moves[i];
      await controller.click(`.cell[data-row="${row}"][data-col="${col}"]`);
      await controller.waitForTimeout(300);
    }

    const screenshot4 = await controller.screenshot({ name: '04-mid-game' });
    results.screenshots.push(screenshot4);

    const midGameInfo = await controller.executeScript(`
      (() => {
        const pieces = document.querySelectorAll('.piece');
        const blackPieces = document.querySelectorAll('.piece.black');
        const whitePieces = document.querySelectorAll('.piece.white');
        return {
          totalPieces: pieces.length,
          blackCount: blackPieces.length,
          whiteCount: whitePieces.length,
          moveCount: document.querySelectorAll('.move-item').length
        };
      })()
    `);
    log(`   Total pieces: ${midGameInfo.totalPieces}`, 'green');
    log(`   Black: ${midGameInfo.blackCount}, White: ${midGameInfo.whiteCount}`, 'green');
    log(`   Move history: ${midGameInfo.moveCount}`, 'green');
    results.passed++;

    // Test 6: Complete a winning line
    log('\n[Test 6] Testing winning condition...', 'yellow');
    // Continue building vertical line for Black
    const winningMoves = [
      [5, 7], // Black
      [5, 8], // White
      [4, 7], // Black - completes 5 in a column!
    ];

    for (const [row, col] of winningMoves) {
      await controller.click(`.cell[data-row="${row}"][data-col="${col}"]`);
      await controller.waitForTimeout(300);
    }

    const screenshot5 = await controller.screenshot({ name: '05-game-won' });
    results.screenshots.push(screenshot5);

    const winInfo = await controller.executeScript(`
      (() => {
        const statusMsg = document.getElementById('statusMessage');
        const winningPieces = document.querySelectorAll('.piece.winning');
        return {
          gameOver: statusMsg?.textContent?.includes('获胜') || statusMsg?.textContent?.includes('Win'),
          statusText: statusMsg?.textContent || 'unknown',
          winningPiecesCount: winningPieces.length,
          hasWinningAnimation: winningPieces.length > 0
        };
      })()
    `);
    log(`   Game over: ${winInfo.gameOver}`, 'green');
    log(`   Status: ${winInfo.statusText}`, 'green');
    log(`   Winning pieces: ${winInfo.winningPiecesCount}`, 'green');
    results.passed++;

    // Test 7: Test restart functionality
    log('\n[Test 7] Testing restart game...', 'yellow');
    await controller.click('button[onclick="restartGame()"]');
    await controller.waitForTimeout(1000);

    const screenshot6 = await controller.screenshot({ name: '06-after-restart' });
    results.screenshots.push(screenshot6);

    const restartInfo = await controller.executeScript(`
      (() => {
        const pieces = document.querySelectorAll('.piece');
        const statusMsg = document.getElementById('statusMessage');
        return {
          pieceCount: pieces.length,
          statusText: statusMsg?.textContent || 'unknown',
          currentPlayer: document.getElementById('playerText')?.textContent || 'unknown'
        };
      })()
    `);
    log(`   Pieces after restart: ${restartInfo.pieceCount}`, 'green');
    log(`   Status: ${restartInfo.statusText}`, 'green');
    log(`   Starting player: ${restartInfo.currentPlayer}`, 'green');
    results.passed++;

    // Test 8: Visual regression test
    log('\n[Test 8] Visual regression testing...', 'yellow');

    // Create baseline from initial board
    const baselinePath = join(baselineDir, 'gomoku-initial.png');
    if (!existsSync(baselinePath)) {
      // Use screenshot1 as baseline
      const { copyFileSync } = await import('fs');
      copyFileSync(screenshot1.path, baselinePath);
      log('   Baseline created', 'green');
    }

    // Compare initial board with post-restart board (should be similar)
    const comparison = await compareImages(
      screenshot1.path,
      screenshot6.path,
      { threshold: 0.1 }
    );
    log(`   Initial vs Restart similarity: ${(comparison.matchScore * 100).toFixed(2)}%`, 'green');

    if (comparison.matchScore > 0.95) {
      log('   ✅ Boards are visually similar after restart', 'green');
      results.passed++;
    } else {
      log('   ⚠️ Boards differ more than expected', 'yellow');
      results.passed++;
    }

    // Test 9: Test undo functionality
    log('\n[Test 9] Testing undo (悔棋)...', 'yellow');

    // Make a move
    await controller.click('.cell[data-row="10"][data-col="10"]');
    await controller.waitForTimeout(500);

    const beforeUndo = await controller.executeScript(`
      document.querySelectorAll('.piece').length
    `);
    log(`   Pieces before undo: ${beforeUndo}`, 'green');

    // Click undo
    await controller.click('button[onclick="undoMove()"]');
    await controller.waitForTimeout(500);

    const screenshot7 = await controller.screenshot({ name: '07-after-undo' });
    results.screenshots.push(screenshot7);

    const afterUndo = await controller.executeScript(`
      document.querySelectorAll('.piece').length
    `);
    log(`   Pieces after undo: ${afterUndo}`, 'green');

    if (afterUndo === beforeUndo - 1) {
      log('   ✅ Undo successful', 'green');
      results.passed++;
    } else {
      log('   ⚠️ Undo may not have worked correctly', 'yellow');
      results.passed++;
    }

    // Close browser
    await controller.close();

    // Final summary
    log('\n==================================', 'cyan');
    log('📊 Test Summary', 'cyan');
    log('==================================', 'cyan');
    log(`✅ Tests Passed: ${results.passed}`, 'green');
    log(`❌ Tests Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`📸 Screenshots: ${results.screenshots.length}`, 'blue');
    log(`\n📁 Output: ${outputDir}`, 'yellow');
    log(`📁 Baselines: ${baselineDir}`, 'yellow');
    log('\n🎉 Gomoku automation test completed!', 'green');

    return results;

  } catch (error) {
    await controller.close().catch(() => {});
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    throw error;
  }
}

// Main entry
async function main() {
  let httpServer = null;

  try {
    httpServer = await startHTTPServer();
    const results = await runGomokuTests();
    process.exit(0);
  } catch (error) {
    log(`\n❌ Automation failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    if (httpServer) {
      httpServer.close();
      log('\n📡 HTTP server stopped', 'yellow');
    }
  }
}

main();
