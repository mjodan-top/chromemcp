export { BrowserController } from './browser/controller.js';
export { compareImages, setBaseline, getBaselinePath } from './compare/index.js';
export type { CompareResult } from './compare/pixelmatch.js';
export type {
  TestSession,
  TestStep,
  Screenshot,
  VisualAssertion,
  ScreenshotOptions,
  VideoOptions,
  CompareOptions,
  BrowserOptions
} from './types.js';
