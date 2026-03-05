#!/usr/bin/env node
/**
 * FreeCell Level 1 - Direct Game API Test
 * 直接调用游戏API进行测试，绕过鼠标模拟
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

// 获取游戏状态
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

// 执行双击移动到foundation
async function doubleClickToFoundation(controller, colIndex, cardIndex) {
  return await controller.executeScript((col, cardIdx) => {
    try {
      const phaserGame = window.game;
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { success: false, error: 'GameScene not found' };

      // 获取卡牌对象
      const card = gameScene.tableauCards[col][cardIdx];
      if (!card) return { success: false, error: 'Card not found' };

      // 模拟双击
      card.emit('pointerdown');
      card.emit('pointerdown');

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, colIndex, cardIndex);
}

// 执行拖拽移动
async function dragCardToTableau(controller, fromCol, fromIndex, toCol) {
  return await controller.executeScript((fromC, fromI, toC) => {
    try {
      const phaserGame = window.game;
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { success: false, error: 'GameScene not found' };

      // 获取卡牌对象
      const card = gameScene.tableauCards[fromC][fromI];
      if (!card) return { success: false, error: 'Card not found' };

      // 手动触发拖拽流程
      card.emit('dragstart');

      // 计算目标位置
      const targetColumn = gameScene.tableauCards[toC];
      const cardWidth = 70;
      const cardGap = 25;
      const tableauStartY = 260;
      const totalWidth = 8 * cardWidth + 7 * 10;
      const startX = (720 - totalWidth) / 2 + cardWidth / 2;

      const toX = startX + toC * (cardWidth + 10);
      const toY = tableauStartY + targetColumn.length * cardGap;

      // 移动卡牌
      card.x = toX;
      card.y = toY;

      // 触发放置
      card.emit('dragend');

      return { success: true, toX, toY };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, fromCol, fromIndex, toCol);
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
        col,
        cardIndex: column.length - 1
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
            cardIndex: column.length - 1,
            toCol: targetCol
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
          fromCol: col,
          cardIndex: column.length - 1,
          toCol: targetCol
        };
      }
    }
  }

  return null;
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Direct API Test\n');

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

    // 游戏循环
    let moveCount = 0;
    const maxMoves = 100;

    while (moveCount < maxMoves) {
      state = await getGameState(controller);

      if (state.error) {
        console.log('获取状态出错:', state.error);
        await sleep(1000);
        continue;
      }

      // 检查胜利
      const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
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

      if (move.type === 'to_foundation') {
        // 双击移动到foundation
        const result = await doubleClickToFoundation(controller, move.col, move.cardIndex);
        console.log('  结果:', result);
      } else if (move.type === 'to_tableau') {
        // 拖拽到tableau
        const result = await dragCardToTableau(controller, move.fromCol, move.cardIndex, move.toCol);
        console.log('  结果:', result);
      }

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