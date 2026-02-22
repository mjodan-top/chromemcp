import Phaser from 'phaser';
import { loadPlayerData } from '../utils/storage';

export default class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingUI();

    // Listen for loading progress
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffffff, 1);
      this.progressBar.fillRect(250, 280, 300 * value, 30);
      this.percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
      this.percentText.destroy();
    });

    // Load level images (level_01 to level_10)
    for (let i = 1; i <= 10; i++) {
      const levelNum = i.toString().padStart(2, '0');
      this.load.image(`level_${levelNum}`, `assets/images/level_${levelNum}.png`);
    }
  }

  create(): void {
    // Load player data and store in registry
    const playerData = loadPlayerData();
    this.registry.set('playerData', playerData);

    // Create placeholder textures
    this.createPlaceholderTextures();

    // Start MenuScene
    this.scene.start('MenuScene');
  }

  private createLoadingUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    this.add.text(width / 2, 150, 'PUZZLE LOVE', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Progress box (background)
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(240, 270, 320, 50);

    // Progress bar
    this.progressBar = this.add.graphics();

    // Loading text
    this.loadingText = this.add.text(width / 2, 250, 'Loading...', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Percentage text
    this.percentText = this.add.text(width / 2, 295, '0%', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  private createPlaceholderTextures(): void {
    // Create placeholder texture for missing images
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Placeholder level image (gray with question mark)
    graphics.fillStyle(0x666666, 1);
    graphics.fillRect(0, 0, 200, 200);
    graphics.lineStyle(4, 0x999999, 1);
    graphics.strokeRect(0, 0, 200, 200);
    graphics.generateTexture('placeholder_level', 200, 200);
    graphics.clear();

    // Button texture
    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillRoundedRect(0, 0, 200, 50, 10);
    graphics.lineStyle(2, 0x6a6a6a, 1);
    graphics.strokeRoundedRect(0, 0, 200, 50, 10);
    graphics.generateTexture('button_bg', 200, 50);
    graphics.clear();

    // Star texture (for ratings)
    graphics.fillStyle(0xffd700, 1);
    const starPoints: number[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? 15 : 7;
      starPoints.push(Math.cos(angle) * radius + 15);
      starPoints.push(Math.sin(angle) * radius + 15);
    }
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < starPoints.length; i += 2) {
      points.push(new Phaser.Geom.Point(starPoints[i], starPoints[i + 1]));
    }
    graphics.fillPoints(points, true);
    graphics.generateTexture('star', 30, 30);
    graphics.clear();

    // Heart texture (for lives)
    graphics.fillStyle(0xff0044, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.fillCircle(20, 10, 10);
    graphics.fillTriangle(0, 12, 30, 12, 15, 30);
    graphics.generateTexture('heart', 30, 30);
    graphics.clear();

    // Particle texture
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);

    graphics.destroy();
  }
}
