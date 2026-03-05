import Phaser from 'phaser';
import { Level } from '../types';
export declare class ResultScene extends Phaser.Scene {
    private levelData;
    private gameTime;
    private gameMoves;
    private gameStars;
    private playerData;
    constructor();
    init(data: {
        level: Level;
        time: number;
        moves: number;
        stars: number;
    }): void;
    create(): void;
    private createCelebration;
    private createStars;
    private createStats;
    private createStatCard;
    private createButtons;
    private createButton;
    private formatTime;
}
//# sourceMappingURL=ResultScene.d.ts.map