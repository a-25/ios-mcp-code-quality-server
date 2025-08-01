import { vi, beforeEach, describe, it, expect } from 'vitest';

vi.mock('../core/taskOrchestrator.js', async () => {
  const actual = await vi.importActual('../core/taskOrchestrator.js');
  return {
    ...actual,
    handleTestFixLoop: vi.fn(),
    handleLintFix: vi.fn(),
  };
});

import { orchestrateTask, TaskType, handleTestFixLoop, handleLintFix } from '../core/taskOrchestrator.js';

describe('orchestrateTask', () => {
  beforeEach(() => {
    (handleTestFixLoop as any).mockReset();
    (handleLintFix as any).mockReset();
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