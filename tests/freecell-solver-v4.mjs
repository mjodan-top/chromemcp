#!/usr/bin/env node
/**
 * FreeCell Level 1 - Complete Solver using Phaser Internal API
 * 直接调用Phaser内部方法实现自动化通关
 *
 * 使用双击和handleDrop方法来处理FreeCell卡牌移动
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

// 使用字符串脚本执行移动
async function executeMoveScript(controller, script) {
  return await controller.page.evaluate(script);
}

// 移动卡牌到Foundation (从Tableau)
async function moveToFoundation(controller, fromCol) {
  const script = `
    (function() {
      try {
        const phaserGame = window.game;
        const gameScene = phaserGame.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };

        const col = ${fromCol};
        const column = gameScene.tableauCards[col];
        if (!column || column.length === 0) {
          return { success: false, error: 'Column ' + col + ' is empty' };
        }

        const card = column[column.length - 1];
        const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.cardData.suit);

        gameScene.moveCardToFoundation(card, col, suitIndex);

        return { success: true, card: card.cardData.rank + card.cardData.suit[0] };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `;
  return await executeMoveScript(controller, script);
}

// 移动卡牌到FreeCell (从Tableau)
async function moveToFreeCell(controller, fromCol, freeCellIdx) {
  const script = `
    (function() {
      try {
        const phaserGame = window.game;
        const gameScene = phaserGame.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };

        const col = ${fromCol};
        const fcIdx = ${freeCellIdx};
        const column = gameScene.tableauCards[col];
        if (!column || column.length === 0) {
          return { success: false, error: 'Column is empty' };
        }

        const card = column[column.length - 1];
        gameScene.moveCardToFreeCell(card, col, fcIdx);

        return { success: true, card: card.cardData.rank + card.cardData.suit[0] };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `;
  return await executeMoveScript(controller, script);
}

// 移动卡牌到Tableau (从Tableau)
async function moveToTableau(controller, fromCol, toCol) {
  const script = `
    (function() {
      try {
        const phaserGame = window.game;
        const gameScene = phaserGame.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };

        const fromC = ${fromCol};
        const toC = ${toCol};
        const fromColumn = gameScene.tableauCards[fromC];
        if (!fromColumn || fromColumn.length === 0) {
          return { success: false, error: 'Source column is empty' };
        }

        const card = fromColumn[fromColumn.length - 1];
        gameScene.moveCardsToTableau([card], fromC, toC);

        return { success: true, card: card.cardData.rank + card.cardData.suit[0] };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `;
  return await executeMoveScript(controller, script);
}

// 从FreeCell移动到Foundation - 使用handleDrop方法
async function moveFreeCellToFoundation(controller, freeCellIdx) {
  const script = `
    (function() {
      try {
        const phaserGame = window.game;
        const gameScene = phaserGame.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };

        const idx = ${freeCellIdx};
        const cardData = gameScene.freeCellCards[idx];
        if (!cardData) {
          return { success: false, error: 'No card in FreeCell' };
        }

        const card = gameScene.cards.find(c => c.cardData.id === cardData.id);
        if (!card) {
          return { success: false, error: 'Card object not found' };
        }

        const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(cardData.suit);

        // 设置选中卡牌并触发handleDrop
        gameScene.selectedCards = [card];

        // 模拟放置到Foundation
        const foundationIndex = suitIndex;
        if (gameScene.foundationArea.containsPoint(card.x, card.y) === foundationIndex || true) {
          // 直接调用内部方法
          gameScene.freeCellCards[idx] = null;
          gameScene.freeCellArea.setCard(idx, null);
          gameScene.foundationCards[foundationIndex].push(card.cardData);
          gameScene.foundationArea.setCards(foundationIndex, gameScene.foundationCards[foundationIndex]);

          const pos = gameScene.foundationArea.getSlotPosition(foundationIndex);
          card.animateTo(pos.x, pos.y);

          gameScene.gameState.movesCount++;
          gameScene.selectedCards = [];
        }

        return { success: true, card: cardData.rank + cardData.suit[0] };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `;
  return await executeMoveScript(controller, script);
}

// 从FreeCell移动到Tableau - 直接操作
async function moveFreeCellToTableau(controller, freeCellIdx, toCol) {
  const script = `
    (function() {
      try {
        const phaserGame = window.game;
        const gameScene = phaserGame.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };

        const idx = ${freeCellIdx};
        const toC = ${toCol};
        const cardData = gameScene.freeCellCards[idx];
        if (!cardData) {
          return { success: false, error: 'No card in FreeCell' };
        }

        const card = gameScene.cards.find(c => c.cardData.id === cardData.id);
        if (!card) {
          return { success: false, error: 'Card object not found' };
        }

        // 直接操作
        gameScene.freeCellCards[idx] = null;
        gameScene.freeCellArea.setCard(idx, null);

        // 计算目标位置
        const cardWidth = 70;
        const cardGap = 25;
        const tableauStartY = 260;
        const totalWidth = 8 * cardWidth + 7 * 10;
        const startX = (720 - totalWidth) / 2 + cardWidth / 2;
        const y = tableauStartY + gameScene.tableauCards[toC].length * cardGap;

        card.animateTo(startX + toC * (cardWidth + 10), y);
        gameScene.tableauCards[toC].push(card);

        gameScene.gameState.movesCount++;
        gameScene.selectedCards = [];

        return { success: true, card: cardData.rank + cardData.suit[0] };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `;
  return await executeMoveScript(controller, script);
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

  const moves = [];

  // 1. 从FreeCell移动到Foundation (最高优先级)
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    if (canMoveToFoundation(card, foundations)) {
      moves.push({
        type: 'freecell_to_foundation',
        card,
        freeCellIndex: i,
        priority: 100
      });
    }
  }

  // 2. 从Tableau移动到Foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      moves.push({
        type: 'tableau_to_foundation',
        card: topCard,
        fromCol: col,
        priority: 95
      });
    }
  }

  // 3. 从Tableau移动到Tableau (建立序列)
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
          const willExposeA = column.length > 1 && column[column.length - 2].rank === 1;
          const willExposeUseful = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
          moves.push({
            type: 'tableau_to_tableau',
            card: topCard,
            fromCol: col,
            toCol: targetCol,
            priority: willExposeA ? 85 : (willExposeUseful ? 75 : 45)
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
        // 只有当卡牌是K时才移到空列
        if (card.rank === 13) {
          moves.push({
            type: 'freecell_to_tableau',
            card,
            freeCellIndex: i,
            toCol: targetCol,
            priority: 38
          });
        }
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(card, targetCard)) {
          moves.push({
            type: 'freecell_to_tableau',
            card,
            freeCellIndex: i,
            toCol: targetCol,
            priority: 55
          });
        }
      }
    }
  }

  // 5. 移到空列 (只移动K或释放有用牌)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      if (tableau[targetCol].length === 0) {
        // K优先移到空列，或者会暴露有用的牌
        const willExposeUseful = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
        if (topCard.rank === 13 || willExposeUseful) {
          moves.push({
            type: 'tableau_to_tableau',
            card: topCard,
            fromCol: col,
            toCol: targetCol,
            priority: topCard.rank === 13 ? 42 : 70
          });
        }
      }
    }
  }

  // 6. 移动到FreeCell (只为了暴露有用的牌)
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  if (emptyFreeCellIndex !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];

      // 只在会暴露有用牌时才移动
      const willExposeA = column[column.length - 2]?.rank === 1;
      const willExposeUseful = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);

      if (willExposeA || willExposeUseful) {
        moves.push({
          type: 'tableau_to_freecell',
          card: topCard,
          fromCol: col,
          freeCellIndex: emptyFreeCellIndex,
          priority: willExposeA ? 80 : 65
        });
      }
    }
  }

  // 按优先级排序
  moves.sort((a, b) => b.priority - a.priority);

  // 避免重复移动
  if (moves.length > 0) {
    for (const move of moves) {
      const moveKey = `${move.type}-${move.card.rank}-${move.card.suit}`;
      const recentCount = previousMoves.slice(-10).filter(m => m === moveKey).length;
      if (recentCount < 3) {
        return move;
      }
    }
    // 如果所有移动都重复，返回最高优先级的
    return moves[0];
  }

  return null;
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Complete Solver v4\n');
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
        break;
      }

      moveCount++;
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      const moveKey = `${move.type}-${move.card.rank}-${move.card.suit}`;
      previousMoves.push(moveKey);
      if (previousMoves.length > 30) {
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
      } else if (result && result.success) {
        console.log(`  ✅ 成功: ${result.card}`);
      }

      await sleep(150);

      // 定期截图
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
    console.log(`\n=== 游戏结果 ===`);
    console.log(`总移动次数: ${moveCount}`);
    console.log(`Foundation卡牌数: ${foundationTotal}/52`);

    if (foundationTotal === 52) {
      console.log(`\n✅ 第一关通关成功！`);
    } else {
      console.log(`\n⚠️ 未完成通关，已移动 ${foundationTotal} 张牌到Foundation`);
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