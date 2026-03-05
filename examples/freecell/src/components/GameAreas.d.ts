import Phaser from 'phaser';
import { Card as CardType } from '../types';
export declare class FreeCellArea {
    private scene;
    private x;
    private y;
    private slots;
    private cards;
    private cardWidth;
    private cardHeight;
    private gap;
    constructor(scene: Phaser.Scene, x: number, y: number);
    private createSlots;
    getSlotPosition(index: number): {
        x: number;
        y: number;
    };
    setCard(index: number, card: CardType | null): void;
    getCard(index: number): CardType | null;
    getAllCards(): (CardType | null)[];
    getEmptySlotIndex(): number;
    getSlotBounds(index: number): Phaser.Geom.Rectangle;
    containsPoint(x: number, y: number): number;
}
export declare class FoundationArea {
    private scene;
    private x;
    private y;
    private slots;
    private foundations;
    private cardWidth;
    private cardHeight;
    private gap;
    private suitOrder;
    constructor(scene: Phaser.Scene, x: number, y: number);
    private createSlots;
    getSlotPosition(index: number): {
        x: number;
        y: number;
    };
    getSuitIndex(suit: string): number;
    setCards(index: number, cards: CardType[]): void;
    getCards(index: number): CardType[];
    getAllCards(): CardType[][];
    getTopCard(index: number): CardType | undefined;
    getSlotBounds(index: number): Phaser.Geom.Rectangle;
    containsPoint(x: number, y: number): number;
    isComplete(): boolean;
    getTotalCards(): number;
}
//# sourceMappingURL=GameAreas.d.ts.map