export interface TestSession {
  id: string;
  url: string;
  startTime: number;
  endTime?: number;
  steps: TestStep[];
  screenshots: Screenshot[];
  videoPath?: string;
  tracePath?: string;
}

export interface TestStep {
  id: string;
  type: 'navigate' | 'click' | 'fill' | 'press' | 'hover' | 'wait' | 'execute';
  target?: string;
  value?: string;
  options?: Record<string, unknown>;
  screenshotBefore?: string;
  screenshotAfter?: string;
  timestamp: number;
  duration?: number;
}

export interface Screenshot {
  id: string;
  path: string;
  type: 'manual' | 'auto';
  metadata: {
    width: number;
    height: number;
    timestamp: number;
  };
}

export interface VisualAssertion {
  id: string;
  baselinePath: string;
  actualPath: string;
  diffPath?: string;
  matchScore: number;
  threshold: number;
  passed: boolean;
}

export interface ScreenshotOptions {
  name?: string;
  clip?: { x: number; y: number; width: number; height: number };
  fullPage?: boolean;
  omitBackground?: boolean;
}

export interface VideoOptions {
  fps?: 30 | 60;
  size?: { width: number; height: number };
  duration?: number;
}

export interface CompareOptions {
  threshold?: number;
  includeAA?: boolean;
  alpha?: number;
}

export interface BrowserOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;
}
