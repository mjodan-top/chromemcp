import Phaser from 'phaser';
import { Card } from '../components/Card';
import { FreeCellArea, FoundationArea } from '../components/GameAreas';
import { getLevel } from '../data/levels';
import { createDeck, shuffleWithSeed, dealCards, canStackOnTableau, canMoveToFoundation, getMaxMovableCards, cloneCard } from '../utils/deck';
import { recordGameCompletion } from '../utils/storage';
export class GameScene extends Phaser.Scene {
    level;
    playerData;
    gameState;
    cards = [];
    freeCellArea;
    foundationArea;
    tableauCards = [[], [], [], [], [], [], [], []];
    freeCellCards = [null, null, null, null];
    foundationCards = [[], [], [], []];
    moveHistory = [];
    timerText;
    movesText;
    timerEvent;
    isPaused = false;
    selectedCards = [];
    cardWidth = 70;
    tableauStartY = 260;
    cardGap = 25;
    constructor() {
        super({ key: 'GameScene' });
    }
    init(data) {
        const level = getLevel(data.levelId);
        if (!level) {
            this.scene.start('MenuScene');
            return;
        }
        this.level = level;
        this.playerData = this.registry.get('playerData');
        // 初始化游戏状态
        this.gameState = {
            levelId: data.levelId,
            tableau: [],
            freeCells: [null, null, null, null],
            foundations: [[], [], [], []],
            moves: [],
            movesCount: 0,
            timeElapsed: 0,
            hintsUsed: 0,
            isPaused: false,
            isCompleted: false,
            isWon: false
        };
        this.cards = [];
        this.tableauCards = [[], [], [], [], [], [], [], []];
        this.freeCellCards = [null, null, null, null];
        this.foundationCards = [[], [], [], []];
        this.moveHistory = [];
        this.selectedCards = [];
    }
    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        // 背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        // 顶部信息栏
        this.createTopBar(width);
        // 功能区 (空位 + 目标)
        this.createFunctionalAreas(width);
        // 游戏区
        this.createTableauArea(width);
        // 初始化卡牌
        this.initializeCards();
        // 底部操作栏
        this.createBottomBar(width, height);
        // 开始计时
        this.startTimer();
    }
    createTopBar(width) {
        // 返回按钮
        const backBtn = this.add.text(30, 30, '←', {
            fontSize: '32px',
            color: '#ffffff'
        }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => this.confirmExit());
        // 关卡标题
        this.add.text(width / 2, 35, this.level.name, {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        // 难度标签
        const difficultyColors = {
            easy: '#4ecdc4',
            medium: '#ffd93d',
            hard: '#ff6b6b'
        };
        this.add.text(width / 2, 65, this.level.difficulty.toUpperCase(), {
            fontSize: '14px',
            color: difficultyColors[this.level.difficulty]
        }).setOrigin(0.5);
        // 计时器
        this.timerText = this.add.text(width - 30, 35, '00:00', {
            fontSize: '24px',
            color: '#4ecdc4',
            fontFamily: 'monospace'
        }).setOrigin(1, 0.5);
        // 移动次数
        this.movesText = this.add.text(width - 30, 65, '移动: 0', {
            fontSize: '16px',
            color: '#888888'
        }).setOrigin(1, 0.5);
    }
    createFunctionalAreas(width) {
        const gap = 20;
        const totalWidth = 4 * this.cardWidth + 3 * 10 + gap + 4 * this.cardWidth + 3 * 10;
        const startX = (width - totalWidth) / 2 + this.cardWidth / 2;
        // 空位区 (左侧)
        this.freeCellArea = new FreeCellArea(this, startX, 150);
        // 目标区 (右侧)
        const foundationX = startX + 4 * (this.cardWidth + 10) + gap;
        this.foundationArea = new FoundationArea(this, foundationX, 150);
    }
    createTableauArea(width) {
        const totalWidth = 8 * this.cardWidth + 7 * 10;
        const startX = (width - totalWidth) / 2 + this.cardWidth / 2;
        // 8列背景
        for (let i = 0; i < 8; i++) {
            const x = startX + i * (this.cardWidth + 10);
            this.add.rectangle(x, this.tableauStartY + 200, this.cardWidth, 400, 0x2a2a4e, 0.3)
                .setStrokeStyle(1, 0x4ecdc4, 0.2);
        }
    }
    initializeCards() {
        const width = this.cameras.main.width;
        // 创建并洗牌
        const deck = createDeck();
        const shuffled = shuffleWithSeed(deck, this.level.seed);
        const tableau = dealCards(shuffled);
        // 保存到游戏状态
        this.gameState.tableau = tableau;
        // 创建卡牌对象
        const totalWidth = 8 * this.cardWidth + 7 * 10;
        const startX = (width - totalWidth) / 2 + this.cardWidth / 2;
        for (let col = 0; col < 8; col++) {
            for (let row = 0; row < tableau[col].length; row++) {
                const cardData = tableau[col][row];
                const x = startX + col * (this.cardWidth + 10);
                const y = this.tableauStartY + row * this.cardGap;
                const card = new Card(this, x, y, cardData);
                this.cards.push(card);
                this.tableauCards[col].push(card);
                this.setupCardInteraction(card, col);
            }
        }
    }
    setupCardInteraction(card, _col) {
        // 双击检测
        let lastClickTime = 0;
        const DOUBLE_CLICK_DELAY = 300;
        card.on('pointerdown', () => {
            const now = Date.now();
            const isDoubleClick = (now - lastClickTime) < DOUBLE_CLICK_DELAY;
            lastClickTime = now;
            if (isDoubleClick) {
                // 双击：尝试自动移动到目标区
                this.tryAutoMoveToFoundation(card);
                lastClickTime = 0; // 重置，避免三击触发
            }
        });
        // 拖拽 - 直接在 Card (Container) 上设置
        this.input.setDraggable(card);
        card.on('dragstart', () => {
            // 重新查找卡牌当前所在的列（因为卡牌可能已经移动过）
            const currentCol = this.getTableauColumn(card);
            if (currentCol === -1)
                return;
            const cardsToMove = this.getMovableCardsFromTableau(currentCol, card);
            if (cardsToMove.length === 0)
                return;
            this.selectedCards = cardsToMove;
            cardsToMove.forEach(c => c.startDrag());
        });
        card.on('drag', (_pointer, dragX, dragY) => {
            if (this.selectedCards.length > 0 && this.selectedCards[0] === card) {
                const offsetX = dragX - card.x;
                const offsetY = dragY - card.y;
                this.selectedCards.forEach(c => {
                    c.x += offsetX;
                    c.y += offsetY;
                });
            }
        });
        card.on('dragend', () => {
            if (this.selectedCards.length > 0) {
                this.handleDrop(this.selectedCards);
            }
        });
    }
    getMovableCardsFromTableau(col, card) {
        const column = this.tableauCards[col];
        const cardIndex = column.indexOf(card);
        if (cardIndex === -1)
            return [];
        // 检查从这张牌开始是否可以移动
        const cardsToMove = column.slice(cardIndex);
        // 检查是否是有效序列 (交替颜色递减)
        for (let i = 0; i < cardsToMove.length - 1; i++) {
            if (!canStackOnTableau(cardsToMove[i + 1].cardData, cardsToMove[i].cardData)) {
                return [];
            }
        }
        // 检查可移动数量
        const tableauData = this.tableauCards.map(col => col.map(c => c.cardData));
        const maxMovable = getMaxMovableCards(this.freeCellCards, tableauData, col);
        if (cardsToMove.length > maxMovable) {
            return [];
        }
        return cardsToMove;
    }
    tryAutoMoveToFoundation(card) {
        const suitIndex = this.foundationArea.getSuitIndex(card.cardData.suit);
        if (suitIndex === -1)
            return;
        if (canMoveToFoundation(card.cardData, this.foundationCards[suitIndex])) {
            // 找到卡牌所在列
            let fromCol = -1;
            for (let i = 0; i < 8; i++) {
                if (this.tableauCards[i].includes(card)) {
                    fromCol = i;
                    break;
                }
            }
            if (fromCol >= 0) {
                this.moveCardToFoundation(card, fromCol, suitIndex);
            }
        }
    }
    handleDrop(cards) {
        if (cards.length === 0)
            return;
        const card = cards[0];
        const x = card.x;
        const y = card.y;
        // 检查放置位置
        const width = this.cameras.main.width;
        // 检查目标区
        const foundationIndex = this.foundationArea.containsPoint(x, y);
        if (foundationIndex >= 0 && cards.length === 1) {
            if (canMoveToFoundation(card.cardData, this.foundationCards[foundationIndex])) {
                this.moveCardToFoundation(card, this.getTableauColumn(card), foundationIndex);
                this.clearSelection();
                return;
            }
        }
        // 检查空位区
        const freeCellIndex = this.freeCellArea.containsPoint(x, y);
        if (freeCellIndex >= 0 && cards.length === 1 && this.freeCellCards[freeCellIndex] === null) {
            this.moveCardToFreeCell(card, this.getTableauColumn(card), freeCellIndex);
            this.clearSelection();
            return;
        }
        // 检查游戏区
        const totalWidth = 8 * this.cardWidth + 7 * 10;
        const startX = (width - totalWidth) / 2;
        for (let col = 0; col < 8; col++) {
            const colX = startX + col * (this.cardWidth + 10) + this.cardWidth / 2;
            const column = this.tableauCards[col];
            if (Math.abs(x - colX) < this.cardWidth / 2) {
                const targetCard = column.length > 0 ? column[column.length - 1] : null;
                if (targetCard === null) {
                    // 空列可以放任何牌
                    this.moveCardsToTableau(cards, this.getTableauColumn(card), col);
                    this.clearSelection();
                    return;
                }
                else if (canStackOnTableau(card.cardData, targetCard.cardData)) {
                    this.moveCardsToTableau(cards, this.getTableauColumn(card), col);
                    this.clearSelection();
                    return;
                }
            }
        }
        // 无法放置，返回原位
        cards.forEach(c => c.returnToOriginal());
        this.clearSelection();
    }
    getTableauColumn(card) {
        for (let i = 0; i < 8; i++) {
            if (this.tableauCards[i].includes(card)) {
                return i;
            }
        }
        return -1;
    }
    moveCardToFoundation(card, fromCol, foundationIndex) {
        // 记录移动
        this.recordMove({ type: 'tableau', index: fromCol }, { type: 'foundation', index: foundationIndex }, [card.cardData]);
        // 从游戏区移除
        const colIndex = this.tableauCards[fromCol].indexOf(card);
        if (colIndex >= 0) {
            this.tableauCards[fromCol].splice(colIndex, 1);
        }
        // 添加到目标区
        this.foundationCards[foundationIndex].push(card.cardData);
        // 移动卡牌
        const pos = this.foundationArea.getSlotPosition(foundationIndex);
        card.animateTo(pos.x, pos.y);
        // 更新计数
        this.gameState.movesCount++;
        this.updateMovesDisplay();
        // 检查胜利
        this.checkWin();
    }
    moveCardToFreeCell(card, fromCol, freeCellIndex) {
        // 记录移动
        this.recordMove({ type: 'tableau', index: fromCol }, { type: 'freeCell', index: freeCellIndex }, [card.cardData]);
        // 从游戏区移除
        const colIndex = this.tableauCards[fromCol].indexOf(card);
        if (colIndex >= 0) {
            this.tableauCards[fromCol].splice(colIndex, 1);
        }
        // 添加到空位
        this.freeCellCards[freeCellIndex] = card.cardData;
        // 移动卡牌
        const pos = this.freeCellArea.getSlotPosition(freeCellIndex);
        card.animateTo(pos.x, pos.y);
        // 更新计数
        this.gameState.movesCount++;
        this.updateMovesDisplay();
    }
    moveCardsToTableau(cards, fromCol, toCol) {
        // 记录移动
        this.recordMove({ type: 'tableau', index: fromCol }, { type: 'tableau', index: toCol }, cards.map(c => c.cardData));
        // 从原列移除
        cards.forEach(card => {
            const idx = this.tableauCards[fromCol].indexOf(card);
            if (idx >= 0) {
                this.tableauCards[fromCol].splice(idx, 1);
            }
        });
        // 添加到新列
        const width = this.cameras.main.width;
        const totalWidth = 8 * this.cardWidth + 7 * 10;
        const startX = (width - totalWidth) / 2 + this.cardWidth / 2;
        const baseY = this.tableauStartY;
        cards.forEach((card, index) => {
            const x = startX + toCol * (this.cardWidth + 10);
            const y = baseY + (this.tableauCards[toCol].length + index) * this.cardGap;
            card.animateTo(x, y);
            this.tableauCards[toCol].push(card);
        });
        // 更新计数
        this.gameState.movesCount++;
        this.updateMovesDisplay();
    }
    recordMove(from, to, cards) {
        this.moveHistory.push({ from, to, cards: cards.map(cloneCard) });
    }
    undo() {
        if (this.moveHistory.length === 0)
            return;
        // 简化版本：重新加载当前关卡
        this.scene.restart();
    }
    clearSelection() {
        this.selectedCards = [];
    }
    checkWin() {
        if (this.foundationArea.isComplete()) {
            this.gameState.isCompleted = true;
            this.gameState.isWon = true;
            // 停止计时
            if (this.timerEvent) {
                this.timerEvent.remove();
            }
            // 记录完成
            this.playerData = recordGameCompletion(this.playerData, this.level.id, this.gameState.timeElapsed, this.gameState.movesCount);
            this.registry.set('playerData', this.playerData);
            // 延迟显示结果
            this.time.delayedCall(500, () => {
                this.scene.start('ResultScene', {
                    level: this.level,
                    time: this.gameState.timeElapsed,
                    moves: this.gameState.movesCount,
                    stars: this.playerData.bestScores[this.level.id]?.stars || 1
                });
            });
        }
    }
    showHint() {
        // 简化版本：高亮可移动的牌
        this.gameState.hintsUsed++;
        // 找到可以移动到目标区的牌
        for (let col = 0; col < 8; col++) {
            const column = this.tableauCards[col];
            if (column.length === 0)
                continue;
            const topCard = column[column.length - 1];
            const suitIndex = this.foundationArea.getSuitIndex(topCard.cardData.suit);
            if (canMoveToFoundation(topCard.cardData, this.foundationCards[suitIndex])) {
                topCard.setHighlight(true);
                this.time.delayedCall(2000, () => {
                    topCard.setHighlight(false);
                });
                return;
            }
        }
    }
    createBottomBar(width, height) {
        const y = height - 80;
        // 提示按钮
        this.createActionButton(width / 2 - 120, y, '💡', '提示', () => this.showHint());
        // 撤销按钮
        this.createActionButton(width / 2, y, '↩️', '撤销', () => this.undo());
        // 重开按钮
        this.createActionButton(width / 2 + 120, y, '🔄', '重开', () => this.scene.restart());
    }
    createActionButton(x, y, icon, label, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 80, 60, 0x3a3a5e)
            .setStrokeStyle(2, 0x4ecdc4)
            .setInteractive({ useHandCursor: true });
        const iconText = this.add.text(0, -8, icon, {
            fontSize: '24px'
        }).setOrigin(0.5);
        const labelText = this.add.text(0, 18, label, {
            fontSize: '12px',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        container.add([bg, iconText, labelText]);
        bg.on('pointerover', () => bg.setFillStyle(0x4ecdc4, 0.3));
        bg.on('pointerout', () => bg.setFillStyle(0x3a3a5e));
        bg.on('pointerdown', callback);
        return container;
    }
    startTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.isPaused && !this.gameState.isCompleted) {
                    this.gameState.timeElapsed++;
                    this.updateTimerDisplay();
                }
            },
            loop: true
        });
    }
    updateTimerDisplay() {
        const minutes = Math.floor(this.gameState.timeElapsed / 60);
        const seconds = this.gameState.timeElapsed % 60;
        this.timerText.setText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
    updateMovesDisplay() {
        this.movesText.setText(`移动: ${this.gameState.movesCount}`);
    }
    confirmExit() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        overlay.setDepth(100);
        const title = this.add.text(width / 2, height / 2 - 60, '确认退出？', {
            fontSize: '36px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(101);
        const yesBtn = this.add.rectangle(width / 2 - 80, height / 2 + 40, 120, 50, 0xff6b6b)
            .setInteractive({ useHandCursor: true }).setDepth(101);
        const yesText = this.add.text(width / 2 - 80, height / 2 + 40, '退出', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(101);
        const noBtn = this.add.rectangle(width / 2 + 80, height / 2 + 40, 120, 50, 0x4ecdc4)
            .setInteractive({ useHandCursor: true }).setDepth(101);
        const noText = this.add.text(width / 2 + 80, height / 2 + 40, '继续', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(101);
        yesBtn.on('pointerdown', () => this.scene.start('LevelSelectScene'));
        noBtn.on('pointerdown', () => {
            overlay.destroy();
            title.destroy();
            yesBtn.destroy();
            yesText.destroy();
            noBtn.destroy();
            noText.destroy();
        });
    }
    /**
     * 获取游戏状态 (用于测试)
     */
    getGameStateForTest() {
        return {
            levelId: this.level?.id,
            tableau: this.tableauCards.map(col => col.map(card => ({
                suit: card.cardData.suit,
                rank: card.cardData.rank,
                id: card.cardData.id
            }))),
            freeCells: this.freeCellCards.map(c => c ? { suit: c.suit, rank: c.rank } : null),
            foundations: this.foundationCards.map(f => f.map(c => ({ suit: c.suit, rank: c.rank }))),
            movesCount: this.gameState?.movesCount || 0,
            timeElapsed: this.gameState?.timeElapsed || 0,
            isCompleted: this.gameState?.isCompleted || false
        };
    }
    shutdown() {
        if (this.timerEvent) {
            this.timerEvent.remove();
        }
    }
}
//# sourceMappingURL=GameScene.js.map