#!/usr/bin/env node
/**
 * FreeCell Level 1 - Simple Auto-Play Test
 * 使用双击自动移动功能测试游戏
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

// 获取花色索引
function getSuitIndex(suit) {
  return ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(suit);
}

// 检查是否可以移动到foundation
function canMoveToFoundation(card, foundations) {
  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];
  if (foundation.length === 0) {
    return card.rank === 1;
  }
  return foundation[foundation.length - 1].rank === card.rank - 1;
}

// 找到所有可以移动到foundation的牌
function findCardsForFoundation(state) {
  const { tableau, freeCells, foundations } = state;
  const cards = [];

  // 检查tableau
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      cards.push({ card: topCard, location: 'tableau', col });
    }
  }

  // 检查freeCells
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    if (canMoveToFoundation(card, foundations)) {
      cards.push({ card, location: 'freecell', index: i });
    }
  }

  return cards;
}

// 获取卡牌位置 (屏幕坐标)
function getCardPosition(card, state) {
  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;
  const startX = 80;
  const freeCellStartX = 75;
  const foundationStartX = 415;

  if (card.location === 'freecell') {
    return {
      x: freeCellStartX + card.index * 80,
      y: 150
    };
  } else {
    const col = state.tableau[card.col];
    return {
      x: startX + card.col * 80,
      y: tableauStartY + (col.length - 1) * cardGap
    };
  }
}

// 双击卡牌
async function doubleClickCard(controller, x, y) {
  const canvas = await controller.page.$('#game-container canvas');
  const box = await canvas.boundingBox();
  await controller.page.mouse.dblclick(box.x + x, box.y + y);
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Simple Auto-Play Test\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    // 进入游戏
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

    // 游戏循环 - 只使用双击移动到foundation
    let moveCount = 0;
    const maxMoves = 200;
    let lastFoundationTotal = 0;
    let noProgressCount = 0;

    while (moveCount < maxMoves) {
      state = await getGameState(controller);

      // 检查胜利
      const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
      if (foundationTotal === 52) {
        console.log('\n🎉 恭喜！成功通关！');
        await controller.screenshot({ name: 'victory' });
        break;
      }

      // 找可以移动到foundation的牌
      const movableCards = findCardsForFoundation(state);

      if (movableCards.length === 0) {
        console.log('\n没有可以直接移动到foundation的牌了');
        console.log(`当前Foundation: ${state.foundations?.map(f => f.length).join('/')}`);

        // 检查是否有进展
        if (foundationTotal === lastFoundationTotal) {
          noProgressCount++;
          if (noProgressCount >= 3) {
            console.log('连续3次无进展，停止测试');
            break;
          }
        } else {
          noProgressCount = 0;
          lastFoundationTotal = foundationTotal;
        }

        // 等待一下
        await sleep(500);
        moveCount++;
        continue;
      }

      // 移动第一张可以移动的牌
      const cardInfo = movableCards[0];
      const pos = getCardPosition(cardInfo, state);
      const cardDisplay = `${cardInfo.card.rank}${cardInfo.card.suit[0].toUpperCase()}`;

      console.log(`移动 #${moveCount + 1}: ${cardDisplay} -> foundation`);
      await doubleClickCard(controller, pos.x, pos.y);
      await sleep(800);

      moveCount++;
      noProgressCount = 0;
      lastFoundationTotal = foundationTotal;

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