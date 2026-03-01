#!/usr/bin/env node
/**
 * Debug test for shooting mode
 */

import { BrowserController } from '../packages/core/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'football-vocab-debug');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const controller = new BrowserController(OUTPUT_DIR);

async function runTest() {
    console.log('🔍 Debugging Shooting Mode\n');
    console.log('=' .repeat(60));

    try {
        await controller.launch({ headless: false, viewport: { width: 1280, height: 800 } });
        await controller.navigate(`http://localhost:9999`);
        await controller.waitForTimeout(2000);

        // Switch to shooting mode
        await controller.click('.nav-tab[data-mode="shooting"]');
        await controller.waitForTimeout(1500);

        await controller.screenshot({ name: '01-shooting-start' });

        // Get detailed game state
        console.log('\n📊 Initial Game State:');
        const state1 = await controller.executeScript(() => ({
            mode: GameState.mode,
            score: GameState.score,
            streak: GameState.streak,
            isAnswering: GameState.isAnswering,
            currentWord: GameState.currentWord,
            options: GameState.options?.map(o => ({ id: o.id, word: o.word, meaning: o.meaning }))
        }));

        console.log('  Mode:', state1.mode);
        console.log('  Current Word:', JSON.stringify(state1.currentWord));
        console.log('  Options:', JSON.stringify(state1.options));
        console.log('  Score:', state1.score);
        console.log('  Streak:', state1.streak);
        console.log('  isAnswering:', state1.isAnswering);

        // Find correct option index
        const correctIndex = state1.options?.findIndex(o => o.id === state1.currentWord?.id);
        console.log('\n  Correct option index:', correctIndex);
        console.log('  Correct option:', state1.options?.[correctIndex]);

        // Get UI elements
        const uiInfo = await controller.executeScript(() => ({
            displayedWord: document.getElementById('shootingWordDisplay')?.textContent,
            buttonTexts: Array.from(document.querySelectorAll('#shootingOptionsContainer .option-btn'))
                .map((btn, idx) => ({ idx, text: btn.textContent, disabled: btn.disabled }))
        }));

        console.log('\n📱 UI State:');
        console.log('  Displayed word:', uiInfo.displayedWord);
        console.log('  Buttons:', uiInfo.buttonTexts);

        // Try to call selectOption directly
        console.log('\n🖱️  Clicking option', correctIndex);

        // Build script with embedded index value
        const script = `
            (function() {
                const index = ${correctIndex};
                const logs = [];
                logs.push('Index type: ' + typeof index);
                logs.push('Index value: ' + index);
                logs.push('Before click - isAnswering: ' + GameState.isAnswering);
                logs.push('Before click - options length: ' + GameState.options?.length);
                logs.push('Before click - options[index]: ' + JSON.stringify(GameState.options?.[index]));

                try {
                    // Only reset if it's stuck from a previous failed attempt
                    if (GameState.isAnswering) {
                        logs.push('Resetting stuck isAnswering flag');
                        GameState.isAnswering = false;
                    }
                    selectOption(index);
                    logs.push('After click - isAnswering: ' + GameState.isAnswering);
                    return { success: true, logs };
                } catch (e) {
                    logs.push('Error: ' + e.message);
                    return { success: false, error: e.message, stack: e.stack, logs };
                }
            })()
        `;

        const clickResult = await controller.executeScript(script);
        console.log('  Click result:', clickResult);

        await controller.waitForTimeout(500);
        await controller.screenshot({ name: '02-after-click' });

        // Check state immediately after click
        console.log('\n📊 State immediately after click:');
        const state2 = await controller.executeScript(() => ({
            score: GameState.score,
            streak: GameState.streak,
            isAnswering: GameState.isAnswering
        }));
        console.log('  Score:', state2.score);
        console.log('  Streak:', state2.streak);
        console.log('  isAnswering:', state2.isAnswering);

        // Wait for transition
        await controller.waitForTimeout(2000);

        console.log('\n📊 State after 2 seconds:');
        const state3 = await controller.executeScript(() => ({
            score: GameState.score,
            streak: GameState.streak,
            isAnswering: GameState.isAnswering,
            currentWord: GameState.currentWord?.word,
            options: GameState.options?.map(o => o.meaning)
        }));
        console.log('  Score:', state3.score);
        console.log('  Streak:', state3.streak);
        console.log('  isAnswering:', state3.isAnswering);
        console.log('  New word:', state3.currentWord);
        console.log('  New options:', state3.options);

        await controller.screenshot({ name: '03-after-transition' });

        console.log('\n✅ Debug complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await controller.close();
    }
}

runTest();
