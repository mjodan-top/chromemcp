export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type SuitColor = 'red' | 'black';
export interface Card {
    suit: Suit;
    rank: number;
    faceUp: boolean;
    id: string;
}
export type CardLocationType = 'tableau' | 'freeCell' | 'foundation';
export interface CardLocation {
    type: CardLocationType;
    index: number;
    position?: number;
}
export interface Move {
    from: CardLocation;
    to: CardLocation;
    card: Card;
    timestamp: number;
}
export interface GameState {
    levelId: number;
    tableau: Card[][];
    freeCells: (Card | null)[];
    foundations: Card[][];
    moves: Move[];
    movesCount: number;
    timeElapsed: number;
    hintsUsed: number;
    isPaused: boolean;
    isCompleted: boolean;
    isWon: boolean;
}
export type Difficulty = 'easy' | 'medium' | 'hard';
export interface Level {
    id: number;
    seed: number;
    difficulty: Difficulty;
    name: string;
}
export interface BestScore {
    time: number;
    moves: number;
    stars: number;
    date: string;
}
export interface PlayerData {
    unlockedLevels: number[];
    completedLevels: number[];
    bestScores: Record<number, BestScore>;
    totalGamesPlayed: number;
    totalWins: number;
    currentStreak: number;
    bestStreak: number;
}
export interface GameConfig {
    tableauColumns: number;
    freeCellCount: number;
    foundationCount: number;
    cardWidth: number;
    cardHeight: number;
    cardGap: number;
}
export declare const DEFAULT_GAME_CONFIG: GameConfig;
export declare const SUIT_SYMBOLS: Record<Suit, string>;
export declare const SUIT_COLORS: Record<Suit, SuitColor>;
export declare const RANK_DISPLAY: Record<number, string>;
//# sourceMappingURL=index.d.ts.map