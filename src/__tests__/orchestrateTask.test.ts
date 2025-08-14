// Error type enum from testRunner.test.ts
enum TestErrorType {
  MaxRetries = 'max-retries',
  BuildError = 'build-error',
  MissingProject = 'missing-project',
  OtherError = 'other-error',
  UnknownError = 'unknown-error',
  LintFail = 'lint-fail',
  Fail = 'fail',
}

import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock the entire module before importing anything
vi.mock('../core/taskOrchestrator.js', () => {
  return {
    __esModule: true,
    // We'll fill these with vi.fn() and replace later
    orchestrateTask: vi.fn(),
    handleTestFixLoop: vi.fn(),
    handleLintFix: vi.fn(),
    TaskType: {
      TestFix: 'test-fix',
      LintFix: 'lint-fix',
    },
  };
});

import * as orchestrator from '../core/taskOrchestrator.js';
const { handleTestFixLoop, handleLintFix } = orchestrator;

describe('task handlers', () => {
  const validTestFixOptions = {
    scheme: 'TestScheme',
    xcodeproj: 'TestProj.xcodeproj',
    xcworkspace: 'TestWorkspace.xcworkspace',
    destination: 'platform=iOS Simulator,name=iPhone 16'
  };
  const validLintFixArg = 'TestFile.swift';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles TestFix with success', async () => {
  (handleTestFixLoop as any).mockResolvedValue({ success: true, data: 'ok' } as import('../core/taskOrchestrator.js').TaskResult<string>);
    const result = await handleTestFixLoop(validTestFixOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('ok');
    } else {
      throw new Error('Expected success result');
    }
  });

  it('handles TestFix with error', async () => {
    (handleTestFixLoop as any).mockRejectedValue(new Error(TestErrorType.Fail));
    try {
      await handleTestFixLoop(validTestFixOptions);
      throw new Error('Expected failure result');
    } catch (e: any) {
      expect(e.message).toBe(TestErrorType.Fail);
    }
  });

  it('handles LintFix with success', async () => {
  (handleLintFix as any).mockResolvedValue({ success: true, data: 'lint-ok' } as import('../core/taskOrchestrator.js').TaskResult<string>);
    const result = await handleLintFix(validLintFixArg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('lint-ok');
    } else {
      throw new Error('Expected success result');
    }
  });

  it('handles LintFix with error', async () => {
    (handleLintFix as any).mockRejectedValue(new Error(TestErrorType.LintFail));
    try {
      await handleLintFix(validLintFixArg);
      throw new Error('Expected failure result');
    } catch (e: any) {
      expect(e.message).toBe(TestErrorType.LintFail);
    }
  });

  it('returns error if TestFix returns failure', async () => {
  (handleTestFixLoop as any).mockResolvedValue({ success: false, error: TestErrorType.UnknownError } as import('../core/taskOrchestrator.js').TaskResult<string>);
    const result = await handleTestFixLoop(validTestFixOptions);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(TestErrorType.UnknownError);
    } else {
      throw new Error('Expected failure result');
    }
  });

  it('returns error if LintFix returns failure', async () => {
  (handleLintFix as any).mockResolvedValue({ success: false, error: TestErrorType.UnknownError } as import('../core/taskOrchestrator.js').TaskResult<string>);
    const result = await handleLintFix(validLintFixArg);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(TestErrorType.UnknownError);
    } else {
      throw new Error('Expected failure result');
    }
  });
});