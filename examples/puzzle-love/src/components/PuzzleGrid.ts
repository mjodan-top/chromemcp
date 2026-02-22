import Phaser from 'phaser';
import { PuzzlePiece } from './PuzzlePiece';
import { shuffleGrid, isGridComplete, findPiecePosition, isAdjacent } from '../utils/shuffle';
import { Position } from '../types';

export interface GridConfig {
  gridSize: number;
  pieceSize: number;
  imageKey: string;
}

export class PuzzleGrid extends Phaser.GameObjects.Container {
  private pieces: PuzzlePiece[][] = [];
  private gridState: number[][] = [];
  private selectedPiece: PuzzlePiece | null = null;
  private gridSize: number;
  private pieceSize: number;
  private imageKey: string;
  private isAnimating: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: GridConfig) {
    super(scene, x, y);

    this.gridSize = config.gridSize;
    this.pieceSize = config.pieceSize;
    this.imageKey = config.imageKey;

    scene.add.existing(this);
  }

  // Initialize puzzle
  async initialize(): Promise<void> {
    this.createPieces();
    await this.shuffle();
  }

  // Create puzzle pieces
  private createPieces(): void {
    const frameWidth = 800 / this.gridSize;
    const frameHeight = 800 / this.gridSize;

    for (let row = 0; row < this.gridSize; row++) {
      this.pieces[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const x = col * this.pieceSize;
        const y = row * this.pieceSize;

        const piece = new PuzzlePiece(
          this.scene,
          x,
          y,
          this.imageKey,
          {
            correctRow: row,
            correctCol: col,
            gridSize: this.gridSize,
            pieceSize: this.pieceSize
          }
        );

        piece.on('selected', this.onPieceSelected, this);
        this.add(piece);
        this.pieces[row][col] = piece;
      }
    }

    // Set container size
    const totalWidth = this.gridSize * this.pieceSize;
    const totalHeight = this.gridSize * this.pieceSize;
    this.setSize(totalWidth, totalHeight);
  }

  // Shuffle puzzle
  async shuffle(): Promise<void> {
    this.gridState = shuffleGrid(this.gridSize);

    // Update piece positions
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const pieceValue = this.gridState[row][col];
        const correctRow = Math.floor(pieceValue / this.gridSize);
        const correctCol = pieceValue % this.gridSize;

        const piece = this.pieces[correctRow][correctCol];
        piece.setGridPosition(row, col);
      }
    }

    // Play shuffle animation
    await this.playShuffleAnimation();
  }

  private async playShuffleAnimation(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 0, to: 1 },
        duration: 500,
        ease: 'Power2',
        onComplete: resolve
      });
    });
  }

  // Piece selected handler
  private async onPieceSelected(piece: PuzzlePiece): Promise<void> {
    if (this.isAnimating) return;

    // Emit sound event
    this.emit('pieceSelected', piece);

    if (!this.selectedPiece) {
      // Select first piece
      this.selectedPiece = piece;
      piece.select();
    } else if (this.selectedPiece === piece) {
      // Deselect
      piece.deselect();
      this.selectedPiece = null;
    } else {
      // Try to swap
      const posA = { row: this.selectedPiece.getCurrentRow(), col: this.selectedPiece.getCurrentCol() };
      const posB = { row: piece.getCurrentRow(), col: piece.getCurrentCol() };

      if (isAdjacent(posA, posB)) {
        await this.swapPieces(this.selectedPiece, piece);
        this.emit('piecesSwapped');

        if (this.checkComplete()) {
          this.emit('puzzleCompleted');
        }
      } else {
        // Not adjacent, play error feedback
        this.playErrorFeedback(piece);
      }

      this.selectedPiece.deselect();
      this.selectedPiece = null;
    }
  }

  // Swap two puzzle pieces
  private async swapPieces(pieceA: PuzzlePiece, pieceB: PuzzlePiece): Promise<void> {
    this.isAnimating = true;

    const rowA = pieceA.getCurrentRow();
    const colA = pieceA.getCurrentCol();
    const rowB = pieceB.getCurrentRow();
    const colB = pieceB.getCurrentCol();

    // Update grid state
    const temp = this.gridState[rowA][colA];
    this.gridState[rowA][colA] = this.gridState[rowB][colB];
    this.gridState[rowB][colB] = temp;

    // Animate swap
    await Promise.all([
      pieceA.moveTo(rowB, colB),
      pieceB.moveTo(rowA, colA)
    ]);

    // Check if pieces are in correct position
    if (pieceA.isInCorrectPosition()) {
      pieceA.playCorrectAnimation();
    }
    if (pieceB.isInCorrectPosition()) {
      pieceB.playCorrectAnimation();
    }

    this.isAnimating = false;
  }

  // Error feedback
  private playErrorFeedback(piece: PuzzlePiece): void {
    this.scene.tweens.add({
      targets: piece,
      x: piece.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Power2'
    });
  }

  // Check if puzzle is complete
  checkComplete(): boolean {
    return isGridComplete(this.gridState);
  }

  // Use hint item
  async useHint(): Promise<boolean> {
    if (this.isAnimating) return false;

    // Find a piece in wrong position
    let wrongPiece: PuzzlePiece | null = null;
    let correctPos: Position | null = null;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const piece = this.pieces[row][col];
        if (!piece.isInCorrectPosition()) {
          wrongPiece = piece;
          correctPos = { row: piece.getCorrectRow(), col: piece.getCorrectCol() };
          break;
        }
      }
      if (wrongPiece) break;
    }

    if (!wrongPiece || !correctPos) return false;

    this.isAnimating = true;

    // Highlight the piece
    wrongPiece.playHintAnimation();

    // Find the piece at target position
    const targetPiece = this.pieces[correctPos.row][correctPos.col];

    // Move to correct position
    await this.swapPieces(wrongPiece, targetPiece);

    this.isAnimating = false;

    if (this.checkComplete()) {
      this.emit('puzzleCompleted');
    }

    return true;
  }

  // Show full image (peek item)
  showFullImage(duration: number = 3000): void {
    const fullImage = this.scene.add.image(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.imageKey
    );
    fullImage.setDisplaySize(this.width, this.height);
    fullImage.setAlpha(0.8);
    fullImage.setDepth(100);

    // Fade in
    this.scene.tweens.add({
      targets: fullImage,
      alpha: 0.8,
      duration: 300,
      ease: 'Power2'
    });

    // Fade out after delay
    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: fullImage,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => fullImage.destroy()
      });
    });
  }

  // Get move count (needs additional tracking, returns 0 for now)
  getMoveCount(): number {
    // This would need additional tracking
    return 0;
  }

  destroy(fromScene?: boolean): void {
    this.pieces.forEach(row => row.forEach(piece => piece.destroy()));
    super.destroy(fromScene);
  }
}
