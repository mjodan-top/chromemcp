import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { dirname, join, basename } from 'path';
import { CompareOptions } from '../types.js';

const BASELINE_DIR = join(process.cwd(), 'baselines');

export interface CompareResult {
  passed: boolean;
  matchScore: number;
  diffPath?: string;
  baselinePath: string;
  actualPath: string;
}

export async function compareImages(
  baselinePath: string,
  actualPath: string,
  options: CompareOptions = {}
): Promise<CompareResult> {
  const { threshold = 0.1, includeAA = false, alpha = 0.1 } = options;

  const img1 = PNG.sync.read(readFileSync(baselinePath));
  const img2 = PNG.sync.read(readFileSync(actualPath));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return {
      passed: false,
      matchScore: 0,
      baselinePath,
      actualPath
    };
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold, includeAA, alpha }
  );

  const totalPixels = width * height;
  const matchScore = 1 - diffPixels / totalPixels;
  const passed = matchScore >= (1 - threshold);

  const diffPath = join(
    dirname(actualPath),
    `diff-${basename(baselinePath, '.png')}-${basename(actualPath)}`
  );

  writeFileSync(diffPath, PNG.sync.write(diff));

  return {
    passed,
    matchScore,
    diffPath,
    baselinePath,
    actualPath
  };
}

export function setBaseline(name: string, screenshotPath: string, baselineDir: string = BASELINE_DIR): string {
  mkdirSync(baselineDir, { recursive: true });

  const baselinePath = join(baselineDir, `${name}.png`);
  copyFileSync(screenshotPath, baselinePath);

  return baselinePath;
}

export function getBaselinePath(name: string, baselineDir: string = BASELINE_DIR): string | null {
  const baselinePath = join(baselineDir, `${name}.png`);
  return existsSync(baselinePath) ? baselinePath : null;
}
