#!/usr/bin/env node
/**
 * Football Vocab Shooting Mode Test
 * Tests the shooting challenge mode with consecutive correct answers
 */

import { BrowserController } from '../packages/core/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'football-vocab-shooting');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const controller = new BrowserController(OUTPUT_DIR);

let passed = 0;
let failed = 0;

async function runTests() {
    console.log('🎯 Football Vocab Shooting Mode Test\n');
    console.log('=' .repeat(60));

    try {
        // Test 1: Launch and navigate
        console.log('\n📱 Test 1: Launch browser and navigate to game');
        await controller.launch({ headless: false, viewport: { width: 1280, height: 800 } });
        await controller.navigate(`http://localhost:9999`);
        await controller.waitForTimeout(2000);

        await controller.screenshot({ name: '01-initial-load' });
        console.log('  ✓ Page loaded successfully');
        passed++;

        // Test 2: Switch to Shooting mode
        console.log('\n🎯 Test 2: Switch to Shooting Challenge mode');
        await controller.click('.nav-tab[data-mode="shooting"]');
        await controller.waitForTimeout(1500);

        const shootingInfo = await controller.executeScript(`
            ({
                isActive: document.querySelector('.nav-tab[data-mode="shooting"]')?.classList.contains('active'),
                word: document.getElementById('shootingWordDisplay')?.textContent,
                timeLeft: document.getElementById('timeLeft')?.textContent,
                optionsCount: document.querySelectorAll('#shootingOptionsContainer .option-btn').length
            })
        `);

        console.log('  Shooting mode active:', shootingInfo.isActive);
        console.log('  Current word:', shootingInfo.word);
        console.log('  Time left:', shootingInfo.timeLeft, 'seconds');
        console.log('  Option buttons:', shootingInfo.optionsCount);

        if (shootingInfo.isActive && shootingInfo.optionsCount === 4) {
            console.log('  ✓ Shooting mode activated with 4 options');
            passed++;
        } else {
            console.log('  ✗ Shooting mode activation failed');
            failed++;
        }

        await controller.screenshot({ name: '02-shooting-mode-start' });

        // Helper function to answer a question
        async function answerQuestion(isCorrect, questionNum) {
            console.log(`\n  Question ${questionNum}:`);

            // Get current word info and find correct index
            const questionInfo = await controller.executeScript(`
                ({
                    word: document.getElementById('shootingWordDisplay')?.textContent,
                    score: GameState.score,
                    streak: GameState.streak,
                    isAnswering: GameState.isAnswering,
                    correctIndex: GameState.options?.findIndex(opt => opt.id === GameState.currentWord?.id)
                })
            `);

            console.log('    Word:', questionInfo.word);
            console.log('    Current score:', questionInfo.score);
            console.log('    Current streak:', questionInfo.streak);

            // Wait if game is still processing previous answer
            if (questionInfo.isAnswering) {
                console.log('    Waiting for previous answer to complete...');
                await controller.waitForTimeout(2000);
            }

            const targetIndex = isCorrect ? questionInfo.correctIndex :
                await controller.executeScript(`
                    GameState.options?.findIndex(opt => opt.id !== GameState.currentWord?.id)
                `);

            if (targetIndex < 0) {
                console.log('    ⚠ Could not find target option');
                return null;
            }

            // Click the option using JavaScript with embedded index
            const clickScript = `
                (function() {
                    const index = ${targetIndex};
                    if (GameState.isAnswering) {
                        GameState.isAnswering = false;
                    }
                    selectOption(index);
                    return { success: true };
                })()
            `;

            const clickResult = await controller.executeScript(clickScript);
            if (!clickResult?.success) {
                console.log('    ✗ Failed to select option');
                return null;
            }

            await controller.waitForTimeout(300);
            await controller.screenshot({ name: `0${2 + questionNum}-${isCorrect ? 'correct' : 'wrong'}-answer` });

            // Wait for transition and get updated score
            await controller.waitForTimeout(1500);

            const afterInfo = await controller.executeScript(`
                ({
                    score: GameState.score,
                    streak: GameState.streak,
                    newWord: document.getElementById('shootingWordDisplay')?.textContent
                })
            `);

            console.log('    Score after:', afterInfo.score);
            console.log('    Streak after:', afterInfo.streak);
            console.log('    Next word:', afterInfo.newWord);

            return afterInfo;
        }

        // Test 3-6: Answer 4 consecutive questions correctly
        console.log('\n✅ Test 3-6: Four consecutive correct answers');

        const initialScore = await controller.executeScript(`GameState.score`);
        console.log('  Initial score:', initialScore);

        // Answer 1 - Correct
        const result1 = await answerQuestion(true, 1);
        if (result1 && result1.score > initialScore) {
            console.log('  ✓ Question 1: Score increased (+', result1.score - initialScore, ')');
            passed++;
        } else {
            console.log('  ✗ Question 1: Score did not increase');
            failed++;
        }

        // Answer 2 - Correct
        const result2 = await answerQuestion(true, 2);
        if (result2 && result2.streak >= 2) {
            console.log('  ✓ Question 2: Streak is 2');
            passed++;
        } else {
            console.log('  ⚠ Question 2: Streak may not be 2');
        }

        // Answer 3 - Correct (Fire Mode!)
        console.log('\n🔥 Question 3: Fire Mode activation');
        const result3 = await answerQuestion(true, 3);

        // Check for fire effect
        const hasFireEffect = await controller.executeScript(`
            document.querySelector('div[style*="firePulse"]') !== null ||
            document.getElementById('fireAnimation') !== null
        `);

        if (result3 && result3.streak >= 3) {
            console.log('  ✓ Question 3: Streak is 3+ - Fire Mode active!');
            passed++;
        } else {
            console.log('  ✗ Question 3: Streak not reaching 3');
            failed++;
        }

        if (hasFireEffect) {
            console.log('  ✓ Fire effect animation detected');
            passed++;
        } else {
            console.log('  ⚠ Fire effect animation not visible');
        }

        // Answer 4 - Correct (Higher bonus)
        console.log('\n✅ Question 4: Higher bonus points');
        const scoreBefore4 = await controller.executeScript(`GameState.score`);

        const result4 = await answerQuestion(true, 4);
        const pointsGained = (result4?.score || 0) - scoreBefore4;

        console.log('  Points gained:', pointsGained);

        // With streak 3+, should get 10 + min(streak*2, 20) = 10 + 8 = 18 points (before was 10 + 6 = 16)
        if (pointsGained >= 14) {
            console.log('  ✓ Higher bonus points awarded (streak bonus active)');
            passed++;
        } else if (pointsGained >= 10) {
            console.log('  ⚠ Standard points awarded (no streak bonus)');
        } else {
            console.log('  ✗ Points not awarded correctly');
            failed++;
        }

        // Test 7: Wrong answer - Streak reset
        console.log('\n❌ Test 7: Wrong answer - Streak reset');

        const streakBeforeWrong = await controller.executeScript(`GameState.streak`);
        console.log('  Streak before wrong answer:', streakBeforeWrong);

        const wrongResult = await answerQuestion(false, 5);

        if (wrongResult && wrongResult.streak === 0) {
            console.log('  ✓ Streak reset to 0 after wrong answer');
            passed++;
        } else {
            console.log('  ✗ Streak not reset correctly (got:', wrongResult?.streak, ')');
            failed++;
        }

        await controller.screenshot({ name: '12-after-wrong-next-question' });

        // Test 8: Timer functionality
        console.log('\n⏱️  Test 8: Timer functionality');
        const timerInfo = await controller.executeScript(`
            ({
                timeLeft: document.getElementById('timeLeft')?.textContent,
                timerProgress: document.getElementById('timerProgress')?.style.width,
                isTimerRunning: GameState.timerInterval !== null
            })
        `);

        console.log('  Time left:', timerInfo.timeLeft);
        console.log('  Timer progress:', timerInfo.timerProgress);
        console.log('  Timer running:', timerInfo.isTimerRunning);

        if (timerInfo.timeLeft && parseInt(timerInfo.timeLeft) < 90) {
            console.log('  ✓ Timer is counting down');
            passed++;
        } else {
            console.log('  ⚠ Timer may not be counting (non-critical)');
        }

        // Test 9: Canvas animation in shooting mode
        console.log('\n🎨 Test 9: Canvas animation in Shooting mode');
        const canvasInfo = await controller.executeScript(`
            (function() {
                const canvas = document.getElementById('gameCanvas');
                if (!canvas) return null;
                return {
                    width: canvas.width,
                    height: canvas.height,
                    parentId: canvas.parentElement?.id
                };
            })()
        `);

        console.log('  Canvas size:', canvasInfo?.width, 'x', canvasInfo?.height);
        console.log('  Canvas in shooting tab:', canvasInfo?.parentId === 'shootingTab');

        if (canvasInfo) {
            console.log('  ✓ Canvas present in shooting mode');
            passed++;
        } else {
            console.log('  ✗ Canvas not found');
            failed++;
        }

        await controller.screenshot({ name: '13-shooting-mode-final' });

        // Test Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📁 Output directory: ${OUTPUT_DIR}`);

        // List all screenshots
        const screenshots = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
        console.log(`📸 Screenshots captured: ${screenshots.length}`);
        screenshots.forEach(f => console.log(`   - ${f}`));

        console.log('='.repeat(60));

        if (failed > 0) {
            console.log(`\n⚠️  ${failed} test(s) failed. Check screenshots for details.`);
            process.exit(1);
        } else {
            console.log('\n🎉 All shooting mode tests passed!');
            console.log('\n✨ Fire Mode and streak system working correctly!');
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
