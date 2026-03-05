import Phaser from 'phaser';
import { getLevel } from '../data/levels';
import { loadPlayerData } from '../utils/storage';
export class ResultScene extends Phaser.Scene {
    levelData;
    gameTime;
    gameMoves;
    gameStars;
    playerData;
    constructor() {
        super({ key: 'ResultScene' });
    }
    init(data) {
        this.levelData = data.level;
        this.gameTime = data.time;
        this.gameMoves = data.moves;
        this.gameStars = data.stars;
        this.playerData = loadPlayerData();
    }
    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        // 背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        // 庆祝动画背景
        this.createCelebration(width, height);
        // 标题
        this.add.text(width / 2, height * 0.2, '🎉 恭喜通关！', {
            fontSize: '48px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        // 关卡名
        this.add.text(width / 2, height * 0.28, this.levelData.name, {
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5);
        // 星星
        this.createStars(width / 2, height * 0.38);
        // 统计信息
        this.createStats(width, height);
        // 按钮
        this.createButtons(width, height);
    }
    createCelebration(width, height) {
        // 简单的粒子效果
        const colors = [0xffd700, 0x4ecdc4, 0xff6b9d, 0x9b59b6];
        for (let i = 0; i < 30; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const color = Phaser.Math.RND.pick(colors);
            const particle = this.add.circle(x, y, Phaser.Math.Between(3, 8), color, 0.6);
            this.tweens.add({
                targets: particle,
                y: y + Phaser.Math.Between(-100, 100),
                x: x + Phaser.Math.Between(-50, 50),
                alpha: 0,
                duration: Phaser.Math.Between(1000, 3000),
                delay: Phaser.Math.Between(0, 1000),
                repeat: -1,
                onRepeat: () => {
                    particle.x = Phaser.Math.Between(0, width);
                    particle.y = Phaser.Math.Between(0, height);
                    particle.alpha = 0.6;
                }
            });
        }
    }
    createStars(x, y) {
        const starWidth = 60;
        const totalWidth = 3 * starWidth;
        const startX = x - totalWidth / 2 + starWidth / 2;
        for (let i = 0; i < 3; i++) {
            const starX = startX + i * starWidth;
            const isFilled = i < this.gameStars;
            const star = this.add.text(starX, y, '★', {
                fontSize: '48px',
                color: isFilled ? '#ffd700' : '#333333'
            }).setOrigin(0.5);
            if (isFilled) {
                // 星星出现动画
                star.setScale(0);
                this.tweens.add({
                    targets: star,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 300,
                    delay: i * 200,
                    ease: 'Back.easeOut'
                });
            }
        }
    }
    createStats(width, height) {
        const statsY = height * 0.52;
        const cardWidth = 150;
        // 时间
        this.createStatCard(width / 2 - cardWidth - 20, statsY, cardWidth, this.formatTime(this.gameTime), '用时');
        // 移动
        this.createStatCard(width / 2 + 20, statsY, cardWidth, this.gameMoves.toString(), '移动次数');
        // 检查是否是最佳成绩
        const bestScore = this.playerData.bestScores[this.levelData.id];
        if (bestScore) {
            if (this.gameTime <= bestScore.time) {
                this.add.text(width / 2, statsY + 80, '🏆 新纪录！', {
                    fontSize: '24px',
                    color: '#ffd700'
                }).setOrigin(0.5);
            }
        }
    }
    createStatCard(x, y, cardWidth, value, label) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, cardWidth, 80, 0x2a2a4e, 0.8)
            .setStrokeStyle(2, 0x4ecdc4);
        const valueText = this.add.text(0, -10, value, {
            fontSize: '32px',
            color: '#4ecdc4',
            fontStyle: 'bold',
            fontFamily: 'monospace'
        }).setOrigin(0.5);
        const labelText = this.add.text(0, 25, label, {
            fontSize: '16px',
            color: '#888888'
        }).setOrigin(0.5);
        container.add([bg, valueText, labelText]);
        return container;
    }
    createButtons(width, height) {
        const y = height * 0.75;
        // 下一关按钮
        if (this.levelData.id < 100) {
            this.createButton(width / 2, y, '下一关', 0x4ecdc4, () => {
                const nextLevel = getLevel(this.levelData.id + 1);
                if (nextLevel) {
                    this.scene.start('GameScene', { levelId: nextLevel.id });
                }
            });
        }
        // 重玩按钮
        this.createButton(width / 2 - 150, y + 80, '再玩一次', 0x3a3a5e, () => {
            this.scene.start('GameScene', { levelId: this.levelData.id });
        });
        // 关卡选择按钮
        this.createButton(width / 2 + 150, y + 80, '关卡选择', 0x3a3a5e, () => {
            this.scene.start('LevelSelectScene');
        });
        // 返回主菜单
        const menuBtn = this.add.text(width / 2, height * 0.92, '返回主菜单', {
            fontSize: '18px',
            color: '#888888'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        menuBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }
    createButton(x, y, text, color, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 200, 55, color)
            .setStrokeStyle(2, 0xffffff, 0.3)
            .setInteractive({ useHandCursor: true });
        const label = this.add.text(0, 0, text, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add([bg, label]);
        bg.on('pointerover', () => bg.setFillStyle(color, 0.8));
        bg.on('pointerout', () => bg.setFillStyle(color, 1));
        bg.on('pointerdown', callback);
    }
    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }
}
//# sourceMappingURL=ResultScene.js.map