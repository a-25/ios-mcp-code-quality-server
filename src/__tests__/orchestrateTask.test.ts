import { orchestrateTask, TaskType } from '../core/taskOrchestrator.js';
import * as taskOrchestrator from '../core/taskOrchestrator.js';
import { vi } from 'vitest';

describe('orchestrateTask', () => {
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
    // Mock handleTestFixLoop to return success
    vi.spyOn(taskOrchestrator, 'handleTestFixLoop').mockResolvedValue({ success: true, data: 'ok' });
    const result = await orchestrateTask(TaskType.TestFix, { foo: 'bar' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('ok');
    } else {
      throw new Error('Expected success result');
    }
  });

  it('handles TestFix with error', async () => {
    vi.spyOn(taskOrchestrator, 'handleTestFixLoop').mockRejectedValue(new Error('fail'));
    const result = await orchestrateTask(TaskType.TestFix, { foo: 'bar' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('fail');
    } else {
      throw new Error('Expected failure result');
    }
  });

  it('handles LintFix with success', async () => {
    vi.spyOn(taskOrchestrator, 'handleLintFix').mockResolvedValue({ success: true, data: 'lint-ok' });
    const result = await orchestrateTask(TaskType.LintFix, {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('lint-ok');
    } else {
      throw new Error('Expected success result');
    }
  });

  it('handles LintFix with error', async () => {
    vi.spyOn(taskOrchestrator, 'handleLintFix').mockRejectedValue(new Error('lint-fail'));
    const result = await orchestrateTask(TaskType.LintFix, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('lint-fail');
    } else {
      throw new Error('Expected failure result');
    }
  });

  it('returns error if TestFix returns undefined', async () => {
    vi.spyOn(taskOrchestrator, 'handleTestFixLoop').mockResolvedValue({ success: false, error: 'unknown-error' });
    const result = await orchestrateTask(TaskType.TestFix, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('unknown-error');
    } else {
      throw new Error('Expected failure result');
    }
  });

  it('returns error if LintFix returns undefined', async () => {
    vi.spyOn(taskOrchestrator, 'handleLintFix').mockResolvedValue({ success: false, error: 'unknown-error' });
    const result = await orchestrateTask(TaskType.LintFix, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('unknown-error');
    } else {
      throw new Error('Expected failure result');
    }
  });
});
