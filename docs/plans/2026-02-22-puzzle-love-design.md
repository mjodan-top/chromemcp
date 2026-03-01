# 心动拼图游戏设计方案

## 日期
2026-02-22

## 项目概述

**游戏名称**：心动拼图
**类型**：H5 滑动拼图游戏
**主题**：现代都市爱情小说
**目标平台**：手机浏览器/微信小游戏

## 设计目标

1. 通过拼图游戏讲述言情小说剧情
2. 50个关卡，难度递进，保持玩家留存
3. 道具+广告变现系统，平衡免费体验和收入
4. 流畅的手机触摸操作体验

---

## 1. 核心玩法

### 1.1 拼图机制
- **交换方式**：滑动相邻拼图块进行交换
- **胜利条件**：所有拼图块回到正确位置
- **难度递进**：
  - 第1-5关：3x3（9格）
  - 第6-10关：4x4（16格）
  - 第11-20关：5x5（25格）
  - 第21-35关：6x6（36格）
  - 第36-45关：7x7（49格）
  - 第46-50关：8x8（64格）

### 1.2 关卡结构
- 共10章，每章5关
- 每关对应小说一个重要情节
- 通关后解锁剧情文字和插画

### 1.3 星级系统
- 根据完成时间评定1-3星
- 星星用于解锁后续章节
- 未达到3星可重复挑战

---

## 2. 数据模型

### 2.1 关卡数据
```typescript
interface Level {
  id: number;
  chapter: number;          // 章节（1-10）
  title: string;            // 关卡名称
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'master';
  gridSize: number;         // 3-8
  imageUrl: string;         // 关卡图片路径
  storyText: string;        // 通关后显示的剧情
  timeLimit?: number;       // 时间限制（秒）
  starThresholds: [number, number, number]; // 1-3星时间阈值
}
```

### 2.2 玩家数据
```typescript
interface PlayerData {
  currentLevel: number;           // 当前进行到的关卡
  unlockedLevels: number[];       // 已解锁关卡
  stars: Record<number, number>;  // 每关获得的星星数
  actionPoints: number;           // 当前行动值（0-5）
  lastActionPointTime: number;    // 上次恢复时间戳
  inventory: {
    hint: number;                 // 提示道具数量
    peek: number;                 // 原图道具数量
    freeze: number;               // 冰冻道具数量
  };
  settings: {
    musicEnabled: boolean;
    soundEnabled: boolean;
  };
}
```

### 2.3 游戏状态
```typescript
interface GameState {
  levelId: number;
  grid: number[][];         // 当前网格状态
  moves: number;            // 移动次数
  timeElapsed: number;      // 已用时间（秒）
  hintsUsed: number;        // 本关使用提示次数
  isPaused: boolean;
  isCompleted: boolean;
}
```

---

## 3. 道具系统

### 3.1 道具功能
| 道具 | 功能 | 获取方式 |
|-----|------|---------|
| **提示** | 自动将一个错误的拼图块放到正确位置 | 广告/通关奖励 |
| **原图** | 半透明遮罩显示完整原图3秒 | 广告/通关奖励 |
| **冰冻** | 增加60秒剩余时间 | 广告/通关奖励 |

### 3.2 道具使用规则
- 每关使用次数不限
- 提示优先选择距离正确位置最近的拼图块
- 原图显示期间可继续操作
- 冰冻可叠加使用

---

## 4. 变现系统

### 4.1 行动值系统
- **上限**：5点
- **恢复速度**：每30分钟恢复1点
- **消耗**：每关挑战消耗1点
- **购买**：观看广告获得3点

### 4.2 广告点位
1. **主界面** - "免费获得行动值"按钮
2. **游戏结束** - 失败后可看广告复活
3. **道具不足** - 使用道具时提示看广告获取
4. **双倍奖励** - 通关后看广告获得双倍道具

### 4.3 奖励规则
| 广告类型 | 奖励 |
|---------|------|
| 行动值广告 | +3点行动值 |
| 道具广告 | 自选道具×1 |
| 复活广告 | 本关继续，保留进度 |
| 双倍奖励 | 通关奖励×2 |

---

## 5. 技术架构

### 5.1 技术栈
- **游戏引擎**：Phaser 3 (v3.70+)
- **语言**：TypeScript
- **构建工具**：Vite
- **移动端适配**：CSS viewport + Phaser Scale Manager

### 5.2 项目结构
```
puzzle-love/
├── src/
│   ├── scenes/           # Phaser 场景
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── LevelSelectScene.ts
│   │   ├── GameScene.ts
│   │   ├── StoryScene.ts
│   │   └── ResultScene.ts
│   ├── components/       # 游戏组件
│   │   ├── PuzzleGrid.ts
│   │   ├── PuzzlePiece.ts
│   │   ├── UIManager.ts
│   │   └── ParticleEffects.ts
│   ├── data/            # 数据定义
│   │   ├── levels.ts    # 50关配置
│   │   └── story.ts     # 剧情文本
│   ├── utils/           # 工具函数
│   │   ├── storage.ts   # 本地存储
│   │   ├── shuffle.ts   # 打乱算法
│   │   └── adManager.ts # 广告管理
│   ├── types/           # TypeScript类型
│   │   └── index.ts
│   └── main.ts          # 入口文件
├── assets/              # 游戏资源
│   ├── images/          # 关卡图片
│   ├── ui/              # UI素材
│   ├── audio/           # 音效和BGM
│   └── fonts/           # 字体文件
├── index.html
├── vite.config.ts
└── package.json
```

### 5.3 Phaser 场景架构
```
┌─────────────────────────────────────────────────────────┐
│                    Phaser Game Instance                 │
├─────────────────────────────────────────────────────────┤
│  BootScene      → 资源预加载                            │
│  MenuScene      → 主菜单、设置                          │
│  LevelSelectScene → 关卡选择（章节导航）                │
│  GameScene      → 核心拼图游戏                          │
│  StoryScene     → 剧情展示                              │
│  ResultScene    → 关卡结算                              │
└─────────────────────────────────────────────────────────┘
```

---

## 6. 核心组件设计

### 6.1 PuzzleGrid 类
```typescript
class PuzzleGrid {
  private scene: Phaser.Scene;
  private grid: PuzzlePiece[][];
  private correctGrid: number[][];
  private selectedPiece: PuzzlePiece | null;
  private gridSize: number;
  private pieceSize: number;

  constructor(scene: Phaser.Scene, x: number, y: number, gridSize: number);

  // 创建拼图块
  createPieces(imageKey: string): void;

  // 打乱拼图（确保可解）
  shuffle(): void;

  // 交换拼图块
  swapPieces(pieceA: PuzzlePiece, pieceB: PuzzlePiece): Promise<void>;

  // 检查是否完成
  checkComplete(): boolean;

  // 使用提示道具
  useHint(): Promise<void>;

  // 获取指定位置的拼图块
  getPieceAt(row: number, col: number): PuzzlePiece;

  // 检查两个位置是否相邻
  isAdjacent(posA: Position, posB: Position): boolean;
}
```

### 6.2 PuzzlePiece 类
```typescript
class PuzzlePiece extends Phaser.GameObjects.Image {
  private correctRow: number;
  private correctCol: number;
  private currentRow: number;
  private currentCol: number;
  private isSelected: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    correctRow: number,
    correctCol: number
  );

  // 选中/取消选中
  select(): void;
  deselect(): void;

  // 移动动画
  moveTo(row: number, col: number, duration?: number): Promise<void>;

  // 检查是否在正确位置
  isInCorrectPosition(): boolean;

  // 提示动画（闪烁）
  playHintAnimation(): void;
}
```

### 6.3 打乱算法
使用可解的随机打乱：
```typescript
function shuffleGrid(gridSize: number): number[][] {
  // 从完成状态开始，随机进行有效移动
  // 确保生成的拼图一定可解
  const grid = createSolvedGrid(gridSize);
  const moves = gridSize * gridSize * 10; // 打乱次数

  for (let i = 0; i < moves; i++) {
    const validMoves = getValidMoves(grid);
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    applyMove(grid, randomMove);
  }

  return grid;
}
```

---

## 7. 响应式设计

### 7.1 屏幕适配
```typescript
const gameConfig = {
  type: Phaser.AUTO,
  width: 720,
  height: 1280,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 320, height: 568 },
    max: { width: 1080, height: 1920 }
  }
};
```

### 7.2 拼图区域计算
- 手机屏幕宽度：375-414px
- 拼图区域边距：20px × 2
- 拼图区域宽度：335-374px
- 8x8 网格每格大小：42-47px
- **优化**：最大拼图区域设为 360px，8x8 时每格 45px（满足 44px 触摸标准）

### 7.3 触摸优化
- 拼图块最小尺寸：45x45px
- 选中：边框高亮 + 缩放1.05倍
- 交换：滑动动画 200ms
- 误触保护：触摸区域比视觉区域大 10%

---

## 8. 本地存储

### 8.1 存储方案
```typescript
class GameStorage {
  private readonly STORAGE_KEY = 'puzzle_love_v1';
  private readonly SECRET_KEY = 'simple_xor_key';

  save(data: PlayerData): void {
    const json = JSON.stringify(data);
    const encrypted = this.xorEncrypt(json, this.SECRET_KEY);
    localStorage.setItem(this.STORAGE_KEY, encrypted);
  }

  load(): PlayerData | null {
    const encrypted = localStorage.getItem(this.STORAGE_KEY);
    if (!encrypted) return null;

    try {
      const json = this.xorDecrypt(encrypted, this.SECRET_KEY);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private xorEncrypt(text: string, key: string): string;
  private xorDecrypt(text: string, key: string): string;
}
```

### 8.2 存档内容
- 关卡进度和星星
- 行动值和时间戳
- 道具库存
- 用户设置

### 8.3 数据迁移
- 版本号检查
- 自动迁移旧版本数据

---

## 9. 音效与反馈

### 9.1 音效列表
| 事件 | 音效类型 |
|-----|---------|
| 选中拼图块 | 清脆"叮"声（短） |
| 交换拼图块 | 滑动音效 |
| 拼图块归位 | 清脆音效 |
| 关卡完成 | 胜利音效 + 粒子爆发 |
| 道具使用 | 魔法音效 |
| 游戏失败 | 低沉音效 |
| 按钮点击 | 通用UI音效 |

### 9.2 视觉反馈
- 选中：金色边框 + 轻微放大
- 正确放置：绿色闪烁 + 粒子效果
- 错误交换：红色抖动
- 通关：全屏烟花 + 星星飞入

---

## 10. 图片资源策略

### 10.1 AI 生成方案
使用 Midjourney 或 Stable Diffusion 生成统一风格插画：

**基础提示词模板**：
```
modern romance illustration, soft pastel colors,
[场景描述], elegant couple, city background,
anime style, high quality, detailed, 4k
```

**章节主题示例**：
1. 初遇：咖啡厅相遇
2. 心动：雨中共伞
3. 误会：办公室争执
4. 和解：海边漫步
5. 告白：天台夜景
...（共10章主题）

### 10.2 图片规格
- 分辨率：800x800px（正方形）
- 格式：WebP（优先）/ PNG
- 大小：单张 < 200KB

---

## 11. 广告 SDK 集成

### 11.1 SDK 选择
- **微信小游戏**：微信广告 SDK
- **H5 通用**：穿山甲广告 / Google AdMob

### 11.2 广告管理器
```typescript
class AdManager {
  // 预加载激励视频
  preloadRewardedAd(): Promise<void>;

  // 显示激励视频
  showRewardedAd(type: 'action_point' | 'item' | 'revive' | 'double'): Promise<boolean>;

  // 检查广告是否可用
  isAdAvailable(): boolean;

  // 获取广告加载状态
  getAdStatus(): AdStatus;
}
```

---

## 12. 测试策略

### 12.1 单元测试
- 打乱算法测试（确保可解性）
- 存储加密/解密测试
- 行动值恢复计算测试

### 12.2 集成测试
- 完整关卡流程测试
- 道具使用流程测试
- 广告回调处理测试

### 12.3 兼容性测试
- iOS Safari / Android Chrome
- 微信内置浏览器
- 不同屏幕尺寸

---

## 13. 后续扩展可能

1. **社交功能**：好友排行榜、分享求助
2. **自定义关卡**：玩家上传图片生成关卡
3. **限时活动**：节日主题关卡
4. **内购**：移除广告、无限行动值月卡

---

## 批准状态

- [x] 核心玩法设计
- [x] 数据模型
- [x] 道具系统
- [x] 变现系统
- [x] 技术架构
- [x] 响应式设计
- [x] 图片资源策略
- [x] 测试策略
