import Phaser from 'phaser';
import { getAllLevels, TOTAL_LEVELS } from '../data/levels';
export class LevelSelectScene extends Phaser.Scene {
    playerData;
    levels = [];
    scrollContainer;
    scrollY = 0;
    constructor() {
        super({ key: 'LevelSelectScene' });
    }
    create() {
        this.playerData = this.registry.get('playerData');
        this.levels = getAllLevels();
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        // 背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        // 标题栏
        this.createHeader(width);
        // 关卡网格
        this.createLevelGrid(width, height);
        // 返回按钮
        this.createBackButton();
    }
    createHeader(width) {
        // 标题
        this.add.text(width / 2, 40, '选择关卡', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        // 进度
        const completed = this.playerData.completedLevels.length;
        this.add.text(width / 2, 80, `通关: ${completed} / ${TOTAL_LEVELS}`, {
            fontSize: '18px',
            color: '#4ecdc4'
        }).setOrigin(0.5);
    }
    createLevelGrid(width, height) {
        const cols = 5;
        const cellWidth = 100;
        const cellHeight = 100;
        const startX = (width - cols * cellWidth) / 2 + cellWidth / 2;
        const startY = 160;
        // 创建滚动容器
        this.scrollContainer = this.add.container(0, 0);
        const totalRows = Math.ceil(TOTAL_LEVELS / cols);
        const totalHeight = totalRows * cellHeight + 200;
        for (let i = 0; i < TOTAL_LEVELS; i++) {
            const level = this.levels[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * cellWidth;
            const y = startY + row * cellHeight;
            this.createLevelButton(x, y, level);
        }
        // 启用滚动
        if (totalHeight > height) {
            this.enableScrolling(height, totalHeight);
        }
    }
    createLevelButton(x, y, level) {
        const isUnlocked = this.playerData.unlockedLevels.includes(level.id);
        const isCompleted = this.playerData.completedLevels.includes(level.id);
        const bestScore = this.playerData.bestScores[level.id];
        const container = this.add.container(x, y);
        // 按钮背景
        let bgColor = 0x333355;
        if (isCompleted) {
            bgColor = 0x2a5a4a;
        }
        else if (isUnlocked) {
            bgColor = 0x3a3a5e;
        }
        const bg = this.add.rectangle(0, 0, 80, 80, bgColor)
            .setStrokeStyle(2, isUnlocked ? 0x4ecdc4 : 0x444466)
            .setInteractive({ useHandCursor: isUnlocked });
        // 关卡编号
        const textColor = isUnlocked ? '#ffffff' : '#666666';
        const levelNum = this.add.text(0, -10, level.id.toString(), {
            fontSize: '32px',
            color: textColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add([bg, levelNum]);
        // 星星显示
        if (isCompleted && bestScore) {
            const stars = this.add.text(0, 20, '★'.repeat(bestScore.stars) + '☆'.repeat(3 - bestScore.stars), {
                fontSize: '14px',
                color: '#ffd700'
            }).setOrigin(0.5);
            container.add(stars);
        }
        // 锁定图标
        if (!isUnlocked) {
            const lock = this.add.text(0, 20, '🔒', {
                fontSize: '20px'
            }).setOrigin(0.5);
            container.add(lock);
        }
        // 难度指示
        const difficultyColor = {
            easy: 0x4ecdc4,
            medium: 0xffd93d,
            hard: 0xff6b6b
        };
        const indicator = this.add.circle(30, -30, 6, difficultyColor[level.difficulty]);
        container.add(indicator);
        // 点击事件
        if (isUnlocked) {
            bg.on('pointerdown', () => {
                this.scene.start('GameScene', { levelId: level.id });
            });
            bg.on('pointerover', () => {
                bg.setFillStyle(0x4ecdc4, 0.3);
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(bgColor, 1);
            });
        }
    }
    enableScrolling(height, totalHeight) {
        let startY = 0;
        const maxScroll = Math.max(0, totalHeight - height + 100);
        this.input.on('pointerdown', (pointer) => {
            startY = pointer.y;
        });
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                const deltaY = pointer.y - startY;
                this.scrollY = Phaser.Math.Clamp(this.scrollY - deltaY, 0, maxScroll);
                this.scrollContainer.setY(-this.scrollY);
                startY = pointer.y;
            }
        });
    }
    createBackButton() {
        const backBtn = this.add.text(30, 40, '←', {
            fontSize: '36px',
            color: '#ffffff'
        }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }
}
//# sourceMappingURL=LevelSelectScene.js.map