#!/usr/bin/env node
/**
 * FreeCell Level 1 Solver - Simple Strategy
 * 使用简单的贪心策略 + 避免循环
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
  console.log('Foundations:', state.foundations?.map(f => f.length).join(', '));
  console.log('================\n');
}

// 计算卡牌的价值（用于启发式）
function cardValue(card) {
  // A和2更有价值，因为它们可以移动到foundation
  if (card.rank === 1) return 100;
  if (card.rank === 2) return 50;
  return card.rank;
}

function analyzeMoves(state) {
  const moves = [];
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return moves;

  // 1. 首先检查freeCell中的牌是否可以移动到foundation
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
        priority: 1000,
        description: `${card.rank}${card.suit[0].toUpperCase()} from freecell to foundation`
      });
    }
  }

  // 0. 检查是否有移动可以暴露A（最高优先级）
  // 检查每一列，找到A的位置，看看是否可以通过移动上面的牌来暴露它
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length < 2) continue;

    // 从底部向上找A
    for (let i = column.length - 2; i >= 0; i--) {
      if (column[i].rank !== 1) continue;

      // 找到A，检查A上面的所有牌是否可以移动
      const cardsAbove = column.slice(i + 1);
      const topCard = cardsAbove[cardsAbove.length - 1];
      const isRed = ['hearts', 'diamonds'].includes(topCard.suit);

      // 尝试找到可以放置顶部牌的位置
      let foundMove = false;
      for (let targetCol = 0; targetCol < 8 && !foundMove; targetCol++) {
        if (targetCol === col) continue;

        const targetColumn = tableau[targetCol];
        if (targetColumn.length === 0) {
          moves.push({
            type: 'to_tableau',
            from: { col },
            to: { type: 'tableau', col: targetCol },
            card: topCard,
            priority: 5000 - i * 10, // A位置越深，优先级略低
            description: `${topCard.rank}${topCard.suit[0].toUpperCase()} from col${col+1} to empty col${targetCol+1} (expose A)`
          });
          foundMove = true;
        } else {
          const targetCard = targetColumn[targetColumn.length - 1];
          const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
          if (isRed !== targetIsRed && topCard.rank === targetCard.rank - 1) {
            moves.push({
              type: 'to_tableau',
              from: { col },
              to: { type: 'tableau', col: targetCol },
              card: topCard,
              priority: 5000 - i * 10,
              description: `${topCard.rank}${topCard.suit[0].toUpperCase()} from col${col+1} to ${targetCard.rank}${targetCard.suit[0].toUpperCase()} on col${targetCol+1} (expose A)`
            });
            foundMove = true;
          }
        }
      }

      // 也可以考虑移动到freeCell
      if (!foundMove) {
        const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
        if (emptyFreeCellIndex !== -1) {
          moves.push({
            type: 'to_freecell',
            from: { col },
            to: { type: 'freecell', index: emptyFreeCellIndex },
            card: topCard,
            priority: 4500 - i * 10,
            description: `${topCard.rank}${topCard.suit[0].toUpperCase()} from col${col+1} to freecell (expose A)`
          });
        }
      }

      // 只处理最上面的A
      break;
    }
  }
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;

    const topCard = column[column.length - 1];
    if (topCard.rank !== 1) continue; // 只处理A

    const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
    const foundation = foundations[suitIndex];
    if (foundation.length === 0) {
      moves.push({
        type: 'to_foundation',
        from: { col },
        to: { type: 'foundation', index: suitIndex },
        card: topCard,
        priority: 2000, // A移动最高优先级
        description: `${topCard.rank}${topCard.suit[0].toUpperCase()} to foundation`
      });
    }
  }

  // 3. 检查tableau中的2是否可以移动到foundation（次高优先级）
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;

    const topCard = column[column.length - 1];
    if (topCard.rank !== 2) continue; // 只处理2

    const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
    const foundation = foundations[suitIndex];
    if (foundation.length === 1) { // A已经在foundation上
      moves.push({
        type: 'to_foundation',
        from: { col },
        to: { type: 'foundation', index: suitIndex },
        card: topCard,
        priority: 1500, // 2移动次高优先级
        description: `${topCard.rank}${topCard.suit[0].toUpperCase()} to foundation`
      });
    }
  }

  // 4. 检查tableau中的其他牌是否可以移动到foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;

    const topCard = column[column.length - 1];
    if (topCard.rank <= 2) continue; // 已经处理过A和2

    const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
    const foundation = foundations[suitIndex];
    const canMoveToFoundation = foundation.length > 0 &&
      foundation[foundation.length - 1].rank === topCard.rank - 1;

    if (canMoveToFoundation) {
      moves.push({
        type: 'to_foundation',
        from: { col },
        to: { type: 'foundation', index: suitIndex },
        card: topCard,
        priority: 500,
        description: `${topCard.rank}${topCard.suit[0].toUpperCase()} to foundation`
      });
    }
  }

  // 3.5 如果freeCell中的牌可以移动到空列，优先这样做
  const emptyTableauCols = [];
  for (let col = 0; col < 8; col++) {
    if (tableau[col].length === 0) {
      emptyTableauCols.push(col);
    }
  }
  for (const emptyCol of emptyTableauCols) {
    for (let i = 0; i < 4; i++) {
      const card = freeCells[i];
      if (!card) continue;
      moves.push({
        type: 'freecell_to_tableau',
        from: { type: 'freecell', index: i },
        to: { type: 'tableau', col: emptyCol },
        card: card,
        priority: 2500, // 高优先级：释放freeCell
        description: `${card.rank}${card.suit[0].toUpperCase()} from freecell to empty col${emptyCol+1}`
      });
    }
  }

  // 4. 检查tableau中的牌是否可以移动到其他tableau列
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;

    const topCard = column[column.length - 1];
    const isRed = ['hearts', 'diamonds'].includes(topCard.suit);

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;

      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) continue;

      const targetCard = targetColumn[targetColumn.length - 1];
      const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);

      if (isRed !== targetIsRed && topCard.rank === targetCard.rank - 1) {
        // 优先移动可以暴露foundation牌的移动
        const newTopCard = column.length > 1 ? column[column.length - 2] : null;
        let priority = 100 - topCard.rank; // 小牌优先

        // 如果可以暴露A或2，提高优先级
        if (newTopCard && (newTopCard.rank === 1 || newTopCard.rank === 2)) {
          priority += 50;
        }

        moves.push({
          type: 'to_tableau',
          from: { col },
          to: { type: 'tableau', col: targetCol },
          card: topCard,
          priority: priority,
          description: `${topCard.rank}${topCard.suit[0].toUpperCase()} from col${col+1} to ${targetCard.rank}${targetCard.suit[0].toUpperCase()} on col${targetCol+1}`
        });
      }
    }
  }

  // 4. 检查是否可以移动到freeCell（低优先级，尽量避免）
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
        moves.push({
          type: 'to_freecell',
          from: { col },
          to: { type: 'freecell', index: emptyFreeCellIndex },
          card: topCard,
          priority: 10,
          description: `${topCard.rank}${topCard.suit[0].toUpperCase()} to freecell (for foundation)`
        });
      }
    }
  }

  return moves.sort((a, b) => b.priority - a.priority);
}

function checkWin(state) {
  if (!state.foundations) return false;
  return state.foundations.every(f => f.length === 13);
}

function getStateKey(state) {
  // 创建一个简洁的状态键用于检测循环
  const tableauKey = state.tableau.map(col =>
    col.map(c => `${c.rank}${c.suit[0]}`).join(',')
  ).join('|');
  const freeCellKey = state.freeCells.map(c => c ? `${c.rank}${c.suit[0]}` : '-').join(',');
  return `${tableauKey}#${freeCellKey}`;
}

async function executeMove(controller, move, state) {
  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;
  const startX = 80;

  let fromX, fromY, toX, toY;

  if (move.from.type === 'freecell') {
    const gap = 20;
    const freeCellStartX = (720 - (4 * 70 + 3 * 10 + gap + 4 * 70 + 3 * 10)) / 2 + 35;
    fromX = freeCellStartX + move.from.index * 80;
    fromY = 150;
  } else {
    const col = state.tableau[move.from.col];
    fromX = startX + move.from.col * 80;
    fromY = tableauStartY + (col.length - 1) * cardGap;
  }

  if (move.to.type === 'foundation') {
    // Foundation位置: freeCell区域右侧
    // freeCell起始位置: (720 - (4*70 + 3*10 + 20 + 4*70 + 3*10)) / 2 + 35 = 75
    // Foundation在freeCell右侧20px，每个70px宽，间隔10px
    const foundationStartX = 75 + 4 * 80 + 20; // 75 + 320 + 20 = 415
    toX = foundationStartX + move.to.index * 80 + 35; // +35是中心点
    toY = 150;
    console.log(`    -> Foundation ${move.to.index}, target: (${toX}, ${toY})`);
  } else if (move.to.type === 'freecell') {
    const gap = 20;
    const freeCellStartX = (720 - (4 * 70 + 3 * 10 + gap + 4 * 70 + 3 * 10)) / 2 + 35;
    toX = freeCellStartX + move.to.index * 80;
    toY = 150;
  } else {
    const targetCol = state.tableau[move.to.col];
    toX = startX + move.to.col * 80;
    toY = tableauStartY + targetCol.length * cardGap;
  }

  const canvas = await controller.page.$('#game-container canvas');
  const box = await canvas.boundingBox();

  // 如果是移动到foundation，使用双击
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
  await sleep(600);
}

async function main() {
  console.log('🃏 FreeCell Level 1 Solver\n');

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

    let state = await getGameState(controller);
    console.log('初始状态:');
    printState(state);

    let moveCount = 0;
    const maxMoves = 200;
    const visitedStates = new Set();
    let stagnantCount = 0;

    while (moveCount < maxMoves) {
      if (checkWin(state)) {
        console.log('\n🎉 恭喜！成功通关！');
        await controller.screenshot({ name: 'win' });
        break;
      }

      const moves = analyzeMoves(state);
      if (moves.length === 0) {
        console.log('\n⚠️ 没有可行移动');
        console.log('当前状态:');
        printState(state);
        // 打印所有可能的移动分析
        console.log('\n详细分析:');
        for (let col = 0; col < 8; col++) {
          const column = state.tableau[col];
          if (column.length === 0) continue;
          const topCard = column[column.length - 1];
          console.log(`列${col+1}顶部: ${topCard.rank}${topCard.suit[0].toUpperCase()}`);
        }
        break;
      }

      // 找到第一个不会导致循环的移动
      let selectedMove = null;
      for (const move of moves) {
        // 模拟执行移动后的状态
        const nextState = JSON.parse(JSON.stringify(state));
        // 简化：只检查tableau和freeCells的变化
        if (move.type === 'to_foundation') {
          const card = nextState.tableau[move.from.col].pop();
          nextState.foundations[move.to.index].push(card);
        } else if (move.type === 'freecell_to_foundation') {
          const card = nextState.freeCells[move.from.index];
          nextState.freeCells[move.from.index] = null;
          nextState.foundations[move.to.index].push(card);
        } else if (move.type === 'to_tableau') {
          const card = nextState.tableau[move.from.col].pop();
          nextState.tableau[move.to.col].push(card);
        } else if (move.type === 'to_freecell') {
          const card = nextState.tableau[move.from.col].pop();
          nextState.freeCells[move.to.index] = card;
        }

        const nextStateKey = getStateKey(nextState);
        if (!visitedStates.has(nextStateKey)) {
          selectedMove = move;
          visitedStates.add(nextStateKey);
          break;
        }
      }

      if (!selectedMove) {
        console.log('\n⚠️ 所有移动都会导致循环');
        break;
      }

      console.log(`\n移动 #${moveCount + 1}: ${selectedMove.description} (priority: ${selectedMove.priority})`);

      await executeMove(controller, selectedMove, state);

      state = await getGameState(controller);
      console.log(`  Foundations: ${state.foundations?.map(f => f.length).join('/')}`);

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
