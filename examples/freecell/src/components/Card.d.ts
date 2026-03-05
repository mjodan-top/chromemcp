import Phaser from 'phaser';
import { Card as CardType } from '../types';
export declare class Card extends Phaser.GameObjects.Container {
    cardData: CardType;
    bg: Phaser.GameObjects.Rectangle;
    private rankText;
    private suitText;
    private originalPosition;
    private highlight;
    constructor(scene: Phaser.Scene, x: number, y: number, card: CardType);
    setHighlight(enabled: boolean): void;
    setSelected(selected: boolean): void;
    startDrag(): void;
    endDrag(): void;
    returnToOriginal(): void;
    animateTo(x: number, y: number, duration?: number): void;
    setCardInteractive(enabled: boolean): void;
}
//# sourceMappingURL=Card.d.ts.map