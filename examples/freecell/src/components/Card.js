import Phaser from 'phaser';
import { SUIT_SYMBOLS, SUIT_COLORS, RANK_DISPLAY } from '../types';
export class Card extends Phaser.GameObjects.Container {
    cardData;
    bg;
    rankText;
    suitText;
    originalPosition = { x: 0, y: 0 };
    highlight;
    constructor(scene, x, y, card) {
        super(scene, x, y);
        this.cardData = card;
        const width = 70;
        const height = 100;
        // 卡牌背景
        this.bg = scene.add.rectangle(0, 0, width, height, 0xffffff, 1);
        this.bg.setStrokeStyle(2, 0x333333);
        this.add(this.bg);
        // 高亮边框
        this.highlight = scene.add.rectangle(0, 0, width + 4, height + 4, 0x4ecdc4, 0);
        this.highlight.setStrokeStyle(3, 0x4ecdc4);
        this.add(this.highlight);
        this.sendToBack(this.highlight);
        // 花色颜色
        const color = SUIT_COLORS[card.suit] === 'red' ? '#e74c3c' : '#2c3e50';
        const suitSymbol = SUIT_SYMBOLS[card.suit];
        const rankDisplay = RANK_DISPLAY[card.rank];
        // 左上角
        this.rankText = scene.add.text(-width / 2 + 8, -height / 2 + 5, rankDisplay, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: color,
            fontStyle: 'bold'
        }).setOrigin(0, 0);
        this.add(this.rankText);
        this.suitText = scene.add.text(-width / 2 + 8, -height / 2 + 22, suitSymbol, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: color
        }).setOrigin(0, 0);
        this.add(this.suitText);
        // 中心大花色
        const centerSuit = scene.add.text(0, 5, suitSymbol, {
            fontSize: '36px',
            fontFamily: 'Arial',
            color: color
        }).setOrigin(0.5);
        this.add(centerSuit);
        // 右下角 (倒置)
        const rankTextBR = scene.add.text(width / 2 - 8, height / 2 - 5, rankDisplay, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: color,
            fontStyle: 'bold'
        }).setOrigin(1, 1).setRotation(Math.PI);
        this.add(rankTextBR);
        const suitTextBR = scene.add.text(width / 2 - 8, height / 2 - 22, suitSymbol, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: color
        }).setOrigin(1, 1).setRotation(Math.PI);
        this.add(suitTextBR);
        // 交互 - 设置整个 Container 为可交互和可拖拽
        this.setSize(width, height);
        this.setInteractive({ useHandCursor: true, draggable: true });
        scene.add.existing(this);
    }
    // 设置高亮
    setHighlight(enabled) {
        this.highlight.setFillStyle(0x4ecdc4, enabled ? 0.2 : 0);
        this.highlight.setStrokeStyle(enabled ? 3 : 0, 0x4ecdc4);
    }
    // 设置选中状态
    setSelected(selected) {
        this.bg.setFillStyle(selected ? 0xe8f4f8 : 0xffffff);
        this.setHighlight(selected);
    }
    // 开始拖拽
    startDrag() {
        this.originalPosition = { x: this.x, y: this.y };
        this.setDepth(1000);
        this.setScale(1.05);
    }
    // 结束拖拽
    endDrag() {
        this.setDepth(0);
        this.setScale(1);
    }
    // 返回原位
    returnToOriginal() {
        this.endDrag();
        this.scene.tweens.add({
            targets: this,
            x: this.originalPosition.x,
            y: this.originalPosition.y,
            duration: 150,
            ease: 'Power2'
        });
    }
    // 移动到新位置 (动画)
    animateTo(x, y, duration = 150) {
        this.endDrag();
        this.scene.tweens.add({
            targets: this,
            x,
            y,
            duration,
            ease: 'Power2'
        });
    }
    // 设置可交互状态
    setCardInteractive(enabled) {
        if (enabled) {
            this.setInteractive({ useHandCursor: true, draggable: true });
        }
        else {
            this.disableInteractive();
        }
    }
}
//# sourceMappingURL=Card.js.map