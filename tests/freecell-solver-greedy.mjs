#!/usr/bin/env node
/**
 * FreeCell Level 1 Solver - Greedy Version
 * 使用贪心策略和启发式规则找到通关路径
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

// 检查是否获胜
function checkWin(state) {
  if (!state.foundations) return false;
  return state.foundations.every(f => f.length === 13);
}

// 获取花色索引
function getSuitIndex(suit) {
  return ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(suit);
}

// 检查是否红色
function isRed(suit) {
  return ['hearts', 'diamonds'].includes(suit);
}

// 检查是否可以移动到foundation
function canMoveToFoundation(card, foundations) {
  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];
  if (foundation.length === 0) {
    return card.rank === 1;
  }
  return foundation[foundation.length - 1].rank === card.rank - 1;
}

// 检查是否可以放到tableau
function canStackOnTableau(card, targetCard) {
  return isRed(card.suit) !== isRed(targetCard.suit) && card.rank === targetCard.rank - 1;
}

// 获取最佳移动 (贪心策略)
function getBestMove(state) {
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return null;

  const moves = [];

  // 优先级1: 从freeCell移动到foundation (最高优先级)
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    if (canMoveToFoundation(card, foundations)) {
      return {
        type: 'freecell_to_foundation',
        from: { type: 'freecell', index: i },
        to: { type: 'foundation', index: getSuitIndex(card.suit) },
        card: card,
        reason: 'freeCell到foundation'
      };
    }
  }

  // 优先级2: 从tableau移动到foundation
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      return {
        type: 'to_foundation',
        from: { col },
        to: { type: 'foundation', index: getSuitIndex(topCard.suit) },
        card: topCard,
        reason: 'tableau到foundation'
      };
    }
  }

  // 优先级3: 从tableau移动到tableau (建立序列)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];

    // 找到可以放置的位置
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];

      if (targetColumn.length === 0) {
        // 只有K可以移到空列，或者释放被压住的牌
        if (column.length > 1) {
          moves.push({
            type: 'to_tableau',
            from: { col },
            to: { type: 'tableau', col: targetCol },
            card: topCard,
            reason: '移到空列释放牌',
            priority: 10
          });
        }
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(topCard, targetCard)) {
          // 检查这个移动是否有价值
          const willExposeCard = column.length > 1;
          moves.push({
            type: 'to_tableau',
            from: { col },
            to: { type: 'tableau', col: targetCol },
            card: topCard,
            reason: '建立序列',
            priority: willExposeCard ? 30 : 15
          });
        }
      }
    }
  }

  // 优先级4: 从freeCell移动到tableau
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        moves.push({
          type: 'freecell_to_tableau',
          from: { type: 'freecell', index: i },
          to: { type: 'tableau', col: targetCol },
          card: card,
          reason: 'freeCell到空列',
          priority: 12
        });
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(card, targetCard)) {
          moves.push({
            type: 'freecell_to_tableau',
            from: { type: 'freecell', index: i },
            to: { type: 'tableau', col: targetCol },
            card: card,
            reason: 'freeCell建立序列',
            priority: 25
          });
        }
      }
    }
  }

  // 优先级5: 从tableau移动到freeCell (当其他移动都不好时)
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  if (emptyFreeCellIndex !== -1) {
    // 找到最有价值的牌移到freeCell
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue; // 不移动单张牌的列
      const topCard = column[column.length - 1];

      // 检查移走后露出的牌是否有用
      const nextCard = column[column.length - 2];
      const willExposeUseful = nextCard && canMoveToFoundation(nextCard, foundations);

      moves.push({
        type: 'to_freecell',
        from: { col },
        to: { type: 'freecell', index: emptyFreeCellIndex },
        card: topCard,
        reason: willExposeUseful ? '移到freeCell释放有用牌' : '移到freeCell',
        priority: willExposeUseful ? 40 : 5
      });
    }
  }

  // 选择最佳移动
  if (moves.length === 0) return null;

  // 按优先级排序
  moves.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return moves[0];
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
  console.log('🃏 FreeCell Level 1 Solver (Greedy)\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    // 进入游戏
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

    // 开始游戏循环
    let moveCount = 0;
    const maxMoves = 500;
    const visitedStates = new Set();

    while (!checkWin(state) && moveCount < maxMoves) {
      const move = getBestMove(state);

      if (!move) {
        console.log('\n⚠️ 没有可行的移动了');
        break;
      }

      // 检查是否卡住
      const stateKey = JSON.stringify(state.foundations);
      if (visitedStates.has(stateKey) && move.type.includes('freecell')) {
        console.log('\n⚠️ 检测到循环，跳过此移动');
        visitedStates.clear();
        continue;
      }
      visitedStates.add(stateKey);

      moveCount++;
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`\n移动 #${moveCount}: ${cardDisplay} - ${move.reason}`);

      await executeMove(controller, move, state);

      state = await getGameState(controller);
      console.log(`  Foundations: ${state.foundations?.map(f => f.length).join('/')}`);

      if (moveCount % 20 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
      }
    }

    // 检查结果
    if (checkWin(state)) {
      console.log('\n🎉 恭喜！成功通关！');
      await controller.screenshot({ name: 'victory' });
    } else {
      console.log('\n⚠️ 未能通关');
    }

    printState(state);
    await controller.screenshot({ name: 'final' });

    console.log('\n浏览器将在10秒后关闭...');
    await sleep(10000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);