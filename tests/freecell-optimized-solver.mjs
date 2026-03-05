#!/usr/bin/env node
/**
 * FreeCell Level 1 - Optimized Best-First DFS Solver
 * Key improvements:
 * 1. Complete state hashing (all card positions)
 * 2. Auto-play to foundation (safe moves)
 * 3. Better move ordering with lookahead
 * 4. Supermove detection (multi-card moves)
 * 5. Priority-based exploration
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

// ==================== Complete State Hashing ====================

function stateHash(state) {
  const { tableau, freeCells, foundations } = state;

  // Encode each card position uniquely
  const tableauStr = tableau.map(col =>
    col.map(c => cardId(c)).join('')
  ).join('|');

  const fcStr = freeCells.map(c => c ? cardId(c) : '_').join('');

  const fdStr = foundations.map(f =>
    f.map(c => cardId(c)).join('')
  ).join('|');

  return `${tableauStr}#${fcStr}#${fdStr}`;
}

// ==================== Safe Auto-Play ====================

// Check if a card can be safely auto-played to foundation
// A card is safe if all cards that could be played on it are already in foundation
function isSafeToAutoPlay(card, foundations) {
  // Aces and 2s are always safe
  if (card.rank <= 2) return true;

  const suitIndex = getSuitIndex(card.suit);
  const foundation = foundations[suitIndex];

  // Check if the card below is already in foundation
  if (foundation.length < card.rank - 1) return false;

  // For cards 3+, also check opposite color cards of rank-1 and rank-2
  const oppositeColors = isRed(card.suit) ? ['clubs', 'spades'] : ['hearts', 'diamonds'];

  for (const oppSuit of oppositeColors) {
    const oppIndex = getSuitIndex(oppSuit);
    const oppFoundation = foundations[oppIndex];

    // Both opposite color cards of rank-1 and rank-2 should be in foundation
    // to ensure we're not blocking any needed cards
    if (oppFoundation.length < card.rank - 2) {
      return false;
    }
  }

  return true;
}

// Auto-play all safe moves to foundation
function autoPlayToFoundation(state) {
  let changed = true;
  let moves = [];

  while (changed) {
    changed = false;

    // Check free cells
    for (let i = 0; i < 4; i++) {
      const card = state.freeCells[i];
      if (card && canMoveToFoundation(card, state.foundations) && isSafeToAutoPlay(card, state.foundations)) {
        moves.push({ type: 'fc_to_f', card: {...card}, from: i, to: getSuitIndex(card.suit), auto: true });
        state.foundations[getSuitIndex(card.suit)].push({...card});
        state.freeCells[i] = null;
        changed = true;
      }
    }

    // Check tableau
    for (let col = 0; col < 8; col++) {
      const column = state.tableau[col];
      if (column.length === 0) continue;
      const topCard = column[column.length - 1];
      if (canMoveToFoundation(topCard, state.foundations) && isSafeToAutoPlay(topCard, state.foundations)) {
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

// Calculate maximum cards that can be moved
function getMaxMovableCards(emptyFreeCells, emptyColumns, isMovingToEmpty) {
  // Formula: (1 + emptyFreeCells) * 2^emptyColumns
  // If moving to empty column, reduce effective empty columns by 1
  const effectiveEmptyCols = isMovingToEmpty ? emptyColumns - 1 : emptyColumns;
  return (1 + emptyFreeCells) * Math.pow(2, Math.max(0, effectiveEmptyCols));
}

// Get the length of a valid sequence from a column (descending, alternating colors)
function getValidSequenceLength(column) {
  if (column.length <= 1) return column.length;

  let len = 1;
  for (let i = column.length - 2; i >= 0; i--) {
    if (canStackOnTableau(column[i + 1], column[i])) {
      len++;
    } else {
      break;
    }
  }
  return len;
}

function getMoves(state) {
  const { tableau, freeCells, foundations } = state;
  const moves = [];

  const emptyFC = getEmptyFreeCells(freeCells);
  const emptyCols = getEmptyColumns(tableau);
  const emptyFCCount = emptyFC.length;
  const emptyColCount = emptyCols.length;

  // 1. Foundation moves (always highest priority) - already handled by auto-play
  // But we still generate them for non-safe cards

  // FreeCell -> Foundation (non-auto)
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && canMoveToFoundation(card, foundations) && !isSafeToAutoPlay(card, foundations)) {
      moves.push({ type: 'fc_to_f', card: {...card}, from: i, to: getSuitIndex(card.suit), score: 0 });
    }
  }

  // Tableau -> Foundation (non-auto)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;
    const topCard = column[column.length - 1];
    if (canMoveToFoundation(topCard, foundations) && !isSafeToAutoPlay(topCard, foundations)) {
      moves.push({ type: 't_to_f', card: {...topCard}, from: col, to: getSuitIndex(topCard.suit), score: 0 });
    }
  }

  // 2. Tableau -> Tableau moves (exposing useful cards)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length === 0) continue;

    const topCard = column[column.length - 1];
    const seqLen = getValidSequenceLength(column);
    const maxMovable = getMaxMovableCards(emptyFCCount, emptyColCount, false);

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      if (targetCol === col) continue;
      const targetColumn = tableau[targetCol];

      if (targetColumn.length > 0) {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(topCard, targetCard)) {
          // Calculate what this move exposes
          const willExpose = column.length > 1;
          const exposedCard = willExpose ? column[column.length - 2] : null;
          const exposesUseful = exposedCard && canMoveToFoundation(exposedCard, foundations);
          const exposesA = exposedCard && exposedCard.rank === 1;

          // Check if we can move a sequence
          const canMoveSeq = seqLen > 1 && seqLen <= maxMovable;

          let score = 5;
          if (exposesA) score = 1;
          else if (exposesUseful) score = 2;
          else if (canMoveSeq) score = 3;
          else if (willExpose) score = 4;

          moves.push({
            type: 't_to_t',
            card: {...topCard},
            from: col,
            to: targetCol,
            score,
            seqLen: Math.min(seqLen, maxMovable)
          });
        }
      }
    }
  }

  // 3. FreeCell -> Tableau
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (!card) continue;

    for (let targetCol = 0; targetCol < 8; targetCol++) {
      const targetColumn = tableau[targetCol];
      if (targetColumn.length > 0) {
        const targetCard = targetColumn[targetColumn.length - 1];
        if (canStackOnTableau(card, targetCard)) {
          moves.push({ type: 'fc_to_t', card: {...card}, from: i, to: targetCol, score: 6 });
        }
      }
    }
  }

  // 4. King to empty column
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;

    const topCard = column[column.length - 1];
    if (topCard.rank === 13 && emptyColCount > 0) {
      const willExpose = column.length > 1;
      const exposedCard = willExpose ? column[column.length - 2] : null;
      const exposesUseful = exposedCard && canMoveToFoundation(exposedCard, foundations);

      moves.push({
        type: 't_to_t',
        card: {...topCard},
        from: col,
        to: emptyCols[0],
        score: exposesUseful ? 3 : 7
      });
    }
  }

  // 5. Tableau -> FreeCell (strategic - only to expose useful cards)
  if (emptyFCCount > 0) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;

      const topCard = column[column.length - 1];
      const willExpose = column.length > 1;
      const exposedCard = willExpose ? column[column.length - 2] : null;
      const exposesUseful = exposedCard && canMoveToFoundation(exposedCard, foundations);
      const exposesA = exposedCard && exposedCard.rank === 1;

      if (exposesUseful || exposesA) {
        moves.push({
          type: 't_to_fc',
          card: {...topCard},
          from: col,
          to: emptyFC[0],
          score: exposesA ? 2 : 4
        });
      }
    }
  }

  // 6. FreeCell King to empty column
  for (let i = 0; i < 4; i++) {
    const card = freeCells[i];
    if (card && card.rank === 13 && emptyColCount > 0) {
      moves.push({ type: 'fc_to_t', card: {...card}, from: i, to: emptyCols[0], score: 8 });
    }
  }

  // 7. Non-King to empty column (lower priority)
  for (let col = 0; col < 8; col++) {
    const column = tableau[col];
    if (column.length <= 1) continue;

    const topCard = column[column.length - 1];
    if (topCard.rank !== 13 && emptyColCount > 0) {
      const seqLen = getValidSequenceLength(column);
      const maxMovable = getMaxMovableCards(emptyFCCount, emptyColCount - 1, true);

      // Only move to empty column if it helps
      if (seqLen <= maxMovable) {
        moves.push({ type: 't_to_t', card: {...topCard}, from: col, to: emptyCols[0], score: 15 });
      }
    }
  }

  // 8. Arbitrary move to FreeCell (lowest priority)
  if (emptyFCCount > 0) {
    for (let col = 0; col < 8; col++) {
      const column = tableau[col];
      if (column.length <= 1) continue;

      const topCard = column[column.length - 1];
      moves.push({ type: 't_to_fc', card: {...topCard}, from: col, to: emptyFC[0], score: 20 });
    }
  }

  // Sort by score (lower is better)
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
    newState.foundations[move.to].push(card);
  } else if (move.type === 'fc_to_f') {
    const card = newState.freeCells[move.from];
    newState.freeCells[move.from] = null;
    newState.foundations[move.to].push(card);
  } else if (move.type === 't_to_t') {
    const cards = newState.tableau[move.from].splice(-move.seqLen || 1);
    newState.tableau[move.to].push(...cards);
  } else if (move.type === 't_to_fc') {
    const card = newState.tableau[move.from].pop();
    newState.freeCells[move.to] = card;
  } else if (move.type === 'fc_to_t') {
    const card = newState.freeCells[move.from];
    newState.freeCells[move.from] = null;
    newState.tableau[move.to].push(card);
  }

  // Auto-play safe moves
  const autoMoves = autoPlayToFoundation(newState);

  return { state: newState, extraMoves: autoMoves };
}

// ==================== Best-First DFS Solver ====================

function solve(initialState, maxIterations = 15000000, maxDepth = 250) {
  console.log('Starting Best-First DFS solver...');
  console.log('Initial state:');

  const memo = new Map();
  let bestFoundation = 0;
  let bestPath = [];
  let iterations = 0;
  let solutions = [];

  // Apply auto-play first
  const state0 = cloneState(initialState);
  const initialAutoMoves = autoPlayToFoundation(state0);

  function dfs(state, depth, path) {
    iterations++;
    if (iterations > maxIterations) return;

    // Check win
    if (isWin(state)) {
      console.log(`\n*** SOLUTION FOUND at depth ${depth}! ***`);
      solutions.push([...path]);
      return true;
    }

    // Track progress
    const foundationTotal = state.foundations.reduce((sum, f) => sum + f.length, 0);
    if (foundationTotal > bestFoundation) {
      bestFoundation = foundationTotal;
      bestPath = [...path];
      console.log(`  Progress: ${bestFoundation}/52, Depth: ${depth}, Iterations: ${iterations}`);
    }

    // Depth limit
    if (depth >= maxDepth) return false;

    // Memoization with depth
    const hash = stateHash(state);
    const prevDepth = memo.get(hash);
    if (prevDepth !== undefined && prevDepth <= depth) {
      return false;
    }
    memo.set(hash, depth);

    // Get and try moves
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

  if (found && solutions.length > 0) {
    console.log(`\nComplete solution found with ${solutions[0].length} moves!`);
    return solutions[0];
  }

  console.log(`\nNo complete solution. Best: ${bestFoundation}/52, Path: ${bestPath.length} moves`);
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
        const col = ${fromCol};
        const card = gs.tableauCards[col][gs.tableauCards[col].length - 1];
        const si = ['hearts','diamonds','clubs','spades'].indexOf(card.cardData.suit);
        gs.moveCardToFoundation(card, col, si);
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
        const card = gs.tableauCards[${fromCol}][gs.tableauCards[${fromCol}].length - 1];
        gs.moveCardToFreeCell(card, ${fromCol}, ${fcIdx});
        return { success: true };
      } catch(e) { return { success: false, error: e.message }; }
    })()
  `);
}

async function moveToTableau(controller, fromCol, toCol, seqLen = 1) {
  return await executeMoveScript(controller, `
    (function() {
      try {
        const gs = window.game.scene.getScene('GameScene');
        const cards = gs.tableauCards[${fromCol}].splice(-${seqLen});
        gs.moveCardsToTableau(cards, ${fromCol}, ${toCol});
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
    case 't_to_t': return await moveToTableau(controller, move.from, move.to, move.seqLen || 1);
    case 'fc_to_f': return await moveFreeCellToFoundation(controller, move.from);
    case 'fc_to_t': return await moveFreeCellToTableau(controller, move.from, move.to);
  }
}

async function main() {
  console.log('========================================');
  console.log('  FreeCell Optimized Solver');
  console.log('========================================\n');

  const controller = new BrowserController(CONFIG.outputDir);

  try {
    await controller.launch({ headless: false, viewport: CONFIG.viewport });
    await controller.navigate(CONFIG.targetUrl);
    await sleep(3000);

    const canvas = await controller.page.$('#game-container canvas');
    const box = await canvas.boundingBox();

    console.log('Clicking to start game...');
    await controller.page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
    await sleep(1500);

    console.log('Clicking Level 1...');
    await controller.page.mouse.click(box.x + 160, box.y + 200);
    await sleep(3000);

    const initialState = await getGameState(controller);
    if (initialState.error) {
      console.log('Failed to get game state:', initialState.error);
      return;
    }

    console.log('Game state obtained successfully');
    console.log('Foundation:', initialState.foundations?.map(f => f.length).join('/'));
    await controller.screenshot({ name: 'initial' });

    // Run solver
    console.log('\nStarting solver...\n');
    const solution = solve(initialState, 15000000, 250);

    if (!solution || solution.length === 0) {
      console.log('\nNo moves found');
      await controller.screenshot({ name: 'failed' });
      return;
    }

    console.log(`\nExecuting ${solution.length} moves...`);

    let successCount = 0;
    for (let i = 0; i < solution.length; i++) {
      const move = solution[i];
      const cardDisplay = `${move.card.rank}${SUIT_SYMBOLS[move.card.suit]}`;

      const result = await executeMove(controller, move);
      if (result?.success) {
        successCount++;
        if ((i + 1) % 20 === 0 || move.type.includes('_f')) {
          console.log(`[${i + 1}/${solution.length}] ${cardDisplay} ${move.type} - OK`);
        }
      }

      await sleep(60);
    }

    const finalState = await getGameState(controller);
    const foundationTotal = finalState.foundations?.reduce((sum, f) => sum + f.length, 0) || 0;

    console.log('\n========================================');
    console.log('  RESULTS');
    console.log('========================================');
    console.log(`Foundation: ${foundationTotal}/52`);
    console.log(`Moves executed: ${successCount}/${solution.length}`);

    if (foundationTotal === 52) {
      console.log('\n*** SUCCESS! Level 1 completed! ***');
      await controller.screenshot({ name: 'victory' });
    } else {
      console.log(`\nPartial completion: ${foundationTotal} cards in foundation`);
      await controller.screenshot({ name: 'final' });
    }

    console.log('\nBrowser closing in 10 seconds...');
    await sleep(10000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await controller.close();
  }
}

main().catch(console.error);