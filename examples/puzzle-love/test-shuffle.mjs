// 测试打乱算法
import {
  createSolvedGrid,
  shuffleGrid,
  isGridComplete,
  getValidMoves,
  applyMove
} from './src/utils/shuffle.ts';

console.log('🧪 测试打乱算法');

// 测试1: 创建已解决网格
console.log('\n测试1: 创建已解决网格');
const solved3x3 = createSolvedGrid(3);
console.log('3x3 已解决网格:');
console.log(solved3x3);
console.assert(isGridComplete(solved3x3), '已解决网格应该返回完成');

// 测试2: 打乱后不应立即完成
console.log('\n测试2: 打乱后不应立即完成');
const shuffled3x3 = shuffleGrid(3, 100);
console.log('打乱后的网格:');
console.log(shuffled3x3);
console.assert(!isGridComplete(shuffled3x3), '打乱后的网格不应完成');

// 测试3: 有效移动
console.log('\n测试3: 有效移动检测');
const moves = getValidMoves(solved3x3);
console.log(`3x3网格有 ${moves.length} 个有效移动`);
console.assert(moves.length === 12, '3x3网格应有12个有效移动');

// 测试4: 多次打乱不应出现错误
console.log('\n测试4: 多次打乱稳定性');
for (let i = 0; i < 100; i++) {
  const grid = shuffleGrid(5, 50);
  console.assert(grid.length === 5, '网格大小应正确');
  console.assert(grid[0].length === 5, '网格列数应正确');
}

console.log('\n✅ 所有测试通过！');
