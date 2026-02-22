import { BrowserController } from '../../packages/core/dist/index.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 简单的静态文件服务器
function createServer() {
  const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.ts': 'text/javascript',
      '.css': 'text/css',
      '.jpg': 'image/jpeg',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(8767, () => {
      console.log('🌐 Test server running at http://localhost:8767');
      resolve(server);
    });
  });
}

async function runTest() {
  const controller = new BrowserController('./chromemcp-output');
  let server;

  try {
    // 启动服务器
    server = await createServer();

    // 启动浏览器
    await controller.launch({
      headless: false,
      viewport: { width: 414, height: 896 } // iPhone 尺寸
    });

    // 导航到游戏
    await controller.navigate('http://localhost:8767');
    await controller.waitForTimeout(2000);

    // 截图：主菜单
    await controller.screenshot({ name: '01-main-menu' });
    console.log('✅ 截图：主菜单');

    // 点击"继续游戏"
    await controller.click('text=继续游戏');
    await controller.waitForTimeout(1500);

    // 截图：关卡选择
    await controller.screenshot({ name: '02-level-select' });
    console.log('✅ 截图：关卡选择');

    // 点击第一关
    await controller.click('text=1');
    await controller.waitForTimeout(2000);

    // 截图：游戏界面
    await controller.screenshot({ name: '03-game-screen' });
    console.log('✅ 截图：游戏界面');

    // 等待几秒观察
    await controller.waitForTimeout(5000);

    console.log('\n✅ 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await controller.close();
    if (server) server.close();
  }
}

runTest();
