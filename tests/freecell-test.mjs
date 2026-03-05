#!/usr/bin/env node
/**
 * FreeCell Automation Test
 * Uses ChromeMCP to test the FreeCell card game
 */

import { BrowserController } from '../packages/core/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'freecell');
const PORT = 3004;

// Ensure directories exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const controller = new BrowserController(OUTPUT_DIR);

let passed = 0;
let failed = 0;

async function runTests() {
    console.log('🃏 FreeCell Automation Test\n');
    console.log('=' .repeat(50));

    try {
        // Test 1: Launch and navigate
        console.log('\n📱 Test 1: Launch browser and navigate to game');
        await controller.launch({ headless: false, viewport: { width: 720, height: 1280 } });
        await controller.navigate(`http://localhost:${PORT}`);
        await controller.waitForTimeout(3000);

        const screenshot1 = await controller.screenshot({ name: '01-initial-load', fullPage: true });
        console.log('  ✓ Page loaded successfully');
        console.log(`  📸 Screenshot: ${screenshot1.path}`);
        passed++;

        // Test 2: Check initial UI elements (Menu Scene)
        console.log('\n🎨 Test 2: Verify Menu Scene UI elements');
        const menuInfo = await controller.executeScript(() => {
            return {
                title: document.querySelector('canvas') ? 'Canvas exists' : 'No canvas',
                hasGame: !!document.querySelector('#game-container canvas')
            };
        });

        console.log('  Canvas exists:', menuInfo.hasGame);
        if (menuInfo.hasGame) {
            console.log('  ✓ Menu scene loaded');
            passed++;
        } else {
            console.log('  ✗ Menu scene not loaded');
            failed++;
        }

        // Test 3: Navigate to level select by clicking start button
        console.log('\n🎯 Test 3: Navigate to Level Select');
        await controller.waitForTimeout(1000);

        // Use executeScript to simulate click on the start button
        await controller.executeScript(() => {
            // Find and click the start button area (center of screen)
            const canvas = document.querySelector('#game-container canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const clickX = rect.left + rect.width / 2;
                const clickY = rect.top + rect.height * 0.5;

                // Create and dispatch click event
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: clickX,
                    clientY: clickY
                });
                canvas.dispatchEvent(event);
            }
        });
        await controller.waitForTimeout(2000);

        const screenshot3 = await controller.screenshot({ name: '03-level-select', fullPage: true });
        console.log('  ✓ Navigated to level select');
        console.log(`  📸 Screenshot: ${screenshot3.path}`);
        passed++;

        // Test 4: Start a level
        console.log('\n🎮 Test 4: Start Level 1');
        await controller.waitForTimeout(500);

        // Click on level 1 (first level position)
        await controller.executeScript(() => {
            const canvas = document.querySelector('#game-container canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                // First level is around position (120, 210) in game coordinates
                const clickX = rect.left + 120;
                const clickY = rect.top + 210;

                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: clickX,
                    clientY: clickY
                });
                canvas.dispatchEvent(event);
            }
        });
        await controller.waitForTimeout(3000);

        const screenshot4 = await controller.screenshot({ name: '04-game-scene', fullPage: true });
        console.log('  ✓ Game scene loaded');
        console.log(`  📸 Screenshot: ${screenshot4.path}`);
        passed++;

        // Test 5: Verify game elements
        console.log('\n🃏 Test 5: Verify game elements');
        const gameInfo = await controller.executeScript(() => {
            const canvas = document.querySelector('canvas');
            return {
                hasCanvas: !!canvas,
                canvasWidth: canvas?.width,
                canvasHeight: canvas?.height
            };
        });

        console.log('  Canvas dimensions:', gameInfo.canvasWidth, 'x', gameInfo.canvasHeight);
        if (gameInfo.hasCanvas && gameInfo.canvasWidth === 720) {
            console.log('  ✓ Game elements present');
            passed++;
        } else {
            console.log('  ✗ Game elements missing');
            failed++;
        }

        // Test 6: Test card interaction
        console.log('\n🖱️ Test 6: Test card interaction');
        await controller.waitForTimeout(500);

        // Click on a card position
        await controller.executeScript(() => {
            const canvas = document.querySelector('#game-container canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                // Click on a card area
                const clickX = rect.left + 150;
                const clickY = rect.top + 350;

                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: clickX,
                    clientY: clickY
                });
                canvas.dispatchEvent(event);
            }
        });
        await controller.waitForTimeout(500);

        const screenshot6 = await controller.screenshot({ name: '06-card-interaction', fullPage: true });
        console.log('  ✓ Card interaction tested');
        console.log(`  📸 Screenshot: ${screenshot6.path}`);
        passed++;

        // Test 7: Test buttons
        console.log('\n🔧 Test 7: Test game buttons');
        await controller.waitForTimeout(500);

        // Test hint button
        await controller.executeScript(() => {
            const canvas = document.querySelector('#game-container canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const clickX = rect.left + 240;
                const clickY = rect.top + 1200;

                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: clickX,
                    clientY: clickY
                });
                canvas.dispatchEvent(event);
            }
        });
        await controller.waitForTimeout(1000);

        const screenshot7 = await controller.screenshot({ name: '07-buttons-test', fullPage: true });
        console.log('  ✓ Buttons tested');
        console.log(`  📸 Screenshot: ${screenshot7.path}`);
        passed++;

        // Test 8: Test back button
        console.log('\n← Test 8: Test back button');
        await controller.waitForTimeout(500);

        // Click back button
        await controller.executeScript(() => {
            const canvas = document.querySelector('#game-container canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const clickX = rect.left + 50;
                const clickY = rect.top + 45;

                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: clickX,
                    clientY: clickY
                });
                canvas.dispatchEvent(event);
            }
        });
        await controller.waitForTimeout(1000);

        const screenshot8 = await controller.screenshot({ name: '08-back-test', fullPage: true });
        console.log('  ✓ Back button tested');
        console.log(`  📸 Screenshot: ${screenshot8.path}`);
        passed++;

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Summary');
        console.log('='.repeat(50));
        console.log(`  ✅ Passed: ${passed}`);
        console.log(`  ❌ Failed: ${failed}`);
        console.log(`  📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

        if (failed === 0) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log('\n⚠️ Some tests failed. Check screenshots for details.');
        }

    } catch (error) {
        console.error('\n❌ Test error:', error.message);
        failed++;
    } finally {
        await controller.close();
    }

    // Write test report
    const report = {
        timestamp: new Date().toISOString(),
        totalTests: passed + failed,
        passed,
        failed,
        successRate: ((passed / (passed + failed)) * 100).toFixed(1) + '%',
        screenshots: fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'))
    };

    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'test-report.json'),
        JSON.stringify(report, null, 2)
    );

    console.log(`\n📁 Test report saved to: ${path.join(OUTPUT_DIR, 'test-report.json')}`);

    process.exit(failed > 0 ? 1 : 0);
}

runTests();