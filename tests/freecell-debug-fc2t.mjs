#!/usr/bin/env node
/**
 * Debug: FreeCell to Tableau move
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
    try {
      const phaserGame = window.game;
      if (!phaserGame) return { error: 'No phaser game found' };
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { error: 'GameScene not found' };
      if (gameScene.getGameStateForTest) return gameScene.getGameStateForTest();
      return { error: 'getGameStateForTest not found' };
    } catch (e) {
      return { error: e.message };
    }
  });
}

function printState(state) {
  console.log('\n=== 牌局状态 ===');
  if (state.tableau) {
    state.tableau.forEach((col, idx) => {
      const cards = col.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(', ');
      console.log(`列 ${idx + 1}: [${cards}] (${col.length}张)`);
    });
  }
  console.log('FreeCells:', state.freeCells?.map(c => c ? `${c.rank}${c.suit[0].toUpperCase()}` : '-').join(', '));
  console.log('Foundations:', state.foundations?.map(f => f.length).join('/'));
  console.log('================\n');
}

async function main() {
  console.log('Debug: FreeCell to Tableau\n');

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

    // 先做一些移动达到测试状态
    const moves = [
      { from: [400, 385], to: [690, 150], name: '1S to foundation' },
      { from: [80, 410], to: [75, 150], name: '10S to freecell' },
      { from: [80, 385], to: [530, 150], name: '1D to foundation' },
      { from: [560, 385], to: [155, 150], name: '11S to freecell' },
      { from: [560, 360], to: [480, 410], name: '7S to col6' },
      { from: [560, 335], to: [530, 150], name: '2D to foundation' },
      { from: [240, 410], to: [530, 150], name: '3D to foundation' },
      { from: [560, 310], to: [610, 150], name: '1C to foundation' },
      { from: [400, 360], to: [235, 150], name: '9H to freecell' },
      { from: [240, 385], to: [400, 360], name: '10C to col5' },
      { from: [240, 360], to: [610, 150], name: '2C to foundation' },
      { from: [560, 285], to: [240, 360], name: '9S to col3' },
      { from: [560, 260], to: [80, 385], name: '12H to col1' },
    ];

    for (const move of moves) {
      console.log(`执行: ${move.name}`);
      await controller.page.mouse.move(box.x + move.from[0], box.y + move.from[1]);
      await sleep(100);
      await controller.page.mouse.down();
      await sleep(100);
      await controller.page.mouse.move(box.x + move.to[0], box.y + move.to[1], { steps: 20 });
      await sleep(100);
      await controller.page.mouse.up();
      await sleep(800);
    }

    let state = await getGameState(controller);
    console.log('当前状态:');
    printState(state);

    // 现在测试 11S (在freecell索引1) -> 列7 (12H)
    console.log('\n测试: 11S from FreeCell[1] -> 列7 (12H)');
    console.log('预期: 11S可以放到12H上 (黑色11放到红色12上)');

    // 尝试拖拽 - 列7的12H位置
    const fromX = 155; // FreeCell[1]
    const fromY = 150;
    const toX = 560; // 列7 (第7列)
    const toY = 260 + 3 * 25; // 列7有4张牌，第4张(12H)的位置 = 335

    console.log(`拖拽: (${fromX}, ${fromY}) -> (${toX}, ${toY})`);
    console.log('注意: 目标位置是列7的12H中心');

    await controller.page.mouse.move(box.x + fromX, box.y + fromY);
    await sleep(300);
    await controller.page.mouse.down();
    await sleep(300);
    await controller.page.mouse.move(box.x + toX, box.y + toY, { steps: 30 });
    await sleep(300);
    await controller.page.mouse.up();
    await sleep(2000);

    state = await getGameState(controller);
    console.log('移动后状态:');
    printState(state);

    // 检查11S是否在列1
    const col1Has11S = state.tableau[0].some(c => c.rank === 11 && c.suit === 'spades');
    const freeCellHas11S = state.freeCells[1] && state.freeCells[1].rank === 11 && state.freeCells[1].suit === 'spades';

    if (col1Has11S) {
      console.log('✅ 11S成功移动到列1');
    } else if (freeCellHas11S) {
      console.log('❌ 11S仍在FreeCell[1]，移动失败');
    }

    await controller.screenshot({ name: 'debug-fc2t' });

    console.log('\n等待5秒...');
    await sleep(5000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);
