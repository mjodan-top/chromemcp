// 花色
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// 花色颜色
export type SuitColor = 'red' | 'black';

// 卡牌
export interface Card {
  suit: Suit;
  rank: number; // 1-13 (A=1, J=11, Q=12, K=13)
  faceUp: boolean;
  id: string; // 唯一标识符
}

// 卡牌位置类型
export type CardLocationType = 'tableau' | 'freeCell' | 'foundation';

// 卡牌位置
export interface CardLocation {
  type: CardLocationType;
  index: number;
  position?: number; // 在tableau中的位置
}

// 移动记录
export interface Move {
  from: CardLocation;
  to: CardLocation;
  card: Card;
  timestamp: number;
}

// 游戏状态
export interface GameState {
  levelId: number;
  tableau: Card[][]; // 8列
  freeCells: (Card | null)[]; // 4个空位
  foundations: Card[][]; // 4个目标堆
  moves: Move[];
  movesCount: number;
  timeElapsed: number;
  hintsUsed: number;
  isPaused: boolean;
  isCompleted: boolean;
  isWon: boolean;
}

// 关卡难度
export type Difficulty = 'easy' | 'medium' | 'hard';

// 关卡配置
export interface Level {
  id: number;
  seed: number;
  difficulty: Difficulty;
  name: string;
}

// 最佳成绩
export interface BestScore {
  time: number;
  moves: number;
  stars: number;
  date: string;
}

// 玩家数据
export interface PlayerData {
  unlockedLevels: number[];
  completedLevels: number[];
  bestScores: Record<number, BestScore>;
  totalGamesPlayed: number;
  totalWins: number;
  currentStreak: number;
  bestStreak: number;
}

// 游戏配置
export interface GameConfig {
  tableauColumns: number; // 8
  freeCellCount: number; // 4
  foundationCount: number; // 4
  cardWidth: number;
  cardHeight: number;
  cardGap: number;
}

// 默认游戏配置
export const DEFAULT_GAME_CONFIG: GameConfig = {
  tableauColumns: 8,
  freeCellCount: 4,
  foundationCount: 4,
  cardWidth: 80,
  cardHeight: 112,
  cardGap: 4
};

// 花色符号
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

// 花色颜色
export const SUIT_COLORS: Record<Suit, SuitColor> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black'
};

// 牌面显示
export const RANK_DISPLAY: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K'
};