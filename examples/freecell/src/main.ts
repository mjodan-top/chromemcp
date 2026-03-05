import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 720,
  height: 1280,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 360, height: 640 },
    max: { width: 1080, height: 1920 }
  },
  scene: [
    BootScene,
    MenuScene,
    LevelSelectScene,
    GameScene,
    ResultScene
  ]
};

const game = new Phaser.Game(config);

// 暴露到window对象，供测试脚本访问
(window as any).game = game;