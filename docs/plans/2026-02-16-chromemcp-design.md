# ChromeMCP 设计方案

## 日期
2026-02-16

## 设计目标
构建一个基于 Playwright + Chrome DevTools Protocol 的本地网页测试框架，支持：
1. 开发调试时的实时浏览器交互
2. 自动录制操作生成测试用例
3. AI Agent 主动执行测试并生成代码

## 使用场景
HTML 游戏测试，专注图像验证

---

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code (MCP Client)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Agent Loop (Prompt-driven)                 │   │
│  │  1. 接收用户意图 → 2. 调用Tool探索 → 3. 分析结果        │   │
│  │  4. 提问澄清/建议 → 5. 生成测试代码 → 6. 验证执行       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ MCP Protocol
┌─────────────────────────────────────────────────────────────────┐
│                  MCP Server (@chromemcp/server)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Tools      │  │  Resources   │  │      Prompts         │  │
│  │  ─────────   │  │  ──────────  │  │  ─────────────────   │  │
│  │              │  │              │  │                      │  │
│  │ browse(url)  │  │ trace/latest │  │ analyze-interaction  │  │
│  │ click(sel)   │  │ snapshot/png │  │ suggest-assertions   │  │
│  │ fill(sel,val)│  │ network/har  │  │ generate-test-case   │  │
│  │ press(key)   │  │ console/logs │  │ debug-failure        │  │
│  │ screenshot() │  │ dom/tree     │  │                      │  │
│  │ get_dom()    │  │ accessibility│  │                      │  │
│  │ get_a11y()   │  │              │  │                      │  │
│  │ execute(js)  │  │              │  │                      │  │
│  │ trace_start()│  │              │  │                      │  │
│  │ trace_stop() │  │              │  │                      │  │
│  │              │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Internal Services                           │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐   │  │
│  │  │BrowserMgr   │ │TraceAnalyzer│ │  TestGenerator    │   │  │
│  │  │             │ │             │ │                   │   │  │
│  │  │- launch()   │ │- parse()    │ │- toPlaywright()   │   │  │
│  │  │- connect()  │ │- extract()  │ │- toCypress()      │   │  │
│  │  │- close()    │ │- diff()     │ │- optimize()       │   │  │
│  │  └─────────────┘ └─────────────┘ └───────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Playwright + CDP Integration                    │
│         (Chromium / WebKit / Firefox via Playwright)            │
└─────────────────────────────────────────────────────────────────┘
```

### 关键设计决策
- **无状态Server**: 每次请求独立，状态通过MCP Resources暴露
- **单一Browser实例**: Server启动时连接，复用tab/page管理多个会话
- **Trace为核心**: 所有操作默认录制trace，作为分析和回放的基础

---

## 2. 数据模型

### TestSession
```typescript
interface TestSession {
  id: string;                    // uuid
  url: string;                   // 测试页面地址
  startTime: number;
  steps: TestStep[];
  screenshots: Screenshot[];     // 关键帧截图
  videoPath?: string;            // 完整录制视频
}
```

### TestStep
```typescript
interface TestStep {
  id: string;
  type: 'navigate' | 'click' | 'fill' | 'press' | 'wait';
  target?: string;               // 选择器或坐标
  value?: string;                // 输入值
  screenshotBefore?: string;     // 操作前截图
  screenshotAfter?: string;      // 操作后截图
  timestamp: number;
}
```

### Screenshot
```typescript
interface Screenshot {
  id: string;
  path: string;                  // 本地存储路径
  type: 'manual' | 'auto';       // 手动捕获或自动捕获
  metadata: {
    width: number;
    height: number;
    timestamp: number;
  };
}
```

### VisualAssertion
```typescript
interface VisualAssertion {
  id: string;
  baselinePath: string;          // 基准图路径
  actualPath: string;            // 实际图路径
  diffPath?: string;             // 差异图路径
  matchScore: number;            // 相似度 0-1
  threshold: number;             // 通过阈值
  passed: boolean;
}
```

---

## 3. MCP Tools API

### 浏览控制
| Tool | 描述 |
|------|------|
| `browse(url, options?)` | 启动浏览器，导航到指定URL |
| `close_browser()` | 关闭浏览器，清理资源 |

### 交互操作
| Tool | 描述 |
|------|------|
| `click(selector, options?)` | 点击元素，自动截图记录前后状态 |
| `fill(selector, value)` | 填充输入框 |
| `press(key, options?)` | 键盘按键（支持游戏常用键如Space, ArrowUp等） |
| `hover(selector)` | 鼠标悬停 |
| `wait_for_selector(selector, options?)` | 等待元素出现（用于游戏加载检测） |
| `wait_for_timeout(ms)` | 固定等待（用于动画播放） |

### 图像捕获
| Tool | 描述 |
|------|------|
| `screenshot(options?)` | 截图，返回截图路径和base64预览 |
| `start_recording(options?)` | 开始视频录制，支持30/60fps |
| `stop_recording()` | 停止录制，返回视频路径 |
| `capture_frame()` | 捕获当前帧（用于关键时间点） |

### 图像对比
| Tool | 描述 |
|------|------|
| `compare_screenshots({baseline, actual, threshold?})` | 对比两张截图，返回相似度分数和差异图路径 |
| `set_baseline(name, screenshotPath)` | 将当前截图设为基准图 |

### DOM查询
| Tool | 描述 |
|------|------|
| `get_canvas_info()` | 返回页面所有canvas元素信息（尺寸、位置） |
| `execute_script(script)` | 执行自定义JS（用于游戏内部状态查询） |

---

## 4. MCP Resources

| Resource URI | 描述 |
|--------------|------|
| `resource://screenshots/{sessionId}/list` | 当前会话所有截图列表 |
| `resource://screenshots/{sessionId}/{screenshotId}` | 单张截图（PNG binary） |
| `resource://sessions/{sessionId}/trace` | Playwright trace文件（用于详细回放） |
| `resource://sessions/{sessionId}/video` | 录制视频（MP4/WebM） |
| `resource://sessions/{sessionId}/steps` | 操作步骤JSON |
| `resource://baselines/list` | 所有基准图列表 |
| `resource://comparisons/{comparisonId}` | 对比结果（包含diff图） |

---

## 5. MCP Prompts

| Prompt URI | 描述 |
|------------|------|
| `prompt://visual-testing-guide` | 视觉测试最佳实践指导 |
| `prompt://game-testing-workflow` | HTML游戏测试工作流 |
| `prompt://screenshot-analysis/{screenshotId}` | 分析截图内容，建议测试点 |
| `prompt://failure-analysis/{comparisonId}` | 分析图像对比失败原因 |

---

## 6. CLI 设计

### 命令列表

```bash
# 开发调试模式 - 启动浏览器，进入交互式MCP会话
chromemcp dev <url> [options]
  --port, -p     MCP Server端口 (默认 3000)
  --headless     无头模式
  --viewport     视口尺寸 (默认 1280x720)

# 录制模式 - 记录操作并生成trace
chromemcp record <url> [options]
  --output, -o   输出目录 (默认 ./traces)
  --name, -n     会话名称

# 测试执行 - 回放trace或执行测试脚本
chromemcp test <trace-or-url> [options]
  --baseline     基准图目录
  --update       更新基准图
  --headed       显示浏览器窗口

# 图像对比 - 直接对比两张图片
chromemcp compare <img1> <img2> [options]
  --threshold    差异阈值 (默认 0.1)
  --output       差异图输出路径

# 启动MCP Server模式
chromemcp mcp [options]
  --port, -p     端口 (默认 3000)
  --stdio        使用stdio传输 (用于Claude Code直接连接)
```

---

## 7. 项目结构

```
chromemcp/
├── packages/
│   ├── core/                    # 核心库 (不依赖MCP)
│   │   ├── src/
│   │   │   ├── browser/         # Playwright/CDP封装
│   │   │   │   ├── controller.ts
│   │   │   │   ├── screenshot.ts
│   │   │   │   └── video.ts
│   │   │   ├── compare/         # 图像对比
│   │   │   │   ├── pixelmatch.ts
│   │   │   │   └── ssim.ts
│   │   │   ├── trace/           # Trace解析
│   │   │   │   ├── parser.ts
│   │   │   │   └── extractor.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── mcp-server/              # MCP Server实现
│   │   ├── src/
│   │   │   ├── tools/           # Tool handlers
│   │   │   │   ├── browser.ts
│   │   │   │   ├── interaction.ts
│   │   │   │   ├── screenshot.ts
│   │   │   │   └── compare.ts
│   │   │   ├── resources/       # Resource handlers
│   │   │   ├── prompts/         # Prompt handlers
│   │   │   ├── server.ts        # MCP Server主入口
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── cli/                     # CLI工具
│       ├── src/
│       │   ├── commands/
│       │   │   ├── dev.ts
│       │   │   ├── record.ts
│       │   │   ├── test.ts
│       │   │   ├── compare.ts
│       │   │   └── mcp.ts
│       │   └── index.ts
│       └── package.json
│
├── docs/
│   └── plans/
│       └── 2026-02-16-chromemcp-design.md
│
├── package.json                 # Workspace root
└── tsconfig.json
```

---

## 8. 图像对比算法

### Mode 1: PixelMatch (默认，像素级精确)
- **适用**: UI界面、静态元素
- **特点**: 速度快，精确到像素
- **阈值**: 0-1，0表示完全相同，1表示完全不同
- **输出**: 差异图（红色标记不同区域）

### Mode 2: SSIM (结构相似性)
- **适用**: 游戏画面、有轻微渲染差异的场景
- **特点**: 对人眼感知更友好，容忍轻微抗锯齿差异
- **阈值**: 0-1，1表示完全相同，<0.9通常表示明显差异
- **输出**: 相似度分数 + 热力图

### 区域遮罩 (Mask)
- 支持JSON遮罩定义，忽略动态区域（如时间显示、粒子效果）
- 支持自动检测动态区域（通过多帧对比）

---

## 9. 典型使用示例

### 场景1：开发调试（CLI）
```bash
chromemcp dev http://localhost:3000/game
# 启动浏览器，同时启动MCP Server
# Claude Code可以连接并开始交互式探索
```

### 场景2：录制测试（CLI）
```bash
chromemcp record http://localhost:3000/game --name battle-test
# 手动操作游戏
# 自动生成trace和截图
```

### 场景3：自动化测试（MCP）
在Claude Code中：
```
> 帮我测试游戏战斗场景

Agent执行:
1. browse("http://localhost:3000/game")
2. screenshot({name: "initial"})
3. click("canvas#game")
4. press("Space")  // 攻击
5. wait_for_timeout(2000)  // 等待动画
6. screenshot({name: "after-attack"})
7. compare_screenshots({
     baseline: "expected-attack.png",
     actual: "after-attack.png"
   })
```

### 场景4：批量回归测试（CLI）
```bash
chromemcp test ./traces/battle-test.zip --baseline ./baselines
# 回放trace，对比所有截图
# 生成测试报告
```

---

## 10. 组件职责总结

| 组件 | 职责 |
|------|------|
| **@chromemcp/core** | Playwright/CDP封装、图像对比、Trace解析 |
| **@chromemcp/mcp-server** | MCP协议实现、Tools/Resources/Prompts |
| **@chromemcp/cli** | 命令行入口，支持dev/record/test/compare/mcp模式 |

## 核心工作流程

1. **CLI模式** → 快速启动、录制、测试
2. **MCP模式** → Claude Code智能Agent交互
3. **混合使用** → CLI录制，MCP分析生成测试代码

---

## 批准状态

- [x] 系统架构
- [x] 数据模型
- [x] MCP Tools API
- [x] MCP Resources
- [x] MCP Prompts
- [x] CLI设计
- [x] 项目结构
- [x] 图像对比算法
- [x] 使用示例
