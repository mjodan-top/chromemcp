#!/usr/bin/env node
/**
 * FreeCell Level 1 - Internal Method Test
 * 直接调用游戏内部方法进行测试
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

// 直接执行游戏移动
async function executeGameMove(controller, moveType, params) {
  return await controller.executeScript((type, p) => {
    try {
      const phaserGame = window.game;
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { success: false, error: 'GameScene not found' };

      if (type === 'to_foundation') {
        // 从tableau移动到foundation
        const col = gameScene.tableauCards[p.fromCol];
        if (!col || col.length === 0) return { success: false, error: 'Column empty' };
        const card = col[col.length - 1];
        gameScene.moveCardToFoundation(card, p.fromCol, p.toFoundationIndex);
        return { success: true };
      }
      else if (type === 'to_freecell') {
        const col = gameScene.tableauCards[p.fromCol];
        if (!col || col.length === 0) return { success: false, error: 'Column empty' };
        const card = col[col.length - 1];
        gameScene.moveCardToFreeCell(card, p.fromCol, p.toFreeCellIndex);
        return { success: true };
      }
      else if (type === 'to_tableau') {
        const fromCol = gameScene.tableauCards[p.fromCol];
        if (!fromCol || fromCol.length === 0) return { success: false, error: 'From column empty' };
        const card = fromCol[fromCol.length - 1];
        gameScene.moveCardsToTableau([card], p.fromCol, p.toCol);
        return { success: true };
      }

      return { success: false, error: 'Unknown move type' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, moveType, params);
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

  // 1. 移动到foundation (最高优先级)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      return {
        type: 'to_foundation',
        card: topCard,
        fromCol: col,
        toFoundationIndex: getSuitIndex(topCard.suit)
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
            fromCol: col,
            toCol: targetCol
          };
        }
      }
    }
  }

  // 3. 移到空列 (K优先)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      if (tableau[targetCol].length === 0) {
        // 优先移动K到空列
        if (topCard.rank === 13 || column.length > 2) {
          return {
            type: 'to_tableau',
            card: topCard,
            fromCol: col,
            toCol: targetCol
          };
        }
      }
    }
  }

  // 4. 移到freeCell
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  if (emptyFreeCellIndex !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];
      return {
        type: 'to_freecell',
        card: topCard,
        fromCol: col,
        toFreeCellIndex: emptyFreeCellIndex
      };
    }
  }

  return null;
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Internal Method Test\n');

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

    // 游戏循环
    let moveCount = 0;
    const maxMoves = 200;

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

      // 获取最佳移动
      const move = getBestMove(state);

      if (!move) {
        console.log('\n没有可行的移动了');
        break;
      }

      moveCount++;
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`\n移动 #${moveCount}: ${cardDisplay} - ${move.type}`);

      const result = await executeGameMove(controller, move.type, move);
      console.log('  结果:', result);

      await sleep(300);

      if (moveCount % 20 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
      }
    }

    // 最终状态
    state = await getGameState(controller);
    console.log('\n最终状态:');
    printState(state);

    await controller.screenshot({ name: 'final' });

    const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
    console.log(`\n总移动次数: ${moveCount}`);
    console.log(`Foundation卡牌数: ${foundationTotal}/52`);

    console.log('\n浏览器将在10秒后关闭...');
    await sleep(10000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);