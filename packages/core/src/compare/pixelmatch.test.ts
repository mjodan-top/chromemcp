import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { compareImages, setBaseline } from './pixelmatch.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const TEST_DIR = './test-output';

describe('Image Comparison', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should detect identical images', async () => {
    // Create two identical 100x100 red images (RGBA: 255, 0, 0, 255)
    const png = new PNG({ width: 100, height: 100 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 255;     // R
      png.data[i + 1] = 0;   // G
      png.data[i + 2] = 0;   // B
      png.data[i + 3] = 255; // A
    }

    const img1Path = join(TEST_DIR, 'img1.png');
    const img2Path = join(TEST_DIR, 'img2.png');

    writeFileSync(img1Path, PNG.sync.write(png));
    writeFileSync(img2Path, PNG.sync.write(png));

    const result = await compareImages(img1Path, img2Path, { threshold: 0.1 });

    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.matchScore, 1);
  });

  it('should detect different images', async () => {
    // Create red image (RGBA: 255, 0, 0, 255)
    const png1 = new PNG({ width: 100, height: 100 });
    for (let i = 0; i < png1.data.length; i += 4) {
      png1.data[i] = 255;     // R
      png1.data[i + 1] = 0;   // G
      png1.data[i + 2] = 0;   // B
      png1.data[i + 3] = 255; // A
    }

    // Create black image (RGBA: 0, 0, 0, 255)
    const png2 = new PNG({ width: 100, height: 100 });
    for (let i = 0; i < png2.data.length; i += 4) {
      png2.data[i] = 0;      // R
      png2.data[i + 1] = 0;  // G
      png2.data[i + 2] = 0;  // B
      png2.data[i + 3] = 255; // A
    }

    const img1Path = join(TEST_DIR, 'red.png');
    const img2Path = join(TEST_DIR, 'black.png');

    writeFileSync(img1Path, PNG.sync.write(png1));
    writeFileSync(img2Path, PNG.sync.write(png2));

    const result = await compareImages(img1Path, img2Path, { threshold: 0.1 });

    assert.strictEqual(result.passed, false);
    assert.ok(result.matchScore < 1);
  });
});
