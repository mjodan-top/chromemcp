import { Level } from '../types';

export const LEVELS: Level[] = [
  // 第1章：初遇
  {
    id: 1,
    chapter: 1,
    title: '咖啡厅的邂逅',
    difficulty: 'easy',
    gridSize: 3,
    imageUrl: 'images/level_01.jpg',
    storyText: '那个午后，阳光透过落地窗洒在咖啡杯上，我遇见了命中注定的他...',
    timeLimit: 60,
    starThresholds: [45, 30, 15]
  },
  {
    id: 2,
    chapter: 1,
    title: '意外的碰撞',
    difficulty: 'easy',
    gridSize: 3,
    imageUrl: 'images/level_02.jpg',
    storyText: '慌忙中，我们的文件散落一地，指尖相触的瞬间，心跳漏了一拍...',
    timeLimit: 60,
    starThresholds: [45, 30, 15]
  },
  {
    id: 3,
    chapter: 1,
    title: '他的微笑',
    difficulty: 'easy',
    gridSize: 4,
    imageUrl: 'images/level_03.jpg',
    storyText: '他弯腰帮我捡起文件，抬起头时，那个微笑让我忘记了呼吸...',
    timeLimit: 90,
    starThresholds: [70, 50, 30]
  },
  {
    id: 4,
    chapter: 1,
    title: '交换联系方式',
    difficulty: 'easy',
    gridSize: 4,
    imageUrl: 'images/level_04.jpg',
    storyText: '为了归还文件，我们交换了微信。看着他的头像，我傻傻地笑了...',
    timeLimit: 90,
    starThresholds: [70, 50, 30]
  },
  {
    id: 5,
    chapter: 1,
    title: '初识的心动',
    difficulty: 'medium',
    gridSize: 5,
    imageUrl: 'images/level_05.jpg',
    storyText: '第一章完：有些相遇，是命运精心安排的巧合...',
    timeLimit: 120,
    starThresholds: [90, 70, 45]
  },
  // 第2章：靠近
  {
    id: 6,
    chapter: 2,
    title: '深夜加班',
    difficulty: 'medium',
    gridSize: 5,
    imageUrl: 'images/level_06.jpg',
    storyText: '加班到深夜，电梯门打开的那一刻，竟然看到了他...',
    timeLimit: 120,
    starThresholds: [90, 70, 45]
  },
  {
    id: 7,
    chapter: 2,
    title: '共乘一车',
    difficulty: 'medium',
    gridSize: 5,
    imageUrl: 'images/level_07.jpg',
    storyText: '雨夜打不到车，他主动送我回家。狭小的空间里，气氛微妙...',
    timeLimit: 120,
    starThresholds: [90, 70, 45]
  },
  {
    id: 8,
    chapter: 2,
    title: '车上的对话',
    difficulty: 'medium',
    gridSize: 5,
    imageUrl: 'images/level_08.jpg',
    storyText: '原来我们住得这么近，原来我们都喜欢同一家早餐店...',
    timeLimit: 120,
    starThresholds: [90, 70, 45]
  },
  {
    id: 9,
    chapter: 2,
    title: '晚安',
    difficulty: 'medium',
    gridSize: 6,
    imageUrl: 'images/level_09.jpg',
    storyText: '下车时，他温柔地说："明天见"。那一刻，我确定我喜欢上了他...',
    timeLimit: 150,
    starThresholds: [110, 85, 55]
  },
  {
    id: 10,
    chapter: 2,
    title: '靠近的心跳',
    difficulty: 'medium',
    gridSize: 6,
    imageUrl: 'images/level_10.jpg',
    storyText: '第二章完：距离越近，心跳越快，这就是爱情的味道吗？',
    timeLimit: 150,
    starThresholds: [110, 85, 55]
  }
];

// 获取关卡
export function getLevel(id: number): Level | undefined {
  return LEVELS.find(level => level.id === id);
}

// 获取章节关卡
export function getChapterLevels(chapter: number): Level[] {
  return LEVELS.filter(level => level.chapter === chapter);
}

// 获取最大关卡ID
export function getMaxLevelId(): number {
  return Math.max(...LEVELS.map(l => l.id));
}
