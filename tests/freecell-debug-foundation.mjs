#!/usr/bin/env node
/**
 * Debug: Test freeCell to foundation move
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

async function main() {
  console.log('Debug: Testing freeCell to foundation move\n');

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

    // 获取初始状态
    let state = await getGameState(controller);
    console.log('Initial state:', JSON.stringify(state.foundations, null, 2));
    console.log('FreeCells:', state.freeCells);

    await controller.screenshot({ name: 'debug-initial' });

    // 尝试双击1S移动它到foundation
    // 1S在第5列，位置大约在 (400, 385)
    console.log('\nTrying to double-click 1S...');
    await controller.page.mouse.dblclick(box.x + 400, box.y + 385);
    await sleep(1000);

    state = await getGameState(controller);
    console.log('After double-click:', JSON.stringify(state.foundations, null, 2));
    console.log('FreeCells:', state.freeCells);

    await controller.screenshot({ name: 'debug-after-dblclick' });

    // 如果1S还在，尝试拖拽
    if (state.freeCells[0]?.rank === 1 && state.freeCells[0]?.suit === 'spades') {
      console.log('\n1S still in freeCell, trying drag...');

      // 从freeCell位置拖拽到foundation位置
      // freeCell 0 位置: (75, 150)
      // foundation 3 (spades) 位置: 415 + 3*80 + 35 = 690

      const fromX = box.x + 75;
      const fromY = box.y + 150;
      const toX = box.x + 690;
      const toY = box.y + 150;

      console.log(`Dragging from (${fromX}, ${fromY}) to (${toX}, ${toY})`);

      await controller.page.mouse.move(fromX, fromY);
      await sleep(200);
      await controller.page.mouse.down();
      await sleep(100);
      await controller.page.mouse.move(toX, toY, { steps: 20 });
      await sleep(100);
      await controller.page.mouse.up();
      await sleep(1500);

      state = await getGameState(controller);
      console.log('After drag:', JSON.stringify(state.foundations, null, 2));
      console.log('FreeCells:', state.freeCells);

      await controller.screenshot({ name: 'debug-after-drag' });
    }

    // 等待观察
    console.log('\nWaiting 10 seconds...');
    await sleep(10000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);
