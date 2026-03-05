import Phaser from 'phaser';
import { loadPlayerData } from '../utils/storage';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 显示加载进度
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 加载文字
    const loadingText = this.add.text(width / 2, height / 2, '加载中...', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 进度条背景
    const progressBarBg = this.add.rectangle(
      width / 2,
      height / 2 + 50,
      300,
      20,
      0x333333
    ).setOrigin(0.5);

    // 进度条
    const progressBar = this.add.rectangle(
      width / 2 - 150,
      height / 2 + 50,
      0,
      20,
      0x4ecdc4
    ).setOrigin(0, 0.5);

    // 监听加载进度
    this.load.on('progress', (value: number) => {
      progressBar.width = 300 * value;
    });

    this.load.on('complete', () => {
      loadingText.destroy();
      progressBarBg.destroy();
      progressBar.destroy();
    });

    // 这里可以加载卡牌图片资源
    // 目前使用代码绘制，暂不需要加载资源
  }

  create(): void {
    // 加载玩家数据到 registry
    const playerData = loadPlayerData();
    this.registry.set('playerData', playerData);

    // 跳转到主菜单
    this.scene.start('MenuScene');
  }
}