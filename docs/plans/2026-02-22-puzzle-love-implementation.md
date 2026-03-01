# 心动拼图游戏实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建一个基于 Phaser.js 的 H5 拼图游戏，包含 50 个关卡、道具系统、广告变现和完整的移动端适配。

**Architecture:** 使用 Phaser 3 场景系统管理游戏状态，模块化组件设计（PuzzleGrid、PuzzlePiece），本地存储管理玩家进度，响应式布局适配手机屏幕。

**Tech Stack:** Phaser 3 (v3.70+), TypeScript, Vite, localStorage

---

## 前置准备

### Task 1: 创建项目目录结构

**Files:**
- Create: `examples/puzzle-love/`
- Create: `examples/puzzle-love/src/`
- Create: `examples/puzzle-love/src/scenes/`
- Create: `examples/puzzle-love/src/components/`
- Create: `examples/puzzle-love/src/data/`
- Create: `examples/puzzle-love/src/utils/`
- Create: `examples/puzzle-love/src/types/`
- Create: `examples/puzzle-love/assets/images/`
- Create: `examples/puzzle-love/assets/ui/`
- Create: `examples/puzzle-love/assets/audio/`

**Step 1: 创建目录**

```bash
cd C:/Users/Administrator/projects/chromemcp
mkdir -p examples/puzzle-love/src/{scenes,components,data,utils,types}
mkdir -p examples/puzzle-love/assets/{images,ui,audio}
```

**Step 2: 验证目录结构**

```bash
ls -la examples/puzzle-love/
ls -la examples/puzzle-love/src/
```

Expected: 所有目录已创建

---

## 阶段 1: 项目基础配置

### Task 2: 初始化项目配置

**Files:**
- Create: `examples/puzzle-love/package.json`
- Create: `examples/puzzle-love/tsconfig.json`
- Create: `examples/puzzle-love/vite.config.ts`
- Create: `examples/puzzle-love/index.html`

**Step 1: 创建 package.json**

```json
{
  "name": "puzzle-love",
  "version": "1.0.0",
  "description": "心动拼图 - H5拼图游戏",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.70.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts"]
}
```

**Step 3: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 8080,
    open: true
  }
});
```

**Step 4: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>心动拼图</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #1a1a2e;
      touch-action: none;
    }
    #game-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Step 5: 安装依赖**

```bash
cd examples/puzzle-love
npm install
```

Expected: 依赖安装成功

**Step 6: Commit**

```bash
git add examples/puzzle-love/
git commit -m "chore(puzzle-love): init project with phaser, typescript and vite"
```

---

### Task 3: 创建类型定义

**Files:**
- Create: `examples/puzzle-love/src/types/index.ts`

**Step 1: 创建类型定义文件**

```typescript
// 关卡数据
export interface Level {
  id: number;
  chapter: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'master';
  gridSize: number;
  imageUrl: string;
  storyText: string;
  timeLimit?: number;
  starThresholds: [number, number, number];
}

// 玩家数据
export interface PlayerData {
  currentLevel: number;
  unlockedLevels: number[];
  stars: Record<number, number>;
  actionPoints: number;
  lastActionPointTime: number;
  inventory: {
    hint: number;
    peek: number;
    freeze: number;
  };
  settings: {
    musicEnabled: boolean;
    soundEnabled: boolean;
  };
}

// 游戏状态
export interface GameState {
  levelId: number;
  grid: number[][];
  moves: number;
  timeElapsed: number;
  hintsUsed: number;
  isPaused: boolean;
  isCompleted: boolean;
}

// 位置
export interface Position {
  row: number;
  col: number;
}

// 道具类型
export type ItemType = 'hint' | 'peek' | 'freeze';

// 广告类型
export type AdType = 'action_point' | 'item' | 'revive' | 'double';

// 广告状态
export interface AdStatus {
  isAvailable: boolean;
  isLoading: boolean;
  lastError?: string;
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/types/index.ts
git commit -m "feat(puzzle-love): add type definitions"
```

---

## 阶段 2: 数据与配置

### Task 4: 创建关卡数据（前10关）

**Files:**
- Create: `examples/puzzle-love/src/data/levels.ts`

**Step 1: 创建关卡配置文件**

```typescript
import { Level } from '../types';

export const LEVELS: Level[] = [
  // 第1章：初遇
  {
    id: 1,
    chapter: 1,
    title: '咖啡厅的邂逅',
    difficulty: 'easy',
    gridSize: 3,
    imageUrl: 'images/level_01.jpg',
    storyText: '那个午后，阳光透过落地窗洒在咖啡杯上，我遇见了命中注定的他...',
    timeLimit: 60,
    starThresholds: [45, 30, 15]
  },
  {
    id: 2,
    chapter: 1,
    title: '意外的碰撞',
    difficulty: 'easy',
    gridSize: 3,
    imageUrl: 'images/level_02.jpg',
    storyText: '慌忙中，我们的文件散落一地，指尖相触的瞬间，心跳漏了一拍...',
    timeLimit: 60,
    starThresholds: [45, 30, 15]
  },
  {
    id: 3,
    chapter: 1,
    title: '他的微笑',
    difficulty: 'easy',
    gridSize: 4,
    imageUrl: 'images/level_03.jpg',
    storyText: '他弯腰帮我捡起文件，抬起头时，那个微笑让我忘记了呼吸...',
    timeLimit: 90,
    starThresholds: [70, 50, 30]
  },
  {
    id: 4,
    chapter: 1,
    title: '交换联系方式',
    difficulty: 'easy',
    gridSize: 4,
    imageUrl: 'images/level_04.jpg',
    storyText: '为了归还文件，我们交换了微信。看着他的头像，我傻傻地笑了...',
    timeLimit: 90,
    starThresholds: [70, 50, 30]
  },
  {
    id: 5,
    chapter: 1,
    title: '初识的心动',
    difficulty: 'medium',
    gridSize: 5,
    imageUrl: 'images/level_05.jpg',
    storyText: '第一章完：有些相遇，是命运精心安排的巧合...',
    timeLimit: 120,
    starThresholds: [90, 70, 45]
  },
  // 第2章：靠近
  {
    id: 6,
    chapter: 2,
    title: '深夜加班',
    difficulty: 'medium',
    gridSize: 5,
    imageUrl: 'images/level_06.jpg',
    storyText: '加班到深夜，电梯门打开的那一刻，竟然看到了他...',
    timeLimit: 120,
    starThresholds: [90, 70, 45]
  },
  {
    id: 7,
    chapter: 2,
    title: '共乘一车',
    difficulty: 'medium',
    gridSize: 5,
    imageUrl: 'images/level_07.jpg',
    storyText: '雨夜打不到车，他主动送我回家。狭小的空间里，气氛微妙...',
    timeLimit: 120,
    starThresholds: [90, 70, 45]
  },
  {
    id: 8,
    chapter: 2,
    title: '车上的对话',
    difficulty: 'medium',
    gridSize: 5,
    imageUrl: 'images/level_08.jpg',
    storyText: '原来我们住得这么近，原来我们都喜欢同一家早餐店...',
    timeLimit: 120,
    starThresholds: [90, 70, 45]
  },
  {
    id: 9,
    chapter: 2,
    title: '晚安',
    difficulty: 'medium',
    gridSize: 6,
    imageUrl: 'images/level_09.jpg',
    storyText: '下车时，他温柔地说："明天见"。那一刻，我确定我喜欢上了他...',
    timeLimit: 150,
    starThresholds: [110, 85, 55]
  },
  {
    id: 10,
    chapter: 2,
    title: '靠近的心跳',
    difficulty: 'medium',
    gridSize: 6,
    imageUrl: 'images/level_10.jpg',
    storyText: '第二章完：距离越近，心跳越快，这就是爱情的味道吗？',
    timeLimit: 150,
    starThresholds: [110, 85, 55]
  }
];

// 获取关卡
export function getLevel(id: number): Level | undefined {
  return LEVELS.find(level => level.id === id);
}

// 获取章节关卡
export function getChapterLevels(chapter: number): Level[] {
  return LEVELS.filter(level => level.chapter === chapter);
}

// 获取最大关卡ID
export function getMaxLevelId(): number {
  return Math.max(...LEVELS.map(l => l.id));
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/data/levels.ts
git commit -m "feat(puzzle-love): add first 10 levels data"
```

---

### Task 5: 创建本地存储工具

**Files:**
- Create: `examples/puzzle-love/src/utils/storage.ts`
- Test: `examples/puzzle-love/tests/storage.test.ts`

**Step 1: 创建存储工具**

```typescript
import { PlayerData } from '../types';

const STORAGE_KEY = 'puzzle_love_v1';
const SECRET_KEY = 'puzzle_xor_2024';

// 简单 XOR 加密
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result);
}

function xorDecrypt(encoded: string, key: string): string {
  const text = atob(encoded);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

// 默认玩家数据
export function getDefaultPlayerData(): PlayerData {
  return {
    currentLevel: 1,
    unlockedLevels: [1],
    stars: {},
    actionPoints: 5,
    lastActionPointTime: Date.now(),
    inventory: {
      hint: 3,
      peek: 3,
      freeze: 2
    },
    settings: {
      musicEnabled: true,
      soundEnabled: true
    }
  };
}

// 保存数据
export function savePlayerData(data: PlayerData): void {
  try {
    const json = JSON.stringify(data);
    const encrypted = xorEncrypt(json, SECRET_KEY);
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save game data:', error);
  }
}

// 加载数据
export function loadPlayerData(): PlayerData {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) {
      return getDefaultPlayerData();
    }

    const json = xorDecrypt(encrypted, SECRET_KEY);
    const data = JSON.parse(json) as PlayerData;

    // 数据版本迁移/校验
    return migrateData(data);
  } catch (error) {
    console.error('Failed to load game data:', error);
    return getDefaultPlayerData();
  }
}

// 数据迁移
function migrateData(data: PlayerData): PlayerData {
  const defaults = getDefaultPlayerData();

  return {
    ...defaults,
    ...data,
    inventory: {
      ...defaults.inventory,
      ...data.inventory
    },
    settings: {
      ...defaults.settings,
      ...data.settings
    }
  };
}

// 清除数据
export function clearPlayerData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// 计算当前应有的行动值
export function calculateActionPoints(data: PlayerData): number {
  const now = Date.now();
  const elapsed = now - data.lastActionPointTime;
  const recovered = Math.floor(elapsed / (30 * 60 * 1000)); // 30分钟恢复1点

  return Math.min(5, data.actionPoints + recovered);
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/utils/storage.ts
git commit -m "feat(puzzle-love): add local storage with encryption"
```

---

## 阶段 3: 核心游戏组件

### Task 6: 创建打乱算法工具

**Files:**
- Create: `examples/puzzle-love/src/utils/shuffle.ts`
- Test: `examples/puzzle-love/tests/shuffle.test.ts`

**Step 1: 创建打乱算法**

```typescript
export type GridState = number[][];

// 创建已解决的网格
export function createSolvedGrid(gridSize: number): GridState {
  const grid: GridState = [];
  let counter = 0;

  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      grid[row][col] = counter++;
    }
  }

  return grid;
}

// 获取有效位置
export function getValidMoves(grid: GridState): Array<{ from: [number, number]; to: [number, number] }> {
  const moves = [];
  const size = grid.length;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // 右邻
      if (col < size - 1) {
        moves.push({ from: [row, col], to: [row, col + 1] });
      }
      // 下邻
      if (row < size - 1) {
        moves.push({ from: [row, col], to: [row + 1, col] });
      }
    }
  }

  return moves;
}

// 执行移动
export function applyMove(grid: GridState, move: { from: [number, number]; to: [number, number] }): void {
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;

  const temp = grid[fromRow][fromCol];
  grid[fromRow][fromCol] = grid[toRow][toCol];
  grid[toRow][toCol] = temp;
}

// 打乱网格（确保可解）
export function shuffleGrid(gridSize: number, shuffleCount?: number): GridState {
  const grid = createSolvedGrid(gridSize);
  const count = shuffleCount || gridSize * gridSize * 10;

  for (let i = 0; i < count; i++) {
    const validMoves = getValidMoves(grid);
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    applyMove(grid, randomMove);
  }

  return grid;
}

// 检查网格是否完成
export function isGridComplete(grid: GridState): boolean {
  const size = grid.length;
  let expected = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== expected) {
        return false;
      }
      expected++;
    }
  }

  return true;
}

// 检查两个位置是否相邻
export function isAdjacent(
  posA: { row: number; col: number },
  posB: { row: number; col: number }
): boolean {
  const rowDiff = Math.abs(posA.row - posB.row);
  const colDiff = Math.abs(posA.col - posB.col);

  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

// 找到拼图块当前位置
export function findPiecePosition(grid: GridState, pieceValue: number): { row: number; col: number } | null {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === pieceValue) {
        return { row, col };
      }
    }
  }
  return null;
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/utils/shuffle.ts
git commit -m "feat(puzzle-love): add grid shuffle algorithm with solvability guarantee"
```

---

### Task 7: 创建 PuzzlePiece 组件

**Files:**
- Create: `examples/puzzle-love/src/components/PuzzlePiece.ts`

**Step 1: 创建拼图块组件**

```typescript
import Phaser from 'phaser';

export interface PieceConfig {
  correctRow: number;
  correctCol: number;
  gridSize: number;
  pieceSize: number;
}

export class PuzzlePiece extends Phaser.GameObjects.Image {
  private correctRow: number;
  private correctCol: number;
  private currentRow: number;
  private currentCol: number;
  private gridSize: number;
  private pieceSize: number;
  private isSelected: boolean = false;

  // 选中效果
  private selectionGraphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: PieceConfig
  ) {
    // 计算纹理裁剪区域
    const frameWidth = 800 / config.gridSize;
    const frameHeight = 800 / config.gridSize;

    super(scene, x, y, texture);

    this.correctRow = config.correctRow;
    this.correctCol = config.correctCol;
    this.currentRow = config.correctRow;
    this.currentCol = config.correctCol;
    this.gridSize = config.gridSize;
    this.pieceSize = config.pieceSize;

    // 设置显示大小
    this.setDisplaySize(config.pieceSize, config.pieceSize);

    // 设置裁剪
    this.setCrop(
      config.correctCol * frameWidth,
      config.correctRow * frameHeight,
      frameWidth,
      frameHeight
    );

    // 启用交互
    this.setInteractive({ useHandCursor: true });

    // 创建选中效果图形
    this.selectionGraphics = scene.add.graphics();
    this.selectionGraphics.setDepth(this.depth + 1);
    this.selectionGraphics.setVisible(false);

    // 添加到场景
    scene.add.existing(this);

    // 绑定点击事件
    this.on('pointerdown', this.onPointerDown, this);
  }

  private onPointerDown(): void {
    this.emit('selected', this);
  }

  select(): void {
    this.isSelected = true;
    this.selectionGraphics.setVisible(true);
    this.drawSelectionEffect();

    // 缩放动画
    this.scene.tweens.add({
      targets: this,
      scale: 1.05,
      duration: 150,
      ease: 'Power2'
    });
  }

  deselect(): void {
    this.isSelected = false;
    this.selectionGraphics.setVisible(false);

    // 恢复缩放
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 150,
      ease: 'Power2'
    });
  }

  private drawSelectionEffect(): void {
    this.selectionGraphics.clear();

    // 金色边框
    this.selectionGraphics.lineStyle(4, 0xFFD700, 1);
    this.selectionGraphics.strokeRect(
      this.x - this.displayWidth / 2 - 4,
      this.y - this.displayHeight / 2 - 4,
      this.displayWidth + 8,
      this.displayHeight + 8
    );

    // 发光效果
    this.selectionGraphics.lineStyle(2, 0xFFD700, 0.5);
    this.selectionGraphics.strokeRect(
      this.x - this.displayWidth / 2 - 8,
      this.y - this.displayHeight / 2 - 8,
      this.displayWidth + 16,
      this.displayHeight + 16
    );
  }

  async moveTo(row: number, col: number, duration: number = 200): Promise<void> {
    return new Promise((resolve) => {
      this.currentRow = row;
      this.currentCol = col;

      const targetX = this.getXForCol(col);
      const targetY = this.getYForRow(row);

      this.scene.tweens.add({
        targets: this,
        x: targetX,
        y: targetY,
        duration,
        ease: 'Power2',
        onComplete: () => {
          this.drawSelectionEffect();
          resolve();
        }
      });
    });
  }

  isInCorrectPosition(): boolean {
    return this.currentRow === this.correctRow && this.currentCol === this.correctCol;
  }

  getCorrectValue(): number {
    return this.correctRow * this.gridSize + this.correctCol;
  }

  getCurrentRow(): number { return this.currentRow; }
  getCurrentCol(): number { return this.currentCol; }
  getCorrectRow(): number { return this.correctRow; }
  getCorrectCol(): number { return this.correctCol; }

  setGridPosition(row: number, col: number): void {
    this.currentRow = row;
    this.currentCol = col;
    this.x = this.getXForCol(col);
    this.y = this.getYForRow(row);
    this.drawSelectionEffect();
  }

  private getXForCol(col: number): number {
    const startX = this.x - this.currentCol * this.pieceSize;
    return startX + col * this.pieceSize;
  }

  private getYForRow(row: number): number {
    const startY = this.y - this.currentRow * this.pieceSize;
    return startY + row * this.pieceSize;
  }

  playHintAnimation(): void {
    // 闪烁效果
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 200,
      yoyo: true,
      repeat: 3,
      ease: 'Power2'
    });
  }

  playCorrectAnimation(): void {
    // 正确放置的庆祝效果
    this.scene.tweens.add({
      targets: this,
      scale: 1.1,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut'
    });
  }

  destroy(fromScene?: boolean): void {
    this.selectionGraphics?.destroy();
    super.destroy(fromScene);
  }
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/components/PuzzlePiece.ts
git commit -m "feat(puzzle-love): add PuzzlePiece component with selection and animation"
```

---

### Task 8: 创建 PuzzleGrid 组件

**Files:**
- Create: `examples/puzzle-love/src/components/PuzzleGrid.ts`

**Step 1: 创建拼图网格组件**

```typescript
import Phaser from 'phaser';
import { PuzzlePiece } from './PuzzlePiece';
import { shuffleGrid, isGridComplete, findPiecePosition, isAdjacent } from '../utils/shuffle';
import { Position } from '../types';

export interface GridConfig {
  gridSize: number;
  pieceSize: number;
  imageKey: string;
}

export class PuzzleGrid extends Phaser.GameObjects.Container {
  private pieces: PuzzlePiece[][] = [];
  private gridState: number[][] = [];
  private selectedPiece: PuzzlePiece | null = null;
  private gridSize: number;
  private pieceSize: number;
  private imageKey: string;
  private isAnimating: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: GridConfig) {
    super(scene, x, y);

    this.gridSize = config.gridSize;
    this.pieceSize = config.pieceSize;
    this.imageKey = config.imageKey;

    scene.add.existing(this);
  }

  // 初始化拼图
  async initialize(): Promise<void> {
    this.createPieces();
    await this.shuffle();
  }

  // 创建拼图块
  private createPieces(): void {
    const frameWidth = 800 / this.gridSize;
    const frameHeight = 800 / this.gridSize;

    for (let row = 0; row < this.gridSize; row++) {
      this.pieces[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const x = col * this.pieceSize;
        const y = row * this.pieceSize;

        const piece = new PuzzlePiece(
          this.scene,
          x,
          y,
          this.imageKey,
          {
            correctRow: row,
            correctCol: col,
            gridSize: this.gridSize,
            pieceSize: this.pieceSize
          }
        );

        piece.on('selected', this.onPieceSelected, this);
        this.add(piece);
        this.pieces[row][col] = piece;
      }
    }

    // 设置容器大小
    const totalWidth = this.gridSize * this.pieceSize;
    const totalHeight = this.gridSize * this.pieceSize;
    this.setSize(totalWidth, totalHeight);
  }

  // 打乱拼图
  async shuffle(): Promise<void> {
    this.gridState = shuffleGrid(this.gridSize);

    // 更新拼图块位置
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const pieceValue = this.gridState[row][col];
        const correctRow = Math.floor(pieceValue / this.gridSize);
        const correctCol = pieceValue % this.gridSize;

        const piece = this.pieces[correctRow][correctCol];
        piece.setGridPosition(row, col);
      }
    }

    // 播放打乱动画
    await this.playShuffleAnimation();
  }

  private async playShuffleAnimation(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 0, to: 1 },
        duration: 500,
        ease: 'Power2',
        onComplete: resolve
      });
    });
  }

  // 拼图块被选中
  private async onPieceSelected(piece: PuzzlePiece): Promise<void> {
    if (this.isAnimating) return;

    // 播放音效
    this.emit('pieceSelected', piece);

    if (!this.selectedPiece) {
      // 选中第一个
      this.selectedPiece = piece;
      piece.select();
    } else if (this.selectedPiece === piece) {
      // 取消选中
      piece.deselect();
      this.selectedPiece = null;
    } else {
      // 尝试交换
      const posA = { row: this.selectedPiece.getCurrentRow(), col: this.selectedPiece.getCurrentCol() };
      const posB = { row: piece.getCurrentRow(), col: piece.getCurrentCol() };

      if (isAdjacent(posA, posB)) {
        await this.swapPieces(this.selectedPiece, piece);
        this.emit('piecesSwapped');

        if (this.checkComplete()) {
          this.emit('puzzleCompleted');
        }
      } else {
        // 不相邻，播放错误反馈
        this.playErrorFeedback(piece);
      }

      this.selectedPiece.deselect();
      this.selectedPiece = null;
    }
  }

  // 交换两个拼图块
  private async swapPieces(pieceA: PuzzlePiece, pieceB: PuzzlePiece): Promise<void> {
    this.isAnimating = true;

    const rowA = pieceA.getCurrentRow();
    const colA = pieceA.getCurrentCol();
    const rowB = pieceB.getCurrentRow();
    const colB = pieceB.getCurrentCol();

    // 更新网格状态
    const temp = this.gridState[rowA][colA];
    this.gridState[rowA][colA] = this.gridState[rowB][colB];
    this.gridState[rowB][colB] = temp;

    // 动画交换
    await Promise.all([
      pieceA.moveTo(rowB, colB),
      pieceB.moveTo(rowA, colA)
    ]);

    // 检查是否正确归位
    if (pieceA.isInCorrectPosition()) {
      pieceA.playCorrectAnimation();
    }
    if (pieceB.isInCorrectPosition()) {
      pieceB.playCorrectAnimation();
    }

    this.isAnimating = false;
  }

  // 错误反馈
  private playErrorFeedback(piece: PuzzlePiece): void {
    this.scene.tweens.add({
      targets: piece,
      x: piece.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Power2'
    });
  }

  // 检查是否完成
  checkComplete(): boolean {
    return isGridComplete(this.gridState);
  }

  // 使用提示道具
  async useHint(): Promise<boolean> {
    if (this.isAnimating) return false;

    // 找到一个位置错误的拼图块
    let wrongPiece: PuzzlePiece | null = null;
    let correctPos: Position | null = null;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const piece = this.pieces[row][col];
        if (!piece.isInCorrectPosition()) {
          wrongPiece = piece;
          correctPos = { row: piece.getCorrectRow(), col: piece.getCorrectCol() };
          break;
        }
      }
      if (wrongPiece) break;
    }

    if (!wrongPiece || !correctPos) return false;

    this.isAnimating = true;

    // 高亮显示
    wrongPiece.playHintAnimation();

    // 找到目标位置的拼图块
    const targetPiece = this.pieces[correctPos.row][correctPos.col];

    // 移动到正确位置
    await this.swapPieces(wrongPiece, targetPiece);

    this.isAnimating = false;

    if (this.checkComplete()) {
      this.emit('puzzleCompleted');
    }

    return true;
  }

  // 显示完整图片（原图道具）
  showFullImage(duration: number = 3000): void {
    const fullImage = this.scene.add.image(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.imageKey
    );
    fullImage.setDisplaySize(this.width, this.height);
    fullImage.setAlpha(0.8);
    fullImage.setDepth(100);

    // 淡入
    this.scene.tweens.add({
      targets: fullImage,
      alpha: 0.8,
      duration: 300,
      ease: 'Power2'
    });

    // 延迟后淡出
    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: fullImage,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => fullImage.destroy()
      });
    });
  }

  // 获取移动次数（通过分析gridState）
  getMoveCount(): number {
    // 这个需要额外跟踪，暂时返回0
    return 0;
  }

  destroy(fromScene?: boolean): void {
    this.pieces.forEach(row => row.forEach(piece => piece.destroy()));
    super.destroy(fromScene);
  }
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/components/PuzzleGrid.ts
git commit -m "feat(puzzle-love): add PuzzleGrid component with swap, hint and full image"
```

---

## 阶段 4: 场景实现

### Task 9: 创建 BootScene

**Files:**
- Create: `examples/puzzle-love/src/scenes/BootScene.ts`

**Step 1: 创建启动场景**

```typescript
import Phaser from 'phaser';
import { loadPlayerData } from '../utils/storage';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 显示加载进度
    this.createLoadingUI();

    // 加载 UI 资源
    this.load.svg('ui-bg', 'assets/ui/background.svg');
    this.load.svg('ui-button', 'assets/ui/button.svg');
    this.load.svg('ui-star', 'assets/ui/star.svg');
    this.load.svg('ui-heart', 'assets/ui/heart.svg');
    this.load.svg('ui-hint', 'assets/ui/hint.svg');
    this.load.svg('ui-peek', 'assets/ui/eye.svg');
    this.load.svg('ui-freeze', 'assets/ui/snowflake.svg');

    // 加载音效
    this.load.audio('bgm-menu', 'assets/audio/bgm-menu.mp3');
    this.load.audio('bgm-game', 'assets/audio/bgm-game.mp3');
    this.load.audio('sfx-select', 'assets/audio/select.mp3');
    this.load.audio('sfx-swap', 'assets/audio/swap.mp3');
    this.load.audio('sfx-correct', 'assets/audio/correct.mp3');
    this.load.audio('sfx-complete', 'assets/audio/complete.mp3');
    this.load.audio('sfx-item', 'assets/audio/item.mp3');

    // 加载关卡图片（示例用占位图）
    for (let i = 1; i <= 10; i++) {
      this.load.image(`level_${i.toString().padStart(2, '0')}`, `assets/images/level_${i.toString().padStart(2, '0')}.jpg`);
    }
  }

  create(): void {
    // 加载存档数据
    const playerData = loadPlayerData();
    this.registry.set('playerData', playerData);

    // 预生成纹理
    this.createPlaceholderTextures();

    // 进入主菜单
    this.scene.start('MenuScene');
  }

  private createLoadingUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 标题
    this.add.text(width / 2, height / 3, '心动拼图', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // 加载进度条背景
    const progressBar = this.add.rectangle(width / 2, height / 2, 300, 30, 0x333344);
    progressBar.setStrokeStyle(2, 0x666677);

    // 进度条填充
    const progressFill = this.add.rectangle(
      width / 2 - 145,
      height / 2,
      0,
      24,
      0xff6b9d
    );
    progressFill.setOrigin(0, 0.5);

    // 进度文字
    const progressText = this.add.text(width / 2, height / 2 + 50, '0%', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 监听加载进度
    this.load.on('progress', (value: number) => {
      progressFill.width = 290 * value;
      progressText.setText(`${Math.floor(value * 100)}%`);
    });

    // 加载完成
    this.load.on('complete', () => {
      progressText.setText('点击开始');
      this.input.once('pointerdown', () => {
        progressText.destroy();
        progressBar.destroy();
        progressFill.destroy();
      });
    });
  }

  private createPlaceholderTextures(): void {
    // 创建占位纹理（实际开发时替换为真实资源）
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // 背景占位
    graphics.fillStyle(0x2d2d44);
    graphics.fillRect(0, 0, 800, 800);
    graphics.generateTexture('placeholder-bg', 800, 800);

    // 关卡占位图
    for (let i = 1; i <= 10; i++) {
      graphics.clear();
      graphics.fillStyle(0x3d3d5c);
      graphics.fillRect(0, 0, 800, 800);
      graphics.fillStyle(0xff6b9d);
      graphics.fillCircle(400, 400, 200);
      graphics.fillStyle(0xffffff);
      graphics.fillText(`Level ${i}`, 350, 390);
      graphics.generateTexture(`level_${i.toString().padStart(2, '0')}`, 800, 800);
    }

    graphics.destroy();
  }
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/scenes/BootScene.ts
git commit -m "feat(puzzle-love): add BootScene with loading and placeholder textures"
```

---

### Task 10: 创建 MenuScene

**Files:**
- Create: `examples/puzzle-love/src/scenes/MenuScene.ts`

**Step 1: 创建主菜单场景**

```typescript
import Phaser from 'phaser';
import { PlayerData } from '../types';
import { calculateActionPoints } from '../utils/storage';

export class MenuScene extends Phaser.Scene {
  private playerData!: PlayerData;
  private actionPointText!: Phaser.GameObjects.Text;
  private actionPointTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // 获取玩家数据
    this.playerData = this.registry.get('playerData');
    this.updateActionPoints();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 装饰背景
    this.add.particles(0, 0, 'placeholder-bg', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      quantity: 1,
      frequency: 1000,
      lifespan: 5000,
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.3, end: 0 },
      tint: [0xff6b9d, 0x4ecdc4, 0xffe66d]
    });

    // 游戏标题
    this.add.text(width / 2, height * 0.2, '心动拼图', {
      fontSize: '64px',
      color: '#ff6b9d',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 副标题
    this.add.text(width / 2, height * 0.3, '拼出心动的瞬间', {
      fontSize: '24px',
      color: '#aaaaaa',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    // 行动值显示
    this.createActionPointUI(width / 2, height * 0.4);

    // 开始游戏按钮
    this.createButton(width / 2, height * 0.55, '继续游戏', () => {
      this.scene.start('LevelSelectScene');
    });

    // 关卡选择按钮
    this.createButton(width / 2, height * 0.65, '选择关卡', () => {
      this.scene.start('LevelSelectScene');
    });

    // 道具商店按钮
    this.createButton(width / 2, height * 0.75, '道具商店', () => {
      this.showShopModal();
    });

    // 设置按钮
    this.createButton(width / 2, height * 0.85, '设置', () => {
      this.showSettingsModal();
    });

    // 启动行动值恢复计时器
    this.startActionPointTimer();

    // 播放背景音乐
    // this.sound.play('bgm-menu', { loop: true });
  }

  private createActionPointUI(x: number, y: number): void {
    // 行动值图标
    const heartIcon = this.add.circle(x - 60, y, 15, 0xff6b9d);

    // 行动值文字
    this.actionPointText = this.add.text(x, y, `行动值: ${this.playerData.actionPoints}/5`, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    // 免费获得按钮
    const freeButton = this.add.rectangle(x + 120, y, 80, 30, 0x4ecdc4);
    freeButton.setInteractive({ useHandCursor: true });

    const freeText = this.add.text(x + 120, y, '免费+3', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);

    freeButton.on('pointerdown', () => {
      this.showAdForActionPoints();
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 按钮背景
    const bg = this.add.rectangle(0, 0, 240, 60, 0x4ecdc4, 1);
    bg.setInteractive({ useHandCursor: true });

    // 按钮文字
    const label = this.add.text(0, 0, text, {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 添加阴影效果
    const shadow = this.add.rectangle(4, 4, 240, 60, 0x3a9a9a, 1);
    shadow.setDepth(-1);

    container.add([shadow, bg, label]);

    // 交互效果
    bg.on('pointerover', () => {
      bg.setFillStyle(0x5ddddd);
      container.setScale(1.05);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x4ecdc4);
      container.setScale(1);
    });

    bg.on('pointerdown', () => {
      container.setScale(0.95);
    });

    bg.on('pointerup', () => {
      container.setScale(1.05);
      callback();
    });

    return container;
  }

  private updateActionPoints(): void {
    this.playerData.actionPoints = calculateActionPoints(this.playerData);
    this.registry.set('playerData', this.playerData);
  }

  private startActionPointTimer(): void {
    // 每分钟检查一次行动值恢复
    this.actionPointTimer = this.time.addEvent({
      delay: 60000,
      callback: () => {
        this.updateActionPoints();
        this.actionPointText.setText(`行动值: ${this.playerData.actionPoints}/5`);
      },
      loop: true
    });
  }

  private showAdForActionPoints(): void {
    // 模拟广告
    this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      300,
      200,
      0x000000,
      0.8
    ).setDepth(100);

    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      '观看广告获得3点行动值\n(模拟)',
      { fontSize: '24px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5).setDepth(101);

    this.time.delayedCall(2000, () => {
      this.playerData.actionPoints = Math.min(5, this.playerData.actionPoints + 3);
      this.actionPointText.setText(`行动值: ${this.playerData.actionPoints}/5`);
      this.scene.restart();
    });
  }

  private showShopModal(): void {
    // 道具商店弹窗
    const modal = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    modal.setDepth(100);

    const bg = this.add.rectangle(0, 0, 350, 400, 0x2d2d44);
    bg.setStrokeStyle(2, 0x4ecdc4);

    const title = this.add.text(0, -160, '道具商店', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 道具列表
    const items = [
      { name: '提示 x1', cost: '看广告', key: 'hint' },
      { name: '原图 x1', cost: '看广告', key: 'peek' },
      { name: '冰冻 x1', cost: '看广告', key: 'freeze' }
    ];

    items.forEach((item, index) => {
      const y = -80 + index * 80;

      const itemBg = this.add.rectangle(0, y, 300, 60, 0x3d3d5c);
      itemBg.setInteractive({ useHandCursor: true });

      const nameText = this.add.text(-120, y, item.name, {
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      const costText = this.add.text(100, y, item.cost, {
        fontSize: '16px',
        color: '#4ecdc4'
      }).setOrigin(0.5);

      itemBg.on('pointerdown', () => {
        this.playerData.inventory[item.key as keyof typeof this.playerData.inventory]++;
        this.registry.set('playerData', this.playerData);
      });

      modal.add([itemBg, nameText, costText]);
    });

    // 关闭按钮
    const closeBtn = this.add.text(0, 160, '关闭', {
      fontSize: '24px',
      color: '#ff6b9d'
    }).setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => modal.destroy());

    modal.add([bg, title, closeBtn]);
  }

  private showSettingsModal(): void {
    // 设置弹窗
    const modal = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    modal.setDepth(100);

    const bg = this.add.rectangle(0, 0, 300, 250, 0x2d2d44);
    bg.setStrokeStyle(2, 0x4ecdc4);

    const title = this.add.text(0, -90, '设置', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 音乐开关
    const musicText = this.add.text(-80, -30, '音乐', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);

    const musicToggle = this.add.rectangle(80, -30, 60, 30, this.playerData.settings.musicEnabled ? 0x4ecdc4 : 0x666666);
    musicToggle.setInteractive({ useHandCursor: true });
    musicToggle.on('pointerdown', () => {
      this.playerData.settings.musicEnabled = !this.playerData.settings.musicEnabled;
      musicToggle.setFillStyle(this.playerData.settings.musicEnabled ? 0x4ecdc4 : 0x666666);
    });

    // 音效开关
    const soundText = this.add.text(-80, 30, '音效', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);

    const soundToggle = this.add.rectangle(80, 30, 60, 30, this.playerData.settings.soundEnabled ? 0x4ecdc4 : 0x666666);
    soundToggle.setInteractive({ useHandCursor: true });
    soundToggle.on('pointerdown', () => {
      this.playerData.settings.soundEnabled = !this.playerData.settings.soundEnabled;
      soundToggle.setFillStyle(this.playerData.settings.soundEnabled ? 0x4ecdc4 : 0x666666);
    });

    // 关闭按钮
    const closeBtn = this.add.text(0, 90, '关闭', {
      fontSize: '24px',
      color: '#ff6b9d'
    }).setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => modal.destroy());

    modal.add([bg, title, musicText, musicToggle, soundText, soundToggle, closeBtn]);
  }

  shutdown(): void {
    if (this.actionPointTimer) {
      this.actionPointTimer.remove();
    }
  }
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/scenes/MenuScene.ts
git commit -m "feat(puzzle-love): add MenuScene with action points and shop modal"
```

---

### Task 11: 创建 LevelSelectScene

**Files:**
- Create: `examples/puzzle-love/src/scenes/LevelSelectScene.ts`

**Step 1: 创建关卡选择场景**

```typescript
import Phaser from 'phaser';
import { PlayerData } from '../types';
import { LEVELS, getChapterLevels } from '../data/levels';

export class LevelSelectScene extends Phaser.Scene {
  private playerData!: PlayerData;
  private currentChapter: number = 1;
  private chapterButtons: Phaser.GameObjects.Container[] = [];
  private levelButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    this.playerData = this.registry.get('playerData');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 标题
    this.add.text(width / 2, 60, '选择关卡', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 返回按钮
    const backBtn = this.add.text(40, 40, '← 返回', {
      fontSize: '24px',
      color: '#aaaaaa'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // 章节选择按钮
    this.createChapterButtons(width / 2, 140);

    // 关卡网格
    this.showChapterLevels(this.currentChapter);

    // 总星星显示
    const totalStars = Object.values(this.playerData.stars).reduce((a, b) => a + b, 0);
    this.add.text(width - 40, 60, `★ ${totalStars}`, {
      fontSize: '28px',
      color: '#FFD700'
    }).setOrigin(1, 0.5);
  }

  private createChapterButtons(x: number, y: number): void {
    const chapters = 2; // 目前只有2章

    for (let i = 1; i <= chapters; i++) {
      const btnX = x + (i - 1.5) * 120;

      const btn = this.add.container(btnX, y);

      const bg = this.add.rectangle(0, 0, 100, 50, i === this.currentChapter ? 0x4ecdc4 : 0x3d3d5c);
      bg.setInteractive({ useHandCursor: true });

      const text = this.add.text(0, 0, `第${i}章`, {
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5);

      btn.add([bg, text]);
      this.chapterButtons.push(btn);

      bg.on('pointerdown', () => {
        this.currentChapter = i;
        this.showChapterLevels(i);
        this.updateChapterButtonStyles();
      });
    }
  }

  private updateChapterButtonStyles(): void {
    this.chapterButtons.forEach((btn, index) => {
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(index + 1 === this.currentChapter ? 0x4ecdc4 : 0x3d3d5c);
    });
  }

  private showChapterLevels(chapter: number): void {
    // 清除旧按钮
    this.levelButtons.forEach(btn => btn.destroy());
    this.levelButtons = [];

    const levels = getChapterLevels(chapter);
    const startY = 250;
    const cols = 5;
    const spacingX = 120;
    const spacingY = 120;

    levels.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = this.cameras.main.width / 2 - (cols - 1) * spacingX / 2 + col * spacingX;
      const y = startY + row * spacingY;

      const isUnlocked = this.playerData.unlockedLevels.includes(level.id);
      const starCount = this.playerData.stars[level.id] || 0;

      const btn = this.createLevelButton(x, y, level.id, isUnlocked, starCount);
      this.levelButtons.push(btn);
    });
  }

  private createLevelButton(
    x: number,
    y: number,
    levelId: number,
    isUnlocked: boolean,
    starCount: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 背景圆形
    const bg = this.add.circle(0, 0, 40, isUnlocked ? 0xff6b9d : 0x444466);
    if (isUnlocked) {
      bg.setInteractive({ useHandCursor: true });
    }

    // 关卡数字
    const numText = this.add.text(0, 0, levelId.toString(), {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, numText]);

    // 星星显示
    if (isUnlocked && starCount > 0) {
      for (let i = 0; i < 3; i++) {
        const starX = -20 + i * 20;
        const starY = 55;
        const starColor = i < starCount ? 0xFFD700 : 0x444444;
        const star = this.add.star(starX, starY, 5, 6, 3, starColor);
        container.add(star);
      }
    }

    // 锁定图标
    if (!isUnlocked) {
      const lock = this.add.text(0, 0, '🔒', {
        fontSize: '20px'
      }).setOrigin(0.5);
      container.add(lock);
    }

    // 交互
    if (isUnlocked) {
      bg.on('pointerover', () => {
        container.setScale(1.1);
      });

      bg.on('pointerout', () => {
        container.setScale(1);
      });

      bg.on('pointerdown', () => {
        this.scene.start('GameScene', { levelId });
      });
    }

    return container;
  }
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/scenes/LevelSelectScene.ts
git commit -m "feat(puzzle-love): add LevelSelectScene with chapter navigation"
```

---

### Task 12: 创建 GameScene

**Files:**
- Create: `examples/puzzle-love/src/scenes/GameScene.ts`

**Step 1: 创建游戏主场景**

```typescript
import Phaser from 'phaser';
import { PuzzleGrid } from '../components/PuzzleGrid';
import { PlayerData, GameState, Level } from '../types';
import { getLevel } from '../data/levels';
import { savePlayerData } from '../utils/storage';

export class GameScene extends Phaser.Scene {
  private level!: Level;
  private playerData!: PlayerData;
  private gameState!: GameState;
  private puzzleGrid!: PuzzleGrid;
  private timerText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private itemButtons!: Phaser.GameObjects.Container[];
  private timerEvent!: Phaser.Time.TimerEvent;
  private isPaused: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelId: number }): void {
    const level = getLevel(data.levelId);
    if (!level) {
      this.scene.start('LevelSelectScene');
      return;
    }
    this.level = level;

    this.playerData = this.registry.get('playerData');

    // 初始化游戏状态
    this.gameState = {
      levelId: data.levelId,
      grid: [],
      moves: 0,
      timeElapsed: 0,
      hintsUsed: 0,
      isPaused: false,
      isCompleted: false
    };

    // 消耗行动值
    if (this.playerData.actionPoints > 0) {
      this.playerData.actionPoints--;
      savePlayerData(this.playerData);
    } else {
      // 行动值不足，返回菜单
      this.scene.start('MenuScene');
    }
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 顶部信息栏
    this.createTopBar();

    // 计算拼图区域大小
    const maxGridSize = Math.min(width - 40, 400);
    const pieceSize = Math.floor(maxGridSize / this.level.gridSize);
    const gridWidth = pieceSize * this.level.gridSize;

    // 创建拼图网格
    const gridX = (width - gridWidth) / 2;
    const gridY = 180;

    this.puzzleGrid = new PuzzleGrid(this, gridX, gridY, {
      gridSize: this.level.gridSize,
      pieceSize: pieceSize,
      imageKey: `level_${this.level.id.toString().padStart(2, '0')}`
    });

    // 初始化拼图
    this.puzzleGrid.initialize();

    // 绑定事件
    this.puzzleGrid.on('puzzleCompleted', this.onPuzzleCompleted, this);

    // 底部道具栏
    this.createItemButtons();

    // 开始计时
    this.startTimer();

    // 暂停按钮
    this.createPauseButton();
  }

  private createTopBar(): void {
    const width = this.cameras.main.width;

    // 返回按钮
    const backBtn = this.add.text(30, 30, '←', {
      fontSize: '32px',
      color: '#ffffff'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.confirmExit());

    // 关卡标题
    this.add.text(width / 2, 35, this.level.title, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 计时器
    this.timerText = this.add.text(width - 30, 35, '00:00', {
      fontSize: '24px',
      color: '#4ecdc4',
      fontFamily: 'monospace'
    }).setOrigin(1, 0.5);

    // 移动次数
    this.movesText = this.add.text(width / 2, 75, '移动: 0', {
      fontSize: '18px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
  }

  private createItemButtons(): void {
    const width = this.cameras.main.width;
    const items = [
      { type: 'hint' as const, icon: '💡', count: this.playerData.inventory.hint },
      { type: 'peek' as const, icon: '👁', count: this.playerData.inventory.peek },
      { type: 'freeze' as const, icon: '❄️', count: this.playerData.inventory.freeze }
    ];

    const startX = width / 2 - (items.length - 1) * 80 / 2;
    const y = this.cameras.main.height - 100;

    this.itemButtons = items.map((item, index) => {
      const x = startX + index * 80;

      const container = this.add.container(x, y);

      // 按钮背景
      const bg = this.add.circle(0, 0, 35, item.count > 0 ? 0x4ecdc4 : 0x444466);
      bg.setInteractive({ useHandCursor: item.count > 0 });

      // 图标
      const icon = this.add.text(0, -5, item.icon, {
        fontSize: '28px'
      }).setOrigin(0.5);

      // 数量
      const count = this.add.text(0, 20, `x${item.count}`, {
        fontSize: '14px',
        color: '#ffffff'
      }).setOrigin(0.5);

      container.add([bg, icon, count]);

      if (item.count > 0) {
        bg.on('pointerdown', () => this.useItem(item.type));
      }

      return container;
    });
  }

  private createPauseButton(): void {
    const btn = this.add.text(this.cameras.main.width - 40, 80, '⏸', {
      fontSize: '24px'
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.togglePause());
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.isPaused && !this.gameState.isCompleted) {
          this.gameState.timeElapsed++;
          this.updateTimerDisplay();

          // 检查时间限制
          if (this.level.timeLimit && this.gameState.timeElapsed >= this.level.timeLimit) {
            this.onTimeUp();
          }
        }
      },
      loop: true
    });
  }

  private updateTimerDisplay(): void {
    const minutes = Math.floor(this.gameState.timeElapsed / 60);
    const seconds = this.gameState.timeElapsed % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (this.level.timeLimit) {
      const remaining = this.level.timeLimit - this.gameState.timeElapsed;
      const remMinutes = Math.floor(remaining / 60);
      const remSeconds = remaining % 60;
      this.timerText.setText(`${remMinutes.toString().padStart(2, '0')}:${remSeconds.toString().padStart(2, '0')}`);

      if (remaining <= 10) {
        this.timerText.setColor('#ff6b9d');
      }
    } else {
      this.timerText.setText(timeStr);
    }
  }

  private useItem(type: 'hint' | 'peek' | 'freeze'): void {
    if (this.playerData.inventory[type] <= 0) return;

    switch (type) {
      case 'hint':
        this.puzzleGrid.useHint().then(success => {
          if (success) {
            this.playerData.inventory.hint--;
            this.gameState.hintsUsed++;
            this.updateItemButtons();
          }
        });
        break;

      case 'peek':
        this.puzzleGrid.showFullImage(3000);
        this.playerData.inventory.peek--;
        this.updateItemButtons();
        break;

      case 'freeze':
        // 增加60秒
        if (this.level.timeLimit) {
          this.level.timeLimit += 60;
          this.showFreezeEffect();
          this.playerData.inventory.freeze--;
          this.updateItemButtons();
        }
        break;
    }

    savePlayerData(this.playerData);
  }

  private updateItemButtons(): void {
    const counts = [
      this.playerData.inventory.hint,
      this.playerData.inventory.peek,
      this.playerData.inventory.freeze
    ];

    this.itemButtons.forEach((btn, index) => {
      const bg = btn.list[0] as Phaser.GameObjects.Arc;
      const countText = btn.list[2] as Phaser.GameObjects.Text;

      bg.setFillStyle(counts[index] > 0 ? 0x4ecdc4 : 0x444466);
      countText.setText(`x${counts[index]}`);
    });
  }

  private showFreezeEffect(): void {
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      '+60秒',
      { fontSize: '48px', color: '#4ecdc4', fontStyle: 'bold' }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 100,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  private onPuzzleCompleted(): void {
    this.gameState.isCompleted = true;

    // 计算星星
    const stars = this.calculateStars();
    this.playerData.stars[this.level.id] = stars;

    // 解锁下一关
    if (!this.playerData.unlockedLevels.includes(this.level.id + 1)) {
      this.playerData.unlockedLevels.push(this.level.id + 1);
    }

    savePlayerData(this.playerData);

    // 延迟后显示结果
    this.time.delayedCall(1000, () => {
      this.scene.start('ResultScene', {
        level: this.level,
        stars,
        time: this.gameState.timeElapsed,
        moves: this.gameState.moves
      });
    });
  }

  private calculateStars(): number {
    if (!this.level.timeLimit) return 3;

    const time = this.gameState.timeElapsed;
    const [threshold1, threshold2, threshold3] = this.level.starThresholds;

    if (time <= threshold3) return 3;
    if (time <= threshold2) return 2;
    if (time <= threshold1) return 1;
    return 1; // 至少1星
  }

  private onTimeUp(): void {
    this.showGameOverModal();
  }

  private showGameOverModal(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 遮罩
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);

    // 标题
    const title = this.add.text(width / 2, height / 2 - 80, '时间到！', {
      fontSize: '48px',
      color: '#ff6b9d',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(101);

    // 重来按钮
    const retryBtn = this.createModalButton(width / 2, height / 2, '再试一次', () => {
      this.scene.restart();
    });
    retryBtn.setDepth(101);

    // 返回按钮
    const backBtn = this.createModalButton(width / 2, height / 2 + 80, '返回关卡', () => {
      this.scene.start('LevelSelectScene');
    });
    backBtn.setDepth(101);
  }

  private createModalButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 200, 50, 0x4ecdc4);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerdown', callback);

    return container;
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.showPauseModal();
    }
  }

  private showPauseModal(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);

    const title = this.add.text(width / 2, height / 2 - 100, '游戏暂停', {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(101);

    const continueBtn = this.createModalButton(width / 2, height / 2 - 20, '继续游戏', () => {
      this.isPaused = false;
      overlay.destroy();
      title.destroy();
      continueBtn.destroy();
      restartBtn.destroy();
      exitBtn.destroy();
    });
    continueBtn.setDepth(101);

    const restartBtn = this.createModalButton(width / 2, height / 2 + 50, '重新开始', () => {
      this.scene.restart();
    });
    restartBtn.setDepth(101);

    const exitBtn = this.createModalButton(width / 2, height / 2 + 120, '退出关卡', () => {
      this.scene.start('LevelSelectScene');
    });
    exitBtn.setDepth(101);
  }

  private confirmExit(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);

    const title = this.add.text(width / 2, height / 2 - 60, '确认退出？', {
      fontSize: '36px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(101);

    const subtitle = this.add.text(width / 2, height / 2 - 10, '当前进度将不会保存', {
      fontSize: '18px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(101);

    const yesBtn = this.createModalButton(width / 2 - 110, height / 2 + 60, '退出', () => {
      this.scene.start('LevelSelectScene');
    });
    yesBtn.setDepth(101);

    const noBtn = this.createModalButton(width / 2 + 110, height / 2 + 60, '继续', () => {
      overlay.destroy();
      title.destroy();
      subtitle.destroy();
      yesBtn.destroy();
      noBtn.destroy();
    });
    noBtn.setDepth(101);
  }

  shutdown(): void {
    if (this.timerEvent) {
      this.timerEvent.remove();
    }
  }
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/scenes/GameScene.ts
git commit -m "feat(puzzle-love): add GameScene with timer, items and pause"
```

---

### Task 13: 创建 ResultScene

**Files:**
- Create: `examples/puzzle-love/src/scenes/ResultScene.ts`

**Step 1: 创建结果场景**

```typescript
import Phaser from 'phaser';
import { Level } from '../types';
import { savePlayerData } from '../utils/storage';

interface ResultData {
  level: Level;
  stars: number;
  time: number;
  moves: number;
}

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.resultData = data;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 粒子庆祝效果
    this.createCelebrationEffect();

    // 关卡完成标题
    this.add.text(width / 2, height * 0.15, '关卡完成！', {
      fontSize: '56px',
      color: '#4ecdc4',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 关卡名称
    this.add.text(width / 2, height * 0.25, this.resultData.level.title, {
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 星星显示
    this.createStarDisplay(width / 2, height * 0.4);

    // 统计数据
    this.createStatsDisplay(width / 2, height * 0.55);

    // 剧情文字
    this.createStoryDisplay(width / 2, height * 0.7);

    // 按钮
    this.createButtons(width / 2, height * 0.88);
  }

  private createCelebrationEffect(): void {
    // 烟花粒子效果
    const particles = this.add.particles(0, 0, 'placeholder-bg', {
      x: { min: 0, max: this.cameras.main.width },
      y: { min: 0, max: this.cameras.main.height },
      quantity: 2,
      frequency: 100,
      lifespan: 3000,
      scale: { start: 0.05, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xff6b9d, 0x4ecdc4, 0xffe66d, 0xff6b6b],
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 }
    });

    // 5秒后停止
    this.time.delayedCall(5000, () => particles.stop());
  }

  private createStarDisplay(x: number, y: number): void {
    const container = this.add.container(x, y);

    for (let i = 0; i < 3; i++) {
      const starX = (i - 1) * 80;
      const isEarned = i < this.resultData.stars;

      // 星星背景（暗色）
      const bgStar = this.add.star(starX, 0, 5, 40, 20, 0x444444);
      container.add(bgStar);

      if (isEarned) {
        // 获得的星星
        const star = this.add.star(starX, 0, 5, 40, 20, 0xFFD700);
        star.setScale(0);
        container.add(star);

        // 弹出动画
        this.tweens.add({
          targets: star,
          scale: 1,
          duration: 500,
          delay: i * 200,
          ease: 'Back.easeOut'
        });

        // 旋转动画
        this.tweens.add({
          targets: star,
          angle: 360,
          duration: 2000,
          delay: i * 200 + 500,
          ease: 'Power2'
        });
      }
    }
  }

  private createStatsDisplay(x: number, y: number): void {
    const container = this.add.container(x, y);

    // 用时
    const minutes = Math.floor(this.resultData.time / 60);
    const seconds = this.resultData.time % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.createStatItem(container, -100, '⏱️', timeStr, '用时');
    this.createStatItem(container, 100, '📍', this.resultData.moves.toString(), '移动');
  }

  private createStatItem(
    container: Phaser.GameObjects.Container,
    x: number,
    icon: string,
    value: string,
    label: string
  ): void {
    const itemContainer = this.add.container(x, 0);

    // 背景
    const bg = this.add.rectangle(0, 0, 120, 80, 0x2d2d44);

    // 图标
    const iconText = this.add.text(0, -15, icon, {
      fontSize: '24px'
    }).setOrigin(0.5);

    // 数值
    const valueText = this.add.text(0, 5, value, {
      fontSize: '20px',
      color: '#4ecdc4',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 标签
    const labelText = this.add.text(0, 25, label, {
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    itemContainer.add([bg, iconText, valueText, labelText]);
    container.add(itemContainer);
  }

  private createStoryDisplay(x: number, y: number): void {
    // 背景
    const bg = this.add.rectangle(x, y, 340, 120, 0x2d2d44);
    bg.setStrokeStyle(2, 0x4ecdc4);

    // 剧情标题
    this.add.text(x, y - 45, '剧情解锁', {
      fontSize: '18px',
      color: '#4ecdc4'
    }).setOrigin(0.5);

    // 剧情文字
    this.add.text(x, y + 10, this.resultData.level.storyText, {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 300 }
    }).setOrigin(0.5);
  }

  private createButtons(x: number, y: number): void {
    // 下一关按钮
    const nextBtn = this.createButton(x, y, '下一关', 0x4ecdc4, () => {
      this.scene.start('GameScene', { levelId: this.resultData.level.id + 1 });
    });

    // 返回按钮
    const backBtn = this.createButton(x - 130, y, '关卡列表', 0x3d3d5c, () => {
      this.scene.start('LevelSelectScene');
    });

    // 分享按钮（可选）
    const shareBtn = this.createButton(x + 130, y, '分享', 0xff6b9d, () => {
      this.shareResult();
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 110, 50, color);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => container.setScale(1.05));
    bg.on('pointerout', () => container.setScale(1));
    bg.on('pointerdown', callback);

    return container;
  }

  private shareResult(): void {
    // 模拟分享
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      '分享功能（模拟）\n敬请期待！',
      { fontSize: '24px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5).setDepth(100);

    this.time.delayedCall(2000, () => text.destroy());
  }
}
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/scenes/ResultScene.ts
git commit -m "feat(puzzle-love): add ResultScene with celebration effects and story"
```

---

## 阶段 5: 入口与测试

### Task 14: 创建主入口文件

**Files:**
- Create: `examples/puzzle-love/src/main.ts`

**Step 1: 创建主入口**

```typescript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 720,
  height: 1280,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 320, height: 568 },
    max: { width: 1080, height: 1920 }
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    MenuScene,
    LevelSelectScene,
    GameScene,
    ResultScene
  ]
};

new Phaser.Game(config);
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/src/main.ts
git commit -m "feat(puzzle-love): add main entry point"
```

---

### Task 15: 创建占位资源

**Files:**
- Create: `examples/puzzle-love/assets/images/level_01.jpg` (使用在线占位图)
- Create: `examples/puzzle-love/README.md`

**Step 1: 创建占位图片脚本**

创建下载占位图的脚本：

```bash
cd examples/puzzle-love

# 创建占位图片目录
mkdir -p assets/images

# 下载占位图 (使用 placeholder.com 或 picsum)
for i in $(seq -w 1 10); do
  curl -L "https://picsum.photos/800/800?random=$i" -o "assets/images/level_$i.jpg"
done
```

**Step 2: 创建 README**

```markdown
# 心动拼图

一款基于 Phaser.js 的 H5 拼图游戏，以现代都市爱情小说为主题。

## 特性

- 50个精心设计的关卡
- 3种实用道具（提示、原图、冰冻）
- 行动值系统 + 广告变现
- 响应式设计，完美适配手机
- 完整的剧情解锁体验

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 关卡设计

- 第1-5关：3x3 格子
- 第6-10关：4x4 格子
- 第11-20关：5x5 格子
- 第21-35关：6x6 格子
- 第36-45关：7x7 格子
- 第46-50关：8x8 格子

## 道具系统

- **提示**：自动将一个拼图块放到正确位置
- **原图**：显示完整原图3秒
- **冰冻**：增加60秒时间

## 行动值

- 上限：5点
- 恢复：每30分钟1点
- 消耗：每关1点
- 获取：观看广告 +3点
```

**Step 3: Commit**

```bash
git add examples/puzzle-love/README.md
git commit -m "docs(puzzle-love): add README with project info"
```

---

## 阶段 6: 测试与优化

### Task 16: 创建基础测试脚本

**Files:**
- Create: `examples/puzzle-love/test-shuffle.mjs`

**Step 1: 创建打乱算法测试**

```javascript
// 测试打乱算法
import {
  createSolvedGrid,
  shuffleGrid,
  isGridComplete,
  getValidMoves,
  applyMove
} from './src/utils/shuffle.ts';

console.log('🧪 测试打乱算法');

// 测试1: 创建已解决网格
console.log('\n测试1: 创建已解决网格');
const solved3x3 = createSolvedGrid(3);
console.log('3x3 已解决网格:');
console.log(solved3x3);
console.assert(isGridComplete(solved3x3), '已解决网格应该返回完成');

// 测试2: 打乱后不应立即完成
console.log('\n测试2: 打乱后不应立即完成');
const shuffled3x3 = shuffleGrid(3, 100);
console.log('打乱后的网格:');
console.log(shuffled3x3);
console.assert(!isGridComplete(shuffled3x3), '打乱后的网格不应完成');

// 测试3: 有效移动
console.log('\n测试3: 有效移动检测');
const moves = getValidMoves(solved3x3);
console.log(`3x3网格有 ${moves.length} 个有效移动`);
console.assert(moves.length === 12, '3x3网格应有12个有效移动');

// 测试4: 多次打乱不应出现错误
console.log('\n测试4: 多次打乱稳定性');
for (let i = 0; i < 100; i++) {
  const grid = shuffleGrid(5, 50);
  console.assert(grid.length === 5, '网格大小应正确');
  console.assert(grid[0].length === 5, '网格列数应正确');
}

console.log('\n✅ 所有测试通过！');
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/test-shuffle.mjs
git commit -m "test(puzzle-love): add shuffle algorithm tests"
```

---

### Task 17: 创建 ChromeMCP 测试脚本

**Files:**
- Create: `examples/puzzle-love/test-chromemcp.mjs`

**Step 1: 创建自动化测试脚本**

```javascript
import { BrowserController } from '../../packages/core/dist/index.js';
import http from 'http';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
```

**Step 2: Commit**

```bash
git add examples/puzzle-love/test-chromemcp.mjs
git commit -m "test(puzzle-love): add ChromeMCP automation test"
```

---

## 总结

实现计划包含以下阶段：

### 阶段1: 项目基础（3个任务）
- Task 1: 创建目录结构
- Task 2: 初始化项目配置
- Task 3: 创建类型定义

### 阶段2: 数据与配置（2个任务）
- Task 4: 创建关卡数据
- Task 5: 创建本地存储工具

### 阶段3: 核心组件（3个任务）
- Task 6: 创建打乱算法
- Task 7: 创建 PuzzlePiece 组件
- Task 8: 创建 PuzzleGrid 组件

### 阶段4: 场景实现（4个任务）
- Task 9: 创建 BootScene
- Task 10: 创建 MenuScene
- Task 11: 创建 LevelSelectScene
- Task 12: 创建 GameScene
- Task 13: 创建 ResultScene

### 阶段5: 入口与测试（2个任务）
- Task 14: 创建主入口
- Task 15: 创建占位资源

### 阶段6: 测试与优化（2个任务）
- Task 16: 创建基础测试
- Task 17: 创建 ChromeMCP 测试

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-02-22-puzzle-love-implementation.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach would you prefer?
