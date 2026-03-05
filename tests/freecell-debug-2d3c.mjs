#!/usr/bin/env node
/**
 * Debug: Test 2D to 3C move
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
  console.log('Debug: Testing 2D to 3C move\n');

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

    // 手动执行移动到达目标状态
    // ... (简化：直接测试从当前状态的2D->3C移动)

    let state = await getGameState(controller);
    console.log('Current state:');
    console.log('列5:', state.tableau[4]?.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(','));
    console.log('列8:', state.tableau[7]?.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(','));

    // 尝试移动2D（列5）到3C（列8）
    // 列5的2D位置: x = 80 + 4*80 = 400, y = 260 + 0*25 = 260 (只有1张牌)
    // 列8的3C位置: x = 80 + 7*80 = 640, y = 260 + 5*25 = 385 (有6张牌)

    const fromX = 400;
    const fromY = 260;
    const toX = 640;
    const toY = 385 + 25; // 放到3C上面

    console.log(`\nDragging 2D from (${fromX}, ${fromY}) to (${toX}, ${toY})`);

    await controller.page.mouse.move(box.x + fromX, box.y + fromY);
    await sleep(200);
    await controller.page.mouse.down();
    await sleep(100);
    await controller.page.mouse.move(box.x + toX, box.y + toY, { steps: 20 });
    await sleep(100);
    await controller.page.mouse.up();
    await sleep(1500);

    state = await getGameState(controller);
    console.log('\nAfter move:');
    console.log('列5:', state.tableau[4]?.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(','));
    console.log('列8:', state.tableau[7]?.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(','));

    await controller.screenshot({ name: 'debug-2d-to-3c' });

    console.log('\nWaiting 5 seconds...');
    await sleep(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);
