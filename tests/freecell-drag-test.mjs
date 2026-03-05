import { BrowserController } from 'file:///C:/Users/Administrator/projects/chromemcp/packages/core/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  targetUrl: 'http://localhost:3003',
  outputDir: path.join(__dirname, 'freecell-test-output'),
  viewport: { width: 720, height: 1280 }
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🃏 FreeCell Card Movement Test\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    // 启动浏览器
    console.log('1. 启动浏览器...');
    await controller.launch({
      headless: false,
      viewport: CONFIG.viewport
    });

    // 导航到游戏页面
    console.log('2. 导航到游戏页面...');
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    // 截图初始状态 (主菜单)
    console.log('3. 截图主菜单...');
    await controller.screenshot({ name: '01-main-menu' });

    // 点击 "开始游戏" 按钮 (在屏幕中间偏下位置)
    console.log('4. 点击"开始游戏"...');
    const canvas = await controller.page.$('#game-container canvas');
    if (!canvas) {
      throw new Error('Canvas not found');
    }

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Cannot get canvas bounding box');
    }

    console.log(`Canvas size: ${box.width}x${box.height} at (${box.x}, ${box.y})`);

    // 点击 "开始游戏" 按钮 (大约在屏幕 50% 高度位置)
    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);
    await controller.screenshot({ name: '02-level-select' });

    // 点击第一个关卡 (左上角位置)
    console.log('5. 点击第一个关卡...');
    // 关卡按钮大约在 (160, 200) 位置，相对于 canvas
    const level1X = box.x + 160;
    const level1Y = box.y + 200;
    await controller.page.mouse.click(level1X, level1Y);
    await sleep(2000);
    await controller.screenshot({ name: '03-game-started' });

    console.log('\n📋 开始测试卡牌拖拽...');

    // 测试 1: 拖拽卡牌到无效位置
    console.log('\n测试 1: 拖拽卡牌到无效位置');
    // 从第 1 列拖拽一张牌到空白区域
    const startX1 = box.x + 100;  // 第 1 列
    const startY1 = box.y + 400;  // 牌堆中段
    const endX1 = box.x + 500;    // 右侧空白
    const endY1 = box.y + 100;    // 顶部

    console.log(`拖拽: (${startX1}, ${startY1}) -> (${endX1}, ${endY1})`);
    await controller.page.mouse.move(startX1, startY1);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(endX1, endY1, { steps: 30 });
    await sleep(50);
    await controller.page.mouse.up();
    await sleep(800);
    await controller.screenshot({ name: '04-after-invalid-drag' });
    console.log('截图: 04-after-invalid-drag.png');

    // 测试 2: 再拖拽另一张卡牌
    console.log('\n测试 2: 拖拽另一张卡牌');
    const startX2 = box.x + 200;  // 第 2 列
    const startY2 = box.y + 500;
    const endX2 = box.x + 400;
    const endY2 = box.y + 150;

    console.log(`拖拽: (${startX2}, ${startY2}) -> (${endX2}, ${endY2})`);
    await controller.page.mouse.move(startX2, startY2);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(endX2, endY2, { steps: 30 });
    await sleep(50);
    await controller.page.mouse.up();
    await sleep(800);
    await controller.screenshot({ name: '05-after-second-drag' });
    console.log('截图: 05-after-second-drag.png');

    // 测试 3: 检查之前的牌是否在正确 depth
    console.log('\n测试 3: 拖拽第 3 张牌到有效位置');
    // 尝试移动牌到另一列
    const startX3 = box.x + 300;
    const startY3 = box.y + 350;
    const endX3 = box.x + 450;  // 第 5 列
    const endY3 = box.y + 600;

    console.log(`拖拽: (${startX3}, ${startY3}) -> (${endX3}, ${endY3})`);
    await controller.page.mouse.move(startX3, startY3);
    await sleep(100);
    await controller.page.mouse.down();
    await sleep(50);
    await controller.page.mouse.move(endX3, endY3, { steps: 30 });
    await sleep(50);
    await controller.page.mouse.up();
    await sleep(800);
    await controller.screenshot({ name: '06-after-valid-move' });
    console.log('截图: 06-after-valid-move.png');

    // 测试 4: 尝试双击自动移动
    console.log('\n测试 4: 双击卡牌');
    await controller.page.mouse.dblclick(box.x + 100, box.y + 500);
    await sleep(800);
    await controller.screenshot({ name: '07-after-double-click' });
    console.log('截图: 07-after-double-click.png');

    // 测试 5: 多次拖拽测试 depth
    console.log('\n测试 5: 多次拖拽测试 depth');
    for (let i = 0; i < 3; i++) {
      const sx = box.x + 100 + i * 100;
      const sy = box.y + 600;
      const ex = box.x + 400;
      const ey = box.y + 200;

      console.log(`拖拽 ${i + 1}: (${sx}, ${sy}) -> (${ex}, ${ey})`);
      await controller.page.mouse.move(sx, sy);
      await sleep(50);
      await controller.page.mouse.down();
      await sleep(30);
      await controller.page.mouse.move(ex, ey, { steps: 20 });
      await sleep(30);
      await controller.page.mouse.up();
      await sleep(500);
    }
    await controller.screenshot({ name: '08-multiple-drags' });
    console.log('截图: 08-multiple-drags.png');

    console.log('\n✅ 测试完成！');
    console.log(`📁 截图保存在: ${CONFIG.outputDir}`);
    console.log('\n请检查截图确认:');
    console.log('1. 卡牌拖拽后是否在正确位置');
    console.log('2. 多次拖拽后卡牌 depth 是否正确 (最后移动的牌应在最上面)');

    // 等待观察
    console.log('\n浏览器将在 10 秒后关闭...');
    await sleep(10000);

  } catch (error) {
    console.error('测试出错:', error);
    await controller.screenshot({ name: 'error-state' });
  } finally {
    await controller.close();
  }
}

main().catch(console.error);