#!/usr/bin/env node
/**
 * FreeCell Level 1 - Complete Solver using Phaser Internal API
 * 直接调用Phaser内部方法实现自动化通关
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

// 移动卡牌到Foundation (使用游戏内部方法)
async function moveToFoundation(controller, fromCol) {
  return await controller.executeScript((col) => {
    try {
      const phaserGame = window.game;
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { success: false, error: 'GameScene not found' };

      const column = gameScene.tableauCards[col];
      if (!column || column.length === 0) {
        return { success: false, error: 'Column is empty' };
      }

      const card = column[column.length - 1];
      const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.cardData.suit);

      // 调用游戏内部方法
      gameScene.moveCardToFoundation(card, col, suitIndex);

      return { success: true, card: `${card.cardData.rank}${card.cardData.suit[0]}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, fromCol);
}

// 移动卡牌到FreeCell (使用游戏内部方法)
async function moveToFreeCell(controller, fromCol, toFreeCellIndex) {
  return await controller.executeScript((col, freeCellIdx) => {
    try {
      const phaserGame = window.game;
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { success: false, error: 'GameScene not found' };

      const column = gameScene.tableauCards[col];
      if (!column || column.length === 0) {
        return { success: false, error: 'Column is empty' };
      }

      const card = column[column.length - 1];

      // 调用游戏内部方法
      gameScene.moveCardToFreeCell(card, col, freeCellIdx);

      return { success: true, card: `${card.cardData.rank}${card.cardData.suit[0]}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, fromCol, toFreeCellIndex);
}

// 移动卡牌到Tableau (使用游戏内部方法)
async function moveToTableau(controller, fromCol, toCol) {
  return await controller.executeScript((fromC, toC) => {
    try {
      const phaserGame = window.game;
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { success: false, error: 'GameScene not found' };

      const fromColumn = gameScene.tableauCards[fromC];
      if (!fromColumn || fromColumn.length === 0) {
        return { success: false, error: 'Source column is empty' };
      }

      const card = fromColumn[fromColumn.length - 1];

      // 调用游戏内部方法
      gameScene.moveCardsToTableau([card], fromC, toC);

      return { success: true, card: `${card.cardData.rank}${card.cardData.suit[0]}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, fromCol, toCol);
}

// 从FreeCell移动到Foundation
async function moveFreeCellToFoundation(controller, freeCellIdx) {
  return await controller.executeScript((idx) => {
    try {
      const phaserGame = window.game;
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { success: false, error: 'GameScene not found' };

      const cardData = gameScene.freeCellCards[idx];
      if (!cardData) {
        return { success: false, error: 'No card in FreeCell' };
      }

      // 找到对应的Card对象
      const card = gameScene.cards.find(c => c.cardData.id === cardData.id);
      if (!card) {
        return { success: false, error: 'Card object not found' };
      }

      const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(cardData.suit);

      // 调用游戏内部方法
      gameScene.moveCardFromFreeCellToFoundation(card, idx, suitIndex);

      return { success: true, card: `${cardData.rank}${cardData.suit[0]}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, freeCellIdx);
}

// 从FreeCell移动到Tableau
async function moveFreeCellToTableau(controller, freeCellIdx, toCol) {
  return await controller.executeScript((idx, toC) => {
    try {
      const phaserGame = window.game;
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { success: false, error: 'GameScene not found' };

      const cardData = gameScene.freeCellCards[idx];
      if (!cardData) {
        return { success: false, error: 'No card in FreeCell' };
      }

      // 找到对应的Card对象
      const card = gameScene.cards.find(c => c.cardData.id === cardData.id);
      if (!card) {
        return { success: false, error: 'Card object not found' };
      }

      // 调用游戏内部方法
      gameScene.moveCardFromFreeCellToTableau(card, idx, toC);

      return { success: true, card: `${cardData.rank}${cardData.suit[0]}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, freeCellIdx, toCol);
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
function getBestMove(state, previousMoves) {
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return null;

  // 1. 优先: 从FreeCell移动到Foundation
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    if (canMoveToFoundation(card, foundations)) {
      return {
        type: 'freecell_to_foundation',
        card,
        freeCellIndex: i,
        priority: 100
      };
    }
  }

  // 2. 优先: 从Tableau移动到Foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      return {
        type: 'tableau_to_foundation',
        card: topCard,
        fromCol: col,
        priority: 90
      };
    }
  }

  // 3. 从Tableau移动到Tableau (建立序列)
  const moves = [];
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
          const willExposeUseful = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
          moves.push({
            type: 'tableau_to_tableau',
            card: topCard,
            fromCol: col,
            toCol: targetCol,
            priority: willExposeUseful ? 70 : 40
          });
        }
      }
    }
  }

  // 4. 从FreeCell移动到Tableau
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        moves.push({
          type: 'freecell_to_tableau',
          card,
          freeCellIndex: i,
          toCol: targetCol,
          priority: 30
        });
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(card, targetCard)) {
          moves.push({
            type: 'freecell_to_tableau',
            card,
            freeCellIndex: i,
            toCol: targetCol,
            priority: 50
          });
        }
      }
    }
  }

  // 5. 移到空列
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      if (tableau[targetCol].length === 0) {
        // K优先移到空列
        const priority = topCard.rank === 13 ? 35 : 15;
        moves.push({
          type: 'tableau_to_tableau',
          card: topCard,
          fromCol: col,
          toCol: targetCol,
          priority
        });
      }
    }
  }

  // 6. 移动到FreeCell
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  if (emptyFreeCellIndex !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];

      // 检查移走后是否会暴露有用的牌
      const willExposeUseful = canMoveToFoundation(column[column.length - 2], foundations);

      moves.push({
        type: 'tableau_to_freecell',
        card: topCard,
        fromCol: col,
        freeCellIndex: emptyFreeCellIndex,
        priority: willExposeUseful ? 60 : 10
      });
    }
  }

  // 按优先级排序并返回最佳移动
  moves.sort((a, b) => b.priority - a.priority);

  // 避免重复移动
  if (moves.length > 0) {
    const bestMove = moves[0];
    const moveKey = `${bestMove.type}-${bestMove.card?.rank}-${bestMove.card?.suit}`;

    // 检查是否最近执行过相同移动
    const recentCount = previousMoves.slice(-5).filter(m => m === moveKey).length;
    if (recentCount >= 3) {
      // 跳过重复移动，尝试下一个
      for (let i = 1; i < moves.length; i++) {
        const altMove = moves[i];
        const altKey = `${altMove.type}-${altMove.card?.rank}-${altMove.card?.suit}`;
        const altCount = previousMoves.slice(-5).filter(m => m === altKey).length;
        if (altCount < 3) {
          return altMove;
        }
      }
    }

    return bestMove;
  }

  return null;
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Complete Solver (Internal API)\n');
  console.log('目标：使用Phaser内部API自动通关第一关\n');

  const controller = new BrowserController(CONFIG.outputDir);
  const previousMoves = [];

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
    const maxMoves = 500;
    let stuckCount = 0;
    const maxStuck = 10;

    while (moveCount < maxMoves) {
      state = await getGameState(controller);

      if (state.error) {
        console.log('获取状态出错:', state.error);
        await sleep(1000);
        continue;
      }

      // 检查胜利
      const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
      console.log(`\n[移动 ${moveCount + 1}] Foundation: ${foundationTotal}/52 [${state.foundations?.map(f => f.length).join('/')}]`);

      if (foundationTotal === 52) {
        console.log('\n🎉🎉🎉 恭喜！成功通关第一关！🎉🎉🎉');
        await controller.screenshot({ name: 'victory' });
        break;
      }

      // 获取最佳移动
      const move = getBestMove(state, previousMoves);

      if (!move) {
        console.log('\n没有可行的移动了');
        stuckCount++;
        if (stuckCount >= maxStuck) {
          console.log('连续无法移动，游戏结束');
          break;
        }
        await sleep(500);
        continue;
      }

      stuckCount = 0;
      moveCount++;

      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      const moveKey = `${move.type}-${move.card.rank}-${move.card.suit}`;
      previousMoves.push(moveKey);
      if (previousMoves.length > 20) {
        previousMoves.shift();
      }

      console.log(`  执行: ${cardDisplay} - ${move.type} (优先级: ${move.priority})`);

      let result;
      if (move.type === 'tableau_to_foundation') {
        result = await moveToFoundation(controller, move.fromCol);
      } else if (move.type === 'tableau_to_freecell') {
        result = await moveToFreeCell(controller, move.fromCol, move.freeCellIndex);
      } else if (move.type === 'tableau_to_tableau') {
        result = await moveToTableau(controller, move.fromCol, move.toCol);
      } else if (move.type === 'freecell_to_foundation') {
        result = await moveFreeCellToFoundation(controller, move.freeCellIndex);
      } else if (move.type === 'freecell_to_tableau') {
        result = await moveFreeCellToTableau(controller, move.freeCellIndex, move.toCol);
      }

      if (result && !result.success) {
        console.log(`  ❌ 失败: ${result.error}`);
      }

      await sleep(200);

      // 定期截图
      if (moveCount % 25 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
      }
    }

    // 最终状态
    state = await getGameState(controller);
    console.log('\n最终状态:');
    printState(state);

    await controller.screenshot({ name: 'final' });

    const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
    console.log(`\n=== 游戏结果 ===`);
    console.log(`总移动次数: ${moveCount}`);
    console.log(`Foundation卡牌数: ${foundationTotal}/52`);

    if (foundationTotal === 52) {
      console.log(`\n✅ 第一关通关成功！`);
    } else {
      console.log(`\n⚠️ 未完成通关，已移动 ${foundationTotal} 张牌`);
    }

    console.log('\n浏览器将在15秒后关闭...');
    await sleep(15000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);