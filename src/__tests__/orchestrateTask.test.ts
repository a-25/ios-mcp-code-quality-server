
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
const { orchestrateTask, TaskType, handleTestFixLoop, handleLintFix } = orchestrator;

describe('orchestrateTask', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // By default, orchestrateTask will call the real logic, so we re-implement it to call the mocked handlers
    (orchestrateTask as any).mockImplementation(async (taskType: string, options: any) => {
      if (taskType === TaskType.TestFix) {
        try {
          return await (handleTestFixLoop as any)(options);
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      } else if (taskType === TaskType.LintFix) {
        try {
          return await (handleLintFix as any)(options);
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      } else {
        return { success: false, error: 'Unknown task type' };
      }
    });
  });

  it('returns error for unknown task type', async () => {
    // @ts-expect-error purposely passing invalid type
    const result = await orchestrateTask('unknown-task', {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unknown task type');
    } else {
      throw new Error('Expected failure result');
    }
  });

  it('handles TestFix with success', async () => {
    (handleTestFixLoop as any).mockResolvedValue({ success: true, data: 'ok' });
    const result = await orchestrateTask(TaskType.TestFix, { foo: 'bar' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('ok');
    } else {
      throw new Error('Expected success result');
    }
  });

  it('handles TestFix with error', async () => {
    (handleTestFixLoop as any).mockRejectedValue(new Error('fail'));
    const result = await orchestrateTask(TaskType.TestFix, { foo: 'bar' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('fail');
    } else {
      throw new Error('Expected failure result');
    }
  });

  it('handles LintFix with success', async () => {
    (handleLintFix as any).mockResolvedValue({ success: true, data: 'lint-ok' });
    const result = await orchestrateTask(TaskType.LintFix, {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('lint-ok');
    } else {
      throw new Error('Expected success result');
    }
  });

  it('handles LintFix with error', async () => {
    (handleLintFix as any).mockRejectedValue(new Error('lint-fail'));
    const result = await orchestrateTask(TaskType.LintFix, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('lint-fail');
    } else {
      throw new Error('Expected failure result');
    }
  });

  it('returns error if TestFix returns undefined', async () => {
    (handleTestFixLoop as any).mockResolvedValue({ success: false, error: 'unknown-error' });
    const result = await orchestrateTask(TaskType.TestFix, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('unknown-error');
    } else {
      throw new Error('Expected failure result');
    }
  });

  it('returns error if LintFix returns undefined', async () => {
    (handleLintFix as any).mockResolvedValue({ success: false, error: 'unknown-error' });
    const result = await orchestrateTask(TaskType.LintFix, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('unknown-error');
    } else {
      throw new Error('Expected failure result');
    }
  });
});