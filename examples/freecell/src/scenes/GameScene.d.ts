import Phaser from 'phaser';
export declare class GameScene extends Phaser.Scene {
    private level;
    private playerData;
    private gameState;
    private cards;
    private freeCellArea;
    private foundationArea;
    private tableauCards;
    private freeCellCards;
    private foundationCards;
    private moveHistory;
    private timerText;
    private movesText;
    private timerEvent;
    private isPaused;
    private selectedCards;
    private cardWidth;
    private tableauStartY;
    private cardGap;
    constructor();
    init(data: {
        levelId: number;
    }): void;
    create(): void;
    private createTopBar;
    private createFunctionalAreas;
    private createTableauArea;
    private initializeCards;
    private setupCardInteraction;
    private getMovableCardsFromTableau;
    private tryAutoMoveToFoundation;
    private handleDrop;
    private getTableauColumn;
    private moveCardToFoundation;
    private moveCardToFreeCell;
    private moveCardsToTableau;
    private recordMove;
    private undo;
    private clearSelection;
    private checkWin;
    private showHint;
    private createBottomBar;
    private createActionButton;
    private startTimer;
    private updateTimerDisplay;
    private updateMovesDisplay;
    private confirmExit;
    /**
     * 获取游戏状态 (用于测试)
     */
    getGameStateForTest(): object;
    shutdown(): void;
}
//# sourceMappingURL=GameScene.d.ts.map