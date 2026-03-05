#!/usr/bin/env node
/**
 * FreeCell Level 1 - Complete Solver
 * 支持所有移动类型的完整求解器
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

// 辅助函数
function getSuitIndex(suit) {
  return ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(suit);
}

function isRed(suit) {
  return ['hearts', 'diamonds'].includes(suit);
}

function canMoveToFoundation(card, foundations) {
  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];
  if (foundation.length === 0) {
    return card.rank === 1;
  }
  return foundation[foundation.length - 1].rank === card.rank - 1;
}

function canStackOnTableau(card, targetCard) {
  return isRed(card.suit) !== isRed(targetCard.suit) && card.rank === targetCard.rank - 1;
}

// 获取卡牌屏幕坐标
function getCardScreenCoords(location, state) {
  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;
  const startX = 80;
  const freeCellStartX = 75;
  const foundationStartX = 415;

  if (location.type === 'freecell') {
    return { x: freeCellStartX + location.index * 80, y: 150 };
  } else if (location.type === 'tableau') {
    const col = state.tableau[location.col];
    return {
      x: startX + location.col * 80,
      y: tableauStartY + (col.length - 1) * cardGap
    };
  } else if (location.type === 'foundation') {
    return { x: foundationStartX + location.index * 80 + 35, y: 150 };
  }
  return { x: 0, y: 0 };
}

// 执行拖拽
async function dragCard(controller, fromX, fromY, toX, toY) {
  const canvas = await controller.page.$('#game-container canvas');
  const box = await canvas.boundingBox();

  await controller.page.mouse.move(box.x + fromX, box.y + fromY);
  await sleep(100);
  await controller.page.mouse.down();
  await sleep(50);
  await controller.page.mouse.move(box.x + toX, box.y + toY, { steps: 15 });
  await sleep(50);
  await controller.page.mouse.up();
  await sleep(300);
}

// 执行双击
async function doubleClickCard(controller, x, y) {
  const canvas = await controller.page.$('#game-container canvas');
  const box = await canvas.boundingBox();
  await controller.page.mouse.dblclick(box.x + x, box.y + y);
  await sleep(300);
}

// 生成最佳移动
function getBestMove(state) {
  const { tableau, freeCells, foundations } = state;
  if (!tableau) return null;

  // 1. 优先: 移动到foundation
  // 从freeCell
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    if (canMoveToFoundation(card, foundations)) {
      return {
        type: 'freecell_to_foundation',
        card,
        from: { type: 'freecell', index: i },
        to: { type: 'foundation', index: getSuitIndex(card.suit) }
      };
    }
  }
  // 从tableau
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      return {
        type: 'tableau_to_foundation',
        card: topCard,
        from: { type: 'tableau', col },
        to: { type: 'foundation', index: getSuitIndex(topCard.suit) }
      };
    }
  }

  // 2. 次优: 建立tableau序列 (有意义的移动)
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
          // 检查这个移动是否会暴露有用的牌
          const willExposeUseful = column.length > 1 &&
            canMoveToFoundation(column[column.length - 2], foundations);
          // 或者移动到非空列是有价值的
          return {
            type: 'tableau_to_tableau',
            card: topCard,
            from: { type: 'tableau', col },
            to: { type: 'tableau', col: targetCol },
            reason: willExposeUseful ? 'expose_useful' : 'build_sequence'
          };
        }
      }
    }
  }

  // 3. 从freeCell移到tableau
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        // 移到空列
        return {
          type: 'freecell_to_tableau',
          card,
          from: { type: 'freecell', index: i },
          to: { type: 'tableau', col: targetCol }
        };
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(card, targetCard)) {
          return {
            type: 'freecell_to_tableau',
            card,
            from: { type: 'freecell', index: i },
            to: { type: 'tableau', col: targetCol }
          };
        }
      }
    }
  }

  // 4. 移动到freeCell (当其他选项都没有时)
  const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
  if (emptyFreeCellIndex !== -1) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];
      return {
        type: 'tableau_to_freecell',
        card: topCard,
        from: { type: 'tableau', col },
        to: { type: 'freecell', index: emptyFreeCellIndex }
      };
    }
  }

  // 5. 移动到空列
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      if (tableau[targetCol].length === 0) {
        return {
          type: 'tableau_to_tableau',
          card: topCard,
          from: { type: 'tableau', col },
          to: { type: 'tableau', col: targetCol },
          reason: 'to_empty_column'
        };
      }
    }
  }

  return null;
}

// 执行移动
async function executeMove(controller, move, state) {
  const fromCoords = getCardScreenCoords(move.from, state);
  const toCoords = getCardScreenCoords(move.to, state);

  if (move.to.type === 'foundation') {
    // 使用双击移动到foundation
    console.log(`  双击: (${Math.round(fromCoords.x)}, ${Math.round(fromCoords.y)})`);
    await doubleClickCard(controller, fromCoords.x, fromCoords.y);
  } else {
    // 使用拖拽
    console.log(`  拖拽: (${Math.round(fromCoords.x)}, ${Math.round(fromCoords.y)}) -> (${Math.round(toCoords.x)}, ${Math.round(toCoords.y)})`);
    await dragCard(controller, fromCoords.x, fromCoords.y, toCoords.x, toCoords.y);
  }
  await sleep(500);
}

async function main() {
  console.log('🃏 FreeCell Level 1 - Complete Solver\n');

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

    // 游戏循环
    let moveCount = 0;
    const maxMoves = 500;
    const stateHistory = [];
    const maxHistory = 10;

    while (moveCount < maxMoves) {
      state = await getGameState(controller);

      if (state.error) {
        console.log('获取状态出错:', state.error);
        await sleep(1000);
        continue;
      }

      // 检查胜利
      const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
      if (foundationTotal === 52) {
        console.log('\n🎉 恭喜！成功通关！');
        await controller.screenshot({ name: 'victory' });
        break;
      }

      // 获取最佳移动
      const move = getBestMove(state);

      if (!move) {
        console.log('\n没有可行的移动了');
        break;
      }

      // 检查是否卡住 (相同状态)
      const stateKey = `${foundationTotal}-${state.tableau.map(c => c.length).join(',')}`;
      if (stateHistory.includes(stateKey) && move.type === 'tableau_to_freecell') {
        console.log('检测到重复状态，跳过freecell移动');
        stateHistory.shift();
      }
      stateHistory.push(stateKey);
      if (stateHistory.length > maxHistory) {
        stateHistory.shift();
      }

      moveCount++;
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;
      console.log(`\n移动 #${moveCount}: ${cardDisplay} - ${move.type} (${move.reason || ''})`);

      await executeMove(controller, move, state);

      if (moveCount % 20 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
        console.log(`  Foundation: ${state.foundations?.map(f => f.length).join('/')}`);
      }
    }

    // 最终状态
    state = await getGameState(controller);
    console.log('\n最终状态:');
    printState(state);

    await controller.screenshot({ name: 'final' });

    const foundationTotal = state.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;
    console.log(`\n总移动次数: ${moveCount}`);
    console.log(`Foundation卡牌数: ${foundationTotal}/52`);

    console.log('\n浏览器将在10秒后关闭...');
    await sleep(10000);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);