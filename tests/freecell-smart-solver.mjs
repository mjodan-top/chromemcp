#!/usr/bin/env node
/**
 * FreeCell Level 1 - Smart Solver with State Tracking
 * 使用状态追踪避免循环，智能求解
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

async function executeMoveScript(controller, script) {
  return await controller.page.evaluate(script);
}

// 移动卡牌到Foundation (从Tableau)
async function moveToFoundation(controller, fromCol) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };

        const col = ${fromCol};
        const column = gameScene.tableauCards[col];
        if (!column || column.length === 0) {
          return { success: false, error: 'Column is empty' };
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
        const gameScene = window.game.scene.getScene('GameScene');
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
        const gameScene = window.game.scene.getScene('GameScene');
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

// 从FreeCell移动到Foundation
async function moveFreeCellToFoundation(controller, freeCellIdx) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };

        const idx = ${freeCellIdx};
        const cardData = gameScene.freeCellCards[idx];
        if (!cardData) return { success: false, error: 'No card in FreeCell' };

        const card = gameScene.cards.find(c => c.cardData.id === cardData.id);
        if (!card) return { success: false, error: 'Card object not found' };

        const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(cardData.suit);

        gameScene.freeCellCards[idx] = null;
        gameScene.freeCellArea.setCard(idx, null);
        gameScene.foundationCards[suitIndex].push(card.cardData);
        gameScene.foundationArea.setCards(suitIndex, gameScene.foundationCards[suitIndex]);

        const pos = gameScene.foundationArea.getSlotPosition(suitIndex);
        card.animateTo(pos.x, pos.y);
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

// 从FreeCell移动到Tableau
async function moveFreeCellToTableau(controller, freeCellIdx, toCol) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };

        const idx = ${freeCellIdx};
        const toC = ${toCol};
        const cardData = gameScene.freeCellCards[idx];
        if (!cardData) return { success: false, error: 'No card in FreeCell' };

        const card = gameScene.cards.find(c => c.cardData.id === cardData.id);
        if (!card) return { success: false, error: 'Card object not found' };

        gameScene.freeCellCards[idx] = null;
        gameScene.freeCellArea.setCard(idx, null);

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

// 生成状态哈希
function getStateHash(state) {
  const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
  const tableauHash = state.tableau?.map(col => col.length).join(',') || '';
  const freeCellCount = state.freeCells?.filter(c => c !== null).length || 0;
  return `${foundationTotal}-${tableauHash}-${freeCellCount}`;
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

function getSuitIndex(suit) {
  return ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(suit);
}

function isRed(suit) {
  return ['hearts', 'diamonds'].includes(suit);
}

function canMoveToFoundation(card, foundations) {
  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];
  if (foundation.length === 0) return card.rank === 1;
  return foundation[foundation.length - 1].rank === card.rank - 1;
}

function canStackOnTableau(card, targetCard) {
  return isRed(card.suit) !== isRed(targetCard.suit) && card.rank === targetCard.rank - 1;
}

// 获取智能移动
function getSmartMoves(state) {
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return [];

  const moves = [];
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  const emptyColumns = tableau.map((col, idx) => col.length === 0 ? idx : -1).filter(i => i >= 0);

  // 1. FreeCell -> Foundation (最高优先级)
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && canMoveToFoundation(card, foundations)) {
      moves.push({ type: 'freecell_to_foundation', card, freeCellIndex: i, priority: 100 });
    }
  }

  // 2. Tableau -> Foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      moves.push({ type: 'tableau_to_foundation', card: topCard, fromCol: col, priority: 95 });
    }
  }

  // 3. Tableau -> Tableau (建立序列，暴露有用牌)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) continue;

      const targetCard = targetColumn[targetColumn.length - 1];
      if (canStackOnTableau(topCard, targetCard)) {
        const willExposeFoundation = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
        const willExposeA = column.length > 1 && column[column.length - 2].rank === 1;
        if (willExposeFoundation || willExposeA) {
          moves.push({ type: 'tableau_to_tableau', card: topCard, fromCol: col, toCol: targetCol, priority: willExposeA ? 90 : 85 });
        }
      }
    }
  }

  // 4. FreeCell -> Tableau (建立序列)
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length > 0) {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(card, targetCard)) {
          moves.push({ type: 'freecell_to_tableau', card, freeCellIndex: i, toCol: targetCol, priority: 60 });
        }
      }
    }
  }

  // 5. K -> 空列
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];
    if (topCard.rank === 13 && emptyColumns.length > 0) {
      const willExposeFoundation = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
      if (willExposeFoundation) {
        moves.push({ type: 'tableau_to_tableau', card: topCard, fromCol: col, toCol: emptyColumns[0], priority: 75 });
      }
    }
  }

  // 6. Tableau -> FreeCell (暴露有用牌)
  if (emptyFreeCellIndex !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];
      const willExposeFoundation = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
      const willExposeA = column.length > 1 && column[column.length - 2].rank === 1;
      if (willExposeFoundation || willExposeA) {
        moves.push({ type: 'tableau_to_freecell', card: topCard, fromCol: col, freeCellIndex: emptyFreeCellIndex, priority: willExposeA ? 88 : 80 });
      }
    }
  }

  // 7. FreeCell K -> 空列
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && card.rank === 13 && emptyColumns.length > 0) {
      moves.push({ type: 'freecell_to_tableau', card, freeCellIndex: i, toCol: emptyColumns[0], priority: 45 });
    }
  }

  // 8. 其他Tableau -> Tableau (普通序列)
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
          moves.push({ type: 'tableau_to_tableau', card: topCard, fromCol: col, toCol: targetCol, priority: 40 });
        }
      }
    }
  }

  // 按优先级排序
  moves.sort((a, b) => b.priority - a.priority);
  return moves;
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Smart Solver\n');

  const controller = new BrowserController(CONFIG.outputDir);
  const stateHistory = new Map();
  let lastFoundationTotal = 0;

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    console.log('点击开始游戏...');
    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);

    console.log('点击第一关...');
    await controller.page.mouse.click(box.x + 160, box.y + 200);
    await sleep(3000);

    let state = await getGameState(controller);
    console.log('初始状态:');
    printState(state);

    await controller.screenshot({ name: 'initial' });

    let moveCount = 0;
    const maxMoves = 500;
    let noProgressCount = 0;

    while (moveCount < maxMoves) {
      state = await getGameState(controller);

      if (state.error) {
        console.log('获取状态出错:', state.error);
        await sleep(1000);
        continue;
      }

      const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
      console.log(`\n[移动 ${moveCount + 1}] Foundation: ${foundationTotal}/52 [${state.foundations?.map(f => f.length).join('/')}]`);

      if (foundationTotal === 52) {
        console.log('\n🎉🎉🎉 恭喜！成功通关第一关！🎉🎉🎉');
        await controller.screenshot({ name: 'victory' });
        break;
      }

      // 检查是否有进展
      if (foundationTotal > lastFoundationTotal) {
        noProgressCount = 0;
        lastFoundationTotal = foundationTotal;
        console.log(`  📈 Foundation进展: ${foundationTotal}/52`);
      }

      const moves = getSmartMoves(state);
      if (moves.length === 0) {
        console.log('\n没有可行的移动了');
        break;
      }

      // 选择一个移动
      let selectedMove = null;
      for (const move of moves) {
        const stateKey = getStateHash(state);
        const moveKey = `${move.type}-${move.card.rank}-${move.card.suit}`;
        const historyKey = `${stateKey}-${moveKey}`;
        const count = stateHistory.get(historyKey) || 0;
        if (count < 2) {
          selectedMove = move;
          stateHistory.set(historyKey, count + 1);
          break;
        }
      }

      if (!selectedMove) {
        noProgressCount++;
        if (noProgressCount >= 5) {
          console.log('\n连续无进展，停止求解');
          break;
        }
        // 使用最高优先级的移动
        selectedMove = moves[0];
      }

      moveCount++;
      const cardDisplay = `${selectedMove.card.rank}${selectedMove.card.suit[0].toUpperCase()}`;
      console.log(`  执行: ${cardDisplay} - ${selectedMove.type} (优先级: ${selectedMove.priority})`);

      let result;
      switch (selectedMove.type) {
        case 'tableau_to_foundation':
          result = await moveToFoundation(controller, selectedMove.fromCol);
          break;
        case 'tableau_to_freecell':
          result = await moveToFreeCell(controller, selectedMove.fromCol, selectedMove.freeCellIndex);
          break;
        case 'tableau_to_tableau':
          result = await moveToTableau(controller, selectedMove.fromCol, selectedMove.toCol);
          break;
        case 'freecell_to_foundation':
          result = await moveFreeCellToFoundation(controller, selectedMove.freeCellIndex);
          break;
        case 'freecell_to_tableau':
          result = await moveFreeCellToTableau(controller, selectedMove.freeCellIndex, selectedMove.toCol);
          break;
      }

      if (result?.success) {
        console.log(`  ✅ 成功: ${result.card}`);
      } else if (result) {
        console.log(`  ❌ 失败: ${result.error}`);
      }

      await sleep(150);

      if (moveCount % 25 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
      }
    }

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