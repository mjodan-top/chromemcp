const STORAGE_KEY = 'freecell_player_data';
// 默认玩家数据
const DEFAULT_PLAYER_DATA = {
    unlockedLevels: [1],
    completedLevels: [],
    bestScores: {},
    totalGamesPlayed: 0,
    totalWins: 0,
    currentStreak: 0,
    bestStreak: 0
};
// 加载玩家数据
export function loadPlayerData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return { ...DEFAULT_PLAYER_DATA, ...JSON.parse(data) };
        }
    }
    catch (e) {
        console.error('Failed to load player data:', e);
    }
    return { ...DEFAULT_PLAYER_DATA };
}
// 保存玩家数据
export function savePlayerData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    catch (e) {
        console.error('Failed to save player data:', e);
    }
}
// 重置玩家数据
export function resetPlayerData() {
    savePlayerData(DEFAULT_PLAYER_DATA);
}
// 记录游戏完成
export function recordGameCompletion(playerData, levelId, time, moves) {
    const newData = { ...playerData };
    // 更新完成记录
    if (!newData.completedLevels.includes(levelId)) {
        newData.completedLevels.push(levelId);
    }
    // 解锁下一关
    const nextLevel = levelId + 1;
    if (nextLevel <= 100 && !newData.unlockedLevels.includes(nextLevel)) {
        newData.unlockedLevels.push(nextLevel);
    }
    // 更新最佳成绩
    const currentBest = newData.bestScores[levelId];
    const stars = calculateStars(time, moves);
    if (!currentBest || isBetterScore(time, moves, currentBest)) {
        newData.bestScores[levelId] = {
            time,
            moves,
            stars,
            date: new Date().toISOString()
        };
    }
    // 更新统计
    newData.totalWins++;
    newData.currentStreak++;
    if (newData.currentStreak > newData.bestStreak) {
        newData.bestStreak = newData.currentStreak;
    }
    savePlayerData(newData);
    return newData;
}
// 记录游戏开始
export function recordGameStart(playerData) {
    const newData = {
        ...playerData,
        totalGamesPlayed: playerData.totalGamesPlayed + 1
    };
    savePlayerData(newData);
    return newData;
}
// 记录游戏失败
export function recordGameLoss(playerData) {
    const newData = {
        ...playerData,
        currentStreak: 0
    };
    savePlayerData(newData);
    return newData;
}
// 计算星级 (1-3星)
function calculateStars(time, moves) {
    // 时间评分 (秒)
    const timeScore = time <= 180 ? 3 : time <= 300 ? 2 : 1;
    // 移动评分
    const moveScore = moves <= 80 ? 3 : moves <= 120 ? 2 : 1;
    return Math.min(timeScore, moveScore);
}
// 比较成绩
function isBetterScore(time, moves, current) {
    // 优先比较移动次数，其次时间
    if (moves < current.moves)
        return true;
    if (moves === current.moves && time < current.time)
        return true;
    return false;
}
//# sourceMappingURL=storage.js.map