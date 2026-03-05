#!/usr/bin/env node
/**
 * FreeCell Level 1 Solver - BFS Version
 * 使用广度优先搜索找到通关路径
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

// 生成状态键
function getStateKey(state) {
  const tableauKey = state.tableau.map(col =>
    col.map(c => `${c.rank}${c.suit[0]}`).join(',')
  ).join('|');
  const freeCellKey = state.freeCells.map(c => c ? `${c.rank}${c.suit[0]}` : '-').join(',');
  const foundationKey = state.foundations.map(f => f.length).join(',');
  return `${tableauKey}#${freeCellKey}#${foundationKey}`;
}

// 检查是否获胜
function checkWin(state) {
  if (!state.foundations) return false;
  return state.foundations.every(f => f.length === 13);
}

// 克隆状态
function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

// 生成所有可能的移动
function generateMoves(state) {
  const moves = [];
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return moves;

  // 1. 从freeCell移动到foundation
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.suit);
    const foundation = foundations[suitIndex];
    const canMoveToFoundation = foundation.length === 0
      ? card.rank === 1
      : (foundation[foundation.length - 1].rank === card.rank - 1);
    if (canMoveToFoundation) {
      moves.push({
        type: 'freecell_to_foundation',
        from: { type: 'freecell', index: i },
        to: { type: 'foundation', index: suitIndex },
        card: card,
        priority: 100
      });
    }
  }

  // 2. 从tableau移动到foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
    const foundation = foundations[suitIndex];
    const canMoveToFoundation = foundation.length === 0
      ? topCard.rank === 1
      : (foundation[foundation.length - 1].rank === topCard.rank - 1);
    if (canMoveToFoundation) {
      moves.push({
        type: 'to_foundation',
        from: { col },
        to: { type: 'foundation', index: suitIndex },
        card: topCard,
        priority: 90
      });
    }
  }

  // 3. 从tableau移动到tableau
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    const isRed = ['hearts', 'diamonds'].includes(topCard.suit);

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];

      if (targetColumn.length === 0) {
        // 空列
        moves.push({
          type: 'to_tableau',
          from: { col },
          to: { type: 'tableau', col: targetCol },
          card: topCard,
          priority: 10
        });
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
        if (isRed !== targetIsRed && topCard.rank === targetCard.rank - 1) {
          moves.push({
            type: 'to_tableau',
            from: { col },
            to: { type: 'tableau', col: targetCol },
            card: topCard,
            priority: 20
          });
        }
      }
    }
  }

  // 4. 从tableau移动到freeCell
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  if (emptyFreeCellIndex !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length === 0) continue;
      const topCard = column[column.length - 1];
      moves.push({
        type: 'to_freecell',
        from: { col },
        to: { type: 'freecell', index: emptyFreeCellIndex },
        card: topCard,
        priority: 5
      });
    }
  }

  // 5. 从freeCell移动到tableau
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    const isRed = ['hearts', 'diamonds'].includes(card.suit);

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        moves.push({
          type: 'freecell_to_tableau',
          from: { type: 'freecell', index: i },
          to: { type: 'tableau', col: targetCol },
          card: card,
          priority: 15
        });
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
        if (isRed !== targetIsRed && card.rank === targetCard.rank - 1) {
          moves.push({
            type: 'freecell_to_tableau',
            from: { type: 'freecell', index: i },
            to: { type: 'tableau', col: targetCol },
            card: card,
            priority: 25
          });
        }
      }
    }
  }

  return moves.sort((a, b) => b.priority - a.priority);
}

// 模拟执行移动
function simulateMove(state, move) {
  const newState = cloneState(state);

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

// BFS搜索解决方案
function solve(state, maxDepth = 150) {
  const queue = [{ state: cloneState(state), path: [] }];
  const visited = new Set();
  visited.add(getStateKey(state));

  let iterations = 0;
  const maxIterations = 200000;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const { state: currentState, path } = queue.shift();

    if (checkWin(currentState)) {
      console.log(`Found solution in ${path.length} moves after ${iterations} iterations`);
      return path;
    }

    if (path.length >= maxDepth) continue;

    const moves = generateMoves(currentState);
    for (const move of moves) {
      const newState = simulateMove(currentState, move);
      const stateKey = getStateKey(newState);

      if (!visited.has(stateKey)) {
        visited.add(stateKey);
        queue.push({
          state: newState,
          path: [...path, move]
        });
      }
    }
  }

  console.log(`No solution found after ${iterations} iterations`);
  return null;
}

// 执行移动
async function executeMove(controller, move, state) {
  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;
  const startX = 80;

  let fromX, fromY, toX, toY;

  if (move.from.type === 'freecell') {
    const freeCellStartX = 75;
    fromX = freeCellStartX + move.from.index * 80;
    fromY = 150;
  } else {
    const col = state.tableau[move.from.col];
    fromX = startX + move.from.col * 80;
    fromY = tableauStartY + (col.length - 1) * cardGap;
  }

  if (move.to.type === 'foundation') {
    const foundationStartX = 415;
    toX = foundationStartX + move.to.index * 80 + 35;
    toY = 150;
  } else if (move.to.type === 'freecell') {
    const freeCellStartX = 75;
    toX = freeCellStartX + move.to.index * 80;
    toY = 150;
  } else {
    const targetCol = state.tableau[move.to.col];
    toX = startX + move.to.col * 80;
    toY = tableauStartY + targetCol.length * cardGap;
  }

  const canvas = await controller.page.$('#game-container canvas');
  const box = await canvas.boundingBox();

  if (move.to.type === 'foundation') {
    console.log(`  双击: (${Math.round(fromX)}, ${Math.round(fromY)})`);
    await controller.page.mouse.dblclick(box.x + fromX, box.y + fromY);
  } else {
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
  console.log('🃏 FreeCell Level 1 Solver (BFS)\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    // 进入游戏
    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);
    await controller.page.mouse.click(box.x + 160, box.y + 200);
    await sleep(3000);

    // 获取初始状态
    let state = await getGameState(controller);
    console.log('初始状态:');
    printState(state);

    // 使用BFS搜索解决方案
    console.log('Searching for solution...');
    const solution = solve(state, 100);

    if (!solution) {
      console.log('\n❌ 未找到解决方案');
      return;
    }

    console.log(`\n✅ 找到解决方案，共 ${solution.length} 步`);

    // 执行解决方案
    for (let i = 0; i < solution.length; i++) {
      const move = solution[i];
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`\n移动 #${i + 1}: ${cardDisplay} ${move.type}`);

      await executeMove(controller, move, state);

      state = await getGameState(controller);
      console.log(`  Foundations: ${state.foundations?.map(f => f.length).join('/')}`);

      if ((i + 1) % 10 === 0) {
        await controller.screenshot({ name: `step-${i + 1}` });
      }
    }

    // 检查结果
    if (checkWin(state)) {
      console.log('\n🎉 恭喜！成功通关！');
    } else {
      console.log('\n⚠️ 未完成');
    }

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