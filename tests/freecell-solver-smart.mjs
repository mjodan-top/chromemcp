#!/usr/bin/env node
/**
 * FreeCell Level 1 Solver - Smart Greedy
 * 使用改进的贪心策略 + 状态评估
 */

import { BrowserController } from '../packages/core/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  targetUrl: 'http://localhost:3004',
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
      if (gameScene.getGameStateForTest) return gameScene.getGameStateForTest();
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

function getStateKey(state) {
  const tableauKey = state.tableau.map(col => col.map(c => `${c.rank}${c.suit[0]}`).join(',')).join('|');
  const freeCellKey = state.freeCells.map(c => c ? `${c.rank}${c.suit[0]}` : '-').join(',');
  const foundationKey = state.foundations.map(f => f.length).join(',');
  return `${tableauKey}#${freeCellKey}#${foundationKey}`;
}

function checkWin(state) {
  if (!state.foundations) return false;
  return state.foundations.every(f => f.length === 13);
}

// 评估状态的分数（越高越好）
function evaluateState(state) {
  let score = 0;

  // foundation中的牌得分
  for (let i = 0; i < 4; i++) {
    score += state.foundations[i].length * 100;
  }

  // freeCell中的牌（尽量保持空位）
  const freeCellCount = state.freeCells.filter(c => c !== null).length;
  score -= freeCellCount * 10;

  // 暴露的A和2
  for (let col = 0; col < 8; col++) {
    const column = state.tableau[col];
    if (column.length > 0) {
      const topCard = column[column.length - 1];
      if (topCard.rank === 1) score += 50;
      if (topCard.rank === 2) score += 25;
    }
  }

  // 空列奖励
  const emptyCols = state.tableau.filter(col => col.length === 0).length;
  score += emptyCols * 30;

  return score;
}

// 生成所有可能的移动
function generateMoves(state) {
  const moves = [];
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return moves;

  // 1. 从freeCell移动到foundation（最高优先级）
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.suit);
    const foundation = foundations[suitIndex];
    const canMove = foundation.length === 0 ? card.rank === 1 : foundation[foundation.length - 1].rank === card.rank - 1;
    if (canMove) {
      moves.push({ type: 'freecell_to_foundation', from: { type: 'freecell', index: i }, to: { type: 'foundation', index: suitIndex }, card });
    }
  }

  // 2. 从tableau移动到foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
    const foundation = foundations[suitIndex];
    const canMove = foundation.length === 0 ? topCard.rank === 1 : foundation[foundation.length - 1].rank === topCard.rank - 1;
    if (canMove) {
      moves.push({ type: 'to_foundation', from: { col }, to: { type: 'foundation', index: suitIndex }, card: topCard });
    }
  }

  // 3. 从freeCell移动到tableau（释放freeCell）
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    const isRed = ['hearts', 'diamonds'].includes(card.suit);
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        moves.push({ type: 'freecell_to_tableau', from: { type: 'freecell', index: i }, to: { type: 'tableau', col: targetCol }, card });
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
        if (isRed !== targetIsRed && card.rank === targetCard.rank - 1) {
          moves.push({ type: 'freecell_to_tableau', from: { type: 'freecell', index: i }, to: { type: 'tableau', col: targetCol }, card });
        }
      }
    }
  }

  // 4. 从tableau移动到tableau
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    const isRed = ['hearts', 'diamonds'].includes(topCard.suit);
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        // 空列：只有当这张牌可以移动到foundation时才考虑
        const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
        const foundation = foundations[suitIndex];
        const nextNeeded = foundation.length === 0 ? 1 : foundation[foundation.length - 1].rank + 1;
        if (topCard.rank === nextNeeded) {
          moves.push({ type: 'to_tableau', from: { col }, to: { type: 'tableau', col: targetCol }, card: topCard });
        }
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
        if (isRed !== targetIsRed && topCard.rank === targetCard.rank - 1) {
          moves.push({ type: 'to_tableau', from: { col }, to: { type: 'tableau', col: targetCol }, card: topCard });
        }
      }
    }
  }

  // 5. 从tableau移动到freeCell（最后选择）
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  if (emptyFreeCellIndex !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length === 0) continue;
      const topCard = column[column.length - 1];
      // 只有当这张牌可以移动到foundation时才考虑放到freeCell
      const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
      const foundation = foundations[suitIndex];
      const nextNeeded = foundation.length === 0 ? 1 : foundation[foundation.length - 1].rank + 1;
      if (topCard.rank === nextNeeded) {
        moves.push({ type: 'to_freecell', from: { col }, to: { type: 'freecell', index: emptyFreeCellIndex }, card: topCard });
      }
    }
  }

  return moves;
}

// 模拟执行移动
function simulateMove(state, move) {
  const newState = JSON.parse(JSON.stringify(state));
  if (move.type === 'to_foundation') {
    const card = newState.tableau[move.from.col].pop();
    newState.foundations[move.to.index].push(card);
  } else if (move.type === 'freecell_to_foundation') {
    const card = newState.freeCells[move.from.index];
    newState.freeCells[move.from.index] = null;
    newState.foundations[move.to.index].push(card);
  } else if (move.type === 'to_tableau') {
    const card = newState.tableau[move.from.col].pop();
    newState.tableau[move.to.col].push(card);
  } else if (move.type === 'to_freecell') {
    const card = newState.tableau[move.from.col].pop();
    newState.freeCells[move.to.index] = card;
  } else if (move.type === 'freecell_to_tableau') {
    const card = newState.freeCells[move.from.index];
    newState.freeCells[move.from.index] = null;
    newState.tableau[move.to.col].push(card);
  }
  return newState;
}

// 选择最佳移动
function selectBestMove(state, moves, visitedStates) {
  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const newState = simulateMove(state, move);
    const stateKey = getStateKey(newState);

    // 避免已访问的状态
    if (visitedStates.has(stateKey)) continue;

    const score = evaluateState(newState);

    // 优先选择foundation移动
    if (move.type === 'to_foundation' || move.type === 'freecell_to_foundation') {
      return move; // 立即返回foundation移动
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// 执行移动
async function executeMove(controller, move, state) {
  const tableauStartY = 260;
  const startX = 80;

  let fromX, fromY;

  if (move.from.type === 'freecell') {
    fromX = 75 + move.from.index * 80;
    fromY = 150;
  } else {
    const col = state.tableau[move.from.col];
    fromX = startX + move.from.col * 80;
    fromY = tableauStartY + (col.length - 1) * 25;
  }

  const canvas = await controller.page.$('#game-container canvas');
  const box = await canvas.boundingBox();

  if (move.to.type === 'foundation') {
    console.log(`  双击: (${Math.round(fromX)}, ${Math.round(fromY)})`);
    await controller.page.mouse.dblclick(box.x + fromX, box.y + fromY);
  } else {
    let toX, toY;
    if (move.to.type === 'freecell') {
      toX = 75 + move.to.index * 80;
      toY = 150;
    } else {
      const targetCol = state.tableau[move.to.col];
      toX = startX + move.to.col * 80;
      toY = tableauStartY + targetCol.length * 25;
    }
    console.log(`  拖拽: (${Math.round(fromX)}, ${Math.round(fromY)}) -> (${Math.round(toX)}, ${Math.round(toY)})`);
    await controller.page.mouse.move(box.x + fromX, box.y + fromY);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(box.x + toX, box.y + toY, { steps: 15 });
    await sleep(50);
    await controller.page.mouse.up();
  }
  await sleep(800);
}

async function main() {
  console.log('🃏 FreeCell Level 1 Solver (Smart Greedy)\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);
    await controller.page.mouse.click(box.x + 160, box.y + 200);
    await sleep(3000);

    let state = await getGameState(controller);
    console.log('初始状态:');
    printState(state);

    const visitedStates = new Set();
    visitedStates.add(getStateKey(state));

    let moveCount = 0;
    const maxMoves = 200;
    let noProgressCount = 0;

    while (moveCount < maxMoves) {
      if (checkWin(state)) {
        console.log('\n🎉 恭喜！成功通关！');
        break;
      }

      const moves = generateMoves(state);
      if (moves.length === 0) {
        console.log('\n⚠️ 没有可行移动');
        printState(state);
        break;
      }

      const move = selectBestMove(state, moves, visitedStates);

      if (!move) {
        console.log('\n⚠️ 所有移动都会导致循环');
        break;
      }

      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`\n移动 #${moveCount + 1}: ${cardDisplay} ${move.type}`);

      await executeMove(controller, move, state);

      const prevScore = evaluateState(state);
      const prevStateKey = getStateKey(state);
      state = await getGameState(controller);
      const newStateKey = getStateKey(state);

      if (prevStateKey === newStateKey) {
        console.log('  ⚠️ 移动未改变状态，跳过');
        continue;
      }

      const newScore = evaluateState(state);
      console.log(`  Foundations: ${state.foundations?.map(f => f.length).join('/')}, Score: ${newScore}`);

      if (newScore <= prevScore) {
        noProgressCount++;
        if (noProgressCount > 10) {
          console.log('\n⚠️ 长时间没有进展');
          break;
        }
      } else {
        noProgressCount = 0;
      }

      visitedStates.add(getStateKey(state));
      moveCount++;

      if (moveCount % 10 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`总移动次数: ${moveCount}`);
    printState(state);
    await controller.screenshot({ name: 'final' });

    console.log('\n浏览器将在5秒后关闭...');
    await sleep(5000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);
