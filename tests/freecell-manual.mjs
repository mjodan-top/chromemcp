#!/usr/bin/env node
/**
 * FreeCell Level 1 - Manual Solution
 * 基于分析的手动解决方案
 */

import { BrowserController } from '../packages/core/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  targetUrl: 'http://localhost:3004',
  outputDir: path.join(__dirname, 'freecell-test-output'),
  viewport: { width: 720, height: 1280 }
};

fs.mkdirSync(CONFIG.outputDir, { recursive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGameState(controller) {
  return await controller.executeScript(() => {
    const phaserGame = window.game;
    if (!phaserGame) return { error: 'No game' };
    const gameScene = phaserGame.scene.getScene('GameScene');
    if (!gameScene) return { error: 'No scene' };
    return gameScene.getGameStateForTest ? gameScene.getGameStateForTest() : { error: 'No method' };
  });
}

function printState(state) {
  console.log('\n=== 牌局状态 ===');
  if (state.tableau) {
    state.tableau.forEach((col, idx) => {
      const cards = col.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(', ');
      console.log(`列 ${idx + 1}: [${cards}]`);
    });
  }
  console.log('FreeCells:', state.freeCells?.map(c => c ? `${c.rank}${c.suit[0].toUpperCase()}` : '-').join(', '));
  console.log('Foundations:', state.foundations?.map(f => f.length).join('/'));
  console.log('================\n');
}

// 执行拖拽
async function drag(controller, box, fromCol, fromRow, toCol, toRow) {
  const startX = 80;
  const startY = 260;
  const cardGap = 25;

  const fromX = startX + fromCol * 80;
  const fromY = startY + fromRow * cardGap;
  const toX = startX + toCol * 80;
  const toY = startY + toRow * cardGap;

  console.log(`  拖拽: 列${fromCol+1} -> 列${toCol+1}`);

  await controller.page.mouse.move(box.x + fromX, box.y + fromY);
  await sleep(100);
  await controller.page.mouse.down();
  await sleep(50);
  await controller.page.mouse.move(box.x + toX, box.y + toY, { steps: 15 });
  await sleep(50);
  await controller.page.mouse.up();
  await sleep(800);
}

// 双击
async function dblclick(controller, box, col, row) {
  const startX = 80;
  const startY = 260;
  const cardGap = 25;

  const x = startX + col * 80;
  const y = startY + row * cardGap;

  console.log(`  双击: 列${col+1}`);

  await controller.page.mouse.dblclick(box.x + x, box.y + y);
  await sleep(800);
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Manual Solution\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    // 进入游戏
    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);
    await controller.page.mouse.click(box.x + 160, box.y + 200);
    await sleep(3000);

    let state = await getGameState(controller);
    console.log('初始状态:');
    printState(state);

    // 移动序列（基于分析）
    const moves = [
      // 第一步：双击1S移动到foundation
      { type: 'dbl', col: 4, row: 5 }, // 1S在第5列底部
    ];

    let moveCount = 0;

    for (const move of moves) {
      moveCount++;
      console.log(`\n移动 #${moveCount}:`);

      if (move.type === 'drag') {
        await drag(controller, box, move.fromCol, move.fromRow, move.toCol, move.toRow);
      } else if (move.type === 'dbl') {
        await dblclick(controller, box, move.col, move.row);
      }

      state = await getGameState(controller);
      console.log(`  Foundations: ${state.foundations?.map(f => f.length).join('/')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`总移动次数: ${moveCount}`);
    printState(state);
    await controller.screenshot({ name: 'final' });

    console.log('\n浏览器将在5秒后关闭...');
    await sleep(5000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);
