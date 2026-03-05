#!/usr/bin/env node
/**
 * FreeCell Level 1 Auto Solver
 * 使用ChromeMCP自动化通关第一关
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
  console.log('================\n');
}

function analyzeMoves(state) {
  const moves = [];
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return moves;

  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;

    const topCard = column[column.length - 1];
    const isRed = ['hearts', 'diamonds'].includes(topCard.suit);

    // 1. 移动到foundation (最高优先级)
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
        priority: 100
      });
    }

    // 2. 移动到其他列
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;

      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        moves.push({
          type: 'to_tableau',
          from: { col },
          to: { type: 'tableau', col: targetCol },
          card: topCard,
          priority: 1
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
            priority: 10
          });
        }
      }
    }

    // 3. 移动到freeCell
    const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
    if (emptyFreeCellIndex !== -1) {
      moves.push({
        type: 'to_freecell',
        from: { col },
        to: { type: 'freecell', index: emptyFreeCellIndex },
        card: topCard,
        priority: 2
      });
    }
  }

  // 从freeCell移动到foundation
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

  return moves.sort((a, b) => b.priority - a.priority);
}

function checkWin(state) {
  if (!state.foundations) return false;
  return state.foundations.every(f => f.length === 13);
}

async function executeMove(controller, move, state) {
  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;
  const startX = 80; // (720 - 8*70 - 7*10) / 2 + 70/2 = 80

  let fromX, fromY, toX, toY;

  // 计算起点
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

  // 计算终点
  if (move.to.type === 'foundation') {
    const gap = 20;
    const freeCellStartX = (720 - (4 * 70 + 3 * 10 + gap + 4 * 70 + 3 * 10)) / 2 + 35;
    const foundationX = freeCellStartX + 4 * 80 + gap;
    toX = foundationX + move.to.index * 80;
    toY = 150;
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

  // 执行拖拽
  const canvas = await controller.page.$('#game-container canvas');
  const box = await canvas.boundingBox();

  console.log(`  拖拽: (${Math.round(fromX)}, ${Math.round(fromY)}) -> (${Math.round(toX)}, ${Math.round(toY)})`);

  await controller.page.mouse.move(box.x + fromX, box.y + fromY);
  await sleep(100);
  await controller.page.mouse.down();
  await sleep(50);
  await controller.page.mouse.move(box.x + toX, box.y + toY, { steps: 20 });
  await sleep(50);
  await controller.page.mouse.up();
  await sleep(800);
}

async function main() {
  console.log('🃏 FreeCell Level 1 Auto Solver\n');

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
    const maxMoves = 300;
    const stateHistory = [];

    while (moveCount < maxMoves) {
      if (checkWin(state)) {
        console.log('\n🎉 恭喜！成功通关！');
        await controller.screenshot({ name: 'win' });
        break;
      }

      const moves = analyzeMoves(state);
      if (moves.length === 0) {
        console.log('\n⚠️ 没有可行移动');
        break;
      }

      // 选择最佳移动
      const move = moves[0];
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;

      // 检查是否会导致循环
      const stateKey = JSON.stringify(state.tableau) + JSON.stringify(state.freeCells);
      if (stateHistory.includes(stateKey)) {
        console.log('\n⚠️ 检测到循环，尝试其他移动');
        // 尝试下一个优先级的移动
        if (moves.length > 1) {
          moves.shift();
          continue;
        }
      }
      stateHistory.push(stateKey);
      if (stateHistory.length > 50) stateHistory.shift();

      console.log(`\n移动 #${moveCount + 1}: ${cardDisplay} -> ${move.to.type}`);

      const prevState = JSON.stringify(state.tableau);
      await executeMove(controller, move, state);

      state = await getGameState(controller);
      const newState = JSON.stringify(state.tableau);

      if (prevState === newState) {
        console.log('  ⚠️ 移动未生效');
      } else {
        console.log('  ✅ 移动成功');
      }

      moveCount++;

      if (moveCount % 20 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
        printState(state);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`总移动次数: ${moveCount}`);
    if (moveCount >= maxMoves) {
      console.log('⚠️ 达到最大移动次数');
    }

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
