# 五子棋 (Gomoku) - ChromeMCP 示例

这是一个完整的五子棋网页游戏，用于演示 ChromeMCP 自动化测试框架。

## 🎮 游戏特性

- **标准五子棋规则**：15x15棋盘，五子连珠获胜
- **双人对战**：黑棋先行，轮流落子
- **悔棋功能**：支持撤销上一步
- **重新开始**：一键重置游戏
- **落子记录**：显示完整对局历史
- **获胜动画**：五子连珠时高亮显示

## 🚀 快速开始

### 1. 启动游戏

```bash
# 进入项目根目录
cd C:/Users/Administrator/projects/chromemcp

# 方式1：使用CLI启动
node packages/cli/dist/index.js dev http://localhost:8766

# 方式2：手动启动HTTP服务器
# 使用Python
python -m http.server 8766

# 或使用Node.js
npx serve examples/gomoku -p 8766
```

然后在浏览器打开：`http://localhost:8766`

### 2. 运行自动化测试

```bash
# 运行完整的五子棋自动化测试
node tests/e2e/gomoku-automation-test.mjs
```

## 🧪 自动化测试内容

测试脚本 (`tests/e2e/gomoku-automation-test.mjs`) 会自动执行：

| 测试项 | 描述 | 预期结果 |
|--------|------|----------|
| Test 1 | 启动浏览器并导航到游戏页面 | 页面加载成功，截图保存 |
| Test 2 | 检查棋盘元素 | 检测到225个格子，显示"黑棋的回合" |
| Test 3 | 黑棋第一步（中心落子） | 成功放置黑棋，切换到白棋回合 |
| Test 4 | 白棋第二步 | 成功放置白棋 |
| Test 5 | 多步对战场景 | 完成7步落子，棋盘状态正确 |
| Test 6 | 测试获胜条件 | 尝试构建五子连珠 |
| Test 7 | 重新开始功能 | 棋盘清空，回到初始状态 |
| Test 8 | 视觉回归测试 | 对比初始和重启后的棋盘 |
| Test 9 | 悔棋功能 | 成功撤销最后一步 |

### 生成的截图

测试完成后会在 `tests/e2e/output/gomoku/` 目录生成：
- `01-initial-board.png` - 初始棋盘
- `02-after-first-move.png` - 第一步后
- `03-after-second-move.png` - 第二步后
- `04-mid-game.png` - 中盘状态
- `05-game-won.png` - 获胜状态
- `06-after-restart.png` - 重启后
- `07-after-undo.png` - 悔棋后

## 🎨 游戏界面

```
┌─────────────────────────────┐
│       五子棋 Gomoku         │
├─────────────────────────────┤
│  当前玩家: ⚫ 黑棋  [悔棋] [重新开始] │
├─────────────────────────────┤
│    ┌───┬───┬───┬───┐       │
│    │   │   │   │   │       │
│    ├───┼───┼───┼───┤       │
│    │   │ ⚫ │ ⚪ │   │       │
│    ├───┼───┼───┼───┤       │
│    │   │   │   │   │       │
│    └───┴───┴───┴───┘       │
├─────────────────────────────┤
│      黑棋的回合              │
├─────────────────────────────┤
│ 落子记录: 1. 黑(7,7) 2. 白(7,8) │
└─────────────────────────────┘
```

## ⌨️ 键盘快捷键

- `R` / `r` - 重新开始
- `Ctrl + Z` - 悔棋

## 🔧 技术实现

### 前端技术
- 纯 HTML5 + CSS3 + JavaScript
- CSS Grid 布局棋盘
- CSS 动画效果

### 测试技术
- ChromeMCP BrowserController - 浏览器控制
- Playwright - 底层浏览器自动化
- 图像对比 - 视觉回归测试

### 获胜检测算法
```javascript
// 检查四个方向：水平、垂直、两条对角线
const directions = [
  [[0, 1], [0, -1]],   // 水平
  [[1, 0], [-1, 0]],   // 垂直
  [[1, 1], [-1, -1]],  // 对角线 \\[ [1, -1], [-1, 1]]   // 对角线 /
];
```

## 📂 文件结构

```
examples/gomoku/
├── index.html          # 游戏主文件
├── README.md           # 本说明文档
└── ...

tests/e2e/
├── gomoku-automation-test.mjs  # 自动化测试脚本
├── output/gomoku/              # 测试截图输出
└── baselines/gomoku/           # 基线截图
```

## 📝 扩展建议

1. **AI对战**：添加简单的AI对手
2. **网络对战**：支持在线双人对战
3. **计时器**：添加对局计时功能
4. **禁手规则**：实现专业五子棋禁手规则
5. **更多测试**：增加边界测试、异常测试等

## 🤝 集成到 CI/CD

可以在持续集成中运行：

```yaml
# .github/workflows/test.yml
- name: Run Gomoku E2E Tests
  run: |
    npm install
    npm run build
    node tests/e2e/gomoku-automation-test.mjs
```

---

**Enjoy playing Gomoku!** 🎉
