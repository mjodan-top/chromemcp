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
