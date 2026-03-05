#!/usr/bin/env node
/**
 * FreeCell Level 1 - Simple DFS Solver
 * 简单的DFS搜索，避免复杂的状态管理
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

// ==================== DFS Solver ====================

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

function isWin(state) {
  return state.foundations.every(f => f.length === 13);
}

// 获取移动列表
function getMoves(state) {
  const { tableau, freeCells, foundations } = state;
  const moves = [];
  const emptyFC = freeCells.findIndex(c => c === null);
  const emptyCols = tableau.map((col, idx) => col.length === 0 ? idx : -1).filter(i => i >= 0);

  // 1. FreeCell -> Foundation (最高优先级)
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && canMoveToFoundation(card, foundations)) {
      moves.push({ type: 'fc_to_f', card: {...card}, from: i, to: getSuitIndex(card.suit), score: 0 });
    }
  }

  // 2. Tableau -> Foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      moves.push({ type: 't_to_f', card: {...topCard}, from: col, to: getSuitIndex(topCard.suit), score: 1 });
    }
  }

  // 3. Tableau -> Tableau (暴露有用牌)
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
          const willExpose = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
          const willExposeA = column.length > 1 && column[column.length - 2].rank === 1;
          moves.push({ type: 't_to_t', card: {...topCard}, from: col, to: targetCol, score: willExposeA ? 2 : (willExpose ? 3 : 7) });
        }
      }
    }
  }

  // 4. FreeCell -> Tableau
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length > 0) {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(card, targetCard)) {
          moves.push({ type: 'fc_to_t', card: {...card}, from: i, to: targetCol, score: 6 });
        }
      }
    }
  }

  // 5. K -> 空列
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];
    if (topCard.rank === 13 && emptyCols.length > 0) {
      const willExpose = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
      moves.push({ type: 't_to_t', card: {...topCard}, from: col, to: emptyCols[0], score: willExpose ? 4 : 9 });
    }
  }

  // 6. Tableau -> FreeCell (只暴露有用牌)
  if (emptyFC !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];
      const willExpose = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
      const willExposeA = column.length > 1 && column[column.length - 2].rank === 1;
      if (willExpose || willExposeA) {
        moves.push({ type: 't_to_fc', card: {...topCard}, from: col, to: emptyFC, score: willExposeA ? 3 : 5 });
      }
    }
  }

  // 7. FreeCell K -> 空列
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && card.rank === 13 && emptyCols.length > 0) {
      moves.push({ type: 'fc_to_t', card: {...card}, from: i, to: emptyCols[0], score: 10 });
    }
  }

  // 8. 任意移到空列 (最低优先级)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];
    if (topCard.rank !== 13 && emptyCols.length > 0) {
      moves.push({ type: 't_to_t', card: {...topCard}, from: col, to: emptyCols[0], score: 15 });
    }
  }

  // 9. 任意移到FreeCell
  if (emptyFC !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];
      moves.push({ type: 't_to_fc', card: {...topCard}, from: col, to: emptyFC, score: 20 });
    }
  }

  moves.sort((a, b) => a.score - b.score);
  return moves;
}

function cloneState(state) {
  return {
    tableau: state.tableau.map(col => col.map(c => ({ ...c }))),
    freeCells: state.freeCells.map(c => c ? { ...c } : null),
    foundations: state.foundations.map(f => f.map(c => ({ ...c })))
  };
}

function applyMove(state, move) {
  const newState = cloneState(state);
  if (move.type === 't_to_f') {
    const card = newState.tableau[move.from].pop();
    newState.foundations[move.to].push(card);
  } else if (move.type === 'fc_to_f') {
    const card = newState.freeCells[move.from];
    newState.freeCells[move.from] = null;
    newState.foundations[move.to].push(card);
  } else if (move.type === 't_to_t') {
    const card = newState.tableau[move.from].pop();
    newState.tableau[move.to].push(card);
  } else if (move.type === 't_to_fc') {
    const card = newState.tableau[move.from].pop();
    newState.freeCells[move.to] = card;
  } else if (move.type === 'fc_to_t') {
    const card = newState.freeCells[move.from];
    newState.freeCells[move.from] = null;
    newState.tableau[move.to].push(card);
  }
  return newState;
}

// 简单的状态哈希
function stateKey(state) {
  const fd = state.foundations.map(f => f.length).join(',');
  const fc = state.freeCells.map(c => c ? `${c.rank}${c.suit[0]}` : '_').join(',');
  const depths = state.tableau.map(col => col.length).join(',');
  return `${fd};${fc};${depths}`;
}

// DFS with memoization
function dfsSolve(initialState, maxDepth = 150) {
  console.log('Starting DFS search with memoization...');

  const memo = new Map();
  let bestFoundation = 0;
  let iterations = 0;
  const maxIterations = 5000000;

  function dfs(state, depth, path) {
    iterations++;
    if (iterations > maxIterations) return null;

    // 检查胜利
    if (isWin(state)) {
      return path;
    }

    // 跟踪进展
    const foundationTotal = state.foundations.reduce((sum, f) => sum + f.length, 0);
    if (foundationTotal > bestFoundation) {
      bestFoundation = foundationTotal;
      console.log(`  Progress: ${bestFoundation}/52, Depth: ${depth}, Iterations: ${iterations}`);
    }

    // 深度限制
    if (depth >= maxDepth) return null;

    // 检查memo
    const key = stateKey(state);
    if (memo.has(key) && memo.get(key) <= depth) {
      return null;
    }
    memo.set(key, depth);

    // 获取移动
    const moves = getMoves(state);

    // 尝试每个移动
    for (const move of moves) {
      const nextState = applyMove(state, move);
      const result = dfs(nextState, depth + 1, [...path, move]);
      if (result) return result;
    }

    return null;
  }

  const result = dfs(initialState, 0, []);

  if (!result) {
    console.log(`\nNo solution found. Best: ${bestFoundation}/52, Iterations: ${iterations}`);
  } else {
    console.log(`\nFound solution in ${result.length} moves!`);
  }

  return result;
}

// ==================== Browser Control ====================

async function getGameState(controller) {
  return await controller.executeScript(() => {
    try {
      const phaserGame = window.game;
      if (!phaserGame) return { error: 'No phaser game found' };
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { error: 'GameScene not found' };
      return gameScene.getGameStateForTest ? gameScene.getGameStateForTest() : { error: 'no method' };
    } catch (e) { return { error: e.message }; }
  });
}

async function executeMoveScript(controller, script) {
  return await controller.page.evaluate(script);
}

async function moveToFoundation(controller, fromCol) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        const col = ${fromCol};
        const card = gs.tableauCards[col][gs.tableauCards[col].length - 1];
        const si = ['hearts','diamonds','clubs','spades'].indexOf(card.cardData.suit);
        gs.moveCardToFoundation(card, col, si);
        return { success: true };
      } catch(e) { return { success: false }; }
    })()
  `);
}

async function moveToFreeCell(controller, fromCol, fcIdx) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        const card = gs.tableauCards[${fromCol}][gs.tableauCards[${fromCol}].length - 1];
        gs.moveCardToFreeCell(card, ${fromCol}, ${fcIdx});
        return { success: true };
      } catch(e) { return { success: false }; }
    })()
  `);
}

async function moveToTableau(controller, fromCol, toCol) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        const card = gs.tableauCards[${fromCol}][gs.tableauCards[${fromCol}].length - 1];
        gs.moveCardsToTableau([card], ${fromCol}, ${toCol});
        return { success: true };
      } catch(e) { return { success: false }; }
    })()
  `);
}

async function moveFreeCellToFoundation(controller, fcIdx) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        const cd = gs.freeCellCards[${fcIdx}];
        const card = gs.cards.find(c => c.cardData.id === cd.id);
        const si = ['hearts','diamonds','clubs','spades'].indexOf(cd.suit);
        gs.freeCellCards[${fcIdx}] = null;
        gs.freeCellArea.setCard(${fcIdx}, null);
        gs.foundationCards[si].push(card.cardData);
        gs.foundationArea.setCards(si, gs.foundationCards[si]);
        card.animateTo(gs.foundationArea.getSlotPosition(si).x, gs.foundationArea.getSlotPosition(si).y);
        gs.gameState.movesCount++;
        return { success: true };
      } catch(e) { return { success: false }; }
    })()
  `);
}

async function moveFreeCellToTableau(controller, fcIdx, toCol) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        const cd = gs.freeCellCards[${fcIdx}];
        const card = gs.cards.find(c => c.cardData.id === cd.id);
        gs.freeCellCards[${fcIdx}] = null;
        gs.freeCellArea.setCard(${fcIdx}, null);
        const y = 260 + gs.tableauCards[${toCol}].length * 25;
        const x = 80 + ${toCol} * 80;
        card.animateTo(x, y);
        gs.tableauCards[${toCol}].push(card);
        gs.gameState.movesCount++;
        return { success: true };
      } catch(e) { return { success: false }; }
    })()
  `);
}

async function executeMove(controller, move) {
  switch (move.type) {
    case 't_to_f': return await moveToFoundation(controller, move.from);
    case 't_to_fc': return await moveToFreeCell(controller, move.from, move.to);
    case 't_to_t': return await moveToTableau(controller, move.from, move.to);
    case 'fc_to_f': return await moveFreeCellToFoundation(controller, move.from);
    case 'fc_to_t': return await moveFreeCellToTableau(controller, move.from, move.to);
  }
}

async function main() {
  console.log('🃏 FreeCell Level 1 - DFS Solver\n');

  const controller = new BrowserController(CONFIG.outputDir);

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

    const initialState = await getGameState(controller);
    if (initialState.error) {
      console.log('获取初始状态失败:', initialState.error);
      return;
    }

    console.log('初始状态获取成功');
    await controller.screenshot({ name: 'initial' });

    // 运行DFS搜索
    const solution = dfsSolve(initialState, 150);

    if (!solution) {
      console.log('\n未找到解决方案');
      await controller.screenshot({ name: 'failed' });
      return;
    }

    console.log(`\n找到解决方案！共 ${solution.length} 步`);

    for (let i = 0; i < solution.length; i++) {
      const move = solution[i];
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`[${i + 1}/${solution.length}] ${cardDisplay} ${move.type}`);
      await executeMove(controller, move);
      await sleep(80);
    }

    const finalState = await getGameState(controller);
    const foundationTotal = finalState.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;

    console.log(`\n=== 游戏结果 ===`);
    console.log(`Foundation: ${foundationTotal}/52`);

    if (foundationTotal === 52) {
      console.log('\n🎉🎉🎉 恭喜！成功通关第一关！🎉🎉🎉');
      await controller.screenshot({ name: 'victory' });
    } else {
      await controller.screenshot({ name: 'final' });
    }

    console.log('\n浏览器将在10秒后关闭...');
    await sleep(10000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);