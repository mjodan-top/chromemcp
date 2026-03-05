import Phaser from 'phaser';
import { Card as CardType, GameState, CardLocation, Level, PlayerData } from '../types';
import { Card } from '../components/Card';
import { FreeCellArea, FoundationArea } from '../components/GameAreas';
import { getLevel } from '../data/levels';
import { createDeck, shuffleWithSeed, dealCards, canStackOnTableau, canMoveToFoundation, getMaxMovableCards, cloneCard } from '../utils/deck';
import { recordGameCompletion } from '../utils/storage';

export class GameScene extends Phaser.Scene {
  private level!: Level;
  private playerData!: PlayerData;
  private gameState!: GameState;
  private cards: Card[] = [];
  private freeCellArea!: FreeCellArea;
  private foundationArea!: FoundationArea;
  private tableauCards: Card[][] = [[], [], [], [], [], [], [], []];
  private freeCellCards: (CardType | null)[] = [null, null, null, null];
  private foundationCards: CardType[][] = [[], [], [], []];
  private moveHistory: { from: CardLocation; to: CardLocation; cards: CardType[] }[] = [];

  private timerText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private isPaused: boolean = false;
  private selectedCards: Card[] = [];
  // Used for tracking move source (useful for undo and move validation)
  // @ts-ignore - used for tracking
  private selectedSource: { type: 'tableau' | 'freeCell'; index: number } | null = null;

  private cardWidth: number = 70;
  private tableauStartY: number = 260;
  private cardGap: number = 25;

  // 双击检测相关
  private lastClickTime: number = 0;
  private lastClickedCard: Card | null = null;
  private readonly DOUBLE_CLICK_DELAY: number = 350;

  // 拖拽状态跟踪
  private isDragging: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelId: number }): void {
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
    this.selectedSource = null;
    this.lastClickTime = 0;
    this.lastClickedCard = null;
    this.isDragging = false;
  }

  create(): void {
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

  private createTopBar(width: number): void {
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
    const difficultyColors: Record<string, string> = {
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

  private createFunctionalAreas(width: number): void {
    const gap = 20;
    const totalWidth = 4 * this.cardWidth + 3 * 10 + gap + 4 * this.cardWidth + 3 * 10;
    const startX = (width - totalWidth) / 2 + this.cardWidth / 2;

    // 空位区 (左侧)
    this.freeCellArea = new FreeCellArea(this, startX, 150);

    // 目标区 (右侧)
    const foundationX = startX + 4 * (this.cardWidth + 10) + gap;
    this.foundationArea = new FoundationArea(this, foundationX, 150);

    // 设置FreeCell槽位的点击处理
    const freeCellSlots = this.freeCellArea.getSlotGameObjects();
    freeCellSlots.forEach((slot, index) => {
      slot.on('pointerdown', () => this.handleFreeCellSlotClick(index));
    });

    // 设置Foundation槽位的点击处理
    const foundationSlots = this.foundationArea.getSlotGameObjects();
    foundationSlots.forEach((slot, index) => {
      slot.on('pointerdown', () => this.handleFoundationSlotClick(index));
    });
  }

  private createTableauArea(width: number): void {
    const totalWidth = 8 * this.cardWidth + 7 * 10;
    const startX = (width - totalWidth) / 2 + this.cardWidth / 2;

    // 8列背景
    for (let i = 0; i < 8; i++) {
      const x = startX + i * (this.cardWidth + 10);
      this.add.rectangle(x, this.tableauStartY + 200, this.cardWidth, 400, 0x2a2a4e, 0.3)
        .setStrokeStyle(1, 0x4ecdc4, 0.2);
    }
  }

  private initializeCards(): void {
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

  private setupCardInteraction(card: Card, _col: number): void {
    // 单击处理（带双击检测）
    let clickTimer: NodeJS.Timeout | null = null;
    let pendingClick = false;

    card.on('pointerdown', () => {
      console.log('[pointerdown] Card clicked:', card.cardData.suit, card.cardData.rank, 'isDragging:', this.isDragging);

      // 如果正在拖拽，不处理点击
      if (this.isDragging) return;

      const now = Date.now();

      // 检查双击
      if (this.lastClickedCard === card && (now - this.lastClickTime) < this.DOUBLE_CLICK_DELAY) {
        console.log('[pointerdown] Double-click detected!');
        // 双击：取消单击定时器，执行双击操作
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        pendingClick = false;
        this.lastClickTime = 0;
        this.lastClickedCard = null;

        // 执行双击操作
        this.handleDoubleClick(card);
      } else {
        console.log('[pointerdown] Single click, lastClickedCard:', this.lastClickedCard?.cardData?.rank, 'time diff:', now - this.lastClickTime);
        // 记录点击时间和卡牌
        this.lastClickTime = now;
        this.lastClickedCard = card;

        // 延迟执行单击，等待可能的双击
        pendingClick = true;
        clickTimer = setTimeout(() => {
          if (pendingClick) {
            pendingClick = false;
            this.handleSingleClick(card);
          }
        }, this.DOUBLE_CLICK_DELAY);
      }
    });

    // 拖拽 - 直接在 Card (Container) 上设置
    this.input.setDraggable(card);

    card.on('dragstart', () => {
      // 设置拖拽状态
      this.isDragging = true;

      // 取消待处理的单击
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        pendingClick = false;
      }

      // 清除之前的选择
      this.clearCardSelection();

      // 检查是否在FreeCell中
      const freeCellIdx = this.freeCellCards.findIndex(c => c && c.id === card.cardData.id);
      if (freeCellIdx >= 0) {
        // FreeCell中的卡牌可以单独移动
        this.selectedCards = [card];
        this.selectedSource = { type: 'freeCell', index: freeCellIdx };
        card.startDrag();
        return;
      }

      // 重新查找卡牌当前所在的列（因为卡牌可能已经移动过）
      const currentCol = this.getTableauColumn(card);
      if (currentCol === -1) return;

      const cardsToMove = this.getMovableCardsFromTableau(currentCol, card);
      if (cardsToMove.length === 0) return;

      this.selectedCards = cardsToMove;
      this.selectedSource = { type: 'tableau', index: currentCol };
      cardsToMove.forEach(c => c.startDrag());
    });

    card.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
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
      // 重置拖拽状态
      this.isDragging = false;

      if (this.selectedCards.length > 0) {
        this.handleDrop(this.selectedCards);
      }
    });
  }

  // 处理单击（选中卡牌）
  private handleSingleClick(card: Card): void {
    // 如果已有选中的卡牌，尝试移动到目标位置
    if (this.selectedCards.length > 0 && this.selectedCards[0] !== card) {
      // 尝试将选中的卡牌放到点击的卡牌上
      const targetCol = this.getTableauColumn(card);
      if (targetCol >= 0) {
        const targetColumn = this.tableauCards[targetCol];
        const targetCard = targetColumn.length > 0 ? targetColumn[targetColumn.length - 1] : null;

        // 只有点击最底部的牌才能放置
        if (targetCard === card && this.selectedCards.length === 1) {
          if (canStackOnTableau(this.selectedCards[0].cardData, card.cardData)) {
            // 执行移动
            const fromCol = this.getTableauColumn(this.selectedCards[0]);
            if (fromCol >= 0) {
              this.moveCardsToTableau(this.selectedCards, fromCol, targetCol);
            } else {
              // 从freeCell移动
              const freeCellIdx = this.freeCellCards.findIndex(c => c && c.id === this.selectedCards[0].cardData.id);
              if (freeCellIdx >= 0) {
                this.moveCardFromFreeCellToTableau(this.selectedCards[0], freeCellIdx, targetCol);
              }
            }
            this.clearCardSelection();
            return;
          }
        }
      }
    }

    // 清除之前的选择
    this.clearCardSelection();

    // 选中这张牌
    card.setSelected(true);
    const currentCol = this.getTableauColumn(card);
    if (currentCol >= 0) {
      const cardsToSelect = this.getMovableCardsFromTableau(currentCol, card);
      this.selectedCards = cardsToSelect;
      this.selectedSource = { type: 'tableau', index: currentCol };
      cardsToSelect.forEach(c => c.setSelected(true));
    } else {
      // 检查是否在FreeCell中
      const freeCellIdx = this.freeCellCards.findIndex(c => c && c.id === card.cardData.id);
      if (freeCellIdx >= 0) {
        this.selectedCards = [card];
        this.selectedSource = { type: 'freeCell', index: freeCellIdx };
        card.setSelected(true);
      }
    }
  }

  // 处理双击（自动移动到Foundation）
  private handleDoubleClick(card: Card): void {
    console.log('[handleDoubleClick] Card:', card.cardData.suit, card.cardData.rank, 'Position:', card.x, card.y);

    // 清除选择
    this.clearCardSelection();

    // 设置标志，防止拖拽事件干扰
    this.isDragging = true;

    // 尝试自动移动到Foundation
    this.tryAutoMoveToFoundation(card);
  }

  // 清除卡牌选择状态
  private clearCardSelection(): void {
    this.selectedCards.forEach(c => c.setSelected(false));
    this.selectedCards = [];
    this.selectedSource = null;
  }

  // 处理FreeCell槽位点击
  private handleFreeCellSlotClick(index: number): void {
    const currentCard = this.freeCellCards[index];

    // 如果有选中的卡牌，尝试移动到这个空位
    if (this.selectedCards.length === 1 && currentCard === null) {
      const card = this.selectedCards[0];
      const fromCol = this.getTableauColumn(card);

      if (fromCol >= 0) {
        // 从tableau移动到freeCell
        this.moveCardToFreeCell(card, fromCol, index);
      } else {
        // 检查是否从另一个freeCell移动
        const fromFreeCellIdx = this.freeCellCards.findIndex(c => c && c.id === card.cardData.id);
        if (fromFreeCellIdx >= 0 && fromFreeCellIdx !== index) {
          // 从一个freeCell移动到另一个freeCell
          this.moveCardBetweenFreeCells(card, fromFreeCellIdx, index);
        }
      }
      this.clearCardSelection();
      return;
    }

    // 如果这个槽位有卡牌，选中它
    if (currentCard !== null) {
      // 找到对应的Card对象
      const cardObj = this.cards.find(c => c.cardData.id === currentCard.id);
      if (cardObj) {
        this.clearCardSelection();
        this.selectedCards = [cardObj];
        this.selectedSource = { type: 'freeCell', index };
        cardObj.setSelected(true);
      }
    }
  }

  // 处理Foundation槽位点击
  private handleFoundationSlotClick(index: number): void {
    // 如果有选中的卡牌（只能移动单张），尝试移动到Foundation
    if (this.selectedCards.length === 1) {
      const card = this.selectedCards[0];

      // 检查是否可以移动到这个Foundation
      if (canMoveToFoundation(card.cardData, this.foundationCards[index])) {
        const suitIndex = this.foundationArea.getSuitIndex(card.cardData.suit);

        // 确保花色匹配
        if (suitIndex === index) {
          const fromCol = this.getTableauColumn(card);
          if (fromCol >= 0) {
            this.moveCardToFoundation(card, fromCol, index);
          } else {
            // 从freeCell移动
            const freeCellIdx = this.freeCellCards.findIndex(c => c && c.id === card.cardData.id);
            if (freeCellIdx >= 0) {
              this.moveCardFromFreeCellToFoundation(card, freeCellIdx, index);
            }
          }
        }
      }
      this.clearCardSelection();
    }
  }

  // 在FreeCell之间移动卡牌
  private moveCardBetweenFreeCells(card: Card, fromIndex: number, toIndex: number): void {
    // 记录移动
    this.recordMove(
      { type: 'freeCell', index: fromIndex },
      { type: 'freeCell', index: toIndex },
      [card.cardData]
    );

    // 从原位置移除
    this.freeCellCards[fromIndex] = null;
    this.freeCellArea.setCard(fromIndex, null);

    // 添加到新位置
    this.freeCellCards[toIndex] = card.cardData;
    this.freeCellArea.setCard(toIndex, card.cardData);

    // 移动卡牌
    const pos = this.freeCellArea.getSlotPosition(toIndex);
    card.animateTo(pos.x, pos.y);

    // 更新计数
    this.gameState.movesCount++;
    this.updateMovesDisplay();
  }

  private getMovableCardsFromTableau(col: number, card: Card): Card[] {
    const column = this.tableauCards[col];
    const cardIndex = column.indexOf(card);
    if (cardIndex === -1) return [];

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
    const maxMovable = getMaxMovableCards(
      this.freeCellCards,
      tableauData,
      col
    );

    if (cardsToMove.length > maxMovable) {
      return [];
    }

    return cardsToMove;
  }

  
  private tryAutoMoveToFoundation(card: Card): void {
    const suitIndex = this.foundationArea.getSuitIndex(card.cardData.suit);
    console.log('[tryAutoMoveToFoundation] Card:', card.cardData.suit, card.cardData.rank, 'suitIndex:', suitIndex);

    if (suitIndex === -1) {
      console.log('[tryAutoMoveToFoundation] Invalid suitIndex, returning');
      return;
    }

    const canMove = canMoveToFoundation(card.cardData, this.foundationCards[suitIndex]);
    console.log('[tryAutoMoveToFoundation] canMoveToFoundation:', canMove, 'foundationCards length:', this.foundationCards[suitIndex].length);

    if (canMove) {
      // 找到卡牌所在列
      let fromCol = -1;
      for (let i = 0; i < 8; i++) {
        if (this.tableauCards[i].includes(card)) {
          fromCol = i;
          break;
        }
      }

      console.log('[tryAutoMoveToFoundation] fromCol:', fromCol);

      if (fromCol >= 0) {
        console.log('[tryAutoMoveToFoundation] Moving from tableau to foundation');
        this.moveCardToFoundation(card, fromCol, suitIndex);
      } else {
        // 检查是否在freeCell中
        const freeCellIdx = this.freeCellCards.findIndex(c => c && c.id === card.cardData.id);
        console.log('[tryAutoMoveToFoundation] freeCellIdx:', freeCellIdx);
        if (freeCellIdx >= 0) {
          console.log('[tryAutoMoveToFoundation] Moving from freeCell to foundation');
          this.moveCardFromFreeCellToFoundation(card, freeCellIdx, suitIndex);
        } else {
          console.log('[tryAutoMoveToFoundation] Card not found in tableau or freeCell');
        }
      }
    } else {
      console.log('[tryAutoMoveToFoundation] Cannot move to foundation - conditions not met');
    }
  }

  private handleDrop(cards: Card[]): void {
    if (cards.length === 0) return;

    const card = cards[0];
    const x = card.x;
    const y = card.y;

    // 检查放置位置
    const width = this.cameras.main.width;

    // 检查目标区
    const foundationIndex = this.foundationArea.containsPoint(x, y);
    if (foundationIndex >= 0 && cards.length === 1) {
      if (canMoveToFoundation(card.cardData, this.foundationCards[foundationIndex])) {
        // 检查卡牌是否在freeCell中
        const freeCellIdx = this.freeCellCards.findIndex(c => c && c.id === card.cardData.id);
        if (freeCellIdx >= 0) {
          // 从freeCell移动到foundation
          this.moveCardFromFreeCellToFoundation(card, freeCellIdx, foundationIndex);
        } else {
          // 从tableau移动到foundation
          this.moveCardToFoundation(card, this.getTableauColumn(card), foundationIndex);
        }
        this.clearSelection();
        return;
      }
    }

    // 检查空位区
    const freeCellIndex = this.freeCellArea.containsPoint(x, y);
    if (freeCellIndex >= 0 && cards.length === 1 && this.freeCellCards[freeCellIndex] === null) {
      const tableauCol = this.getTableauColumn(card);
      if (tableauCol >= 0) {
        this.moveCardToFreeCell(card, tableauCol, freeCellIndex);
        this.clearSelection();
        return;
      }
    }

    // 检查游戏区
    const totalWidth = 8 * this.cardWidth + 7 * 10;
    const startX = (width - totalWidth) / 2 + this.cardWidth / 2;

    for (let col = 0; col < 8; col++) {
      const colX = startX + col * (this.cardWidth + 10);
      const column = this.tableauCards[col];

      if (Math.abs(x - colX) < this.cardWidth / 2) {
        const targetCard = column.length > 0 ? column[column.length - 1] : null;

        if (targetCard === null) {
          // 空列可以放任何牌
          // 检查是否来自FreeCell
          const freeCellIdx = this.freeCellCards.findIndex(c => c && c.id === card.cardData.id);
          if (freeCellIdx >= 0) {
            this.moveCardFromFreeCellToTableau(card, freeCellIdx, col);
          } else {
            this.moveCardsToTableau(cards, this.getTableauColumn(card), col);
          }
          this.clearSelection();
          return;
        } else if (canStackOnTableau(card.cardData, targetCard.cardData)) {
          // 检查是否来自FreeCell
          const freeCellIdx = this.freeCellCards.findIndex(c => c && c.id === card.cardData.id);
          if (freeCellIdx >= 0) {
            this.moveCardFromFreeCellToTableau(card, freeCellIdx, col);
          } else {
            this.moveCardsToTableau(cards, this.getTableauColumn(card), col);
          }
          this.clearSelection();
          return;
        }
      }
    }

    // 无法放置，返回原位
    cards.forEach(c => c.returnToOriginal());
    this.clearSelection();
  }

  private getTableauColumn(card: Card): number {
    for (let i = 0; i < 8; i++) {
      if (this.tableauCards[i].includes(card)) {
        return i;
      }
    }
    return -1;
  }

  private moveCardToFoundation(card: Card, fromCol: number, foundationIndex: number): void {
    console.log('[moveCardToFoundation] Card:', card.cardData.suit, card.cardData.rank, 'fromCol:', fromCol, 'foundationIndex:', foundationIndex);

    // 记录移动
    this.recordMove(
      { type: 'tableau', index: fromCol },
      { type: 'foundation', index: foundationIndex },
      [card.cardData]
    );

    // 从游戏区移除
    const colIndex = this.tableauCards[fromCol].indexOf(card);
    console.log('[moveCardToFoundation] colIndex in tableau:', colIndex);
    if (colIndex >= 0) {
      this.tableauCards[fromCol].splice(colIndex, 1);
    }

    // 添加到目标区
    this.foundationCards[foundationIndex].push(card.cardData);
    console.log('[moveCardToFoundation] Foundation now has', this.foundationCards[foundationIndex].length, 'cards');

    // 移动卡牌
    const pos = this.foundationArea.getSlotPosition(foundationIndex);
    console.log('[moveCardToFoundation] Target position:', pos.x, pos.y, 'Card current position:', card.x, card.y);
    card.animateTo(pos.x, pos.y);

    // 更新计数
    this.gameState.movesCount++;
    this.updateMovesDisplay();

    // 检查胜利
    this.checkWin();
  }

  private moveCardToFreeCell(card: Card, fromCol: number, freeCellIndex: number): void {
    // 记录移动
    this.recordMove(
      { type: 'tableau', index: fromCol },
      { type: 'freeCell', index: freeCellIndex },
      [card.cardData]
    );

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

  private moveCardsToTableau(cards: Card[], fromCol: number, toCol: number): void {
    // 记录移动
    this.recordMove(
      { type: 'tableau', index: fromCol },
      { type: 'tableau', index: toCol },
      cards.map(c => c.cardData)
    );

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

  private moveCardFromFreeCellToTableau(card: Card, freeCellIdx: number, toCol: number): void {
    // 记录移动
    this.recordMove(
      { type: 'freeCell', index: freeCellIdx },
      { type: 'tableau', index: toCol },
      [card.cardData]
    );

    // 从FreeCell移除
    this.freeCellCards[freeCellIdx] = null;
    this.freeCellArea.setCard(freeCellIdx, null);

    // 计算目标位置
    const width = this.cameras.main.width;
    const totalWidth = 8 * this.cardWidth + 7 * 10;
    const startX = (width - totalWidth) / 2 + this.cardWidth / 2;
    const y = this.tableauStartY + this.tableauCards[toCol].length * this.cardGap;

    // 移动卡牌
    card.animateTo(startX + toCol * (this.cardWidth + 10), y);
    this.tableauCards[toCol].push(card);

    // 更新计数
    this.gameState.movesCount++;
    this.updateMovesDisplay();
  }

  private recordMove(from: CardLocation, to: CardLocation, cards: CardType[]): void {
    this.moveHistory.push({ from, to, cards: cards.map(cloneCard) });
  }

  private undo(): void {
    if (this.moveHistory.length === 0) return;
    // 简化版本：重新加载当前关卡
    this.scene.restart();
  }

  private clearSelection(): void {
    this.selectedCards = [];
  }

  private checkWin(): void {
    if (this.foundationArea.isComplete()) {
      this.gameState.isCompleted = true;
      this.gameState.isWon = true;

      // 停止计时
      if (this.timerEvent) {
        this.timerEvent.remove();
      }

      // 记录完成
      this.playerData = recordGameCompletion(
        this.playerData,
        this.level.id,
        this.gameState.timeElapsed,
        this.gameState.movesCount
      );
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

  private showHint(): void {
    // 简化版本：高亮可移动的牌
    this.gameState.hintsUsed++;

    // 找到可以移动到目标区的牌
    for (let col = 0; col < 8; col++) {
      const column = this.tableauCards[col];
      if (column.length === 0) continue;

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

  private createBottomBar(width: number, height: number): void {
    const y = height - 80;

    // 提示按钮
    this.createActionButton(width / 2 - 120, y, '💡', '提示', () => this.showHint());

    // 撤销按钮
    this.createActionButton(width / 2, y, '↩️', '撤销', () => this.undo());

    // 重开按钮
    this.createActionButton(width / 2 + 120, y, '🔄', '重开', () => this.scene.restart());
  }

  private createActionButton(x: number, y: number, icon: string, label: string, callback: () => void): Phaser.GameObjects.Container {
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

  private startTimer(): void {
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

  private updateTimerDisplay(): void {
    const minutes = Math.floor(this.gameState.timeElapsed / 60);
    const seconds = this.gameState.timeElapsed % 60;
    this.timerText.setText(
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
  }

  private updateMovesDisplay(): void {
    this.movesText.setText(`移动: ${this.gameState.movesCount}`);
  }

  private confirmExit(): void {
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
  getGameStateForTest(): object {
    return {
      levelId: this.level?.id,
      tableau: this.tableauCards.map(col =>
        col.map(card => ({
          suit: card.cardData.suit,
          rank: card.cardData.rank,
          id: card.cardData.id
        }))
      ),
      freeCells: this.freeCellCards.map(c =>
        c ? { suit: c.suit, rank: c.rank } : null
      ),
      foundations: this.foundationCards.map(f =>
        f.map(c => ({ suit: c.suit, rank: c.rank }))
      ),
      movesCount: this.gameState?.movesCount || 0,
      timeElapsed: this.gameState?.timeElapsed || 0,
      isCompleted: this.gameState?.isCompleted || false
    };
  }

  private moveCardFromFreeCellToFoundation(card: Card, fromFreeCellIndex: number, foundationIndex: number): void {
    // 记录移动
    this.recordMove(
      { type: 'freeCell', index: fromFreeCellIndex },
      { type: 'foundation', index: foundationIndex },
      [card.cardData]
    );

    // 从freeCell移除
    this.freeCellCards[fromFreeCellIndex] = null;
    this.freeCellArea.setCard(fromFreeCellIndex, null);

    // 添加到foundation
    this.foundationCards[foundationIndex].push(card.cardData);
    this.foundationArea.setCards(foundationIndex, this.foundationCards[foundationIndex]);

    // 获取目标位置
    const foundationPos = this.foundationArea.getSlotPosition(foundationIndex);

    // 动画
    card.animateTo(foundationPos.x, foundationPos.y);
  }

  shutdown(): void {
    if (this.timerEvent) {
      this.timerEvent.remove();
    }
  }
}