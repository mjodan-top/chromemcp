import Phaser from 'phaser';

export interface PieceConfig {
  correctRow: number;
  correctCol: number;
  gridSize: number;
  pieceSize: number;
}

export class PuzzlePiece extends Phaser.GameObjects.Image {
  private correctRow: number;
  private correctCol: number;
  private currentRow: number;
  private currentCol: number;
  private gridSize: number;
  private pieceSize: number;
  private isSelected: boolean = false;

  // 选中效果
  private selectionGraphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: PieceConfig
  ) {
    // 计算纹理裁剪区域
    const frameWidth = 800 / config.gridSize;
    const frameHeight = 800 / config.gridSize;

    super(scene, x, y, texture);

    this.correctRow = config.correctRow;
    this.correctCol = config.correctCol;
    this.currentRow = config.correctRow;
    this.currentCol = config.correctCol;
    this.gridSize = config.gridSize;
    this.pieceSize = config.pieceSize;

    // 设置显示大小
    this.setDisplaySize(config.pieceSize, config.pieceSize);

    // 设置裁剪
    this.setCrop(
      config.correctCol * frameWidth,
      config.correctRow * frameHeight,
      frameWidth,
      frameHeight
    );

    // 启用交互
    this.setInteractive({ useHandCursor: true });

    // 创建选中效果图形
    this.selectionGraphics = scene.add.graphics();
    this.selectionGraphics.setDepth(this.depth + 1);
    this.selectionGraphics.setVisible(false);

    // 添加到场景
    scene.add.existing(this);

    // 绑定点击事件
    this.on('pointerdown', this.onPointerDown, this);
  }

  private onPointerDown(): void {
    this.emit('selected', this);
  }

  select(): void {
    this.isSelected = true;
    this.selectionGraphics.setVisible(true);
    this.drawSelectionEffect();

    // 缩放动画
    this.scene.tweens.add({
      targets: this,
      scale: 1.05,
      duration: 150,
      ease: 'Power2'
    });
  }

  deselect(): void {
    this.isSelected = false;
    this.selectionGraphics.setVisible(false);

    // 恢复缩放
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 150,
      ease: 'Power2'
    });
  }

  private drawSelectionEffect(): void {
    this.selectionGraphics.clear();

    // 金色边框
    this.selectionGraphics.lineStyle(4, 0xFFD700, 1);
    this.selectionGraphics.strokeRect(
      this.x - this.displayWidth / 2 - 4,
      this.y - this.displayHeight / 2 - 4,
      this.displayWidth + 8,
      this.displayHeight + 8
    );

    // 发光效果
    this.selectionGraphics.lineStyle(2, 0xFFD700, 0.5);
    this.selectionGraphics.strokeRect(
      this.x - this.displayWidth / 2 - 8,
      this.y - this.displayHeight / 2 - 8,
      this.displayWidth + 16,
      this.displayHeight + 16
    );
  }

  async moveTo(row: number, col: number, duration: number = 200): Promise<void> {
    return new Promise((resolve) => {
      this.currentRow = row;
      this.currentCol = col;

      const targetX = this.getXForCol(col);
      const targetY = this.getYForRow(row);

      this.scene.tweens.add({
        targets: this,
        x: targetX,
        y: targetY,
        duration,
        ease: 'Power2',
        onComplete: () => {
          this.drawSelectionEffect();
          resolve();
        }
      });
    });
  }

  isInCorrectPosition(): boolean {
    return this.currentRow === this.correctRow && this.currentCol === this.correctCol;
  }

  getCorrectValue(): number {
    return this.correctRow * this.gridSize + this.correctCol;
  }

  getCurrentRow(): number { return this.currentRow; }
  getCurrentCol(): number { return this.currentCol; }
  getCorrectRow(): number { return this.correctRow; }
  getCorrectCol(): number { return this.correctCol; }

  setGridPosition(row: number, col: number): void {
    this.currentRow = row;
    this.currentCol = col;
    this.x = this.getXForCol(col);
    this.y = this.getYForRow(row);
    this.drawSelectionEffect();
  }

  private getXForCol(col: number): number {
    const startX = this.x - this.currentCol * this.pieceSize;
    return startX + col * this.pieceSize;
  }

  private getYForRow(row: number): number {
    const startY = this.y - this.currentRow * this.pieceSize;
    return startY + row * this.pieceSize;
  }

  playHintAnimation(): void {
    // 闪烁效果
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 200,
      yoyo: true,
      repeat: 3,
      ease: 'Power2'
    });
  }

  playCorrectAnimation(): void {
    // 正确放置的庆祝效果
    this.scene.tweens.add({
      targets: this,
      scale: 1.1,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut'
    });
  }

  destroy(fromScene?: boolean): void {
    this.selectionGraphics?.destroy();
    super.destroy(fromScene);
  }
}
