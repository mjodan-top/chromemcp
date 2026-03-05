import Phaser from 'phaser';
import { Card as CardType, SUIT_SYMBOLS } from '../types';

// 空位区组件 (4个空位)
export class FreeCellArea {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private slots: Phaser.GameObjects.Rectangle[] = [];
  private cards: (CardType | null)[] = [null, null, null, null];
  private cardWidth: number = 70;
  private cardHeight: number = 100;
  private gap: number = 10;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.createSlots();
  }

  private createSlots(): void {
    for (let i = 0; i < 4; i++) {
      const slotX = this.x + i * (this.cardWidth + this.gap);

      // 空位背景
      const slot = this.scene.add.rectangle(
        slotX,
        this.y,
        this.cardWidth,
        this.cardHeight,
        0x2a2a4e,
        0.5
      );
      slot.setStrokeStyle(2, 0x4ecdc4, 0.5);

      // 标签
      this.scene.add.text(slotX, this.y, '空位', {
        fontSize: '12px',
        color: '#4ecdc4'
      }).setOrigin(0.5).setAlpha(0.5);

      this.slots.push(slot);
    }
  }

  // 获取槽位位置
  getSlotPosition(index: number): { x: number; y: number } {
    return {
      x: this.x + index * (this.cardWidth + this.gap),
      y: this.y
    };
  }

  // 设置卡牌
  setCard(index: number, card: CardType | null): void {
    this.cards[index] = card;
  }

  // 获取卡牌
  getCard(index: number): CardType | null {
    return this.cards[index];
  }

  // 获取所有卡牌
  getAllCards(): (CardType | null)[] {
    return [...this.cards];
  }

  // 获取空槽位索引
  getEmptySlotIndex(): number {
    return this.cards.findIndex(card => card === null);
  }

  // 获取槽位区域 (用于碰撞检测)
  getSlotBounds(index: number): Phaser.Geom.Rectangle {
    const pos = this.getSlotPosition(index);
    return new Phaser.Geom.Rectangle(
      pos.x - this.cardWidth / 2,
      pos.y - this.cardHeight / 2,
      this.cardWidth,
      this.cardHeight
    );
  }

  // 检查点是否在区域内
  containsPoint(x: number, y: number): number {
    for (let i = 0; i < 4; i++) {
      const bounds = this.getSlotBounds(i);
      if (bounds.contains(x, y)) {
        return i;
      }
    }
    return -1;
  }
}

// 目标区组件 (4个花色堆)
export class FoundationArea {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private slots: Phaser.GameObjects.Rectangle[] = [];
  private foundations: CardType[][] = [[], [], [], []];
  private cardWidth: number = 70;
  private cardHeight: number = 100;
  private gap: number = 10;
  private suitOrder = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.createSlots();
  }

  private createSlots(): void {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const suitColors = {
      hearts: '#e74c3c',
      diamonds: '#e74c3c',
      clubs: '#2c3e50',
      spades: '#2c3e50'
    };

    for (let i = 0; i < 4; i++) {
      const slotX = this.x + i * (this.cardWidth + this.gap);

      // 空位背景
      const slot = this.scene.add.rectangle(
        slotX,
        this.y,
        this.cardWidth,
        this.cardHeight,
        0x2a2a4e,
        0.5
      );
      slot.setStrokeStyle(2, 0x4ecdc4, 0.5);

      // 花色提示
      this.scene.add.text(slotX, this.y, SUIT_SYMBOLS[suits[i]], {
        fontSize: '32px',
        color: suitColors[suits[i]]
      }).setOrigin(0.5).setAlpha(0.3);

      this.slots.push(slot);
    }
  }

  // 获取槽位位置
  getSlotPosition(index: number): { x: number; y: number } {
    return {
      x: this.x + index * (this.cardWidth + this.gap),
      y: this.y
    };
  }

  // 获取花色索引
  getSuitIndex(suit: string): number {
    return this.suitOrder.indexOf(suit as any);
  }

  // 设置卡牌堆
  setCards(index: number, cards: CardType[]): void {
    this.foundations[index] = [...cards];
  }

  // 获取卡牌堆
  getCards(index: number): CardType[] {
    return this.foundations[index];
  }

  // 获取所有卡牌
  getAllCards(): CardType[][] {
    return this.foundations.map(f => [...f]);
  }

  // 获取顶部卡牌
  getTopCard(index: number): CardType | undefined {
    const pile = this.foundations[index];
    return pile.length > 0 ? pile[pile.length - 1] : undefined;
  }

  // 获取槽位区域
  getSlotBounds(index: number): Phaser.Geom.Rectangle {
    const pos = this.getSlotPosition(index);
    return new Phaser.Geom.Rectangle(
      pos.x - this.cardWidth / 2,
      pos.y - this.cardHeight / 2,
      this.cardWidth,
      this.cardHeight
    );
  }

  // 检查点是否在区域内
  containsPoint(x: number, y: number): number {
    for (let i = 0; i < 4; i++) {
      const bounds = this.getSlotBounds(i);
      if (bounds.contains(x, y)) {
        return i;
      }
    }
    return -1;
  }

  // 检查是否完成
  isComplete(): boolean {
    return this.foundations.every(pile => pile.length === 13);
  }

  // 获取总卡牌数
  getTotalCards(): number {
    return this.foundations.reduce((sum, pile) => sum + pile.length, 0);
  }
}