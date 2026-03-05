#!/usr/bin/env node
/**
 * FreeCell Level 1 - Interactive Solver with State Verification
 * Improvements:
 * 1. State verification after each move batch
 * 2. Re-planning when moves fail
 * 3. Multi-phase solving approach
 * 4. Better error handling
 */

import { BrowserController } from '../packages/core/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  targetUrl: 'http://localhost:3008',
  outputDir: path.join(__dirname, 'freecell-test-output'),
  viewport: { width: 720, height: 1280 }
};

fs.mkdirSync(CONFIG.outputDir, { recursive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Card Utilities ====================

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' };

function getSuitIndex(suit) {
  return SUITS.indexOf(suit);
}

function isRed(suit) {
  return suit === 'hearts' || suit === 'diamonds';
}

function cardId(card) {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

// ==================== Game Rules ====================

function canMoveToFoundation(card, foundations) {
  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];
  if (foundation.length === 0) return card.rank === 1;
  return foundation[foundation.length - 1].rank === card.rank - 1;
}

function canStackOnTableau(card, targetCard) {
  return isRed(card.suit) !== isRed(targetCard.suit) && card.rank === targetCard.rank - 1;
}

function isWin(state) {
  return state.foundations.every(f => f.length === 13);
}

// ==================== State Hashing ====================

function stateHash(state) {
  const { tableau, freeCells, foundations } = state;
  const tableauStr = tableau.map(col => col.map(c => cardId(c)).join('')).join('|');
  const fcStr = freeCells.map(c => c ? cardId(c) : '_').join('');
  const fdStr = foundations.map(f => f.map(c => cardId(c)).join('')).join('|');
  return `${tableauStr}#${fcStr}#${fdStr}`;
}

// ==================== Safe Auto-Play ====================

function isSafeToAutoPlay(card, foundations) {
  if (card.rank <= 2) return true;
  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];
  if (foundation.length < card.rank - 1) return false;
  const oppositeColors = isRed(card.suit) ? ['clubs', 'spades'] : ['hearts', 'diamonds'];
  for (const oppSuit of oppositeColors) {
    const oppIndex = getSuitIndex(oppSuit);
    if (foundations[oppIndex].length < card.rank - 2) return false;
  }
  return true;
}

function autoPlayToFoundation(state) {
  let changed = true;
  let moves = [];

  while (changed) {
    changed = false;

    for (let i = 0; i < 4; i++) {
      const card = state.freeCells[i];
      if (card && card.suit && canMoveToFoundation(card, state.foundations) && isSafeToAutoPlay(card, state.foundations)) {
        moves.push({ type: 'fc_to_f', card: {...card}, from: i, to: getSuitIndex(card.suit), auto: true });
        state.foundations[getSuitIndex(card.suit)].push({...card});
        state.freeCells[i] = null;
        changed = true;
      }
    }

    for (let col = 0; col < 8; col++) {
      const column = state.tableau[col];
      if (column.length === 0) continue;
      const topCard = column[column.length - 1];
      if (topCard && topCard.suit && canMoveToFoundation(topCard, state.foundations) && isSafeToAutoPlay(topCard, state.foundations)) {
        moves.push({ type: 't_to_f', card: {...topCard}, from: col, to: getSuitIndex(topCard.suit), auto: true });
        state.foundations[getSuitIndex(topCard.suit)].push({...topCard});
        column.pop();
        changed = true;
      }
    }
  }

  return moves;
}

// ==================== Move Generation ====================

function getEmptyFreeCells(freeCells) {
  return freeCells.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
}

function getEmptyColumns(tableau) {
  return tableau.map((col, i) => col.length === 0 ? i : -1).filter(i => i >= 0);
}

function getValidSequenceLength(column) {
  if (column.length <= 1) return column.length;
  let len = 1;
  for (let i = column.length - 2; i >= 0; i--) {
    if (canStackOnTableau(column[i + 1], column[i])) len++;
    else break;
  }
  return len;
}

function getMoves(state) {
  const { tableau, freeCells, foundations } = state;
  const moves = [];
  const emptyFC = getEmptyFreeCells(freeCells);
  const emptyCols = getEmptyColumns(tableau);

  // Foundation moves
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && canMoveToFoundation(card, foundations)) {
      moves.push({ type: 'fc_to_f', card: {...card}, from: i, to: getSuitIndex(card.suit), score: 0 });
    }
  }

  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations)) {
      moves.push({ type: 't_to_f', card: {...topCard}, from: col, to: getSuitIndex(topCard.suit), score: 0 });
    }
  }

  // Tableau -> Tableau
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];

      if (targetColumn.length > 0) {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(topCard, targetCard)) {
          const willExpose = column.length > 1;
          const exposedCard = willExpose ? column[column.length - 2] : null;
          const exposesUseful = exposedCard && canMoveToFoundation(exposedCard, foundations);
          const exposesA = exposedCard && exposedCard.rank === 1;

          moves.push({
            type: 't_to_t',
            card: {...topCard},
            from: col,
            to: targetCol,
            score: exposesA ? 1 : (exposesUseful ? 2 : 5)
          });
        }
      }
    }
  }

  // FreeCell -> Tableau
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;
    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length > 0) {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(card, targetCard)) {
          moves.push({ type: 'fc_to_t', card: {...card}, from: i, to: targetCol, score: 4 });
        }
      }
    }
  }

  // King to empty column
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];
    if (topCard.rank === 13 && emptyCols.length > 0) {
      const exposedCard = column.length > 1 ? column[column.length - 2] : null;
      const exposesUseful = exposedCard && canMoveToFoundation(exposedCard, foundations);
      moves.push({ type: 't_to_t', card: {...topCard}, from: col, to: emptyCols[0], score: exposesUseful ? 3 : 7 });
    }
  }

  // Tableau -> FreeCell (strategic)
  if (emptyFC.length > 0) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];
      const exposedCard = column.length > 1 ? column[column.length - 2] : null;
      const exposesUseful = exposedCard && canMoveToFoundation(exposedCard, foundations);
      const exposesA = exposedCard && exposedCard.rank === 1;

      if (exposesUseful || exposesA) {
        moves.push({ type: 't_to_fc', card: {...topCard}, from: col, to: emptyFC[0], score: exposesA ? 2 : 3 });
      }
    }
  }

  // FreeCell King to empty column
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && card.rank === 13 && emptyCols.length > 0) {
      moves.push({ type: 'fc_to_t', card: {...card}, from: i, to: emptyCols[0], score: 8 });
    }
  }

  // Non-King to empty column
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;
    const topCard = column[column.length - 1];
    if (topCard.rank !== 13 && emptyCols.length > 0) {
      moves.push({ type: 't_to_t', card: {...topCard}, from: col, to: emptyCols[0], score: 15 });
    }
  }

  // Arbitrary FreeCell move
  if (emptyFC.length > 0) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;
      const topCard = column[column.length - 1];
      moves.push({ type: 't_to_fc', card: {...topCard}, from: col, to: emptyFC[0], score: 20 });
    }
  }

  moves.sort((a, b) => a.score - b.score);
  return moves;
}

// ==================== State Operations ====================

function cloneState(state) {
  return {
    tableau: state.tableau.map(col => col.map(c => ({ ...c }))),
    freeCells: state.freeCells.map(c => c ? { ...c } : null),
    foundations: state.foundations.map(f => f.map(c => ({ ...c })))
  };
}

function applyMove(state, move) {
  const newState = cloneState(state);

  if (move.type === 't_to_f') {
    const card = newState.tableau[move.from].pop();
    if (card && card.suit) {
      newState.foundations[move.to].push(card);
    }
  } else if (move.type === 'fc_to_f') {
    const card = newState.freeCells[move.from];
    if (card && card.suit) {
      newState.freeCells[move.from] = null;
      newState.foundations[move.to].push(card);
    }
  } else if (move.type === 't_to_t') {
    const card = newState.tableau[move.from].pop();
    if (card) {
      newState.tableau[move.to].push(card);
    }
  } else if (move.type === 't_to_fc') {
    const card = newState.tableau[move.from].pop();
    if (card) {
      newState.freeCells[move.to] = card;
    }
  } else if (move.type === 'fc_to_t') {
    const card = newState.freeCells[move.from];
    if (card) {
      newState.freeCells[move.from] = null;
      newState.tableau[move.to].push(card);
    }
  }

  const autoMoves = autoPlayToFoundation(newState);
  return { state: newState, extraMoves: autoMoves };
}

// ==================== DFS Solver ====================

function solveDFS(initialState, maxIterations = 20000000, maxDepth = 300) {
  console.log('Starting DFS solver...');

  const memo = new Map();
  let bestFoundation = 0;
  let bestPath = [];
  let iterations = 0;

  const state0 = cloneState(initialState);
  const initialAutoMoves = autoPlayToFoundation(state0);

  function dfs(state, depth, path) {
    iterations++;
    if (iterations > maxIterations) return false;

    if (isWin(state)) {
      console.log(`\n*** SOLUTION FOUND at depth ${depth}! ***`);
      bestPath = [...path];
      return true;
    }

    const foundationTotal = state.foundations.reduce((sum, f) => sum + f.length, 0);
    if (foundationTotal > bestFoundation) {
      bestFoundation = foundationTotal;
      bestPath = [...path];
      if (iterations % 50000 === 0 || foundationTotal > 30) {
        console.log(`  Progress: ${bestFoundation}/52, Depth: ${depth}, Iterations: ${iterations}`);
      }
    }

    if (depth >= maxDepth) return false;

    const hash = stateHash(state);
    const prevDepth = memo.get(hash);
    if (prevDepth !== undefined && prevDepth <= depth) return false;
    memo.set(hash, depth);

    const moves = getMoves(state);

    for (const move of moves) {
      const { state: nextState, extraMoves } = applyMove(state, move);
      const fullPath = [...path, move, ...extraMoves];

      if (dfs(nextState, depth + 1 + extraMoves.length, fullPath)) {
        return true;
      }
    }

    return false;
  }

  const found = dfs(state0, 0, initialAutoMoves);

  if (found) {
    console.log(`Complete solution: ${bestPath.length} moves`);
    return bestPath;
  }

  console.log(`Best solution: ${bestFoundation}/52, ${bestPath.length} moves`);
  return bestPath;
}

// ==================== Browser Control ====================

async function getGameState(controller) {
  return await controller.executeScript(() => {
    try {
      const phaserGame = window.game;
      if (!phaserGame) return { error: 'No phaser game found' };
      const gameScene = phaserGame.scene.getScene('GameScene');
      if (!gameScene) return { error: 'GameScene not found' };
      return gameScene.getGameStateForTest ? gameScene.getGameStateForTest() : { error: 'no method' };
    } catch (e) { return { error: e.message }; }
  });
}

async function executeMoveScript(controller, script) {
  return await controller.page.evaluate(script);
}

async function moveToFoundation(controller, fromCol) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        if (!gs || !gs.tableauCards[${fromCol}] || gs.tableauCards[${fromCol}].length === 0) return { success: false };
        const card = gs.tableauCards[${fromCol}][gs.tableauCards[${fromCol}].length - 1];
        const si = ['hearts','diamonds','clubs','spades'].indexOf(card.cardData.suit);
        gs.moveCardToFoundation(card, ${fromCol}, si);
        return { success: true };
      } catch(e) { return { success: false, error: e.message }; }
    })()
  `);
}

async function moveToFreeCell(controller, fromCol, fcIdx) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        if (!gs || !gs.tableauCards[${fromCol}] || gs.tableauCards[${fromCol}].length === 0) return { success: false };
        const card = gs.tableauCards[${fromCol}][gs.tableauCards[${fromCol}].length - 1];
        gs.moveCardToFreeCell(card, ${fromCol}, ${fcIdx});
        return { success: true };
      } catch(e) { return { success: false, error: e.message }; }
    })()
  `);
}

async function moveToTableau(controller, fromCol, toCol) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        if (!gs || !gs.tableauCards[${fromCol}] || gs.tableauCards[${fromCol}].length === 0) return { success: false };
        const card = gs.tableauCards[${fromCol}][gs.tableauCards[${fromCol}].length - 1];
        gs.moveCardsToTableau([card], ${fromCol}, ${toCol});
        return { success: true };
      } catch(e) { return { success: false, error: e.message }; }
    })()
  `);
}

async function moveFreeCellToFoundation(controller, fcIdx) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        if (!gs || !gs.freeCellCards[${fcIdx}]) return { success: false };
        const cd = gs.freeCellCards[${fcIdx}];
        const card = gs.cards.find(c => c.cardData.id === cd.id);
        const si = ['hearts','diamonds','clubs','spades'].indexOf(cd.suit);
        gs.freeCellCards[${fcIdx}] = null;
        gs.freeCellArea.setCard(${fcIdx}, null);
        gs.foundationCards[si].push(card.cardData);
        gs.foundationArea.setCards(si, gs.foundationCards[si]);
        card.animateTo(gs.foundationArea.getSlotPosition(si).x, gs.foundationArea.getSlotPosition(si).y);
        gs.gameState.movesCount++;
        return { success: true };
      } catch(e) { return { success: false, error: e.message }; }
    })()
  `);
}

async function moveFreeCellToTableau(controller, fcIdx, toCol) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        if (!gs || !gs.freeCellCards[${fcIdx}]) return { success: false };
        const cd = gs.freeCellCards[${fcIdx}];
        const card = gs.cards.find(c => c.cardData.id === cd.id);
        gs.freeCellCards[${fcIdx}] = null;
        gs.freeCellArea.setCard(${fcIdx}, null);
        const y = 260 + gs.tableauCards[${toCol}].length * 25;
        const x = 80 + ${toCol} * 80;
        card.animateTo(x, y);
        gs.tableauCards[${toCol}].push(card);
        gs.gameState.movesCount++;
        return { success: true };
      } catch(e) { return { success: false, error: e.message }; }
    })()
  `);
}

async function executeMove(controller, move) {
  switch (move.type) {
    case 't_to_f': return await moveToFoundation(controller, move.from);
    case 't_to_fc': return await moveToFreeCell(controller, move.from, move.to);
    case 't_to_t': return await moveToTableau(controller, move.from, move.to);
    case 'fc_to_f': return await moveFreeCellToFoundation(controller, move.from);
    case 'fc_to_t': return await moveFreeCellToTableau(controller, move.from, move.to);
  }
}

// ==================== Interactive Solver ====================

async function solveInteractively(controller, initialState) {
  let currentState = cloneState(initialState);
  let totalMoves = 0;
  let phase = 1;

  while (true) {
    const foundationTotal = currentState.foundations.reduce((sum, f) => sum + f.length, 0);
    console.log(`\n=== Phase ${phase}: ${foundationTotal}/52 in foundation ===`);

    if (isWin(currentState)) {
      console.log('\n*** VICTORY! All cards in foundation! ***');
      return true;
    }

    // Find solution from current state
    console.log('Searching for solution...');
    const solution = solveDFS(currentState, 10000000, 200);

    if (!solution || solution.length === 0) {
      console.log('No moves found. Checking game state...');
      const actualState = await getGameState(controller);
      const actualFoundation = actualState.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;

      if (actualFoundation === 52) {
        console.log('\n*** VICTORY! Game completed! ***');
        return true;
      }

      console.log(`Current progress: ${actualFoundation}/52`);
      return false;
    }

    // Execute moves
    console.log(`Executing ${solution.length} moves...`);
    let failedMoves = 0;
    let lastSuccessIdx = -1;

    for (let i = 0; i < solution.length; i++) {
      const move = solution[i];
      const cardDisplay = `${move.card.rank}${SUIT_SYMBOLS[move.card.suit]}`;

      const result = await executeMove(controller, move);
      await sleep(50);

      if (result?.success) {
        totalMoves++;
        lastSuccessIdx = i;

        // Update local state
        const { state: newState } = applyMove(currentState, move);
        currentState = newState;

        if ((i + 1) % 30 === 0 || move.type.includes('_f')) {
          console.log(`  [${i + 1}/${solution.length}] ${cardDisplay} ${move.type}`);
        }
      } else {
        failedMoves++;
        if (failedMoves > 10) {
          console.log(`  Too many failed moves at step ${i + 1}`);
          break;
        }
      }
    }

    // Verify actual game state
    const actualState = await getGameState(controller);
    const actualFoundation = actualState.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;

    console.log(`Phase ${phase} result: ${actualFoundation}/52 cards in foundation`);

    if (actualFoundation === 52) {
      console.log('\n*** VICTORY! ***');
      return true;
    }

    // Update local state to match actual
    currentState = cloneState(actualState);
    phase++;

    if (phase > 10) {
      console.log('Max phases reached');
      return false;
    }
  }
}

// ==================== Main ====================

async function main() {
  console.log('========================================');
  console.log('  FreeCell Interactive Solver');
  console.log('========================================\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    console.log('Starting game...');
    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);

    console.log('Selecting Level 1...');
    await controller.page.mouse.click(box.x + 160, box.y + 200);
    await sleep(3000);

    const initialState = await getGameState(controller);
    if (initialState.error) {
      console.log('Failed to get game state:', initialState.error);
      return;
    }

    console.log('Game initialized successfully');
    console.log('Foundation:', initialState.foundations?.map(f => f.length).join('/'));
    await controller.screenshot({ name: 'initial' });

    const success = await solveInteractively(controller, initialState);

    const finalState = await getGameState(controller);
    const foundationTotal = finalState.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;

    console.log('\n========================================');
    console.log('  FINAL RESULTS');
    console.log('========================================');
    console.log(`Foundation: ${foundationTotal}/52`);

    if (foundationTotal === 52) {
      console.log('\n*** SUCCESS! Level 1 completed! ***');
      await controller.screenshot({ name: 'victory' });
    } else {
      console.log(`\nProgress: ${foundationTotal} cards in foundation`);
      await controller.screenshot({ name: 'final' });
    }

    console.log('\nClosing browser in 10 seconds...');
    await sleep(10000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);