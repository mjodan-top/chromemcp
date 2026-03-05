#!/usr/bin/env node
/**
 * FreeCell Level 1 Solver
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

// 确保输出目录存在
fs.mkdirSync(CONFIG.outputDir, { recursive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从游戏获取当前牌局状态
 */
async function getGameState(controller) {
  return await controller.executeScript(() => {
    try {
      // 获取Phaser游戏实例
      const phaserGame = window.game;
      if (!phaserGame) return { error: 'No phaser game found' };

      // 获取GameScene
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { error: 'GameScene not found' };

      // 使用公共方法获取状态
      if (gameScene.getGameStateForTest) {
        return gameScene.getGameStateForTest();
      }

      return { error: 'getGameStateForTest method not found' };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });
}

/**
 * 打印牌局状态
 */
function printGameState(state) {
  console.log('\n=== 当前牌局状态 ===');
  console.log(`关卡: ${state.levelId}`);

  console.log('\n--- 游戏区 (Tableau) ---');
  if (state.tableau) {
    state.tableau.forEach((col, idx) => {
      const cards = col.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(', ');
      console.log(`列 ${idx + 1}: [${cards}]`);
    });
  }

  console.log('\n--- 空位 (FreeCells) ---');
  if (state.freeCells) {
    state.freeCells.forEach((cell, idx) => {
      console.log(`空位 ${idx + 1}: ${cell ? `${cell.rank}${cell.suit[0].toUpperCase()}` : '空'}`);
    });
  }

  console.log('\n--- 目标区 (Foundations) ---');
  if (state.foundations) {
    const suits = ['♥', '♦', '♣', '♠'];
    state.foundations.forEach((stack, idx) => {
      const top = stack.length > 0 ? stack[stack.length - 1] : null;
      console.log(`${suits[idx]}: ${top ? `${top.rank}` : '空'} (${stack.length}张)`);
    });
  }
  console.log('===================\n');
}

/**
 * 获取卡牌位置 (相对于canvas)
 */
function getCardPosition(col, row = 'top') {
  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;

  const totalWidth = 8 * cardWidth + 7 * 10;
  const startX = (720 - totalWidth) / 2 + cardWidth / 2;

  const x = startX + col * (cardWidth + 10);
  let y;

  if (row === 'top') {
    // 获取该列最上面的牌
    y = tableauStartY; // 需要动态计算
  } else if (typeof row === 'number') {
    y = tableauStartY + row * cardGap;
  } else {
    y = tableauStartY;
  }

  return { x, y };
}

/**
 * 获取FreeCell位置
 */
function getFreeCellPosition(index) {
  const cardWidth = 70;
  const gap = 20;
  const totalWidth = 4 * cardWidth + 3 * 10 + gap + 4 * cardWidth + 3 * 10;
  const startX = (720 - totalWidth) / 2 + cardWidth / 2;

  return {
    x: startX + index * (cardWidth + 10),
    y: 150
  };
}

/**
 * 获取Foundation位置
 */
function getFoundationPosition(index) {
  const cardWidth = 70;
  const gap = 20;
  const totalWidth = 4 * cardWidth + 3 * 10 + gap + 4 * cardWidth + 3 * 10;
  const startX = (720 - totalWidth) / 2 + cardWidth / 2;
  const foundationX = startX + 4 * (cardWidth + 10) + gap;

  return {
    x: foundationX + index * (cardWidth + 10),
    y: 150
  };
}

/**
 * 执行拖拽操作
 */
async function dragCard(controller, fromX, fromY, toX, toY) {
  const canvas = await controller.page.$('#game-container canvas');
  if (!canvas) throw new Error('Canvas not found');

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Cannot get canvas bounding box');

  const startX = box.x + fromX;
  const startY = box.y + fromY;
  const endX = box.x + toX;
  const endY = box.y + toY;

  console.log(`  拖拽: (${Math.round(fromX)}, ${Math.round(fromY)}) -> (${Math.round(toX)}, ${Math.round(toY)})`);

  await controller.page.mouse.move(startX, startY);
  await sleep(100);
  await controller.page.mouse.down();
  await sleep(50);
  await controller.page.mouse.move(endX, endY, { steps: 20 });
  await sleep(50);
  await controller.page.mouse.up();
  await sleep(500);
}

/**
 * 点击位置
 */
async function clickAt(controller, x, y) {
  const canvas = await controller.page.$('#game-container canvas');
  if (!canvas) throw new Error('Canvas not found');

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Cannot get canvas bounding box');

  await controller.page.mouse.click(box.x + x, box.y + y);
  await sleep(300);
}

/**
 * 双击位置
 */
async function doubleClickAt(controller, x, y) {
  const canvas = await controller.page.$('#game-container canvas');
  if (!canvas) throw new Error('Canvas not found');

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Cannot get canvas bounding box');

  await controller.page.mouse.dblclick(box.x + x, box.y + y);
  await sleep(500);
}

/**
 * 分析可行的移动
 * 返回 [{ from: {col, row}, to: {col|type, index}, card }]
 */
function analyzeMoves(state) {
  const moves = [];
  const { tableau, freeCells, foundations } = state;

  if (!tableau) return moves;

  // 对每个列的最上面一张牌
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;

    const topCard = column[column.length - 1];

    // 1. 检查是否可以移动到foundation
    const suitIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(topCard.suit);
    const foundation = foundations[suitIndex];
    const canMoveToFoundation = foundation.length === 0
      ? topCard.rank === 1
      : (foundation[foundation.length - 1].rank === topCard.rank - 1);

    if (canMoveToFoundation) {
      moves.push({
        type: 'to_foundation',
        from: { col, row: column.length - 1 },
        to: { type: 'foundation', index: suitIndex },
        card: topCard,
        priority: 10 // 高优先级
      });
    }

    // 2. 检查是否可以移动到其他列
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;

      const targetColumn = tableau[targetCol];
      if (targetColumn.length === 0) {
        // 空列可以放置
        moves.push({
          type: 'to_tableau',
          from: { col, row: column.length - 1 },
          to: { type: 'tableau', col: targetCol },
          card: topCard,
          priority: 1
        });
      } else {
        const targetCard = targetColumn[targetColumn.length - 1];
        // 检查是否可以叠放 (颜色不同且点数递减)
        const isOppositeColor = (c1, c2) => {
          const red = ['hearts', 'diamonds'];
          return red.includes(c1.suit) !== red.includes(c2.suit);
        };

        if (isOppositeColor(topCard, targetCard) && topCard.rank === targetCard.rank - 1) {
          moves.push({
            type: 'to_tableau',
            from: { col, row: column.length - 1 },
            to: { type: 'tableau', col: targetCol },
            card: topCard,
            priority: 5
          });
        }
      }
    }

    // 3. 检查是否可以移动到freeCell
    const emptyFreeCellIndex = freeCells.findIndex(c => c === null);
    if (emptyFreeCellIndex !== -1) {
      moves.push({
        type: 'to_freecell',
        from: { col, row: column.length - 1 },
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
        priority: 10
      });
    }
  }

  // 按优先级排序
  return moves.sort((a, b) => b.priority - a.priority);
}

/**
 * 检查是否获胜
 */
function checkWin(state) {
  if (!state.foundations) return false;
  return state.foundations.every(f => f.length === 13);
}

/**
 * 执行移动
 */
async function executeMove(controller, move, state) {
  let fromX, fromY, toX, toY;

  const cardWidth = 70;
  const cardGap = 25;
  const tableauStartY = 260;
  const totalWidth = 8 * cardWidth + 7 * 10;
  const startX = (720 - totalWidth) / 2 + cardWidth / 2;

  // 计算起点
  if (move.from.type === 'freecell') {
    const pos = getFreeCellPosition(move.from.index);
    fromX = pos.x;
    fromY = pos.y;
  } else {
    fromX = startX + move.from.col * (cardWidth + 10);
    // 需要获取该列当前高度
    const colHeight = state.tableau[move.from.col].length;
    fromY = tableauStartY + (colHeight - 1) * cardGap;
  }

  // 计算终点
  if (move.to.type === 'foundation') {
    const pos = getFoundationPosition(move.to.index);
    toX = pos.x;
    toY = pos.y;
  } else if (move.to.type === 'freecell') {
    const pos = getFreeCellPosition(move.to.index);
    toX = pos.x;
    toY = pos.y;
  } else {
    toX = startX + move.to.col * (cardWidth + 10);
    // 目标列的高度
    const targetColHeight = state.tableau[move.to.col].length;
    if (move.type === 'to_tableau') {
      toY = tableauStartY + targetColHeight * cardGap;
    } else {
      toY = tableauStartY + (targetColHeight - 1) * cardGap;
    }
  }

  await dragCard(controller, fromX, fromY, toX, toY);
}

/**
 * 主函数
 */
async function main() {
  console.log('🃏 FreeCell Level 1 Solver\n');
  console.log('=' .repeat(60));

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    // 1. 启动浏览器
    console.log('\n1. 启动浏览器...');
    await controller.launch({
      headless: false,
      viewport: CONFIG.viewport
    });

    // 2. 导航到游戏
    console.log('2. 导航到游戏...');
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    // 截图初始状态
    await controller.screenshot({ name: '01-initial' });

    // 3. 进入关卡选择
    console.log('3. 点击"开始游戏"...');
    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();
    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);
    await controller.screenshot({ name: '02-level-select' });

    // 4. 选择第一关
    console.log('4. 选择第1关...');
    // 关卡1按钮大约在 (160, 200) 相对于 canvas
    await controller.page.mouse.click(box.x + 160, box.y + 200);
    await sleep(3000);  // 增加等待时间，确保场景完全加载
    await controller.screenshot({ name: '03-game-started' });

    // 5. 获取初始牌局状态
    console.log('5. 分析初始牌局...');
    await sleep(2000);  // 等待场景完全初始化

    // 先检查游戏是否加载
    const checkGame = await controller.executeScript(() => {
      const phaserGame = window.game;
      return {
        hasGame: !!phaserGame,
        sceneKeys: phaserGame?.scene?.keys,
        scenes: phaserGame?.scene?.scenes?.map(s => s.scene?.key)
      };
    });
    console.log('游戏检查:', checkGame);

    let state = await getGameState(controller);
    console.log('原始状态:', JSON.stringify(state, null, 2));
    printGameState(state);

    // 6. 自动求解
    console.log('6. 开始自动求解...');
    let moveCount = 0;
    const maxMoves = 50; // 减少最大步数以便调试

    while (moveCount < maxMoves) {
      // 获取当前状态
      state = await getGameState(controller);

      // 检查是否获胜
      if (checkWin(state)) {
        console.log('\n🎉 恭喜！成功通关！');
        await controller.screenshot({ name: '09-win' });
        break;
      }

      // 分析可行移动
      const moves = analyzeMoves(state);

      if (moves.length === 0) {
        console.log('\n⚠️ 没有可行的移动，尝试获取更多调试信息...');
        // 获取调试信息
        const debugInfo = await controller.executeScript(() => {
          const gameScene = window.game?.scene?.getScene('GameScene');
          if (!gameScene) return { error: 'No GameScene' };
          return {
            selectedCards: gameScene.selectedCards?.length || 0,
            moveHistory: gameScene.moveHistory?.length || 0,
            hasInput: !!gameScene.input
          };
        });
        console.log('调试信息:', debugInfo);
        break;
      }

      // 执行最高优先级的移动
      const move = moves[0];
      const cardDisplay = `${move.card.rank}${move.card.suit[0].toUpperCase()}`;

      console.log(`\n移动 #${moveCount + 1}: ${cardDisplay} -> ${move.to.type}`);

      // 记录移动前的状态
      const prevState = JSON.stringify(state.tableau);

      // 执行移动
      await executeMove(controller, move, state);

      // 等待并获取新状态
      await sleep(800);
      state = await getGameState(controller);
      const newState = JSON.stringify(state.tableau);

      // 检查移动是否成功
      if (prevState === newState) {
        console.log('  ⚠️ 移动似乎未生效，状态未改变');
        // 截图记录
        await controller.screenshot({ name: `failed-move-${moveCount + 1}` });
      } else {
        console.log('  ✅ 移动成功');
      }

      moveCount++;

      // 每5步截个图
      if (moveCount % 5 === 0) {
        await controller.screenshot({ name: `step-${moveCount}` });
      }

      await sleep(200);
    }

    // 7. 最终结果
    console.log('\n' + '='.repeat(60));
    if (moveCount >= maxMoves) {
      console.log('⚠️ 达到最大移动次数限制，未能完成');
    }
    console.log(`总移动次数: ${moveCount}`);

    // 最终截图
    await controller.screenshot({ name: 'final-state' });

    // 等待观察
    console.log('\n浏览器将在5秒后关闭...');
    await sleep(5000);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    await controller.screenshot({ name: 'error' });
  } finally {
    await controller.close();
  }
}

main().catch(console.error);
