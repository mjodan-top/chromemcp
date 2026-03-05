import { Card, Suit, SUIT_COLORS, SUIT_SYMBOLS, RANK_DISPLAY, SuitColor } from '../types';

// 创建一副牌 (52张)
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];
  let id = 0;

  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        suit,
        rank,
        faceUp: true,
        id: `card-${id++}`
      });
    }
  }

  return deck;
}

// 线性同余生成器 (LCG) 用于可重复的随机数
function createSeededRNG(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// 使用种子洗牌
export function shuffleWithSeed(deck: Card[], seed: number): Card[] {
  const shuffled = [...deck];
  const rng = createSeededRNG(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// 获取牌面值
export function getCardValue(card: Card): number {
  return card.rank;
}

// 判断花色颜色
export function getSuitColor(suit: Suit): SuitColor {
  return SUIT_COLORS[suit];
}

// 判断是否红色
export function isRed(card: Card): boolean {
  return getSuitColor(card.suit) === 'red';
}

// 判断是否黑色
export function isBlack(card: Card): boolean {
  return getSuitColor(card.suit) === 'black';
}

// 判断两张牌颜色是否不同
export function isOppositeColor(card1: Card, card2: Card): boolean {
  return getSuitColor(card1.suit) !== getSuitColor(card2.suit);
}

// 判断是否可以叠放在游戏区 (tableau)
// 规则: 颜色交替，点数递减
export function canStackOnTableau(movingCard: Card, targetCard: Card): boolean {
  return isOppositeColor(movingCard, targetCard) && movingCard.rank === targetCard.rank - 1;
}

// 判断是否可以放入目标区 (foundation)
// 规则: 同花色，点数递增 (从A开始)
export function canMoveToFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) {
    return card.rank === 1; // 只有A可以放入空目标区
  }
  const topCard = foundation[foundation.length - 1];
  return card.suit === topCard.suit && card.rank === topCard.rank + 1;
}

// 判断是否可以放入空位 (freeCell)
export function canMoveToFreeCell(freeCells: (Card | null)[]): boolean {
  return freeCells.some(cell => cell === null);
}

// 计算可移动的最大卡牌数
// 公式: (空位数 + 1) * (空列数 + 1)
export function getMaxMovableCards(
  freeCells: (Card | null)[],
  tableau: Card[][],
  excludeColumn?: number
): number {
  const emptyFreeCells = freeCells.filter(cell => cell === null).length;
  const emptyColumns = tableau.filter((col, idx) =>
    col.length === 0 && idx !== excludeColumn
  ).length;

  return (emptyFreeCells + 1) * (emptyColumns + 1);
}

// 获取卡牌显示文本
export function getCardDisplay(card: Card): string {
  return `${RANK_DISPLAY[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

// 获取花色索引 (0-3)
export function getSuitIndex(suit: Suit): number {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  return suits.indexOf(suit);
}

// 初始化游戏区布局
export function dealCards(deck: Card[]): Card[][] {
  const tableau: Card[][] = [[], [], [], [], [], [], [], []];

  // 前4列各7张，后4列各6张
  let cardIndex = 0;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 8; col++) {
      // 第7行只发到前4列
      if (row === 6 && col >= 4) continue;
      tableau[col].push(deck[cardIndex++]);
    }
  }

  return tableau;
}

// 深拷贝卡牌
export function cloneCard(card: Card): Card {
  return { ...card };
}

// 深拷贝卡牌数组
export function cloneCards(cards: Card[]): Card[] {
  return cards.map(cloneCard);
}