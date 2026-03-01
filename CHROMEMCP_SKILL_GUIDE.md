# ChromeMCP Skill 使用指南

## 概述

ChromeMCP 已成功配置为 Claude Code 的 skill，可用于在任何 HTML5 项目上执行自动化浏览器测试。

## 安装位置

- **ChromeMCP 主目录**: `C:\Users\Administrator\projects\chromemcp`
- **Skill 位置**: `~/.claude/plugins/superpowers/skills/chromemcp-testing/`
- **核心库**: `packages/core/dist/index.js`
- **MCP Server**: `packages/mcp-server/dist/index.js`
- **CLI**: `packages/cli/dist/index.js`

## 快速开始

### 1. 使用 Wrapper 脚本（推荐）

```bash
cd C:\Users\Administrator\projects\chromemcp

# 测试 URL
node chromemcp-wrapper.mjs test http://localhost:8080

# 开发模式
node chromemcp-wrapper.mjs dev http://localhost:8080

# 比较截图
node chromemcp-wrapper.mjs compare baseline.png current.png

# 启动 MCP Server
node chromemcp-wrapper.mjs mcp
```

### 2. 在其他项目中使用

复制模板文件到你的项目：

```bash
cp ~/.claude/plugins/superpowers/skills/chromemcp-testing/templates/chromemcp-test.mjs ./my-test.mjs
```

修改 `CONFIG` 部分：

```javascript
const CONFIG = {
  targetUrl: 'http://localhost:8080',  // 你的项目地址
  outputDir: './chromemcp-output',      // 输出目录
  // ... 其他配置
};
```

运行测试：

```bash
node my-test.mjs
```

## 可用模板

| 模板 | 用途 | 路径 |
|------|------|------|
| `chromemcp-test.mjs` | 基础测试框架 | `templates/chromemcp-test.mjs` |
| `visual-regression-test.mjs` | 视觉回归测试 | `templates/visual-regression-test.mjs` |

## API 参考

### BrowserController

```javascript
import { BrowserController } from 'C:/Users/Administrator/projects/chromemcp/packages/core/dist/index.js';

const controller = new BrowserController('./output');

// 启动浏览器
await controller.launch({
  headless: true,
  viewport: { width: 1280, height: 720 }
});

// 导航到页面
await controller.navigate('http://localhost:8080');

// 截图
const screenshot = await controller.screenshot({ name: 'homepage' });

// 点击元素
await controller.click('#button');

// 填写输入框
await controller.fill('#input', 'value');

// 按键
await controller.press('Enter');

// 等待
await controller.waitForTimeout(1000);

// 等待元素出现
await controller.waitForSelector('#element', { timeout: 5000 });

// 执行 JavaScript
const result = await controller.executeScript(() => document.title);

// 获取 Canvas 信息
const canvasInfo = await controller.getCanvasInfo();

// 关闭浏览器
await controller.close();
```

### 图片对比

```javascript
import { compareImages } from 'C:/Users/Administrator/projects/chromemcp/packages/core/dist/index.js';

const result = await compareImages(
  'baseline.png',
  'current.png',
  'diff.png'
);

console.log(result.score);        // 匹配分数 (0-1)
console.log(result.diffPixelCount); // 不同像素数
console.log(result.passed);       // 是否通过
```

## 示例项目

### Demo 项目

位置: `tests/demo-project/`

包含：
- `index.html` - 计数器应用示例
- `test.mjs` - 完整的测试脚本

运行：
```bash
cd tests/demo-project
node test.mjs
```

### 五子棋示例

位置: `examples/gomoku/`

运行：
```bash
# 启动游戏服务器
python -m http.server 8766

# 运行自动化测试
node tests/e2e/gomoku-automation-test.mjs
```

## 测试输出

测试完成后会生成：
- 截图文件 (`.png`)
- 差异图片 (`diff-*.png`)
- 测试报告 (`report.json`)

## 在其他 HTML5 项目中的集成步骤

### 步骤 1: 复制模板

```bash
cp C:\Users\Administrator\.claude\plugins\superpowers\skills\chromemcp-testing\templates\chromemcp-test.mjs \
   /path/to/your/project/test.mjs
```

### 步骤 2: 修改配置

编辑 `test.mjs` 中的 `CONFIG`：

```javascript
const CONFIG = {
  targetUrl: 'http://localhost:3000',  // 修改为你的项目地址
  outputDir: './test-output',
  // ...
};
```

### 步骤 3: 添加测试步骤

```javascript
steps: [
  { name: 'initial', action: 'screenshot', delay: 1000 },
  { name: 'click-button', action: 'click', selector: '#my-button' },
  { name: 'fill-form', action: 'fill', selector: '#name', value: 'Test' },
  { name: 'submit', action: 'click', selector: '#submit' }
]
```

### 步骤 4: 运行测试

```bash
node test.mjs
```

## 故障排除

### 浏览器无法启动

```bash
# 重新安装 Playwright 浏览器
npx playwright install chromium

# 重新构建 ChromeMCP
cd C:\Users\Administrator\projects\chromemcp
npm run build
```

### 截图不匹配

- 确保视口大小一致
- 添加适当的等待时间让动画完成
- 检查差异图片了解变化

### 元素找不到

- 使用 `waitForSelector` 等待元素加载
- 检查选择器是否正确
- 确认元素可见（非 `display: none`）

## 文件结构

```
chromemcp/
├── packages/
│   ├── core/              # 核心库 (BrowserController, compareImages)
│   ├── mcp-server/        # MCP Server
│   └── cli/               # CLI 工具
├── examples/
│   └── gomoku/            # 五子棋示例
├── tests/
│   ├── demo-project/      # Demo 测试项目
│   └── e2e/               # E2E 测试示例
├── chromemcp-wrapper.mjs  # 便捷包装脚本
└── CHROMEMCP_SKILL_GUIDE.md  # 本指南
```

## 参考资料

- ChromeMCP 项目: `C:\Users\Administrator\projects\chromemcp`
- Skill 文档: `~/.claude/plugins/superpowers/skills/chromemcp-testing/skill.md`
- Skill README: `~/.claude/plugins/superpowers/skills/chromemcp-testing/README.md`

## 验证安装

运行 Demo 测试验证一切正常：

```bash
cd C:\Users\Administrator\projects\chromemcp
cd tests/demo-project
node test.mjs
```

预期输出：
```
🚀 ChromeMCP Demo Test

🌐 Demo server running at http://localhost:9999
Test 1: Navigate to demo page
  ✓ Page loaded and screenshot saved
Test 2: Click increment button
  ✓ Counter incremented to 1
...
✓ Passed: 7
✗ Failed: 0
```

---

**ChromeMCP Skill 已准备就绪，可以开始测试你的 HTML5 项目！**
