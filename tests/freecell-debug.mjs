#!/usr/bin/env node
/**
 * FreeCell Debug Test
 * 调试卡牌移动问题
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
      return { error: 'getGameStateForTest method not found' };
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

async function main() {
  console.log('🃏 FreeCell Debug Test\n');

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

    // 尝试移动第6列的10D到第1列
    // 第6列的X = 45 + 35 + 6*(70+10) = 45 + 35 + 480 = 560
    // 第6列有6张牌，最上面一张Y = 260 + (6-1)*25 = 260 + 125 = 385

    // 让我们先尝试双击移动A♠到foundation
    console.log('尝试双击移动A♠...');
    // A♠在第7列，是第6张牌
    // 第7列X = 45 + 35 + 6*(70+10) = 560? 不对

    // 重新计算
    // startX = (720 - 8*70 - 7*10) / 2 + 70/2 = (720 - 560 - 70)/2 + 35 = 45 + 35 = 80
    // 列1 X = 80 + 0*80 = 80
    // 列2 X = 80 + 1*80 = 160
    // 列3 X = 80 + 2*80 = 240
    // 列4 X = 80 + 3*80 = 320
    // 列5 X = 80 + 4*80 = 400
    // 列6 X = 80 + 5*80 = 480
    // 列7 X = 80 + 6*80 = 560
    // 列8 X = 80 + 7*80 = 640

    // 从初始状态看：
    // 第1列7张: [7D, 13H, 11C, 8C, 13S, 1D, 10S] -> 最上面是10S, Y = 260 + 6*25 = 410
    // 第6列6张: [5C, 13D, 6D, 9D, 10D, 8H] -> 最上面是8H, Y = 260 + 5*25 = 385
    // 第7列6张: [12H, 9S, 1C, 2D, 7S, 11S] -> 最上面是11S, Y = 260 + 5*25 = 385

    // A♠应该被移动了，让我们看看当前状态
    // 等等，输出中显示列6有10D，这说明10D被移动到了列6

    // 让我尝试移动10D（从列1到列6）
    // 列1的10S应该可以放到列6的8H上（都是黑桃？不对）

    // 让我先检查当前状态中的具体牌
    console.log('当前各列最上面的牌:');
    if (state.tableau) {
      state.tableau.forEach((col, idx) => {
        if (col.length > 0) {
          const top = col[col.length - 1];
          console.log(`列 ${idx + 1}: ${top.rank}${top.suit[0].toUpperCase()} (位置: ${80 + idx * 80}, ${260 + (col.length - 1) * 25})`);
        }
      });
    }

    // 尝试手动拖拽第1列的牌到第2列
    // 第1列最上面是10S（黑桃）
    // 第2列最上面是6C（梅花，黑色）- 不能放，颜色相同

    // 尝试第1列10S -> 第6列（如果第6列最上面是红心或方块）
    // 根据初始状态，第6列最上面是8H（红桃）
    // 10S是黑桃，8H是红桃，颜色不同
    // 10S点数是10，8H点数是8，10 != 8+1，不能放

    // 让我尝试第3列的3D -> 第2列的6C
    // 3D是方块（红色），6C是梅花（黑色），颜色不同
    // 3D点数是3，6C点数是6，3 != 6-1，不能放

    // 让我找一个有效的移动
    // 第7列11S -> 第4列？第4列最上面是9C（梅花）
    // 11S是黑桃（黑色），9C是梅花（黑色），颜色相同，不能放

    // 第7列11S -> 第3列？第3列最上面是3D（方块）
    // 11S是黑桃（黑色），3D是方块（红色），颜色不同
    // 11 != 3-1，不能放

    // 第7列11S -> 第6列？第6列最上面是8H（红桃）
    // 11S是黑桃（黑色），8H是红桃（红色），颜色不同
    // 11 != 8+1，不能放

    // 第8列7C -> 第？列
    // 7C是梅花（黑色）
    // 需要找红桃8或方块8

    // 让我查看是否有可移动的牌
    console.log('\n分析可行移动...');
    for (let col = 0; col < 8; col++) {
      const column = state.tableau[col];
      if (column.length === 0) continue;

      const topCard = column[column.length - 1];
      const topDisplay = `${topCard.rank}${topCard.suit[0].toUpperCase()}`;
      const isRed = ['hearts', 'diamonds'].includes(topCard.suit);

      for (let targetCol = 0; targetCol < 8; targetCol++) {
        if (targetCol === col) continue;

        const targetColumn = state.tableau[targetCol];
        if (targetColumn.length === 0) {
          console.log(`  ${topDisplay} (列${col+1}) -> 空列${targetCol+1}`);
        } else {
          const targetCard = targetColumn[targetColumn.length - 1];
          const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
          const canStack = isRed !== targetIsRed && topCard.rank === targetCard.rank - 1;
          if (canStack) {
            console.log(`  ${topDisplay} (列${col+1}) -> ${targetCard.rank}${targetCard.suit[0].toUpperCase()} (列${targetCol+1}) ✅`);
          }
        }
      }
    }

    // 测试：执行第一个有效移动
    let moveFound = false;
    for (let col = 0; col < 8 && !moveFound; col++) {
      const column = state.tableau[col];
      if (column.length === 0) continue;

      const topCard = column[column.length - 1];
      const isRed = ['hearts', 'diamonds'].includes(topCard.suit);
      const fromX = 80 + col * 80;
      const fromY = 260 + (column.length - 1) * 25;

      for (let targetCol = 0; targetCol < 8 && !moveFound; targetCol++) {
        if (targetCol === col) continue;

        const targetColumn = state.tableau[targetCol];
        const toX = 80 + targetCol * 80;
        let toY;

        if (targetColumn.length === 0) {
          toY = 260;
          console.log(`\n执行移动: ${topCard.rank}${topCard.suit[0].toUpperCase()} (列${col+1}) -> 空列${targetCol+1}`);
          moveFound = true;
        } else {
          const targetCard = targetColumn[targetColumn.length - 1];
          const targetIsRed = ['hearts', 'diamonds'].includes(targetCard.suit);
          if (isRed !== targetIsRed && topCard.rank === targetCard.rank - 1) {
            toY = 260 + targetColumn.length * 25;
            console.log(`\n执行移动: ${topCard.rank}${topCard.suit[0].toUpperCase()} (列${col+1}) -> ${targetCard.rank}${targetCard.suit[0].toUpperCase()} (列${targetCol+1})`);
            moveFound = true;
          }
        }

        if (moveFound) {
          // 执行拖拽
          console.log(`  拖拽: (${fromX}, ${fromY}) -> (${toX}, ${toY})`);
          await controller.page.mouse.move(box.x + fromX, box.y + fromY);
          await sleep(100);
          await controller.page.mouse.down();
          await sleep(50);
          await controller.page.mouse.move(box.x + toX, box.y + toY, { steps: 20 });
          await sleep(50);
          await controller.page.mouse.up();
          await sleep(1000);

          await controller.screenshot({ name: 'debug-after-move' });

          // 获取新状态
          const newState = await getGameState(controller);
          console.log('\n移动后状态:');
          printState(newState);
          break;
        }
      }
    }

    if (!moveFound) {
      console.log('没有找到有效移动');
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
