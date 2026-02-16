# ChromeMCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现一个基于Playwright + MCP的本地网页测试框架，支持图像捕获、对比和AI Agent交互

**Architecture:** 采用monorepo结构，分离core库（浏览器控制、图像对比）、mcp-server（MCP协议实现）、cli（命令行入口）。Playwright作为底层浏览器控制，MCP Server暴露Tools/Resources/Prompts给Claude Code

**Tech Stack:** TypeScript, Playwright, MCP SDK, pixelmatch, pngjs, commander.js

---

## Task 1: 初始化Monorepo工作区

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Step 1: 创建根package.json**

```json
{
  "name": "chromemcp",
  "version": "0.1.0",
  "private": true,
  "description": "Playwright + MCP based web testing framework",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "eslint packages/*/src/**/*.ts"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

**Step 2: 创建tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: 创建.gitignore**

```
node_modules/
dist/
*.log
.env
.DS_Store
traces/
screenshots/
baselines/
.vscode/
.idea/
```

**Step 4: 初始化git仓库**

```bash
git init
git add package.json tsconfig.json .gitignore
git commit -m "chore: initialize monorepo workspace"
```

---

## Task 2: 创建Core包 - 类型定义

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/types.ts`

**Step 1: 创建packages/core/package.json**

```json
{
  "name": "@chromemcp/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "node --test dist/**/*.test.js"
  },
  "dependencies": {
    "playwright": "^1.40.0",
    "pixelmatch": "^5.3.0",
    "pngjs": "^7.0.0"
  },
  "devDependencies": {
    "@types/pixelmatch": "^5.2.0",
    "@types/pngjs": "^6.0.0"
  }
}
```

**Step 2: 创建packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: 创建packages/core/src/types.ts**

```typescript
export interface TestSession {
  id: string;
  url: string;
  startTime: number;
  endTime?: number;
  steps: TestStep[];
  screenshots: Screenshot[];
  videoPath?: string;
  tracePath?: string;
}

export interface TestStep {
  id: string;
  type: 'navigate' | 'click' | 'fill' | 'press' | 'hover' | 'wait' | 'execute';
  target?: string;
  value?: string;
  options?: Record<string, unknown>;
  screenshotBefore?: string;
  screenshotAfter?: string;
  timestamp: number;
  duration?: number;
}

export interface Screenshot {
  id: string;
  path: string;
  type: 'manual' | 'auto';
  metadata: {
    width: number;
    height: number;
    timestamp: number;
  };
}

export interface VisualAssertion {
  id: string;
  baselinePath: string;
  actualPath: string;
  diffPath?: string;
  matchScore: number;
  threshold: number;
  passed: boolean;
}

export interface ScreenshotOptions {
  name?: string;
  clip?: { x: number; y: number; width: number; height: number };
  fullPage?: boolean;
  omitBackground?: boolean;
}

export interface VideoOptions {
  fps?: 30 | 60;
  size?: { width: number; height: number };
  duration?: number;
}

export interface CompareOptions {
  threshold?: number;
  includeAA?: boolean;
  alpha?: number;
}

export interface BrowserOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;
}
```

**Step 4: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add type definitions"
```

---

## Task 3: 实现BrowserController

**Files:**
- Create: `packages/core/src/browser/controller.ts`
- Test: `packages/core/src/browser/controller.test.ts`

**Step 1: 创建测试文件**

```typescript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { BrowserController } from './controller.js';

describe('BrowserController', () => {
  let controller: BrowserController;

  beforeEach(() => {
    controller = new BrowserController();
  });

  afterEach(async () => {
    await controller.close();
  });

  it('should launch browser', async () => {
    await controller.launch({ headless: true });
    assert.ok(controller['browser'], 'Browser should be initialized');
  });

  it('should navigate to URL', async () => {
    await controller.launch({ headless: true });
    const page = await controller.navigate('about:blank');
    assert.ok(page, 'Page should be returned');
  });

  it('should take screenshot', async () => {
    await controller.launch({ headless: true });
    await controller.navigate('about:blank');
    const screenshot = await controller.screenshot({ name: 'test' });
    assert.ok(screenshot.path, 'Screenshot path should exist');
    assert.ok(screenshot.metadata.width > 0, 'Width should be > 0');
  });
});
```

**Step 2: 运行测试（应失败）**

```bash
cd packages/core && npm install && npm run build
node --test dist/browser/controller.test.js
```

Expected: FAIL - "BrowserController is not defined"

**Step 3: 实现BrowserController**

```typescript
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Screenshot, ScreenshotOptions, BrowserOptions, TestSession, TestStep } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = join(process.cwd(), 'screenshots');

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private session: TestSession | null = null;
  private outputDir: string;

  constructor(outputDir: string = DEFAULT_OUTPUT_DIR) {
    this.outputDir = outputDir;
  }

  async launch(options: BrowserOptions = {}): Promise<void> {
    const { headless = true, viewport = { width: 1280, height: 720 } } = options;

    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext({
      viewport,
      recordVideo: headless ? undefined : { dir: join(this.outputDir, 'videos') }
    });
    this.page = await this.context.newPage();

    await mkdir(this.outputDir, { recursive: true });
  }

  async navigate(url: string): Promise<Page> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    await this.page.goto(url, { waitUntil: 'networkidle' });

    this.session = {
      id: generateId(),
      url,
      startTime: Date.now(),
      steps: [],
      screenshots: []
    };

    return this.page;
  }

  async screenshot(options: ScreenshotOptions = {}): Promise<Screenshot> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    const id = generateId();
    const filename = `${options.name || 'screenshot'}-${id}.png`;
    const path = join(this.outputDir, filename);

    await this.page.screenshot({
      path,
      clip: options.clip,
      fullPage: options.fullPage,
      omitBackground: options.omitBackground
    });

    const screenshot: Screenshot = {
      id,
      path,
      type: options.name ? 'manual' : 'auto',
      metadata: {
        width: options.clip?.width || this.page.viewportSize()?.width || 0,
        height: options.clip?.height || this.page.viewportSize()?.height || 0,
        timestamp: Date.now()
      }
    };

    if (this.session) {
      this.session.screenshots.push(screenshot);
    }

    return screenshot;
  }

  async click(selector: string, options?: { position?: { x: number; y: number }; button?: 'left' | 'right' | 'middle' }): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    await this.recordStep('click', selector, undefined, async () => {
      await this.page!.click(selector, options);
    });
  }

  async fill(selector: string, value: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    await this.recordStep('fill', selector, value, async () => {
      await this.page!.fill(selector, value);
    });
  }

  async press(key: string, options?: { modifiers?: string[] }): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    const modifiers = options?.modifiers || [];
    await this.recordStep('press', undefined, key, async () => {
      await this.page!.keyboard.press(modifiers.join('+') + (modifiers.length ? '+' : '') + key);
    });
  }

  async hover(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    await this.recordStep('hover', selector, undefined, async () => {
      await this.page!.hover(selector);
    });
  }

  async waitForSelector(selector: string, options?: { timeout?: number }): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.waitForSelector(selector, { timeout: options?.timeout || 30000 });
  }

  async waitForTimeout(ms: number): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.waitForTimeout(ms);
  }

  async executeScript<T>(script: string): Promise<T> {
    if (!this.page) throw new Error('Browser not launched');

    return await this.page.evaluate(script);
  }

  getCanvasInfo(): Promise<Array<{ selector: string; width: number; height: number; x: number; y: number }>> {
    return this.executeScript(`
      Array.from(document.querySelectorAll('canvas')).map((canvas, i) => {
        const rect = canvas.getBoundingClientRect();
        return {
          selector: 'canvas >> nth=' + i,
          width: canvas.width,
          height: canvas.height,
          x: rect.x,
          y: rect.y
        };
      })
    `);
  }

  getPage(): Page {
    if (!this.page) throw new Error('Browser not launched');
    return this.page;
  }

  getSession(): TestSession | null {
    return this.session;
  }

  async close(): Promise<void> {
    if (this.session) {
      this.session.endTime = Date.now();
    }
    await this.context?.close();
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  private async recordStep(type: TestStep['type'], target?: string, value?: string, action?: () => Promise<void>): Promise<void> {
    if (!this.session) return;

    const screenshotBefore = await this.screenshot({ name: `step-${this.session.steps.length}-before` });

    const step: TestStep = {
      id: generateId(),
      type,
      target,
      value,
      screenshotBefore: screenshotBefore.path,
      timestamp: Date.now()
    };

    if (action) {
      const startTime = Date.now();
      await action();
      step.duration = Date.now() - startTime;
    }

    step.screenshotAfter = (await this.screenshot({ name: `step-${this.session.steps.length}-after` })).path;

    this.session.steps.push(step);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
```

**Step 4: 运行测试（应通过）**

```bash
npm run build
node --test dist/browser/controller.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/browser/
git commit -m "feat(core): implement BrowserController"
```

---

## Task 4: 实现图像对比模块

**Files:**
- Create: `packages/core/src/compare/pixelmatch.ts`
- Create: `packages/core/src/compare/index.ts`
- Test: `packages/core/src/compare/pixelmatch.test.ts`

**Step 1: 创建测试文件**

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compareImages, setBaseline } from './pixelmatch.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const TEST_DIR = './test-output';

describe('Image Comparison', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should detect identical images', async () => {
    // Create two identical 100x100 red images
    const png = new PNG({ width: 100, height: 100 });
    png.data.fill(255, 0, 100 * 100 * 4); // Fill red

    const img1Path = join(TEST_DIR, 'img1.png');
    const img2Path = join(TEST_DIR, 'img2.png');

    writeFileSync(img1Path, PNG.sync.write(png));
    writeFileSync(img2Path, PNG.sync.write(png));

    const result = await compareImages(img1Path, img2Path, { threshold: 0.1 });

    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.matchScore, 1);
  });

  it('should detect different images', async () => {
    const png1 = new PNG({ width: 100, height: 100 });
    png1.data.fill(255, 0, 100 * 100 * 4); // Red

    const png2 = new PNG({ width: 100, height: 100 });
    png2.data.fill(0, 0, 100 * 100 * 4); // Black

    const img1Path = join(TEST_DIR, 'red.png');
    const img2Path = join(TEST_DIR, 'black.png');

    writeFileSync(img1Path, PNG.sync.write(png1));
    writeFileSync(img2Path, PNG.sync.write(png2));

    const result = await compareImages(img1Path, img2Path, { threshold: 0.1 });

    assert.strictEqual(result.passed, false);
    assert.ok(result.matchScore < 1);
  });
});
```

**Step 2: 运行测试（应失败）**

```bash
npm run build
node --test dist/compare/pixelmatch.test.js
```

Expected: FAIL - "compareImages is not defined"

**Step 3: 实现图像对比模块**

```typescript
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { dirname, join, basename } from 'path';
import { VisualAssertion, CompareOptions } from '../types.js';

const BASELINE_DIR = join(process.cwd(), 'baselines');

export interface CompareResult {
  passed: boolean;
  matchScore: number;
  diffPath?: string;
  baselinePath: string;
  actualPath: string;
}

export async function compareImages(
  baselinePath: string,
  actualPath: string,
  options: CompareOptions = {}
): Promise<CompareResult> {
  const { threshold = 0.1, includeAA = false, alpha = 0.1 } = options;

  const img1 = PNG.sync.read(readFileSync(baselinePath));
  const img2 = PNG.sync.read(readFileSync(actualPath));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return {
      passed: false,
      matchScore: 0,
      baselinePath,
      actualPath
    };
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold, includeAA, alpha }
  );

  const totalPixels = width * height;
  const matchScore = 1 - diffPixels / totalPixels;
  const passed = matchScore >= (1 - threshold);

  const diffPath = join(
    dirname(actualPath),
    `diff-${basename(baselinePath, '.png')}-${basename(actualPath)}`
  );

  writeFileSync(diffPath, PNG.sync.write(diff));

  return {
    passed,
    matchScore,
    diffPath,
    baselinePath,
    actualPath
  };
}

export function setBaseline(name: string, screenshotPath: string, baselineDir: string = BASELINE_DIR): string {
  mkdirSync(baselineDir, { recursive: true });

  const baselinePath = join(baselineDir, `${name}.png`);
  copyFileSync(screenshotPath, baselinePath);

  return baselinePath;
}

export function getBaselinePath(name: string, baselineDir: string = BASELINE_DIR): string | null {
  const baselinePath = join(baselineDir, `${name}.png`);
  return existsSync(baselinePath) ? baselinePath : null;
}
```

**Step 4: 创建index.ts导出**

```typescript
export { compareImages, setBaseline, getBaselinePath } from './pixelmatch.js';
export type { CompareResult } from './pixelmatch.js';
```

**Step 5: 运行测试（应通过）**

```bash
npm run build
node --test dist/compare/pixelmatch.test.js
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/src/compare/
git commit -m "feat(core): implement image comparison with pixelmatch"
```

---

## Task 5: 实现Core包入口

**Files:**
- Create: `packages/core/src/index.ts`

**Step 1: 创建入口文件**

```typescript
export { BrowserController } from './browser/controller.js';
export { compareImages, setBaseline, getBaselinePath } from './compare/index.js';
export type { CompareResult } from './compare/pixelmatch.js';
export type {
  TestSession,
  TestStep,
  Screenshot,
  VisualAssertion,
  ScreenshotOptions,
  VideoOptions,
  CompareOptions,
  BrowserOptions
} from './types.js';
```

**Step 2: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): add package entry point"
```

---

## Task 6: 创建MCP Server包

**Files:**
- Create: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/tsconfig.json`
- Create: `packages/mcp-server/src/server.ts`

**Step 1: 创建packages/mcp-server/package.json**

```json
{
  "name": "@chromemcp/mcp-server",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "chromemcp-server": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@chromemcp/core": "file:../core",
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

**Step 2: 创建packages/mcp-server/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../core" }]
}
```

**Step 3: 创建MCP Server主文件**

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BrowserController, compareImages, setBaseline, ScreenshotOptions } from '@chromemcp/core';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const controller = new BrowserController();

const server = new Server(
  {
    name: 'chromemcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ========== Tools ==========

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'browse',
        description: 'Launch browser and navigate to URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' },
            headless: { type: 'boolean', description: 'Run in headless mode' },
            viewport: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' }
              }
            }
          },
          required: ['url']
        }
      },
      {
        name: 'close_browser',
        description: 'Close the browser',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the screenshot' },
            clip: {
              type: 'object',
              description: 'Clip region',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' }
              }
            },
            fullPage: { type: 'boolean' }
          }
        }
      },
      {
        name: 'click',
        description: 'Click on an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' }
          },
          required: ['selector']
        }
      },
      {
        name: 'fill',
        description: 'Fill an input field',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            value: { type: 'string' }
          },
          required: ['selector', 'value']
        }
      },
      {
        name: 'press',
        description: 'Press a key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key to press (e.g., Enter, Space, ArrowUp)' }
          },
          required: ['key']
        }
      },
      {
        name: 'hover',
        description: 'Hover over an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string' }
          },
          required: ['selector']
        }
      },
      {
        name: 'wait_for_selector',
        description: 'Wait for an element to appear',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' }
          },
          required: ['selector']
        }
      },
      {
        name: 'wait_for_timeout',
        description: 'Wait for a specified time',
        inputSchema: {
          type: 'object',
          properties: {
            ms: { type: 'number', description: 'Milliseconds to wait' }
          },
          required: ['ms']
        }
      },
      {
        name: 'get_canvas_info',
        description: 'Get information about all canvas elements',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'execute_script',
        description: 'Execute JavaScript in the browser',
        inputSchema: {
          type: 'object',
          properties: {
            script: { type: 'string', description: 'JavaScript code to execute' }
          },
          required: ['script']
        }
      },
      {
        name: 'compare_screenshots',
        description: 'Compare two screenshots',
        inputSchema: {
          type: 'object',
          properties: {
            baseline: { type: 'string', description: 'Baseline image path or name' },
            actual: { type: 'string', description: 'Actual image path or name' },
            threshold: { type: 'number', description: 'Difference threshold (0-1)', default: 0.1 }
          },
          required: ['baseline', 'actual']
        }
      },
      {
        name: 'set_baseline',
        description: 'Set a screenshot as baseline',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Baseline name' },
            screenshotPath: { type: 'string', description: 'Path to screenshot' }
          },
          required: ['name', 'screenshotPath']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'browse': {
        const { url, headless = true, viewport } = args as { url: string; headless?: boolean; viewport?: { width: number; height: number } };
        await controller.launch({ headless, viewport });
        await controller.navigate(url);
        const session = controller.getSession();
        return {
          content: [{ type: 'text', text: `Navigated to ${url}. Session ID: ${session?.id}` }]
        };
      }

      case 'close_browser': {
        await controller.close();
        return {
          content: [{ type: 'text', text: 'Browser closed' }]
        };
      }

      case 'screenshot': {
        const screenshot = await controller.screenshot(args as ScreenshotOptions);
        return {
          content: [
            { type: 'text', text: `Screenshot saved: ${screenshot.path}` },
            { type: 'image', data: readFileSync(screenshot.path).toString('base64'), mimeType: 'image/png' }
          ]
        };
      }

      case 'click': {
        const { selector } = args as { selector: string };
        await controller.click(selector);
        return {
          content: [{ type: 'text', text: `Clicked ${selector}` }]
        };
      }

      case 'fill': {
        const { selector, value } = args as { selector: string; value: string };
        await controller.fill(selector, value);
        return {
          content: [{ type: 'text', text: `Filled ${selector} with "${value}"` }]
        };
      }

      case 'press': {
        const { key } = args as { key: string };
        await controller.press(key);
        return {
          content: [{ type: 'text', text: `Pressed ${key}` }]
        };
      }

      case 'hover': {
        const { selector } = args as { selector: string };
        await controller.hover(selector);
        return {
          content: [{ type: 'text', text: `Hovered ${selector}` }]
        };
      }

      case 'wait_for_selector': {
        const { selector, timeout } = args as { selector: string; timeout?: number };
        await controller.waitForSelector(selector, { timeout });
        return {
          content: [{ type: 'text', text: `Element ${selector} appeared` }]
        };
      }

      case 'wait_for_timeout': {
        const { ms } = args as { ms: number };
        await controller.waitForTimeout(ms);
        return {
          content: [{ type: 'text', text: `Waited ${ms}ms` }]
        };
      }

      case 'get_canvas_info': {
        const info = await controller.getCanvasInfo();
        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
        };
      }

      case 'execute_script': {
        const { script } = args as { script: string };
        const result = await controller.executeScript(script);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }

      case 'compare_screenshots': {
        const { baseline, actual, threshold = 0.1 } = args as { baseline: string; actual: string; threshold?: number };
        const result = await compareImages(baseline, actual, { threshold });
        return {
          content: [
            { type: 'text', text: `Match score: ${result.matchScore.toFixed(4)}\nPassed: ${result.passed}` },
            ...(result.diffPath ? [{ type: 'image', data: readFileSync(result.diffPath).toString('base64'), mimeType: 'image/png' }] : [])
          ]
        };
      }

      case 'set_baseline': {
        const { name, screenshotPath } = args as { name: string; screenshotPath: string };
        const baselinePath = setBaseline(name, screenshotPath);
        return {
          content: [{ type: 'text', text: `Baseline set: ${baselinePath}` }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true
    };
  }
});

// ========== Resources ==========

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const session = controller.getSession();
  if (!session) {
    return { resources: [] };
  }

  return {
    resources: [
      {
        uri: `resource://sessions/${session.id}/screenshots`,
        name: 'Session Screenshots',
        mimeType: 'application/json'
      },
      {
        uri: `resource://sessions/${session.id}/steps`,
        name: 'Session Steps',
        mimeType: 'application/json'
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const session = controller.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  if (uri === `resource://sessions/${session.id}/screenshots`) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(session.screenshots, null, 2)
      }]
    };
  }

  if (uri === `resource://sessions/${session.id}/steps`) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(session.steps, null, 2)
      }]
    };
  }

  // Handle screenshot image resources
  const screenshotMatch = uri.match(/resource:\/\/screenshots\/([^/]+)\/(.+)/);
  if (screenshotMatch) {
    const [, sessionId, screenshotId] = screenshotMatch;
    const screenshot = session.screenshots.find(s => s.id === screenshotId);
    if (screenshot && existsSync(screenshot.path)) {
      const data = readFileSync(screenshot.path).toString('base64');
      return {
        contents: [{
          uri,
          mimeType: 'image/png',
          blob: data
        }]
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

// ========== Prompts ==========

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'visual-testing-guide',
        description: 'Guide for visual testing best practices'
      },
      {
        name: 'game-testing-workflow',
        description: 'Workflow for testing HTML games'
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'visual-testing-guide') {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `# Visual Testing Guide

## Best Practices

1. **Take screenshots at consistent viewport sizes**
2. **Wait for animations to complete before capturing**
3. **Use meaningful names for screenshots**
4. **Set baselines from known good states**
5. **Review diff images carefully when tests fail**

## Workflow

1. Navigate to page
2. Interact with elements
3. Take screenshots at key states
4. Compare against baselines
5. Update baselines if changes are intentional
`
        }
      }]
    };
  }

  if (name === 'game-testing-workflow') {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `# HTML Game Testing Workflow

## Steps

1. **Load the game**: Use browse() to navigate to game URL
2. **Wait for canvas**: Use get_canvas_info() to verify game loaded
3. **Record initial state**: Take screenshot before interaction
4. **Simulate input**: Use press() or click() for game controls
5. **Wait for animation**: Use wait_for_timeout() for transitions
6. **Capture result**: Take screenshot of outcome
7. **Compare**: Use compare_screenshots() against expected state

## Tips

- Canvas games may need custom selectors
- Frame timing is critical, use appropriate waits
- Record videos for complex sequences
`
        }
      }]
    };
  }

  throw new Error(`Prompt not found: ${name}`);
});

// ========== Start Server ==========

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ChromeMCP Server running on stdio');
}

main().catch(console.error);
```

**Step 4: Commit**

```bash
git add packages/mcp-server/
git commit -m "feat(mcp-server): implement MCP server with tools, resources, and prompts"
```

---

## Task 7: 创建CLI包

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`

**Step 1: 创建packages/cli/package.json**

```json
{
  "name": "@chromemcp/cli",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "bin": {
    "chromemcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@chromemcp/core": "file:../core",
    "@chromemcp/mcp-server": "file:../mcp-server",
    "commander": "^11.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

**Step 2: 创建packages/cli/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: 创建CLI入口**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const program = new Command();

program
  .name('chromemcp')
  .description('ChromeMCP - Playwright + MCP based web testing framework')
  .version('0.1.0');

program
  .command('dev')
  .description('Start development mode with MCP server')
  .argument('<url>', 'URL to navigate to')
  .option('-p, --port <port>', 'MCP server port', '3000')
  .option('--headless', 'Run in headless mode', false)
  .option('--viewport <viewport>', 'Viewport size (e.g., 1280x720)', '1280x720')
  .action(async (url, options) => {
    console.log(`Starting dev mode for ${url}`);
    console.log(`Viewport: ${options.viewport}`);
    console.log(`Headless: ${options.headless}`);
    console.log('\nMCP Server starting...');
    console.log('Connect Claude Code to this server to begin testing.\n');

    // Start MCP server
    const serverPath = join(__dirname, '../../mcp-server/dist/index.js');
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    server.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    server.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
    });
  });

program
  .command('record')
  .description('Record browser interactions')
  .argument('<url>', 'URL to navigate to')
  .option('-o, --output <dir>', 'Output directory', './traces')
  .option('-n, --name <name>', 'Session name')
  .action(async (url, options) => {
    console.log(`Recording session for ${url}`);
    console.log(`Output: ${options.output}`);
    console.log('Feature coming soon: interactive recording mode');
  });

program
  .command('test')
  .description('Run tests from trace or URL')
  .argument('<target>', 'Trace file or URL')
  .option('--baseline <dir>', 'Baseline directory', './baselines')
  .option('--update', 'Update baselines', false)
  .option('--headed', 'Show browser window', false)
  .action(async (target, options) => {
    console.log(`Running tests for ${target}`);
    console.log(`Baseline: ${options.baseline}`);
    console.log(`Update: ${options.update}`);
    console.log('Feature coming soon: automated test execution');
  });

program
  .command('compare')
  .description('Compare two images')
  .argument('<img1>', 'First image')
  .argument('<img2>', 'Second image')
  .option('-t, --threshold <n>', 'Difference threshold', '0.1')
  .option('-o, --output <path>', 'Diff output path')
  .action(async (img1, img2, options) => {
    console.log(`Comparing ${img1} and ${img2}`);
    console.log(`Threshold: ${options.threshold}`);
    console.log('Feature coming soon: image comparison');
  });

program
  .command('mcp')
  .description('Start MCP server')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('--stdio', 'Use stdio transport')
  .action(async (options) => {
    console.log('Starting MCP server...');

    const serverPath = join(__dirname, '../../mcp-server/dist/index.js');
    const server = spawn('node', [serverPath], {
      stdio: options.stdio ? 'inherit' : ['pipe', 'pipe', 'pipe']
    });

    if (!options.stdio) {
      server.stdout.on('data', (data) => {
        console.log(data.toString());
      });

      server.stderr.on('data', (data) => {
        console.error(data.toString());
      });
    }

    server.on('close', (code) => {
      process.exit(code || 0);
    });
  });

program.parse();
```

**Step 4: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): add CLI with dev, record, test, compare, mcp commands"
```

---

## Task 8: 创建根级构建配置

**Files:**
- Modify: `package.json`
- Create: `.npmrc`

**Step 1: 更新根package.json添加workspace配置**

```json
{
  "name": "chromemcp",
  "version": "0.1.0",
  "private": true,
  "description": "Playwright + MCP based web testing framework",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "clean": "rm -rf packages/*/dist packages/*/node_modules node_modules"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 2: 创建.npmrc**

```
workspace-concurrency=4
```

**Step 3: 安装依赖并构建**

```bash
npm install
npm run build
```

Expected: 构建成功，无错误

**Step 4: Commit**

```bash
git add package.json .npmrc
git commit -m "chore: add workspace build configuration"
```

---

## Task 9: 添加Playwright安装步骤

**Files:**
- Create: `scripts/install-browsers.js`

**Step 1: 创建浏览器安装脚本**

```javascript
#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Installing Playwright browsers...');

try {
  execSync('npx playwright install chromium', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('Browsers installed successfully!');
} catch (error) {
  console.error('Failed to install browsers:', error);
  process.exit(1);
}
```

**Step 2: 更新根package.json添加postinstall**

```json
{
  "scripts": {
    "postinstall": "node scripts/install-browsers.js",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "clean": "rm -rf packages/*/dist packages/*/node_modules node_modules"
  }
}
```

**Step 3: Commit**

```bash
git add scripts/ package.json
git commit -m "chore: add Playwright browser installation script"
```

---

## Task 10: 验证完整安装

**Step 1: 清理并重新安装**

```bash
npm run clean
npm install
```

Expected: 安装成功，Playwright browsers自动安装

**Step 2: 构建所有包**

```bash
npm run build
```

Expected: 三个包都构建成功

**Step 3: 运行测试**

```bash
npm test
```

Expected: Core包测试通过

**Step 4: 验证CLI**

```bash
node packages/cli/dist/index.js --help
```

Expected: 显示帮助信息

**Step 5: 最终Commit**

```bash
git add -A
git commit -m "chore: verify complete installation"
```

---

## 实施计划总结

| 任务 | 描述 | 预估时间 |
|------|------|----------|
| 1 | 初始化Monorepo | 5分钟 |
| 2 | Core包 - 类型定义 | 5分钟 |
| 3 | Core包 - BrowserController | 10分钟 |
| 4 | Core包 - 图像对比 | 10分钟 |
| 5 | Core包 - 入口 | 2分钟 |
| 6 | MCP Server包 | 15分钟 |
| 7 | CLI包 | 10分钟 |
| 8 | 根级构建配置 | 5分钟 |
| 9 | Playwright浏览器安装 | 5分钟 |
| 10 | 验证完整安装 | 5分钟 |

**总计: ~72分钟**

---

## 执行说明

使用 `superpowers:executing-plans` skill 执行此计划，或在本会话中使用 `superpowers:subagent-driven-development` skill 逐个任务执行。
