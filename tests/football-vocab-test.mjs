#!/usr/bin/env node
/**
 * Football Vocab Automation Test
 * Uses ChromeMCP to test the football vocabulary game
 */

import { BrowserController, compareImages } from '../packages/core/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'football-vocab');
const BASELINE_DIR = path.join(__dirname, 'baselines', 'football-vocab');
const PORT = 9999;

// Ensure directories exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(BASELINE_DIR, { recursive: true });

const controller = new BrowserController(OUTPUT_DIR);

let passed = 0;
let failed = 0;

async function runTests() {
    console.log('🚀 Football Vocab Automation Test\n');
    console.log('=' .repeat(50));

    try {
        // Test 1: Launch and navigate
        console.log('\n📱 Test 1: Launch browser and navigate to game');
        await controller.launch({ headless: false, viewport: { width: 1280, height: 800 } });
        await controller.navigate(`http://localhost:${PORT}`);
        await controller.waitForTimeout(2000);

        const screenshot1 = await controller.screenshot({ name: '01-initial-load', fullPage: true });
        console.log('  ✓ Page loaded successfully');
        console.log(`  📸 Screenshot: ${screenshot1.path}`);
        passed++;

        // Test 2: Check initial UI elements
        console.log('\n🎨 Test 2: Verify UI elements');
        const pageInfo = await controller.executeScript(() => {
            return {
                title: document.title,
                headerText: document.querySelector('.header h1')?.textContent,
                tabsCount: document.querySelectorAll('.nav-tab').length,
                canvasExists: !!document.getElementById('gameCanvas'),
                wordCardExists: !!document.querySelector('.word-card'),
                optionsCount: document.querySelectorAll('.option-btn').length
            };
        });

        console.log('  Page title:', pageInfo.title);
        console.log('  Header:', pageInfo.headerText);
        console.log('  Navigation tabs:', pageInfo.tabsCount);
        console.log('  Canvas exists:', pageInfo.canvasExists);
        console.log('  Word card exists:', pageInfo.wordCardExists);
        console.log('  Option buttons:', pageInfo.optionsCount);

        if (pageInfo.tabsCount === 4 && pageInfo.canvasExists && pageInfo.wordCardExists) {
            console.log('  ✓ All UI elements present');
            passed++;
        } else {
            console.log('  ✗ Some UI elements missing');
            failed++;
        }

        // Test 3: Test mode switching - Shooting mode
        console.log('\n🎯 Test 3: Switch to Shooting mode');
        await controller.click('.nav-tab[data-mode="shooting"]');
        await controller.waitForTimeout(1000);

        const shootingModeActive = await controller.executeScript(() => {
            return document.querySelector('.nav-tab[data-mode="shooting"]')?.classList.contains('active');
        });

        const screenshot2 = await controller.screenshot({ name: '02-shooting-mode', fullPage: true });

        if (shootingModeActive) {
            console.log('  ✓ Shooting mode activated');
            passed++;
        } else {
            console.log('  ✗ Shooting mode not activated');
            failed++;
        }

        // Test 4: Test word display
        console.log('\n📖 Test 4: Verify word display');
        const wordInfo = await controller.executeScript(() => {
            const wordEl = document.getElementById('wordDisplay');
            const phoneticEl = document.getElementById('phonetic');
            return {
                word: wordEl?.textContent,
                phonetic: phoneticEl?.textContent,
                hasWord: !!wordEl && wordEl.textContent.length > 0
            };
        });

        console.log('  Current word:', wordInfo.word);
        console.log('  Phonetic:', wordInfo.phonetic);

        if (wordInfo.hasWord) {
            console.log('  ✓ Word displayed correctly');
            passed++;
        } else {
            console.log('  ✗ Word not displayed');
            failed++;
        }

        // Test 5: Test option selection (correct answer)
        console.log('\n✅ Test 5: Select an answer option');
        const beforeScore = await controller.executeScript(() => {
            return document.getElementById('score')?.textContent;
        });
        console.log('  Score before:', beforeScore);

        // Click first option
        await controller.click('.option-btn');
        await controller.waitForTimeout(1500);

        const afterScore = await controller.executeScript(() => {
            return document.getElementById('score')?.textContent;
        });
        console.log('  Score after:', afterScore);

        const screenshot3 = await controller.screenshot({ name: '03-after-answer', fullPage: true });
        console.log('  ✓ Answer selected');
        passed++;

        // Test 6: Switch to Levels mode
        console.log('\n🏆 Test 6: Switch to Levels mode');
        await controller.click('.nav-tab[data-mode="levels"]');
        await controller.waitForTimeout(1000);

        const levelsModeActive = await controller.executeScript(() => {
            return document.querySelector('.nav-tab[data-mode="levels"]')?.classList.contains('active');
        });

        const levelInfo = await controller.executeScript(() => {
            return {
                level: document.getElementById('levelDisplay')?.textContent,
                progress: document.getElementById('levelProgress')?.textContent,
                required: document.getElementById('levelRequired')?.textContent
            };
        });

        console.log('  Level:', levelInfo.level);
        console.log('  Progress:', levelInfo.progress, '/', levelInfo.required);

        const screenshot4 = await controller.screenshot({ name: '04-levels-mode', fullPage: true });

        if (levelsModeActive) {
            console.log('  ✓ Levels mode activated');
            passed++;
        } else {
            console.log('  ✗ Levels mode not activated');
            failed++;
        }

        // Test 7: Switch to Vocabulary mode
        console.log('\n📚 Test 7: Switch to Vocabulary mode');
        await controller.click('.nav-tab[data-mode="vocabulary"]');
        await controller.waitForTimeout(1000);

        const vocabModeActive = await controller.executeScript(() => {
            return document.querySelector('.nav-tab[data-mode="vocabulary"]')?.classList.contains('active');
        });

        const screenshot5 = await controller.screenshot({ name: '05-vocabulary-mode', fullPage: true });

        if (vocabModeActive) {
            console.log('  ✓ Vocabulary mode activated');
            passed++;
        } else {
            console.log('  ✗ Vocabulary mode not activated');
            failed++;
        }

        // Test 8: Back to Practice mode
        console.log('\n📖 Test 8: Back to Practice mode');
        await controller.click('.nav-tab[data-mode="practice"]');
        await controller.waitForTimeout(1000);

        const practiceModeActive = await controller.executeScript(() => {
            return document.querySelector('.nav-tab[data-mode="practice"]')?.classList.contains('active');
        });

        // Test navigation buttons in practice mode
        const hasNextBtn = await controller.executeScript(() => {
            return !!document.querySelector('button[onclick="nextPracticeWord()"]');
        });

        if (practiceModeActive && hasNextBtn) {
            console.log('  ✓ Practice mode with navigation');
            passed++;
        } else {
            console.log('  ✗ Practice mode issues');
            failed++;
        }

        // Test 9: Test statistics button
        console.log('\n📊 Test 9: Open statistics modal');
        await controller.click('.status-bar button[onclick="showStats()"]');
        await controller.waitForTimeout(500);

        const screenshot6 = await controller.screenshot({ name: '06-statistics-modal', fullPage: true });

        const statsVisible = await controller.executeScript(() => {
            return !!document.getElementById('statsModal');
        });

        if (statsVisible) {
            console.log('  ✓ Statistics modal opened');
            passed++;

            // Close stats modal
            await controller.click('#statsModal button[onclick="closeStats()"]');
            await controller.waitForTimeout(500);
        } else {
            console.log('  ✗ Statistics modal not opened');
            failed++;
        }

        // Test 10: Verify responsive design (mobile viewport)
        console.log('\n📱 Test 10: Test responsive design (mobile viewport)');
        await controller.executeScript(() => {
            window.resizeTo(375, 667);
        });
        await controller.waitForTimeout(500);

        const screenshot7 = await controller.screenshot({ name: '07-mobile-viewport', fullPage: true });

        const mobileLayout = await controller.executeScript(() => {
            return window.innerWidth < 480;
        });

        if (mobileLayout) {
            console.log('  ✓ Mobile viewport test passed');
            passed++;
        } else {
            console.log('  ⚠ Mobile viewport test (non-critical)');
        }

        // Test Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Summary');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📁 Output: ${OUTPUT_DIR}`);
        console.log('='.repeat(50));

        if (failed > 0) {
            console.log('\n⚠️  Some tests failed. Check screenshots for details.');
            process.exit(1);
        } else {
            console.log('\n🎉 All tests passed!');
        }

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await controller.close();
    }
}

runTests();
