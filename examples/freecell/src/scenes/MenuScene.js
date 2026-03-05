import Phaser from 'phaser';
import { resetPlayerData, loadPlayerData } from '../utils/storage';
export class MenuScene extends Phaser.Scene {
    playerData;
    constructor() {
        super({ key: 'MenuScene' });
    }
    create() {
        this.playerData = this.registry.get('playerData');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        // 背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        // 标题
        this.add.text(width / 2, height * 0.2, '空挡接龙', {
            fontSize: '64px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        // 副标题
        this.add.text(width / 2, height * 0.28, 'FreeCell', {
            fontSize: '28px',
            color: '#4ecdc4'
        }).setOrigin(0.5);
        // 统计信息
        this.createStatsDisplay(width, height);
        // 开始按钮
        this.createButton(width / 2, height * 0.5, '开始游戏', () => {
            this.scene.start('LevelSelectScene');
        });
        // 继续游戏按钮 (如果有进度)
        const lastPlayed = this.getLastPlayedLevel();
        if (lastPlayed > 1) {
            this.createButton(width / 2, height * 0.62, `继续第 ${lastPlayed} 关`, () => {
                this.scene.start('GameScene', { levelId: lastPlayed });
            });
        }
        // 重置按钮
        const resetBtn = this.add.text(width / 2, height * 0.85, '重置进度', {
            fontSize: '20px',
            color: '#ff6b6b'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        resetBtn.on('pointerdown', () => {
            this.showResetConfirm();
        });
    }
    createStatsDisplay(width, height) {
        const statsY = height * 0.38;
        const spacing = 120;
        const stats = [
            { label: '已通关', value: this.playerData.completedLevels.length.toString() },
            { label: '胜率', value: this.getWinRate() },
            { label: '连胜', value: this.playerData.currentStreak.toString() }
        ];
        stats.forEach((stat, index) => {
            const x = width / 2 + (index - 1) * spacing;
            this.add.text(x, statsY, stat.value, {
                fontSize: '36px',
                color: '#4ecdc4',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add.text(x, statsY + 35, stat.label, {
                fontSize: '16px',
                color: '#888888'
            }).setOrigin(0.5);
        });
    }
    createButton(x, y, text, callback) {
        const button = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 280, 60, 0x4ecdc4, 0.2)
            .setStrokeStyle(2, 0x4ecdc4)
            .setInteractive({ useHandCursor: true });
        const label = this.add.text(0, 0, text, {
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5);
        button.add([bg, label]);
        bg.on('pointerover', () => {
            bg.setFillStyle(0x4ecdc4, 0.4);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x4ecdc4, 0.2);
        });
        bg.on('pointerdown', callback);
    }
    getWinRate() {
        if (this.playerData.totalGamesPlayed === 0)
            return '0%';
        const rate = (this.playerData.totalWins / this.playerData.totalGamesPlayed) * 100;
        return `${Math.round(rate)}%`;
    }
    getLastPlayedLevel() {
        const completed = this.playerData.completedLevels;
        if (completed.length === 0)
            return 1;
        return Math.max(...completed) + 1;
    }
    showResetConfirm() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        // 遮罩
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        // 确认框
        const modal = this.add.container(width / 2, height / 2);
        const bg = this.add.rectangle(0, 0, 320, 180, 0x2a2a4e);
        const title = this.add.text(0, -50, '确认重置？', {
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5);
        const desc = this.add.text(0, -10, '所有进度将被清除', {
            fontSize: '18px',
            color: '#888888'
        }).setOrigin(0.5);
        modal.add([bg, title, desc]);
        // 确认按钮
        const confirmBtn = this.add.rectangle(-70, 50, 100, 40, 0xff6b6b)
            .setInteractive({ useHandCursor: true });
        const confirmText = this.add.text(-70, 50, '确认', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
        modal.add([confirmBtn, confirmText]);
        confirmBtn.on('pointerdown', () => {
            resetPlayerData();
            this.playerData = loadPlayerData();
            this.registry.set('playerData', this.playerData);
            overlay.destroy();
            modal.destroy();
            this.scene.restart();
        });
        // 取消按钮
        const cancelBtn = this.add.rectangle(70, 50, 100, 40, 0x4ecdc4)
            .setInteractive({ useHandCursor: true });
        const cancelText = this.add.text(70, 50, '取消', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);
        modal.add([cancelBtn, cancelText]);
        cancelBtn.on('pointerdown', () => {
            overlay.destroy();
            modal.destroy();
        });
    }
}
//# sourceMappingURL=MenuScene.js.map