import { PlayerData } from '../types';

const STORAGE_KEY = 'puzzle_love_v1';
export const MAX_ACTION_POINTS = 5;
export const ACTION_POINT_RECOVERY_MS = 30 * 60 * 1000; // 30 minutes
const SECRET_KEY = 'puzzle_xor_2024';

// 简单 XOR 加密
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result);
}

function xorDecrypt(encoded: string, key: string): string {
  const text = atob(encoded);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

// 默认玩家数据
export function getDefaultPlayerData(): PlayerData {
  return {
    currentLevel: 1,
    unlockedLevels: [1],
    stars: {},
    actionPoints: 5,
    lastActionPointTime: Date.now(),
    inventory: {
      hint: 3,
      peek: 3,
      freeze: 2
    },
    settings: {
      musicEnabled: true,
      soundEnabled: true
    }
  };
}

// 保存数据
export function savePlayerData(data: PlayerData): void {
  try {
    const json = JSON.stringify(data);
    const encrypted = xorEncrypt(json, SECRET_KEY);
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save game data:', error);
  }
}

// 加载数据
export function loadPlayerData(): PlayerData {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) {
      return getDefaultPlayerData();
    }

    const json = xorDecrypt(encrypted, SECRET_KEY);
    const data = JSON.parse(json) as PlayerData;

    // 数据版本迁移/校验
    return migrateData(data);
  } catch (error) {
    console.error('Failed to load game data:', error);
    return getDefaultPlayerData();
  }
}

// 数据迁移
function migrateData(data: PlayerData): PlayerData {
  const defaults = getDefaultPlayerData();

  return {
    ...defaults,
    ...data,
    inventory: {
      ...defaults.inventory,
      ...data.inventory
    },
    settings: {
      ...defaults.settings,
      ...data.settings
    }
  };
}

// 清除数据
export function clearPlayerData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// 计算当前应有的行动值
export function calculateActionPoints(data: PlayerData): number {
  const now = Date.now();
  const elapsed = now - data.lastActionPointTime;
  const recovered = Math.floor(elapsed / (30 * 60 * 1000)); // 30分钟恢复1点

  return Math.min(5, data.actionPoints + recovered);
}
