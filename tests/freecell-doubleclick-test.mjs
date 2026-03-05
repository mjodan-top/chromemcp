#!/usr/bin/env node
/**
 * FreeCell Level 1 - Double-Click Only Test
 * 只使用双击移动到foundation，测试游戏基本功能
 */

import { BrowserController } from '../packages/core/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  targetUrl: 'http://localhost:3008',
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
      if (gameScene.getGameStateForTest) {
        return gameScene.getGameStateForTest();
      }
      return { error: 'getGameStateForTest not found' };
    } catch (e) {
      return { error: e.message };
    }
  });
}

function printState(state) {
  if (state.error) {
    console.log('Error:', state.error);
    return;
  }
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

// 辅助函数
function getSuitIndex(suit) {
  return ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(suit);
}

function canMoveToFoundation(card, foundations) {
  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];
  if (foundation.length === 0) {
    return card.rank === 1;
  }
  return foundation[foundation.length - 1].rank === card.rank - 1;
}

// 计算卡牌位置
function getCardPosition(col, state) {
  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;
  const viewportWidth = 720;

  const totalWidth = 8 * cardWidth + 7 * 10;
  const startX = (viewportWidth - totalWidth) / 2 + cardWidth / 2;

  const column = state.tableau[col];
  return {
    x: startX + col * (cardWidth + 10),
    y: tableauStartY + (column.length - 1) * cardGap
  };
}

// 找所有可以移到foundation的牌
function findFoundationMoves(state) {
  const moves = [];
  const { tableau, freeCells, foundations } = state;

  // 检查tableau
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      moves.push({ card: topCard, col, location: 'tableau' });
    }
  }

  // 检查freeCells
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    if (canMoveToFoundation(card, foundations)) {
      moves.push({ card, index: i, location: 'freecell' });
    }
  }

  return moves;
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Double-Click Only Test\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    // 点击开始游戏
    console.log('点击开始游戏...');
    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);

    // 点击第一关
    console.log('点击第一关...');
    await controller.page.mouse.click(box.x + 160, box.y + 200);
    await sleep(3000);

    // 获取初始状态
    let state = await getGameState(controller);
    console.log('初始状态:');
    printState(state);

    await controller.screenshot({ name: 'initial' });

    // 游戏循环 - 只用双击移到foundation
    let moveCount = 0;
    const maxMoves = 100;
    let prevFoundationTotal = 0;
    let noProgressCount = 0;

    while (moveCount < maxMoves) {
      state = await getGameState(controller);

      if (state.error) {
        console.log('获取状态出错:', state.error);
        await sleep(1000);
        continue;
      }

      // 检查胜利
      const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
      console.log(`\nFoundation: ${foundationTotal}/52 (${state.foundations?.join('/')})`);

      if (foundationTotal === 52) {
        console.log('\n🎉 恭喜！成功通关！');
        await controller.screenshot({ name: 'victory' });
        break;
      }

      // 检查进展
      if (foundationTotal === prevFoundationTotal) {
        noProgressCount++;
        if (noProgressCount >= 5) {
          console.log('\n连续5次无进展，停止测试');
          console.log('当前需要手动移动卡牌来释放更多可移动的牌');
          break;
        }
      } else {
        noProgressCount = 0;
        prevFoundationTotal = foundationTotal;
      }

      // 找可以移到foundation的牌
      const moves = findFoundationMoves(state);

      if (moves.length === 0) {
        console.log('\n没有可以直接移到foundation的牌了');
        console.log('需要手动操作来释放卡牌');
        break;
      }

      // 移动第一张
      const move = moves[0];
      moveCount++;
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`\n移动 #${moveCount}: ${cardDisplay} (from ${move.location}) -> foundation`);

      // 计算位置并双击
      let x, y;
      if (move.location === 'freecell') {
        const freeCellStartX = 75;
        x = freeCellStartX + move.index * 80;
        y = 150;
      } else {
        const pos = getCardPosition(move.col, state);
        x = pos.x;
        y = pos.y;
      }

      await controller.page.mouse.dblclick(box.x + x, box.y + y);
      await sleep(500);

      if (moveCount % 10 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
      }
    }

    // 最终状态
    state = await getGameState(controller);
    console.log('\n最终状态:');
    printState(state);

    await controller.screenshot({ name: 'final' });

    console.log('\n浏览器将在10秒后关闭...');
    await sleep(10000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);