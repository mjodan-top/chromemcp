#!/usr/bin/env node
/**
 * FreeCell Level 1 - Canvas Event Test
 * 使用正确的Canvas坐标和事件模拟
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

// 计算卡牌在canvas中的位置
function getCardCanvasPosition(location, state, viewportWidth = 720) {
  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;
  const cardHeight = 100;

  // 计算布局
  const totalWidth = 8 * cardWidth + 7 * 10;
  const startX = (viewportWidth - totalWidth) / 2 + cardWidth / 2;
  const freeCellStartX = (viewportWidth - (4 * cardWidth + 3 * 10 + 20 + 4 * cardWidth + 3 * 10)) / 2 + cardWidth / 2;
  const foundationStartX = freeCellStartX + 4 * (cardWidth + 10) + 20;

  if (location.type === 'freecell') {
    return { x: freeCellStartX + location.index * (cardWidth + 10), y: 150 };
  } else if (location.type === 'tableau') {
    const col = state.tableau[location.col];
    return {
      x: startX + location.col * (cardWidth + 10),
      y: tableauStartY + (col.length - 1) * cardGap
    };
  } else if (location.type === 'foundation') {
    return { x: foundationStartX + location.index * (cardWidth + 10), y: 150 };
  }
  return { x: 0, y: 0 };
}

// 辅助函数
function getSuitIndex(suit) {
  return ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(suit);
}

function isRed(suit) {
  return ['hearts', 'diamonds'].includes(suit);
}

function canMoveToFoundation(card, foundations) {
  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];
  if (foundation.length === 0) {
    return card.rank === 1;
  }
  return foundation[foundation.length - 1].rank === card.rank - 1;
}

function canStackOnTableau(card, targetCard) {
  return isRed(card.suit) !== isRed(targetCard.suit) && card.rank === targetCard.rank - 1;
}

// 获取最佳移动
function getBestMove(state) {
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return null;

  // 1. 移动到foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      return {
        type: 'to_foundation',
        card: topCard,
        from: { type: 'tableau', col },
        to: { type: 'foundation', index: getSuitIndex(topCard.suit) }
      };
    }
  }

  // 2. 建立tableau序列
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];

      if (targetColumn.length > 0) {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(topCard, targetCard)) {
          return {
            type: 'to_tableau',
            card: topCard,
            from: { type: 'tableau', col },
            to: { type: 'tableau', col: targetCol }
          };
        }
      }
    }
  }

  // 3. 移到空列
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      if (tableau[targetCol].length === 0) {
        return {
          type: 'to_tableau',
          card: topCard,
          from: { type: 'tableau', col },
          to: { type: 'tableau', col: targetCol }
        };
      }
    }
  }

  return null;
}

// 执行拖拽
async function performDrag(controller, fromX, fromY, toX, toY) {
  const canvas = await controller.page.$('#game-container canvas');
  if (!canvas) {
    console.log('Canvas not found');
    return false;
  }
  const box = await canvas.boundingBox();
  if (!box) {
    console.log('Canvas bounding box not found');
    return false;
  }

  // 使用相对于canvas的坐标
  const absFromX = box.x + fromX;
  const absFromY = box.y + fromY;
  const absToX = box.x + toX;
  const absToY = box.y + toY;

  console.log(`  Canvas offset: (${box.x}, ${box.y})`);
  console.log(`  Drag: (${absFromX}, ${absFromY}) -> (${absToX}, ${absToY})`);

  // 模拟拖拽
  await controller.page.mouse.move(absFromX, absFromY);
  await sleep(100);
  await controller.page.mouse.down();
  await sleep(50);
  await controller.page.mouse.move(absToX, absToY, { steps: 20 });
  await sleep(100);
  await controller.page.mouse.up();
  await sleep(500);

  return true;
}

// 执行双击
async function performDoubleClick(controller, x, y) {
  const canvas = await controller.page.$('#game-container canvas');
  if (!canvas) return false;
  const box = await canvas.boundingBox();
  if (!box) return false;

  const absX = box.x + x;
  const absY = box.y + y;

  console.log(`  Double click at: (${absX}, ${absY})`);
  await controller.page.mouse.dblclick(absX, absY);
  await sleep(500);

  return true;
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Canvas Event Test\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();
    console.log('Canvas size:', box);

    // 点击开始游戏
    console.log('\n点击开始游戏...');
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

    // 游戏循环
    let moveCount = 0;
    const maxMoves = 50;
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
      console.log(`\nFoundation: ${foundationTotal}/52`);

      if (foundationTotal === 52) {
        console.log('\n🎉 恭喜！成功通关！');
        await controller.screenshot({ name: 'victory' });
        break;
      }

      // 检查进展
      if (foundationTotal === prevFoundationTotal) {
        noProgressCount++;
        if (noProgressCount >= 3) {
          console.log('无进展，停止测试');
          break;
        }
      } else {
        noProgressCount = 0;
        prevFoundationTotal = foundationTotal;
      }

      // 获取最佳移动
      const move = getBestMove(state);

      if (!move) {
        console.log('\n没有可行的移动了');
        break;
      }

      moveCount++;
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`\n移动 #${moveCount}: ${cardDisplay} - ${move.type}`);

      const fromPos = getCardCanvasPosition(move.from, state);
      const toPos = getCardCanvasPosition(move.to, state);

      if (move.to.type === 'foundation') {
        await performDoubleClick(controller, fromPos.x, fromPos.y);
      } else {
        await performDrag(controller, fromPos.x, fromPos.y, toPos.x, toPos.y);
      }

      if (moveCount % 5 === 0) {
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