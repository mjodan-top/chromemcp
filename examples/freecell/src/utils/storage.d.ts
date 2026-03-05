import { PlayerData } from '../types';
export declare function loadPlayerData(): PlayerData;
export declare function savePlayerData(data: PlayerData): void;
export declare function resetPlayerData(): void;
export declare function recordGameCompletion(playerData: PlayerData, levelId: number, time: number, moves: number): PlayerData;
export declare function recordGameStart(playerData: PlayerData): PlayerData;
export declare function recordGameLoss(playerData: PlayerData): PlayerData;
//# sourceMappingURL=storage.d.ts.map