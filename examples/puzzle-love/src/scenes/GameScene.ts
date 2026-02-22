import Phaser from 'phaser';
import { PuzzleGrid } from '../components/PuzzleGrid';
import { PlayerData, GameState, Level } from '../types';
import { getLevel } from '../data/levels';
import { savePlayerData } from '../utils/storage';

export class GameScene extends Phaser.Scene {
  private level!: Level;
  private playerData!: PlayerData;
  private gameState!: GameState;
  private puzzleGrid!: PuzzleGrid;
  private timerText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private itemButtons!: Phaser.GameObjects.Container[];
  private timerEvent!: Phaser.Time.TimerEvent;
  private isPaused: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelId: number }): void {
    const level = getLevel(data.levelId);
    if (!level) {
      this.scene.start('LevelSelectScene');
      return;
    }
    this.level = level;

    this.playerData = this.registry.get('playerData');

    // 初始化游戏状态
    this.gameState = {
      levelId: data.levelId,
      grid: [],
      moves: 0,
      timeElapsed: 0,
      hintsUsed: 0,
      isPaused: false,
      isCompleted: false
    };

    // 消耗行动值
    if (this.playerData.actionPoints > 0) {
      this.playerData.actionPoints--;
      savePlayerData(this.playerData);
    } else {
      // 行动值不足，返回菜单
      this.scene.start('MenuScene');
    }
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 顶部信息栏
    this.createTopBar();

    // 计算拼图区域大小
    const maxGridSize = Math.min(width - 40, 400);
    const pieceSize = Math.floor(maxGridSize / this.level.gridSize);
    const gridWidth = pieceSize * this.level.gridSize;

    // 创建拼图网格
    const gridX = (width - gridWidth) / 2;
    const gridY = 180;

    this.puzzleGrid = new PuzzleGrid(this, gridX, gridY, {
      gridSize: this.level.gridSize,
      pieceSize: pieceSize,
      imageKey: `level_${this.level.id.toString().padStart(2, '0')}`
    });

    // 初始化拼图
    this.puzzleGrid.initialize();

    // 绑定事件
    this.puzzleGrid.on('puzzleCompleted', this.onPuzzleCompleted, this);

    // 底部道具栏
    this.createItemButtons();

    // 开始计时
    this.startTimer();

    // 暂停按钮
    this.createPauseButton();
  }

  private createTopBar(): void {
    const width = this.cameras.main.width;

    // 返回按钮
    const backBtn = this.add.text(30, 30, '←', {
      fontSize: '32px',
      color: '#ffffff'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.confirmExit());

    // 关卡标题
    this.add.text(width / 2, 35, this.level.title, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 计时器
    this.timerText = this.add.text(width - 30, 35, '00:00', {
      fontSize: '24px',
      color: '#4ecdc4',
      fontFamily: 'monospace'
    }).setOrigin(1, 0.5);

    // 移动次数
    this.movesText = this.add.text(width / 2, 75, '移动: 0', {
      fontSize: '18px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
  }

  private createItemButtons(): void {
    const width = this.cameras.main.width;
    const items = [
      { type: 'hint' as const, icon: '💡', count: this.playerData.inventory.hint },
      { type: 'peek' as const, icon: '👁', count: this.playerData.inventory.peek },
      { type: 'freeze' as const, icon: '❄️', count: this.playerData.inventory.freeze }
    ];

    const startX = width / 2 - (items.length - 1) * 80 / 2;
    const y = this.cameras.main.height - 100;

    this.itemButtons = items.map((item, index) => {
      const x = startX + index * 80;

      const container = this.add.container(x, y);

      // 按钮背景
      const bg = this.add.circle(0, 0, 35, item.count > 0 ? 0x4ecdc4 : 0x444466);
      bg.setInteractive({ useHandCursor: item.count > 0 });

      // 图标
      const icon = this.add.text(0, -5, item.icon, {
        fontSize: '28px'
      }).setOrigin(0.5);

      // 数量
      const count = this.add.text(0, 20, `x${item.count}`, {
        fontSize: '14px',
        color: '#ffffff'
      }).setOrigin(0.5);

      container.add([bg, icon, count]);

      if (item.count > 0) {
        bg.on('pointerdown', () => this.useItem(item.type));
      }

      return container;
    });
  }

  private createPauseButton(): void {
    const btn = this.add.text(this.cameras.main.width - 40, 80, '⏸', {
      fontSize: '24px'
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.togglePause());
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.isPaused && !this.gameState.isCompleted) {
          this.gameState.timeElapsed++;
          this.updateTimerDisplay();

          // 检查时间限制
          if (this.level.timeLimit && this.gameState.timeElapsed >= this.level.timeLimit) {
            this.onTimeUp();
          }
        }
      },
      loop: true
    });
  }

  private updateTimerDisplay(): void {
    const minutes = Math.floor(this.gameState.timeElapsed / 60);
    const seconds = this.gameState.timeElapsed % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (this.level.timeLimit) {
      const remaining = this.level.timeLimit - this.gameState.timeElapsed;
      const remMinutes = Math.floor(remaining / 60);
      const remSeconds = remaining % 60;
      this.timerText.setText(`${remMinutes.toString().padStart(2, '0')}:${remSeconds.toString().padStart(2, '0')}`);

      if (remaining <= 10) {
        this.timerText.setColor('#ff6b9d');
      }
    } else {
      this.timerText.setText(timeStr);
    }
  }

  private useItem(type: 'hint' | 'peek' | 'freeze'): void {
    if (this.playerData.inventory[type] <= 0) return;

    switch (type) {
      case 'hint':
        this.puzzleGrid.useHint().then(success => {
          if (success) {
            this.playerData.inventory.hint--;
            this.gameState.hintsUsed++;
            this.updateItemButtons();
          }
        });
        break;

      case 'peek':
        this.puzzleGrid.showFullImage(3000);
        this.playerData.inventory.peek--;
        this.updateItemButtons();
        break;

      case 'freeze':
        // 增加60秒
        if (this.level.timeLimit) {
          this.level.timeLimit += 60;
          this.showFreezeEffect();
          this.playerData.inventory.freeze--;
          this.updateItemButtons();
        }
        break;
    }

    savePlayerData(this.playerData);
  }

  private updateItemButtons(): void {
    const counts = [
      this.playerData.inventory.hint,
      this.playerData.inventory.peek,
      this.playerData.inventory.freeze
    ];

    this.itemButtons.forEach((btn, index) => {
      const bg = btn.list[0] as Phaser.GameObjects.Arc;
      const countText = btn.list[2] as Phaser.GameObjects.Text;

      bg.setFillStyle(counts[index] > 0 ? 0x4ecdc4 : 0x444466);
      countText.setText(`x${counts[index]}`);
    });
  }

  private showFreezeEffect(): void {
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      '+60秒',
      { fontSize: '48px', color: '#4ecdc4', fontStyle: 'bold' }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 100,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  private onPuzzleCompleted(): void {
    this.gameState.isCompleted = true;

    // 计算星星
    const stars = this.calculateStars();
    this.playerData.stars[this.level.id] = stars;

    // 解锁下一关
    if (!this.playerData.unlockedLevels.includes(this.level.id + 1)) {
      this.playerData.unlockedLevels.push(this.level.id + 1);
    }

    savePlayerData(this.playerData);

    // 延迟后显示结果
    this.time.delayedCall(1000, () => {
      this.scene.start('ResultScene', {
        level: this.level,
        stars,
        time: this.gameState.timeElapsed,
        moves: this.gameState.moves
      });
    });
  }

  private calculateStars(): number {
    if (!this.level.timeLimit) return 3;

    const time = this.gameState.timeElapsed;
    const [threshold1, threshold2, threshold3] = this.level.starThresholds;

    if (time <= threshold3) return 3;
    if (time <= threshold2) return 2;
    if (time <= threshold1) return 1;
    return 1; // 至少1星
  }

  private onTimeUp(): void {
    this.showGameOverModal();
  }

  private showGameOverModal(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 遮罩
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);

    // 标题
    const title = this.add.text(width / 2, height / 2 - 80, '时间到！', {
      fontSize: '48px',
      color: '#ff6b9d',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(101);

    // 重来按钮
    const retryBtn = this.createModalButton(width / 2, height / 2, '再试一次', () => {
      this.scene.restart();
    });
    retryBtn.setDepth(101);

    // 返回按钮
    const backBtn = this.createModalButton(width / 2, height / 2 + 80, '返回关卡', () => {
      this.scene.start('LevelSelectScene');
    });
    backBtn.setDepth(101);
  }

  private createModalButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 200, 50, 0x4ecdc4);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerdown', callback);

    return container;
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.showPauseModal();
    }
  }

  private showPauseModal(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);

    const title = this.add.text(width / 2, height / 2 - 100, '游戏暂停', {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(101);

    const continueBtn = this.createModalButton(width / 2, height / 2 - 20, '继续游戏', () => {
      this.isPaused = false;
      overlay.destroy();
      title.destroy();
      continueBtn.destroy();
      restartBtn.destroy();
      exitBtn.destroy();
    });
    continueBtn.setDepth(101);

    const restartBtn = this.createModalButton(width / 2, height / 2 + 50, '重新开始', () => {
      this.scene.restart();
    });
    restartBtn.setDepth(101);

    const exitBtn = this.createModalButton(width / 2, height / 2 + 120, '退出关卡', () => {
      this.scene.start('LevelSelectScene');
    });
    exitBtn.setDepth(101);
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

    const subtitle = this.add.text(width / 2, height / 2 - 10, '当前进度将不会保存', {
      fontSize: '18px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(101);

    const yesBtn = this.createModalButton(width / 2 - 110, height / 2 + 60, '退出', () => {
      this.scene.start('LevelSelectScene');
    });
    yesBtn.setDepth(101);

    const noBtn = this.createModalButton(width / 2 + 110, height / 2 + 60, '继续', () => {
      overlay.destroy();
      title.destroy();
      subtitle.destroy();
      yesBtn.destroy();
      noBtn.destroy();
    });
    noBtn.setDepth(101);
  }

  shutdown(): void {
    if (this.timerEvent) {
      this.timerEvent.remove();
    }
  }
}
