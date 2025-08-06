import testFailureMock from './mockData/testFailureMock.json' with { type: 'json' };
import { vi, describe, it, expect } from 'vitest';

// Mock execAsync before importing getXcresultObject
vi.mock('../core/testRunner.js', async () => {
  const actual = await vi.importActual('../core/testRunner.js');
  return {
    ...actual,
    execAsync: vi.fn().mockResolvedValue({ stdout: JSON.stringify(testFailureMock) }),
  };
});




describe('getXcresultObject', () => {
  it('should parse xcresult JSON from mocked execAsync', async () => {
    const mockExecAsync = vi.fn().mockResolvedValue({ stdout: JSON.stringify(testFailureMock) });
    const { getXcresultObject } = await import('../core/testRunner.js');
    const result = await getXcresultObject('dummy.xcresult', 'dummy-id', mockExecAsync);
    expect(result).toEqual(testFailureMock);
    expect(mockExecAsync).toHaveBeenCalled();
  });
});
