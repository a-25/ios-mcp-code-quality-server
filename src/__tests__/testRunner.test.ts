import { getXcresultObject, runTestsAndParseFailures } from '../core/testRunner';
import * as testRunner from '../core/testRunner';

describe('getXcresultObject', () => {
  it('should parse xcresult JSON from mocked execAsync', async () => {
    const mockJson = { summaries: { _values: [] } };
    jest.spyOn(testRunner as any, 'execAsync').mockResolvedValue({ stdout: JSON.stringify(mockJson) });
    const result = await getXcresultObject('dummy.xcresult', 'dummy-id');
    expect(result).toEqual(mockJson);
  });
});

// Add more tests for runTestsAndParseFailures and parseXcresultForFailures as needed
