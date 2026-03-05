import { Card, Suit, SuitColor } from '../types';
export declare function createDeck(): Card[];
export declare function shuffleWithSeed(deck: Card[], seed: number): Card[];
export declare function getCardValue(card: Card): number;
export declare function getSuitColor(suit: Suit): SuitColor;
export declare function isRed(card: Card): boolean;
export declare function isBlack(card: Card): boolean;
export declare function isOppositeColor(card1: Card, card2: Card): boolean;
export declare function canStackOnTableau(movingCard: Card, targetCard: Card): boolean;
export declare function canMoveToFoundation(card: Card, foundation: Card[]): boolean;
export declare function canMoveToFreeCell(freeCells: (Card | null)[]): boolean;
export declare function getMaxMovableCards(freeCells: (Card | null)[], tableau: Card[][], excludeColumn?: number): number;
export declare function getCardDisplay(card: Card): string;
export declare function getSuitIndex(suit: Suit): number;
export declare function dealCards(deck: Card[]): Card[][];
export declare function cloneCard(card: Card): Card;
export declare function cloneCards(cards: Card[]): Card[];
//# sourceMappingURL=deck.d.ts.map