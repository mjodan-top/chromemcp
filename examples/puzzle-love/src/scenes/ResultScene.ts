import Phaser from 'phaser';
import { Level } from '../types';
import { getLevel, getMaxLevelId } from '../data/levels';

interface ResultData {
  level: Level;
  stars: number;
  time: number;
  moves: number;
}

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;
  private starImages: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.resultData = data;
  }

  create(): void {
    this.createBackground();
    this.createCelebrationEffect();
    this.createTitle();
    this.createLevelName();
    this.createStarDisplay();
    this.createStatsDisplay();
    this.createStoryDisplay();
    this.createButtons();
    this.playVictorySound();
  }

  private createBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    const glow = this.add.circle(width / 2, height / 2, 300, 0x4ecdc4, 0.1);
    this.tweens.add({
      targets: glow,
      scale: 1.2,
      alpha: 0.2,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createCelebrationEffect(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
    graphics.destroy();
    const colors = [0xffd700, 0xff6b9d, 0x4ecdc4, 0xffa500, 0xe74c3c];
    const positions = [
      { x: width * 0.2, y: height * 0.3 },
      { x: width * 0.8, y: height * 0.3 },
      { x: width * 0.5, y: height * 0.2 },
      { x: width * 0.3, y: height * 0.4 },
      { x: width * 0.7, y: height * 0.4 }
    ];
    positions.forEach((pos, index) => {
      this.time.delayedCall(index * 200, () => {
        this.createFirework(pos.x, pos.y, colors[index % colors.length]);
      });
    });
    this.createConfettiEffect();
  }

  private createFirework(x: number, y: number, color: number): void {
    const particles = this.add.particles(x, y, 'particle', {
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      gravityY: 200,
      quantity: 30,
      tint: color,
      emitting: false
    });
    particles.explode();
    this.time.delayedCall(1500, () => particles.destroy());
  }

  private createConfettiEffect(): void {
    const width = this.cameras.main.width;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const colors = [0xffd700, 0xff6b9d, 0x4ecdc4, 0xffa500];
    colors.forEach((color, index) => {
      graphics.fillStyle(color);
      graphics.fillRect(index * 10, 0, 8, 8);
    });
    graphics.generateTexture('confetti', 40, 8);
    graphics.destroy();
    const confetti = this.add.particles(0, -10, 'confetti', {
      x: { min: 0, max: width },
      speedY: { min: 50, max: 150 },
      speedX: { min: -20, max: 20 },
      
      scale: { min: 0.5, max: 1 },
      lifespan: 4000,
      frequency: 200,
      quantity: 2
    });
    this.time.delayedCall(5000, () => {
      confetti.stop();
      this.time.delayedCall(4000, () => confetti.destroy());
    });
  }

  private createTitle(): void {
    const width = this.cameras.main.width;
    const title = this.add.text(width / 2, 80, 'Level Complete!', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true }
    }).setOrigin(0.5);
    title.setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.out' });
  }

  private createLevelName(): void {
    const width = this.cameras.main.width;
    const levelName = this.add.text(width / 2, 140, this.resultData.level.title, {
      fontSize: '24px', color: '#4ecdc4', fontStyle: 'bold'
    }).setOrigin(0.5);
    levelName.setAlpha(0);
    this.tweens.add({ targets: levelName, alpha: 1, duration: 400, delay: 300 });
  }

  private createStarDisplay(): void {
    const width = this.cameras.main.width;
    const starY = 210;
    const starSpacing = 70;
    for (let i = 0; i < 3; i++) {
      const x = width / 2 + (i - 1) * starSpacing;
      this.add.text(x, starY, '☆', { fontSize: '56px', color: '#444466' }).setOrigin(0.5);
      if (i < this.resultData.stars) {
        const star = this.add.text(x, starY, '★', { fontSize: '56px', color: '#ffd700' }).setOrigin(0.5);
        star.setScale(0);
        star.setAlpha(0);
        this.tweens.add({ targets: star, scale: 1, alpha: 1, duration: 400, delay: 600 + i * 200, ease: 'Back.out' });
        this.tweens.add({ targets: star, scale: 1.1, duration: 300, delay: 1200 + i * 200, yoyo: true, ease: 'Sine.easeInOut' });
        this.starImages.push(star);
      }
    }
    const starText = this.getStarText();
    const ratingText = this.add.text(width / 2, starY + 50, starText, {
      fontSize: '18px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);
    ratingText.setAlpha(0);
    this.tweens.add({ targets: ratingText, alpha: 1, duration: 400, delay: 1400 });
  }

  private getStarText(): string {
    switch (this.resultData.stars) {
      case 3: return 'Perfect!';
      case 2: return 'Great!';
      case 1: return 'Complete!';
      default: return '';
    }
  }

  private createStatsDisplay(): void {
    const width = this.cameras.main.width;
    const statsY = 310;
    const timeStr = this.formatTime(this.resultData.time);
    const timeContainer = this.createStatItem(width / 2 - 100, statsY, 'TIME', timeStr, '#4ecdc4');
    const movesStr = this.resultData.moves + ' moves';
    const movesContainer = this.createStatItem(width / 2 + 100, statsY, 'MOVES', movesStr, '#ff6b9d');
    timeContainer.setAlpha(0);
    movesContainer.setAlpha(0);
    this.tweens.add({ targets: timeContainer, alpha: 1, y: statsY, duration: 400, delay: 1000 });
    this.tweens.add({ targets: movesContainer, alpha: 1, y: statsY, duration: 400, delay: 1100 });
  }

  private createStatItem(x: number, y: number, icon: string, value: string, color: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y + 20);
    const iconText = this.add.text(0, -15, icon, { fontSize: '14px' }).setOrigin(0.5);
    const valueText = this.add.text(0, 15, value, { fontSize: '20px', color: color, fontStyle: 'bold' }).setOrigin(0.5);
    container.add([iconText, valueText]);
    return container;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  }

  private createStoryDisplay(): void {
    const width = this.cameras.main.width;
    const storyY = 400;
    const unlockTitle = this.add.text(width / 2, storyY, 'Story Unlocked', {
      fontSize: '18px', color: '#aaaaaa'
    }).setOrigin(0.5);
    const storyBg = this.add.rectangle(width / 2, storyY + 60, width - 60, 90, 0x000000, 0.3);
    storyBg.setStrokeStyle(1, 0x4ecdc4, 0.3);
    const storyText = this.add.text(width / 2, storyY + 60, this.resultData.level.storyText, {
      fontSize: '16px', color: '#ffffff', align: 'center', wordWrap: { width: width - 100 }
    }).setOrigin(0.5);
    unlockTitle.setAlpha(0);
    storyBg.setAlpha(0);
    storyText.setAlpha(0);
    this.tweens.add({ targets: [unlockTitle, storyBg, storyText], alpha: 1, duration: 400, delay: 1300, stagger: 100 });
  }

  private createButtons(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const buttonY = height - 100;
    const maxLevelId = getMaxLevelId();
    const isLastLevel = this.resultData.level.id >= maxLevelId;
    if (!isLastLevel) {
      const nextBtn = this.createButton(width / 2 + 120, buttonY, 'Next Level', 0x4ecdc4, () => this.goToNextLevel());
      this.animateButtonIn(nextBtn, 1600);
    }
    const levelSelectBtn = this.createButton(width / 2, buttonY, 'Level Select', 0x666699, () => this.scene.start('LevelSelectScene'));
    this.animateButtonIn(levelSelectBtn, 1700);
    if (!isLastLevel) levelSelectBtn.x = width / 2 - 120;
    const shareBtn = this.createIconButton(width - 50, 50, 'SHARE', () => this.shareResult());
    this.animateButtonIn(shareBtn, 1800);
  }

  private createButton(x: number, y: number, text: string, color: number, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 140, 50, color);
    bg.setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, text, { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    container.add([bg, label]);
    bg.on('pointerover', () => { bg.setFillStyle(this.lightenColor(color, 20)); container.setScale(1.05); });
    bg.on('pointerout', () => { bg.setFillStyle(color); container.setScale(1); });
    bg.on('pointerdown', () => container.setScale(0.95));
    bg.on('pointerup', () => { container.setScale(1.05); callback(); });
    return container;
  }

  private createIconButton(x: number, y: number, icon: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.circle(0, 0, 25, 0x444466);
    bg.setInteractive({ useHandCursor: true });
    const iconText = this.add.text(0, 0, icon, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    container.add([bg, iconText]);
    bg.on('pointerover', () => { bg.setFillStyle(0x4ecdc4); container.setScale(1.1); });
    bg.on('pointerout', () => { bg.setFillStyle(0x444466); container.setScale(1); });
    bg.on('pointerdown', callback);
    return container;
  }

  private animateButtonIn(button: Phaser.GameObjects.Container, delay: number): void {
    button.setAlpha(0);
    button.y += 20;
    this.tweens.add({ targets: button, alpha: 1, y: button.y - 20, duration: 400, delay: delay, ease: 'Back.out' });
  }

  private lightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + amount);
    const g = Math.min(255, ((color >> 8) & 0xff) + amount);
    const b = Math.min(255, (color & 0xff) + amount);
    return (r << 16) | (g << 8) | b;
  }

  private goToNextLevel(): void {
    const nextLevelId = this.resultData.level.id + 1;
    const nextLevel = getLevel(nextLevelId);
    if (nextLevel) this.scene.start('GameScene', { levelId: nextLevelId });
    else this.scene.start('LevelSelectScene');
  }

  private shareResult(): void {
    const shareText = 'I completed level ' + this.resultData.level.id + ' \"' + this.resultData.level.title + '\" with ' + this.resultData.stars + ' stars! Time: ' + this.formatTime(this.resultData.time) + ', Moves: ' + this.resultData.moves;
    if (navigator.share) {
      navigator.share({ title: 'Puzzle Love - Level Complete', text: shareText, url: window.location.href }).catch(() => this.copyToClipboard(shareText));
    } else {
      this.copyToClipboard(shareText);
    }
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => this.showToast('Copied to clipboard!')).catch(() => this.showToast('Copy failed'));
  }

  private showToast(message: string): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const toast = this.add.container(width / 2, height - 180);
    const bg = this.add.rectangle(0, 0, 200, 40, 0x000000, 0.8);
    bg.setStrokeStyle(1, 0x4ecdc4);
    const text = this.add.text(0, 0, message, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    toast.add([bg, text]);
    toast.setDepth(1000);
    toast.setAlpha(0);
    this.tweens.add({
      targets: toast, alpha: 1, duration: 200,
      onComplete: () => this.time.delayedCall(2000, () => this.tweens.add({ targets: toast, alpha: 0, duration: 200, onComplete: () => toast.destroy() }))
    });
  }

  private playVictorySound(): void {
    const playerData = this.registry.get('playerData');
    if (playerData?.settings?.soundEnabled) {
      // Sound effect can be added here
    }
  }
}
