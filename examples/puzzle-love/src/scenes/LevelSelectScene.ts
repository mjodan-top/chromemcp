import Phaser from 'phaser';
import { PlayerData, Level } from '../types';
import { loadPlayerData } from '../utils/storage';
import { LEVELS, getChapterLevels } from '../data/levels';

export default class LevelSelectScene extends Phaser.Scene {
  private playerData!: PlayerData;
  private currentChapter: number = 1;
  private chapterButtons: Phaser.GameObjects.Container[] = [];
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private totalStarsText!: Phaser.GameObjects.Text;
  private levelsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    // Load player data
    this.playerData = this.registry.get('playerData') || loadPlayerData();

    // Create background
    this.createBackground();

    // Create title
    this.createTitle();

    // Create back button
    this.createBackButton();

    // Create chapter buttons
    this.createChapterButtons();

    // Create levels container
    this.levelsContainer = this.add.container(0, 0);

    // Show initial chapter levels
    this.showChapterLevels(this.currentChapter);

    // Create total stars display
    this.createTotalStarsDisplay();
  }

  private createBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Gradient background
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, width, height);

    // Add decorative floating hearts
    for (let i = 0; i < 5; i++) {
      const heart = this.add.image(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(50, height - 50),
        'heart'
      );
      heart.setScale(0.4);
      heart.setAlpha(0.2);

      // Floating animation
      this.tweens.add({
        targets: heart,
        y: heart.y - 20,
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createTitle(): void {
    const width = this.cameras.main.width;

    // Title
    this.add.text(width / 2, 50, '选择关卡', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ff6b9d',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createBackButton(): void {
    // Back button in top-left corner
    const backBtn = this.createButton(50, 50, '返回', 80, 40, 0x7f8c8d);
    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private createChapterButtons(): void {
    const width = this.cameras.main.width;
    const startX = width / 2 - 80;
    const y = 110;

    // Chapter 1 button
    const chapter1Btn = this.createChapterButton(startX, y, '第1章', 1);
    this.chapterButtons.push(chapter1Btn);

    // Chapter 2 button
    const chapter2Btn = this.createChapterButton(startX + 160, y, '第2章', 2);
    this.chapterButtons.push(chapter2Btn);

    // Update button states
    this.updateChapterButtonStates();
  }

  private createChapterButton(
    x: number,
    y: number,
    text: string,
    chapter: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const graphics = this.add.graphics();
    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillRoundedRect(-70, -25, 140, 50, 10);
    graphics.lineStyle(2, 0xffffff, 0.3);
    graphics.strokeRoundedRect(-70, -25, 140, 50, 10);

    container.add(graphics);

    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(buttonText);

    // Store reference to graphics for state updates
    (container as any).buttonGraphics = graphics;
    (container as any).chapter = chapter;

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(-70, -25, 140, 50);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    // Click handler
    container.on('pointerdown', () => {
      if (this.currentChapter !== chapter) {
        this.currentChapter = chapter;
        this.showChapterLevels(chapter);
        this.updateChapterButtonStates();
      }
    });

    // Hover effects
    container.on('pointerover', () => {
      if (this.currentChapter !== chapter) {
        container.setScale(1.05);
      }
    });

    container.on('pointerout', () => {
      container.setScale(1);
    });

    return container;
  }

  private updateChapterButtonStates(): void {
    this.chapterButtons.forEach((btn) => {
      const graphics = (btn as any).buttonGraphics as Phaser.GameObjects.Graphics;
      const chapter = (btn as any).chapter as number;
      const isActive = this.currentChapter === chapter;

      graphics.clear();

      if (isActive) {
        // Active state - pink color
        graphics.fillStyle(0xff6b9d, 1);
        graphics.fillRoundedRect(-70, -25, 140, 50, 10);
        graphics.lineStyle(3, 0xffffff, 0.6);
        graphics.strokeRoundedRect(-70, -25, 140, 50, 10);
      } else {
        // Inactive state
        graphics.fillStyle(0x4a4a4a, 1);
        graphics.fillRoundedRect(-70, -25, 140, 50, 10);
        graphics.lineStyle(2, 0xffffff, 0.3);
        graphics.strokeRoundedRect(-70, -25, 140, 50, 10);
      }
    });
  }

  private showChapterLevels(chapter: number): void {
    // Clear existing level buttons
    this.levelsContainer.removeAll(true);
    this.levelButtons = [];

    const width = this.cameras.main.width;
    const levels = getChapterLevels(chapter);

    // Grid layout: 3 columns
    const cols = 3;
    const startX = width / 2 - 120;
    const startY = 180;
    const spacingX = 120;
    const spacingY = 110;

    levels.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const levelBtn = this.createLevelButton(x, y, level);
      this.levelsContainer.add(levelBtn);
      this.levelButtons.push(levelBtn);
    });
  }

  private createLevelButton(x: number, y: number, level: Level): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const isUnlocked = this.playerData.unlockedLevels.includes(level.id);
    const starCount = this.playerData.stars[level.id] || 0;

    // Level circle background
    const graphics = this.add.graphics();

    if (isUnlocked) {
      // Unlocked level - gradient effect with base color
      graphics.fillStyle(0x4a90e2, 1);
    } else {
      // Locked level
      graphics.fillStyle(0x555555, 1);
    }

    // Draw circle
    graphics.fillCircle(0, 0, 40);
    graphics.lineStyle(3, 0xffffff, 0.4);
    graphics.strokeCircle(0, 0, 40);

    container.add(graphics);

    if (isUnlocked) {
      // Level number
      const levelText = this.add.text(0, -5, level.id.toString(), {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(levelText);

      // Stars display (below the number)
      const starsContainer = this.add.container(0, 22);
      for (let i = 0; i < 3; i++) {
        const starX = (i - 1) * 14;
        const starColor = i < starCount ? 0xffd700 : 0x666666;
        const star = this.add.star(starX, 0, 5, 6, 3, starColor);
        starsContainer.add(star);
      }
      container.add(starsContainer);

      // Make interactive
      const hitArea = new Phaser.Geom.Circle(0, 0, 40);
      container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

      // Hover effects
      container.on('pointerover', () => {
        container.setScale(1.1);
        graphics.clear();
        graphics.fillStyle(0x5aa0f2, 1);
        graphics.fillCircle(0, 0, 40);
        graphics.lineStyle(3, 0xffffff, 0.6);
        graphics.strokeCircle(0, 0, 40);
      });

      container.on('pointerout', () => {
        container.setScale(1);
        graphics.clear();
        graphics.fillStyle(0x4a90e2, 1);
        graphics.fillCircle(0, 0, 40);
        graphics.lineStyle(3, 0xffffff, 0.4);
        graphics.strokeCircle(0, 0, 40);
      });

      container.on('pointerdown', () => {
        container.setScale(0.95);
      });

      container.on('pointerup', () => {
        container.setScale(1.1);
        this.startLevel(level.id);
      });
    } else {
      // Locked level - show lock icon
      const lockIcon = this.add.text(0, 0, '🔒', {
        fontSize: '24px'
      }).setOrigin(0.5);
      container.add(lockIcon);
    }

    return container;
  }

  private createTotalStarsDisplay(): void {
    const width = this.cameras.main.width;

    // Calculate total stars
    const totalStars = Object.values(this.playerData.stars).reduce((sum, count) => sum + count, 0);
    const maxStars = LEVELS.length * 3;

    // Container at bottom
    const container = this.add.container(width / 2, this.cameras.main.height - 40);

    // Star icon
    const starIcon = this.add.star(-60, 0, 5, 12, 6, 0xffd700);
    container.add(starIcon);

    // Total stars text
    this.totalStarsText = this.add.text(-40, 0, '总星星: ' + totalStars + '/' + maxStars, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    container.add(this.totalStarsText);
  }

  private startLevel(levelId: number): void {
    // Check if we have enough action points
    if (this.playerData.actionPoints <= 0) {
      this.showNoActionPointsMessage();
      return;
    }

    // Start the game scene
    this.scene.start('GameScene', { levelId });
  }

  private showNoActionPointsMessage(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create message container
    const messageContainer = this.add.container(width / 2, height / 2);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 1);
    bg.fillRoundedRect(-150, -60, 300, 120, 12);
    bg.lineStyle(3, 0xffffff, 0.5);
    bg.strokeRoundedRect(-150, -60, 300, 120, 12);
    messageContainer.add(bg);

    // Message text
    const message = this.add.text(0, -20, '体力不足', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#e74c3c',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    messageContainer.add(message);

    // Sub message
    const subMessage = this.add.text(0, 10, '请返回主菜单获取体力', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    messageContainer.add(subMessage);

    // OK button
    const okBtn = this.createButton(0, 45, '确定', 80, 35, 0x7f8c8d);
    okBtn.on('pointerdown', () => {
      messageContainer.destroy();
    });
    messageContainer.add(okBtn);

    // Auto dismiss after 2 seconds
    this.time.delayedCall(2000, () => {
      if (messageContainer.active) {
        messageContainer.destroy();
      }
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    width: number = 200,
    height: number = 50,
    color: number = 0x4a4a4a
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const graphics = this.add.graphics();

    // Normal state
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    graphics.lineStyle(3, 0xffffff, 0.3);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    container.add(graphics);

    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(buttonText);

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    // Hover effects
    container.on('pointerover', () => {
      graphics.clear();
      graphics.fillStyle(color, 1);
      graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
      graphics.lineStyle(3, 0xffffff, 0.6);
      graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
      container.setScale(1.05);
    });

    container.on('pointerout', () => {
      graphics.clear();
      graphics.fillStyle(color, 1);
      graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
      graphics.lineStyle(3, 0xffffff, 0.3);
      graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
      container.setScale(1);
    });

    container.on('pointerdown', () => {
      container.setScale(0.95);
    });

    container.on('pointerup', () => {
      container.setScale(1.05);
    });

    return container;
  }
}
