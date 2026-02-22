export type GridState = number[][];

// 创建已解决的网格
export function createSolvedGrid(gridSize: number): GridState {
  const grid: GridState = [];
  let counter = 0;

  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      grid[row][col] = counter++;
    }
  }

  return grid;
}

// 获取有效位置
export function getValidMoves(grid: GridState): Array<{ from: [number, number]; to: [number, number] }> {
  const moves = [];
  const size = grid.length;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // 右邻
      if (col < size - 1) {
        moves.push({ from: [row, col], to: [row, col + 1] });
      }
      // 下邻
      if (row < size - 1) {
        moves.push({ from: [row, col], to: [row + 1, col] });
      }
    }
  }

  return moves;
}

// 执行移动
export function applyMove(grid: GridState, move: { from: [number, number]; to: [number, number] }): void {
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;

  const temp = grid[fromRow][fromCol];
  grid[fromRow][fromCol] = grid[toRow][toCol];
  grid[toRow][toCol] = temp;
}

// 打乱网格（确保可解）
export function shuffleGrid(gridSize: number, shuffleCount?: number): GridState {
  const grid = createSolvedGrid(gridSize);
  const count = shuffleCount || gridSize * gridSize * 10;

  for (let i = 0; i < count; i++) {
    const validMoves = getValidMoves(grid);
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    applyMove(grid, randomMove);
  }

  return grid;
}

// 检查网格是否完成
export function isGridComplete(grid: GridState): boolean {
  const size = grid.length;
  let expected = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== expected) {
        return false;
      }
      expected++;
    }
  }

  return true;
}

// 检查两个位置是否相邻
export function isAdjacent(
  posA: { row: number; col: number },
  posB: { row: number; col: number }
): boolean {
  const rowDiff = Math.abs(posA.row - posB.row);
  const colDiff = Math.abs(posA.col - posB.col);

  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

// 找到拼图块当前位置
export function findPiecePosition(grid: GridState, pieceValue: number): { row: number; col: number } | null {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === pieceValue) {
        return { row, col };
      }
    }
  }
  return null;
}
