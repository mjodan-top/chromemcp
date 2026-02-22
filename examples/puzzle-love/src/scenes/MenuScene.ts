import Phaser from 'phaser';
import { PlayerData } from '../types';
import { loadPlayerData, savePlayerData, MAX_ACTION_POINTS, ACTION_POINT_RECOVERY_MS } from '../utils/storage';

export default class MenuScene extends Phaser.Scene {
  private playerData!: PlayerData;
  private actionPointText!: Phaser.GameObjects.Text;
  private actionPointTimer!: Phaser.GameObjects.Text;
  private actionPointTimerEvent!: Phaser.Time.TimerEvent;
  private modalContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Load player data from registry or localStorage
    this.playerData = this.registry.get('playerData') || loadPlayerData();
    
    // Create background
    this.createBackground();
    
    // Create title and subtitle
    this.createTitle();
    
    // Create action point UI
    this.createActionPointUI();
    
    // Create menu buttons
    this.createMenuButtons();
    
    // Start action point recovery timer
    this.startActionPointTimer();
    
    // Recover action points based on elapsed time
    this.recoverActionPoints();
  }

  private createBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Gradient background
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, width, height);
    
    // Add some decorative elements (floating hearts)
    for (let i = 0; i < 5; i++) {
      const heart = this.add.image(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(50, height - 50),
        'heart'
      );
      heart.setScale(0.5);
      heart.setAlpha(0.3);
      
      // Floating animation
      this.tweens.add({
        targets: heart,
        y: heart.y - 30,
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createTitle(): void {
    const width = this.cameras.main.width;
    
    // Main title
    this.add.text(width / 2, 80, 'PUZZLE LOVE', {
      fontSize: '56px',
      fontFamily: 'Arial',
      color: '#ff6b9d',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Subtitle
    this.add.text(width / 2, 140, '拼图爱情', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private createActionPointUI(): void {
    const width = this.cameras.main.width;
    
    // Container for action point display
    const container = this.add.container(width / 2, 200);
    
    // Heart icon
    const heartIcon = this.add.image(0, 0, 'heart');
    heartIcon.setScale(0.8);
    container.add(heartIcon);
    
    // Action point count text
    this.actionPointText = this.add.text(25, 0, this.playerData.actionPoints + '/' + MAX_ACTION_POINTS, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    container.add(this.actionPointText);
    
    // Free +3 button (if action points are not full)
    if (this.playerData.actionPoints < MAX_ACTION_POINTS) {
      const freeButton = this.createButton(120, 0, '+3', 60, 35, 0xff6b9d);
      freeButton.on('pointerdown', () => {
        this.showAdForActionPoints();
      });
      container.add(freeButton);
    }
    
    // Timer text (shows time until next recovery)
    this.actionPointTimer = this.add.text(0, 35, '', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(this.actionPointTimer);
  }

  private createMenuButtons(): void {
    const width = this.cameras.main.width;
    const startY = 280;
    const buttonSpacing = 70;
    
    // Continue game button
    const continueBtn = this.createButton(width / 2, startY, '继续游戏', 220, 55, 0x4a90e2);
    continueBtn.on('pointerdown', () => {
      this.continueGame();
    });
    
    // Level select button
    const levelSelectBtn = this.createButton(width / 2, startY + buttonSpacing, '选择关卡', 220, 55, 0x9b59b6);
    levelSelectBtn.on('pointerdown', () => {
      this.scene.start('LevelSelectScene');
    });
    
    // Shop button
    const shopBtn = this.createButton(width / 2, startY + buttonSpacing * 2, '道具商店', 220, 55, 0xe67e22);
    shopBtn.on('pointerdown', () => {
      this.showShopModal();
    });
    
    // Settings button
    const settingsBtn = this.createButton(width / 2, startY + buttonSpacing * 3, '设置', 220, 55, 0x34495e);
    settingsBtn.on('pointerdown', () => {
      this.showSettingsModal();
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

  private startActionPointTimer(): void {
    // Update timer every second
    this.actionPointTimerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateActionPointTimer,
      callbackScope: this,
      loop: true
    });
    
    this.updateActionPointTimer();
  }

  private updateActionPointTimer(): void {
    if (this.playerData.actionPoints >= MAX_ACTION_POINTS) {
      this.actionPointTimer.setText('体力已满');
      return;
    }
    
    const now = Date.now();
    const elapsed = now - this.playerData.lastActionPointTime;
    const remaining = Math.max(0, ACTION_POINT_RECOVERY_MS - elapsed);
    
    if (remaining === 0 && this.playerData.actionPoints < MAX_ACTION_POINTS) {
      // Recover one action point
      this.playerData.actionPoints++;
      this.playerData.lastActionPointTime = now;
      savePlayerData(this.playerData);
      this.updateActionPointDisplay();
    }
    
    // Format remaining time
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    this.actionPointTimer.setText('恢复时间: ' + minutes + ':' + seconds.toString().padStart(2, '0'));
  }

  private recoverActionPoints(): void {
    const now = Date.now();
    const elapsed = now - this.playerData.lastActionPointTime;
    const pointsToRecover = Math.floor(elapsed / ACTION_POINT_RECOVERY_MS);
    
    if (pointsToRecover > 0) {
      this.playerData.actionPoints = Math.min(
        MAX_ACTION_POINTS,
        this.playerData.actionPoints + pointsToRecover
      );
      this.playerData.lastActionPointTime = now - (elapsed % ACTION_POINT_RECOVERY_MS);
      savePlayerData(this.playerData);
      this.updateActionPointDisplay();
    }
  }

  private updateActionPointDisplay(): void {
    this.actionPointText.setText(this.playerData.actionPoints + '/' + MAX_ACTION_POINTS);
  }

  private showAdForActionPoints(): void {
    // Create modal overlay
    this.createModalOverlay();
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Modal background
    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x2c3e50, 1);
    modalBg.fillRoundedRect(-150, -100, 300, 200, 16);
    modalBg.lineStyle(3, 0xffffff, 0.5);
    modalBg.strokeRoundedRect(-150, -100, 300, 200, 16);
    this.modalContainer.add(modalBg);
    
    // Modal title
    const title = this.add.text(0, -70, '观看广告', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.modalContainer.add(title);
    
    // Modal content
    const content = this.add.text(0, -20, '观看短视频广告\n即可获得 +3 体力', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5);
    this.modalContainer.add(content);
    
    // Watch button
    const watchBtn = this.createButton(0, 40, '观看 (+3)', 140, 45, 0x27ae60);
    watchBtn.on('pointerdown', () => {
      this.simulateAdWatching();
    });
    this.modalContainer.add(watchBtn);
    
    // Close button
    const closeBtn = this.createButton(0, 95, '关闭', 100, 35, 0x7f8c8d);
    closeBtn.on('pointerdown', () => {
      this.closeModal();
    });
    this.modalContainer.add(closeBtn);
    
    this.modalContainer.setPosition(width / 2, height / 2);
  }

  private simulateAdWatching(): void {
    // Show loading/ad simulation
    const loadingText = this.add.text(0, 0, '广告播放中...', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.modalContainer.add(loadingText);
    
    // Simulate ad duration
    this.time.delayedCall(2000, () => {
      // Add action points
      this.playerData.actionPoints = Math.min(
        MAX_ACTION_POINTS,
        this.playerData.actionPoints + 3
      );
      savePlayerData(this.playerData);
      this.updateActionPointDisplay();
      
      // Show success message
      loadingText.setText('获得 +3 体力!');
      loadingText.setColor('#27ae60');
      
      this.time.delayedCall(1000, () => {
        this.closeModal();
      });
    });
  }

  private showShopModal(): void {
    this.createModalOverlay();
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Modal background
    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x2c3e50, 1);
    modalBg.fillRoundedRect(-180, -220, 360, 440, 16);
    modalBg.lineStyle(3, 0xffffff, 0.5);
    modalBg.strokeRoundedRect(-180, -220, 360, 440, 16);
    this.modalContainer.add(modalBg);
    
    // Modal title
    const title = this.add.text(0, -190, '道具商店', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.modalContainer.add(title);
    
    // Shop items
    const items = [
      { name: '提示道具', key: 'hint', desc: '显示正确拼图位置', icon: '💡', price: 10 },
      { name: '预览道具', key: 'peek', desc: '3秒查看完整图片', icon: '👁️', price: 15 },
      { name: '冻结道具', key: 'freeze', desc: '暂停计时30秒', icon: '❄️', price: 20 }
    ];
    
    let yOffset = -130;
    items.forEach((item) => {
      // Item container
      const itemContainer = this.add.container(0, yOffset);
      
      // Item background
      const itemBg = this.add.graphics();
      itemBg.fillStyle(0x34495e, 1);
      itemBg.fillRoundedRect(-150, -35, 300, 70, 10);
      itemContainer.add(itemBg);
      
      // Icon
      const icon = this.add.text(-130, 0, item.icon, {
        fontSize: '32px'
      }).setOrigin(0, 0.5);
      itemContainer.add(icon);
      
      // Name
      const nameText = this.add.text(-90, -10, item.name, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      itemContainer.add(nameText);
      
      // Description
      const descText = this.add.text(-90, 12, item.desc, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#aaaaaa'
      }).setOrigin(0, 0.5);
      itemContainer.add(descText);
      
      // Current count
      const count = this.playerData.inventory[item.key as keyof typeof this.playerData.inventory];
      const countText = this.add.text(60, -10, '拥有: ' + count, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#f1c40f'
      }).setOrigin(0, 0.5);
      itemContainer.add(countText);
      
      // Buy button
      const buyBtn = this.createButton(100, 10, item.price + '💎', 80, 35, 0xe74c3c);
      buyBtn.on('pointerdown', () => {
        this.buyItem(item.key as 'hint' | 'peek' | 'freeze', item.price);
        countText.setText('拥有: ' + this.playerData.inventory[item.key as keyof typeof this.playerData.inventory]);
      });
      itemContainer.add(buyBtn);
      
      this.modalContainer.add(itemContainer);
      yOffset += 85;
    });
    
    // Close button
    const closeBtn = this.createButton(0, 180, '关闭', 120, 40, 0x7f8c8d);
    closeBtn.on('pointerdown', () => {
      this.closeModal();
    });
    this.modalContainer.add(closeBtn);
    
    this.modalContainer.setPosition(width / 2, height / 2);
  }

  private buyItem(itemType: 'hint' | 'peek' | 'freeze', price: number): void {
    // In a real game, this would check currency and deduct
    // For now, just add the item
    this.playerData.inventory[itemType]++;
    savePlayerData(this.playerData);
    
    // Show feedback
    const feedback = this.add.text(0, 0, '购买成功!', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#27ae60',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.modalContainer.add(feedback);
    
    this.tweens.add({
      targets: feedback,
      y: -50,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        feedback.destroy();
      }
    });
  }

  private showSettingsModal(): void {
    this.createModalOverlay();
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Modal background
    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x2c3e50, 1);
    modalBg.fillRoundedRect(-150, -150, 300, 300, 16);
    modalBg.lineStyle(3, 0xffffff, 0.5);
    modalBg.strokeRoundedRect(-150, -150, 300, 300, 16);
    this.modalContainer.add(modalBg);
    
    // Modal title
    const title = this.add.text(0, -120, '设置', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.modalContainer.add(title);
    
    // Music toggle
    const musicContainer = this.add.container(0, -50);
    const musicLabel = this.add.text(-80, 0, '背景音乐', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    musicContainer.add(musicLabel);
    
    const musicToggle = this.createToggleButton(60, 0, this.playerData.settings.musicEnabled);
    musicToggle.on('pointerdown', () => {
      this.playerData.settings.musicEnabled = !this.playerData.settings.musicEnabled;
      savePlayerData(this.playerData);
      this.updateToggleButton(musicToggle, this.playerData.settings.musicEnabled);
    });
    musicContainer.add(musicToggle);
    this.modalContainer.add(musicContainer);
    
    // Sound toggle
    const soundContainer = this.add.container(0, 10);
    const soundLabel = this.add.text(-80, 0, '音效', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    soundContainer.add(soundLabel);
    
    const soundToggle = this.createToggleButton(60, 0, this.playerData.settings.soundEnabled);
    soundToggle.on('pointerdown', () => {
      this.playerData.settings.soundEnabled = !this.playerData.settings.soundEnabled;
      savePlayerData(this.playerData);
      this.updateToggleButton(soundToggle, this.playerData.settings.soundEnabled);
    });
    soundContainer.add(soundToggle);
    this.modalContainer.add(soundContainer);
    
    // Reset data button
    const resetBtn = this.createButton(0, 80, '重置游戏数据', 160, 40, 0xe74c3c);
    resetBtn.on('pointerdown', () => {
      this.resetGameData();
    });
    this.modalContainer.add(resetBtn);
    
    // Close button
    const closeBtn = this.createButton(0, 130, '关闭', 120, 40, 0x7f8c8d);
    closeBtn.on('pointerdown', () => {
      this.closeModal();
    });
    this.modalContainer.add(closeBtn);
    
    this.modalContainer.setPosition(width / 2, height / 2);
  }

  private createToggleButton(x: number, y: number, enabled: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.graphics();
    container.add(bg);
    
    const circle = this.add.circle(enabled ? 15 : -15, 0, 12, 0xffffff);
    container.add(circle);
    
    container.setSize(60, 30);
    container.setInteractive();
    
    this.updateToggleGraphics(container, enabled);
    
    return container;
  }

  private updateToggleButton(container: Phaser.GameObjects.Container, enabled: boolean): void {
    this.updateToggleGraphics(container, enabled);
    
    // Animate circle
    const circle = container.list[1] as Phaser.GameObjects.Circle;
    this.tweens.add({
      targets: circle,
      x: enabled ? 15 : -15,
      duration: 200
    });
  }

  private updateToggleGraphics(container: Phaser.GameObjects.Container, enabled: boolean): void {
    const bg = container.list[0] as Phaser.GameObjects.Graphics;
    bg.clear();
    bg.fillStyle(enabled ? 0x27ae60 : 0x7f8c8d, 1);
    bg.fillRoundedRect(-30, -15, 60, 30, 15);
  }

  private resetGameData(): void {
    // Reset to default
    this.playerData = {
      currentLevel: 1,
      unlockedLevels: [1],
      stars: {},
      actionPoints: MAX_ACTION_POINTS,
      lastActionPointTime: Date.now(),
      inventory: { hint: 3, peek: 1, freeze: 0 },
      settings: this.playerData.settings
    };
    savePlayerData(this.playerData);
    this.updateActionPointDisplay();
    
    // Show feedback
    const feedback = this.add.text(0, -80, '数据已重置!', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#e74c3c',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.modalContainer.add(feedback);
    
    this.time.delayedCall(1500, () => {
      feedback.destroy();
    });
  }

  private createModalOverlay(): void {
    // Remove existing modal if any
    this.closeModal();
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    this.modalContainer = this.add.container(0, 0);
    
    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive();
    
    // Prevent clicks from passing through
    overlay.on('pointerdown', () => {
      // Do nothing, just block
    });
    
    this.modalContainer.add(overlay);
  }

  private closeModal(): void {
    if (this.modalContainer) {
      this.modalContainer.destroy();
      this.modalContainer = null as unknown as Phaser.GameObjects.Container;
    }
  }

  private continueGame(): void {
    // Find the first unlocked but not completed level, or the current level
    const nextLevel = this.playerData.currentLevel;
    
    // Check if we have enough action points
    if (this.playerData.actionPoints <= 0) {
      this.showAdForActionPoints();
      return;
    }
    
    // Start the game scene with the level
    this.scene.start('GameScene', { levelId: nextLevel });
  }

  shutdown(): void {
    if (this.actionPointTimerEvent) {
      this.actionPointTimerEvent.destroy();
    }
  }
}
