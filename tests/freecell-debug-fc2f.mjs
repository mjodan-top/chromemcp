#!/usr/bin/env node
/**
 * Debug: Test freeCell to foundation drag
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
  console.log('Debug: Testing freeCell to foundation drag\n');

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

    // Step 1: 把1S移动到freeCell
    // 1S在第5列底部，先移动上面的牌
    console.log('Step 1: Moving 1S to freeCell...');

    // 移动9H到列1的10S上
    await controller.page.mouse.move(box.x + 400, box.y + 385);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(box.x + 80, box.y + 410, { steps: 15 });
    await sleep(50);
    await controller.page.mouse.up();
    await sleep(800);

    // 移动11H到freeCell
    await controller.page.mouse.move(box.x + 400, box.y + 360);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(box.x + 155, box.y + 150, { steps: 15 });
    await sleep(50);
    await controller.page.mouse.up();
    await sleep(800);

    // 移动6S到freeCell
    await controller.page.mouse.move(box.x + 400, box.y + 335);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(box.x + 235, box.y + 150, { steps: 15 });
    await sleep(50);
    await controller.page.mouse.up();
    await sleep(800);

    // 移动3H到freeCell
    await controller.page.mouse.move(box.x + 400, box.y + 310);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(box.x + 315, box.y + 150, { steps: 15 });
    await sleep(50);
    await controller.page.mouse.up();
    await sleep(800);

    // 现在移动1S到freeCell
    await controller.page.mouse.move(box.x + 400, box.y + 285);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(box.x + 75, box.y + 150, { steps: 15 });
    await sleep(50);
    await controller.page.mouse.up();
    await sleep(800);

    let state = await getGameState(controller);
    console.log('After moving 1S to freeCell:');
    console.log('Foundations:', JSON.stringify(state.foundations));
    console.log('FreeCells:', state.freeCells);

    await controller.screenshot({ name: 'debug-fc-1s-in-freecell' });

    // Step 2: 尝试从freeCell拖拽1S到foundation
    console.log('\nStep 2: Dragging 1S from freeCell to foundation...');

    // 1S在freeCell 0，位置 (75, 150)
    // foundation 3 (spades) 位置大约在 (655, 150)

    await controller.page.mouse.move(box.x + 75, box.y + 150);
    await sleep(200);
    await controller.page.mouse.down();
    await sleep(100);
    await controller.page.mouse.move(box.x + 655, box.y + 150, { steps: 20 });
    await sleep(100);
    await controller.page.mouse.up();
    await sleep(1500);

    state = await getGameState(controller);
    console.log('After dragging to foundation:');
    console.log('Foundations:', JSON.stringify(state.foundations));
    console.log('FreeCells:', state.freeCells);

    await controller.screenshot({ name: 'debug-fc-after-drag' });

    // 等待观察
    console.log('\nWaiting 5 seconds...');
    await sleep(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);
