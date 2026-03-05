#!/usr/bin/env node
/**
 * FreeCell Level 1 - Optimized A* Solver
 * 优化的 A* 搜索，使用更好的启发函数和状态管理
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

// ==================== A* Solver ====================

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

// 更紧凑的状态哈希 - 只关注关键信息
function stateHash(state) {
  const { tableau, freeCells, foundations } = state;

  // Foundation 状态
  const fd = foundations.map(f => f.length).join(',');

  // FreeCell 状态 - 只记录有牌的
  const fc = freeCells.map(c => c ? `${c.rank}${c.suit[0]}` : '_').join('');

  // Tableau 顶部牌 - 只记录每列顶部
  const topCards = tableau.map(col =>
    col.length > 0 ? `${col[col.length-1].rank}${col[col.length-1].suit[0]}` : '_'
  ).join('');

  // Tableau 深度
  const depths = tableau.map(col => col.length).join(',');

  return `${fd};${fc};${topCards};${depths}`;
}

function isWin(state) {
  return state.foundations.every(f => f.length === 13);
}

// 改进的启发函数
function heuristic(state) {
  const { tableau, freeCells, foundations } = state;

  // Foundation中的卡牌数
  const foundationTotal = foundations.reduce((sum, f) => sum + f.length, 0);

  // 空FreeCell数量
  const emptyFreeCells = freeCells.filter(c => c === null).length;

  // 空列数量
  const emptyColumns = tableau.filter(col => col.length === 0).length;

  // 可以立即移到Foundation的牌数
  let canMoveToFoundationCount = 0;
  for (const col of tableau) {
    if (col.length > 0 && canMoveToFoundation(col[col.length - 1], foundations)) {
      canMoveToFoundationCount++;
    }
  }
  for (const card of freeCells) {
    if (card && canMoveToFoundation(card, foundations)) {
      canMoveToFoundationCount++;
    }
  }

  // 每张不在Foundation的牌需要至少1步移动
  // 有序序列可以一次移动多张
  // 空位和空列可以增加移动能力

  const minMoves = (52 - foundationTotal);
  const bonus = emptyFreeCells * 2 + emptyColumns * 2 + canMoveToFoundationCount * 3;

  return minMoves - bonus;
}

// 获取所有有效移动
function getValidMoves(state) {
  const { tableau, freeCells, foundations } = state;
  const moves = [];
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  const emptyColumns = tableau.map((col, idx) => col.length === 0 ? idx : -1).filter(i => i >= 0);

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
          const willExposeUseful = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
          const willExposeA = column.length > 1 && column[column.length - 2].rank === 1;
          moves.push({
            type: 't_to_t', card: {...topCard}, from: col, to: targetCol,
            score: willExposeA ? 2 : (willExposeUseful ? 3 : 6)
          });
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
          moves.push({ type: 'fc_to_t', card: {...card}, from: i, to: targetCol, score: 5 });
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
      const willExposeUseful = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
      moves.push({ type: 't_to_t', card: {...topCard}, from: col, to: emptyColumns[0], score: willExposeUseful ? 4 : 8 });
    }
  }

  // 6. Tableau -> FreeCell (只为了暴露有用牌)
  if (emptyFreeCellIndex !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];
      const willExposeUseful = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
      const willExposeA = column.length > 1 && column[column.length - 2].rank === 1;
      if (willExposeUseful || willExposeA) {
        moves.push({ type: 't_to_fc', card: {...topCard}, from: col, to: emptyFreeCellIndex, score: willExposeA ? 3 : 4 });
      }
    }
  }

  // 7. FreeCell K -> 空列
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && card.rank === 13 && emptyColumns.length > 0) {
      moves.push({ type: 'fc_to_t', card: {...card}, from: i, to: emptyColumns[0], score: 9 });
    }
  }

  // 按分数排序
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

// IDA* 搜索 (Iterative Deepening A*)
function idaStarSolve(initialState, maxDepth = 200) {
  console.log('Starting IDA* search...');

  let threshold = heuristic(initialState);
  let bestFoundation = 0;
  let totalIterations = 0;

  while (threshold <= maxDepth * 2) {
    console.log(`\nThreshold: ${threshold}, searching...`);

    const result = search(initialState, 0, threshold, [], new Set(), (progress) => {
      if (progress > bestFoundation) {
        bestFoundation = progress;
        console.log(`  Progress: ${progress}/52 in foundation`);
      }
      totalIterations++;
    });

    if (result.found) {
      console.log(`\nFound solution in ${result.path.length} moves! (Total iterations: ${totalIterations})`);
      return result.path;
    }

    if (result.newThreshold === Infinity) {
      console.log(`\nNo solution found. Best: ${bestFoundation}/52`);
      return null;
    }

    threshold = result.newThreshold;
  }

  return null;
}

function search(state, g, threshold, path, visited, onProgress) {
  const h = heuristic(state);
  const f = g + h;

  // 报告进展
  const foundationTotal = state.foundations.reduce((sum, f) => sum + f.length, 0);
  onProgress(foundationTotal);

  if (f > threshold) {
    return { found: false, newThreshold: f };
  }

  if (isWin(state)) {
    return { found: true, path: path };
  }

  const hash = stateHash(state);
  if (visited.has(hash)) {
    return { found: false, newThreshold: Infinity };
  }
  visited.add(hash);

  let minThreshold = Infinity;
  const moves = getValidMoves(state);

  for (const move of moves) {
    const nextState = applyMove(state, move);
    const nextPath = [...path, move];

    const result = search(nextState, g + 1, threshold, nextPath, visited, onProgress);

    if (result.found) {
      return result;
    }

    if (result.newThreshold < minThreshold) {
      minThreshold = result.newThreshold;
    }
  }

  visited.delete(hash);
  return { found: false, newThreshold: minThreshold };
}

// ==================== Browser Control ====================

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

async function moveToFoundation(controller, fromCol) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false };
        const col = ${fromCol};
        const column = gameScene.tableauCards[col];
        if (!column || column.length === 0) return { success: false };
        const card = column[column.length - 1];
        const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.cardData.suit);
        gameScene.moveCardToFoundation(card, col, suitIndex);
        return { success: true };
      } catch (e) { return { success: false }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

async function moveToFreeCell(controller, fromCol, freeCellIdx) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false };
        const col = ${fromCol}, fcIdx = ${freeCellIdx};
        const column = gameScene.tableauCards[col];
        if (!column || column.length === 0) return { success: false };
        const card = column[column.length - 1];
        gameScene.moveCardToFreeCell(card, col, fcIdx);
        return { success: true };
      } catch (e) { return { success: false }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

async function moveToTableau(controller, fromCol, toCol) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false };
        const fromC = ${fromCol}, toC = ${toCol};
        const fromColumn = gameScene.tableauCards[fromC];
        if (!fromColumn || fromColumn.length === 0) return { success: false };
        const card = fromColumn[fromColumn.length - 1];
        gameScene.moveCardsToTableau([card], fromC, toC);
        return { success: true };
      } catch (e) { return { success: false }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

async function moveFreeCellToFoundation(controller, freeCellIdx) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false };
        const idx = ${freeCellIdx};
        const cardData = gameScene.freeCellCards[idx];
        if (!cardData) return { success: false };
        const card = gameScene.cards.find(c => c.cardData.id === cardData.id);
        if (!card) return { success: false };
        const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(cardData.suit);
        gameScene.freeCellCards[idx] = null;
        gameScene.freeCellArea.setCard(idx, null);
        gameScene.foundationCards[suitIndex].push(card.cardData);
        gameScene.foundationArea.setCards(suitIndex, gameScene.foundationCards[suitIndex]);
        const pos = gameScene.foundationArea.getSlotPosition(suitIndex);
        card.animateTo(pos.x, pos.y);
        gameScene.gameState.movesCount++;
        return { success: true };
      } catch (e) { return { success: false }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

async function moveFreeCellToTableau(controller, freeCellIdx, toCol) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false };
        const idx = ${freeCellIdx}, toC = ${toCol};
        const cardData = gameScene.freeCellCards[idx];
        if (!cardData) return { success: false };
        const card = gameScene.cards.find(c => c.cardData.id === cardData.id);
        if (!card) return { success: false };
        gameScene.freeCellCards[idx] = null;
        gameScene.freeCellArea.setCard(idx, null);
        const cardWidth = 70, cardGap = 25, tableauStartY = 260;
        const totalWidth = 8 * cardWidth + 7 * 10;
        const startX = (720 - totalWidth) / 2 + cardWidth / 2;
        const y = tableauStartY + gameScene.tableauCards[toC].length * cardGap;
        card.animateTo(startX + toC * (cardWidth + 10), y);
        gameScene.tableauCards[toC].push(card);
        gameScene.gameState.movesCount++;
        return { success: true };
      } catch (e) { return { success: false }; }
    })()
  `;
  return await executeMoveScript(controller, script);
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
  console.log('🃏 FreeCell Level 1 - IDA* Solver\n');

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
    console.log('Foundation:', initialState.foundations?.map(f => f.length).join('/'));
    await controller.screenshot({ name: 'initial' });

    // 运行 IDA* 搜索
    const solution = idaStarSolve(initialState, 200);

    if (!solution) {
      console.log('\n未找到解决方案');
      await controller.screenshot({ name: 'failed' });
      return;
    }

    console.log(`\n找到解决方案！共 ${solution.length} 步`);
    console.log('开始执行移动...\n');

    for (let i = 0; i < solution.length; i++) {
      const move = solution[i];
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      const typeDisplay = {
        't_to_f': '->Foundation', 't_to_fc': '->FreeCell', 't_to_t': '->Tableau',
        'fc_to_f': 'FC->Foundation', 'fc_to_t': 'FC->Tableau'
      }[move.type];

      console.log(`[${i + 1}/${solution.length}] ${cardDisplay} ${typeDisplay}`);
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