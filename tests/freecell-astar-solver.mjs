#!/usr/bin/env node
/**
 * FreeCell Level 1 - A* Search Solver
 * 使用 A* 搜索算法找到通关路径
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

// ==================== A* Solver (Node.js side) ====================

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

// 状态哈希
function stateHash(state) {
  const { tableau, freeCells, foundations } = state;
  const t = tableau.map(col => col.map(c => `${c.rank}${c.suit[0]}`).join(',')).join('|');
  const f = freeCells.map(c => c ? `${c.rank}${c.suit[0]}` : '_').join(',');
  const fd = foundations.map(f => f.length).join(',');
  return `${t}#${f}#${fd}`;
}

// 检查胜利
function isWin(state) {
  return state.foundations.every(f => f.length === 13);
}

// 启发函数 - 估计到目标的距离
function heuristic(state) {
  const { tableau, freeCells, foundations } = state;

  // Foundation中的卡牌数（越多越好，所以取负）
  const foundationScore = foundations.reduce((sum, f) => sum + f.length, 0);

  // 空FreeCell数量（越多越好）
  const emptyFreeCells = freeCells.filter(c => c === null).length;

  // 空列数量（越多越好）
  const emptyColumns = tableau.filter(col => col.length === 0).length;

  // 有序序列长度（越长越好）
  let sequenceScore = 0;
  for (const col of tableau) {
    if (col.length < 2) continue;
    for (let i = col.length - 2; i >= 0; i--) {
      if (canStackOnTableau(col[i + 1], col[i])) {
        sequenceScore++;
      } else {
        break;
      }
    }
  }

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

  // 启发值：越小越好
  // 52 - foundationScore = 剩余需要移到Foundation的牌
  // 减去有利因素
  return (52 - foundationScore) * 10
    - emptyFreeCells * 5
    - emptyColumns * 3
    - sequenceScore * 2
    - canMoveToFoundationCount * 15;
}

// 获取所有有效移动
function getValidMoves(state) {
  const { tableau, freeCells, foundations } = state;
  const moves = [];
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  const emptyColumns = tableau.map((col, idx) => col.length === 0 ? idx : -1).filter(i => i >= 0);

  // 1. FreeCell -> Foundation
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && canMoveToFoundation(card, foundations)) {
      moves.push({ type: 'fc_to_f', card, from: i, to: getSuitIndex(card.suit), priority: 0 });
    }
  }

  // 2. Tableau -> Foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      moves.push({ type: 't_to_f', card: topCard, from: col, to: getSuitIndex(topCard.suit), priority: 0 });
    }
  }

  // 3. Tableau -> Tableau
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
          // 计算优先级：暴露有用牌的优先
          const willExposeUseful = column.length > 1 && canMoveToFoundation(column[column.length - 2], foundations);
          const willExposeA = column.length > 1 && column[column.length - 2].rank === 1;
          const priority = willExposeA ? 1 : (willExposeUseful ? 2 : 5);
          moves.push({ type: 't_to_t', card: topCard, from: col, to: targetCol, priority });
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
          moves.push({ type: 'fc_to_t', card, from: i, to: targetCol, priority: 4 });
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
      moves.push({ type: 't_to_t', card: topCard, from: col, to: emptyColumns[0], priority: willExposeUseful ? 3 : 6 });
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
        moves.push({ type: 't_to_fc', card: topCard, from: col, to: emptyFreeCellIndex, priority: willExposeA ? 2 : 3 });
      }
    }
  }

  // 7. FreeCell K -> 空列
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && card.rank === 13 && emptyColumns.length > 0) {
      moves.push({ type: 'fc_to_t', card, from: i, to: emptyColumns[0], priority: 7 });
    }
  }

  // 8. 任意移到空列
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];
    if (topCard.rank !== 13 && emptyColumns.length > 0) {
      moves.push({ type: 't_to_t', card: topCard, from: col, to: emptyColumns[0], priority: 10 });
    }
  }

  // 按优先级排序
  moves.sort((a, b) => a.priority - b.priority);
  return moves;
}

// 深拷贝状态
function cloneState(state) {
  return {
    tableau: state.tableau.map(col => col.map(c => ({ ...c }))),
    freeCells: state.freeCells.map(c => c ? { ...c } : null),
    foundations: state.foundations.map(f => f.map(c => ({ ...c })))
  };
}

// 应用移动到状态
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

// A* 搜索
function aStarSolve(initialState, maxIterations = 200000, maxDepth = 150) {
  console.log('Starting A* search...');

  // 开放列表：{ state, path, g, h, f }
  const openSet = [{
    state: cloneState(initialState),
    path: [],
    g: 0,
    h: heuristic(initialState),
    f: heuristic(initialState)
  }];

  const closedSet = new Set();
  let iterations = 0;
  let bestFoundation = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // 取出 f 值最小的状态
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();

    // 检查胜利
    if (isWin(current.state)) {
      console.log(`Found solution in ${current.path.length} moves after ${iterations} iterations!`);
      return current.path;
    }

    // 检查状态哈希
    const hash = stateHash(current.state);
    if (closedSet.has(hash)) continue;
    closedSet.add(hash);

    // 跟踪最佳进展
    const foundationTotal = current.state.foundations.reduce((sum, f) => sum + f.length, 0);
    if (foundationTotal > bestFoundation) {
      bestFoundation = foundationTotal;
      console.log(`  Progress: ${bestFoundation}/52 cards in foundation`);
    }

    // 深度限制
    if (current.path.length >= maxDepth) continue;

    // 生成后继状态
    const moves = getValidMoves(current.state);
    for (const move of moves) {
      const nextState = applyMove(current.state, move);
      const nextHash = stateHash(nextState);

      if (!closedSet.has(nextHash)) {
        const g = current.g + 1;
        const h = heuristic(nextState);
        openSet.push({
          state: nextState,
          path: [...current.path, move],
          g,
          h,
          f: g + h
        });
      }
    }

    // 限制开放列表大小
    if (openSet.length > 50000) {
      openSet.sort((a, b) => a.f - b.f);
      openSet.splice(30000);
    }
  }

  console.log(`No solution found after ${iterations} iterations. Best: ${bestFoundation}/52`);
  return null;
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
        if (!gameScene) return { success: false, error: 'GameScene not found' };
        const col = ${fromCol};
        const column = gameScene.tableauCards[col];
        if (!column || column.length === 0) return { success: false, error: 'Column is empty' };
        const card = column[column.length - 1];
        const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.cardData.suit);
        gameScene.moveCardToFoundation(card, col, suitIndex);
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

async function moveToFreeCell(controller, fromCol, freeCellIdx) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };
        const col = ${fromCol};
        const fcIdx = ${freeCellIdx};
        const column = gameScene.tableauCards[col];
        if (!column || column.length === 0) return { success: false, error: 'Column is empty' };
        const card = column[column.length - 1];
        gameScene.moveCardToFreeCell(card, col, fcIdx);
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

async function moveToTableau(controller, fromCol, toCol) {
  const script = `
    (function() {
      try {
        const gameScene = window.game.scene.getScene('GameScene');
        if (!gameScene) return { success: false, error: 'GameScene not found' };
        const fromC = ${fromCol};
        const toC = ${toCol};
        const fromColumn = gameScene.tableauCards[fromC];
        if (!fromColumn || fromColumn.length === 0) return { success: false, error: 'Source column is empty' };
        const card = fromColumn[fromColumn.length - 1];
        gameScene.moveCardsToTableau([card], fromC, toC);
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

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
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

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
        const cardWidth = 70, cardGap = 25, tableauStartY = 260;
        const totalWidth = 8 * cardWidth + 7 * 10;
        const startX = (720 - totalWidth) / 2 + cardWidth / 2;
        const y = tableauStartY + gameScene.tableauCards[toC].length * cardGap;
        card.animateTo(startX + toC * (cardWidth + 10), y);
        gameScene.tableauCards[toC].push(card);
        gameScene.gameState.movesCount++;
        gameScene.selectedCards = [];
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    })()
  `;
  return await executeMoveScript(controller, script);
}

async function executeMove(controller, move) {
  switch (move.type) {
    case 't_to_f':
      return await moveToFoundation(controller, move.from);
    case 't_to_fc':
      return await moveToFreeCell(controller, move.from, move.to);
    case 't_to_t':
      return await moveToTableau(controller, move.from, move.to);
    case 'fc_to_f':
      return await moveFreeCellToFoundation(controller, move.from);
    case 'fc_to_t':
      return await moveFreeCellToTableau(controller, move.from, move.to);
  }
}

async function main() {
  console.log('🃏 FreeCell Level 1 - A* Search Solver\n');

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

    // 获取初始状态
    const initialState = await getGameState(controller);
    if (initialState.error) {
      console.log('获取初始状态失败:', initialState.error);
      return;
    }

    console.log('初始状态获取成功');
    console.log('Foundation:', initialState.foundations?.map(f => f.length).join('/'));

    await controller.screenshot({ name: 'initial' });

    // 运行 A* 搜索
    console.log('\n开始 A* 搜索...\n');
    const solution = aStarSolve(initialState, 300000, 200);

    if (!solution) {
      console.log('\n未找到解决方案');
      await controller.screenshot({ name: 'failed' });
      return;
    }

    console.log(`\n找到解决方案！共 ${solution.length} 步`);
    console.log('开始执行移动...\n');

    // 执行解决方案
    for (let i = 0; i < solution.length; i++) {
      const move = solution[i];
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      const typeDisplay = {
        't_to_f': '->Foundation',
        't_to_fc': '->FreeCell',
        't_to_t': '->Tableau',
        'fc_to_f': 'FC->Foundation',
        'fc_to_t': 'FC->Tableau'
      }[move.type];

      console.log(`[${i + 1}/${solution.length}] ${cardDisplay} ${typeDisplay}`);

      const result = await executeMove(controller, move);
      if (!result?.success) {
        console.log(`  失败: ${result?.error}`);
      }

      await sleep(100);

      if ((i + 1) % 20 === 0) {
        await controller.screenshot({ name: `step-${i + 1}` });
      }
    }

    // 验证结果
    const finalState = await getGameState(controller);
    const foundationTotal = finalState.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;

    console.log(`\n=== 游戏结果 ===`);
    console.log(`Foundation: ${foundationTotal}/52 [${finalState.foundations?.map(f => f.length).join('/')}]`);

    if (foundationTotal === 52) {
      console.log('\n🎉🎉🎉 恭喜！成功通关第一关！🎉🎉🎉');
      await controller.screenshot({ name: 'victory' });
    } else {
      console.log(`\n⚠️ 未完成通关`);
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