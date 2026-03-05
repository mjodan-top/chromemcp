#!/usr/bin/env node
/**
 * FreeCell Level 1 Solver - Advanced DFS with Heuristics
 * 使用深度优先搜索 + 改进的启发式函数 + 回溯
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
  return `${tableauKey}#${freeCellKey}`;
}

function checkWin(state) {
  if (!state.foundations) return false;
  return state.foundations.every(f => f.length === 13);
}

// 改进的状态评估函数
function evaluateState(state) {
  let score = 0;
  const { tableau, freeCells, foundations } = state;

  // 1. Foundation 中的牌 - 权重最高
  const foundationCards = foundations.reduce((sum, f) => sum + f.length, 0);
  score += foundationCards * 1000;

  // 2. 检查每个 foundation 的连续性
  for (let i = 0; i < 4; i++) {
    const foundation = foundations[i];
    if (foundation.length > 0) {
      // 连续的牌额外加分
      score += foundation.length * foundation.length * 10;
    }
  }

  // 3. 暴露的A和2（可以直接移动到foundation）
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length > 0) {
      const topCard = column[column.length - 1];
      if (topCard.rank === 1) score += 200;
      if (topCard.rank === 2) {
        const suitIdx = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
        if (foundations[suitIdx].length === 1) score += 150;
      }
    }
  }

  // 4. FreeCell 中的A和2
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    if (card.rank === 1) score += 100;
    if (card.rank === 2) {
      const suitIdx = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.suit);
      if (foundations[suitIdx].length === 1) score += 80;
    }
  }

  // 5. 空列奖励（可以暂存更多牌）
  const emptyCols = tableau.filter(col => col.length === 0).length;
  score += emptyCols * 100;

  // 6. 空FreeCell奖励
  const emptyFreeCells = freeCells.filter(c => c === null).length;
  score += emptyFreeCells * 50;

  // 7. 序列长度奖励（可以一次移动多张牌）
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length >= 2) {
      let seqLength = 1;
      for (let i = column.length - 2; i >= 0; i--) {
        const card = column[i];
        const belowCard = column[i + 1];
        const isRed = ['hearts', 'diamonds'].includes(card.suit);
        const belowIsRed = ['hearts', 'diamonds'].includes(belowCard.suit);
        if (isRed !== belowIsRed && card.rank === belowCard.rank + 1) {
          seqLength++;
        } else {
          break;
        }
      }
      score += seqLength * seqLength * 5;
    }
  }

  // 8. 可移动牌数量（选择多的状态更好）
  const availableMoves = countAvailableMoves(state);
  score += availableMoves * 10;

  return score;
}

// 计算可用移动数量
function countAvailableMoves(state) {
  const { tableau, freeCells, foundations } = state;
  let count = 0;

  // 检查所有可能的移动
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];

    // 能否到foundation
    const suitIdx = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
    if (foundations[suitIdx].length === topCard.rank - 1) count++;

    // 能否到其他列
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        count++;
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        const isRed = ['hearts', 'diamonds'].includes(topCard.suit);
        const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
        if (isRed !== targetIsRed && topCard.rank === targetCard.rank - 1) count++;
      }
    }
  }

  return count;
}

// 生成所有可能的移动
function generateMoves(state) {
  const moves = [];
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return moves;

  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

  // 1. FreeCell -> Foundation (最高优先级)
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    const suitIdx = suits.indexOf(card.suit);
    const canMove = foundations[suitIdx].length === card.rank - 1;
    if (canMove) {
      moves.push({
        type: 'freecell_to_foundation',
        from: { type: 'freecell', index: i },
        to: { type: 'foundation', index: suitIdx },
        card,
        priority: 10000
      });
    }
  }

  // 2. Tableau -> Foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    const suitIdx = suits.indexOf(topCard.suit);
    const canMove = foundations[suitIdx].length === topCard.rank - 1;
    if (canMove) {
      moves.push({
        type: 'to_foundation',
        from: { col },
        to: { type: 'foundation', index: suitIdx },
        card: topCard,
        priority: 9000 + (14 - topCard.rank) // 小牌优先
      });
    }
  }

  // 3. 暴露A的优先级操作 - 检查是否有A被压在下面
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length < 2) continue;

    // 从底部向上找A
    for (let i = column.length - 2; i >= 0; i--) {
      if (column[i].rank !== 1) continue;

      // A上面有牌，尝试移动上面的牌
      const topCard = column[column.length - 1];
      const isRed = ['hearts', 'diamonds'].includes(topCard.suit);

      // 尝试移动到空列
      for (let targetCol = 0; targetCol < 8; targetCol++) {
        if (targetCol === col) continue;
        if (tableau[targetCol].length === 0) {
          moves.push({
            type: 'to_tableau',
            from: { col },
            to: { type: 'tableau', col: targetCol },
            card: topCard,
            priority: 8000 - (column.length - 1 - i) * 10 // A越深优先级略低
          });
        }
      }

      // 尝试移动到FreeCell
      const emptyFC = freeCells.findIndex(c => c === null);
      if (emptyFC !== -1) {
        moves.push({
          type: 'to_freecell',
          from: { col },
          to: { type: 'freecell', index: emptyFC },
          card: topCard,
          priority: 7500
        });
      }

      break; // 只处理最上面的A
    }
  }

  // 3.5 释放FreeCell：如果FreeCell满了，优先将FreeCell中的牌移到Tableau
  const freeCellCount = freeCells.filter(c => c !== null).length;
  if (freeCellCount >= 3) {
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
            card,
            priority: 8700
          });
        } else {
          const targetCard = targetColumn[targetColumn.length - 1];
          const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
          if (isRed !== targetIsRed && card.rank === targetCard.rank - 1) {
            moves.push({
              type: 'freecell_to_tableau',
              from: { type: 'freecell', index: i },
              to: { type: 'tableau', col: targetCol },
              card,
              priority: 8600
            });
          }
        }
      }
    }
  }

  // 4. FreeCell -> Tableau (释放FreeCell)
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
          card,
          priority: 3000
        });
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
        if (isRed !== targetIsRed && card.rank === targetCard.rank - 1) {
          moves.push({
            type: 'freecell_to_tableau',
            from: { type: 'freecell', index: i },
            to: { type: 'tableau', col: targetCol },
            card,
            priority: 2500
          });
        }
      }
    }
  }

  // 5. Tableau -> Tableau
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    const isRed = ['hearts', 'diamonds'].includes(topCard.suit);

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];

      if (targetColumn.length === 0) {
        // 空列：优先用于释放重要的牌
        const newTopCard = column.length > 1 ? column[column.length - 2] : null;
        let priority = 100;
        if (newTopCard && newTopCard.rank === 1) priority = 4000;
        else if (newTopCard && newTopCard.rank === 2) priority = 3000;

        moves.push({
          type: 'to_tableau',
          from: { col },
          to: { type: 'tableau', col: targetCol },
          card: topCard,
          priority
        });
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
        if (isRed !== targetIsRed && topCard.rank === targetCard.rank - 1) {
          // 检查移动后是否暴露重要牌
          const newTopCard = column.length > 1 ? column[column.length - 2] : null;
          let priority = 200 - topCard.rank;
          if (newTopCard) {
            if (newTopCard.rank === 1) priority += 1000;
            if (newTopCard.rank === 2) priority += 500;
          }

          moves.push({
            type: 'to_tableau',
            from: { col },
            to: { type: 'tableau', col: targetCol },
            card: topCard,
            priority
          });
        }
      }
    }
  }

  // 6. Tableau -> FreeCell (最后选择)
  const emptyFC = freeCells.findIndex(c => c === null);
  if (emptyFC !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length === 0) continue;

      // 只有当这个移动可以暴露A时才考虑
      if (column.length >= 2) {
        const belowCard = column[column.length - 2];
        if (belowCard.rank === 1) {
          moves.push({
            type: 'to_freecell',
            from: { col },
            to: { type: 'freecell', index: emptyFC },
            card: column[column.length - 1],
            priority: 500
          });
        }
      }
    }
  }

  return moves.sort((a, b) => b.priority - a.priority);
}

// 模拟执行移动
function simulateMove(state, move) {
  const newState = JSON.parse(JSON.stringify(state));
  const { type, from, to } = move;

  if (type === 'to_foundation') {
    const card = newState.tableau[from.col].pop();
    newState.foundations[to.index].push(card);
  } else if (type === 'freecell_to_foundation') {
    const card = newState.freeCells[from.index];
    newState.freeCells[from.index] = null;
    newState.foundations[to.index].push(card);
  } else if (type === 'to_tableau') {
    const card = newState.tableau[from.col].pop();
    newState.tableau[to.col].push(card);
  } else if (type === 'to_freecell') {
    const card = newState.tableau[from.col].pop();
    newState.freeCells[to.index] = card;
  } else if (type === 'freecell_to_tableau') {
    const card = newState.freeCells[from.index];
    newState.freeCells[from.index] = null;
    newState.tableau[to.col].push(card);
  }

  return newState;
}

// 使用DFS + 启发式搜索寻找最佳移动路径
function findBestMove(state, visitedStates, depth = 0, maxDepth = 5) {
  if (depth >= maxDepth) return null;

  const moves = generateMoves(state);
  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const newState = simulateMove(state, move);
    const stateKey = getStateKey(newState);

    // 避免循环
    if (visitedStates.has(stateKey)) continue;

    // 评估这个移动
    let score = evaluateState(newState);

    // 如果是foundation移动，大幅加分
    if (move.to.type === 'foundation') {
      score += 5000;
    }

    // 递归搜索
    if (depth < maxDepth - 1) {
      const nextVisited = new Set(visitedStates);
      nextVisited.add(stateKey);
      const nextMove = findBestMove(newState, nextVisited, depth + 1, maxDepth);
      if (nextMove) {
        score += nextMove.score * 0.8; // 折扣因子
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = { move, score };
    }
  }

  return bestMove;
}

// 执行移动并验证
async function executeMoveWithVerify(controller, move, state) {
  const tableauStartY = 260;
  const startX = 80;
  const freeCellX = 75;
  const foundationX = 75 + 4 * 80 + 20; // 415

  let fromX, fromY, toX, toY;

  // 计算起点
  if (move.from.type === 'freecell') {
    fromX = freeCellX + move.from.index * 80;
    fromY = 150;
  } else {
    const col = state.tableau[move.from.col];
    fromX = startX + move.from.col * 80;
    fromY = tableauStartY + (col.length - 1) * 25;
  }

  // 计算终点
  if (move.to.type === 'foundation') {
    toX = foundationX + move.to.index * 80 + 35; // 中心点
    toY = 150;
  } else if (move.to.type === 'freecell') {
    toX = freeCellX + move.to.index * 80;
    toY = 150;
  } else {
    const targetCol = state.tableau[move.to.col];
    toX = startX + move.to.col * 80;
    // 目标位置是目标列最后一张牌的中心
    toY = tableauStartY + (targetCol.length - 1) * 25;
  }

  const canvas = await controller.page.$('#game-container canvas');
  const box = await canvas.boundingBox();

  const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
  const moveType = move.to.type === 'foundation' ? '到Foundation' :
                   move.to.type === 'freecell' ? '到FreeCell' :
                   `到列${move.to.col + 1}`;

  console.log(`  ${cardDisplay}: (${Math.round(fromX)}, ${Math.round(fromY)}) -> (${Math.round(toX)}, ${Math.round(toY)}) ${moveType}`);

  // 所有移动都使用拖拽，更可靠
  await controller.page.mouse.move(box.x + fromX, box.y + fromY);
  await sleep(150);
  await controller.page.mouse.down();
  await sleep(150);
  await controller.page.mouse.move(box.x + toX, box.y + toY, { steps: 25 });
  await sleep(150);
  await controller.page.mouse.up();
  await sleep(800);

  // 获取新状态验证移动
  const newState = await getGameState(controller);
  const stateChanged = getStateKey(newState) !== getStateKey(state);

  if (!stateChanged) {
    console.log(`  ⚠️ 移动未生效，状态未改变`);
  }

  return { newState, stateChanged };
}

async function main() {
  console.log('🃏 FreeCell Level 1 Solver (Advanced DFS)\n');

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
    const maxMoves = 300;
    let stagnantCount = 0;
    let lastFoundationCount = 0;

    while (moveCount < maxMoves) {
      if (checkWin(state)) {
        console.log('\n🎉 恭喜！成功通关！');
        await controller.screenshot({ name: 'win' });
        break;
      }

      const currentFoundationCount = state.foundations.reduce((sum, f) => sum + f.length, 0);

      // 使用DFS寻找最佳移动
      const result = findBestMove(state, visitedStates, 0, 4);

      if (!result || !result.move) {
        console.log('\n⚠️ 没有可行移动');
        printState(state);
        break;
      }

      const move = result.move;
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`\n移动 #${moveCount + 1}: ${cardDisplay} ${move.type} (score: ${Math.round(result.score)})`);

      const { newState, stateChanged } = await executeMoveWithVerify(controller, move, state);

      if (!stateChanged) {
        console.log('  移动未改变状态，尝试下一个移动');
        stagnantCount++;
        if (stagnantCount > 10) {
          console.log('\n⚠️ 多次移动失败，停止');
          break;
        }
        continue;
      }

      state = newState;

      const newStateKey = getStateKey(state);
      if (visitedStates.has(newStateKey)) {
        console.log('  ⚠️ 进入循环状态，尝试其他移动');
        stagnantCount++;
        if (stagnantCount > 5) {
          console.log('\n⚠️ 无法避免循环');
          break;
        }
        continue;
      }

      visitedStates.add(newStateKey);

      const newFoundationCount = state.foundations.reduce((sum, f) => sum + f.length, 0);
      console.log(`  Foundations: ${state.foundations?.map(f => f.length).join('/')}, Score: ${evaluateState(state)}`);

      if (newFoundationCount > lastFoundationCount) {
        stagnantCount = 0;
        lastFoundationCount = newFoundationCount;
      } else {
        stagnantCount++;
        if (stagnantCount > 20) {
          console.log('\n⚠️ 长时间没有进展到foundation');
          // 尝试放宽搜索
        }
      }

      moveCount++;

      if (moveCount % 10 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`总移动次数: ${moveCount}`);
    if (moveCount >= maxMoves) {
      console.log('⚠️ 达到最大移动次数');
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
