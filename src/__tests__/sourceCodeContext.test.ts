import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { 
  extractSourceCodeContext, 
  enhanceTestFailuresWithSourceContext,
  extractProjectRoot 
} from '../core/sourceCodeContext.js';
import type { TestFailure } from '../core/testRunner.js';

describe('Source Code Context Integration', () => {
  const testDir = '/tmp/test-source-context';
  const testFile = path.join(testDir, 'TestExample.swift');

  const sampleSwiftCode = `import XCTest
import Foundation
@testable import MyApp

class MyAppTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
    }
    
    func testBasicFeature() {
        // This is a test that should pass
        let expected = "Hello, World!"
        let actual = MyApp.greeting()
        XCTAssertEqual(expected, actual, "Greeting should match")
    }
    
    func testComplexFeature() {
        // This test demonstrates a complex scenario
        let user = User(name: "John", age: 30)
        let result = user.isAdult()
        
        // This line will fail for testing purposes
        XCTAssertFalse(result, "User should not be adult") // Line 22 - intentional fail
    }
    
    func testEdgeCase() {
        let emptyString = ""
        XCTAssertTrue(emptyString.isEmpty)
    }
    
    override func tearDown() {
        super.tearDown()
    }
}`;

  beforeAll(async () => {
    await fs.ensureDir(testDir);
    await fs.writeFile(testFile, sampleSwiftCode);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('extractSourceCodeContext', () => {
    it('should extract imports correctly', async () => {
      const context = await extractSourceCodeContext(testFile);
      
      expect(context).toBeDefined();
      expect(context?.imports).toEqual([
        'import XCTest',
        'import Foundation',
        '@testable import MyApp'
      ]);
    });

    it('should extract specific line context with surrounding code', async () => {
      const context = await extractSourceCodeContext(testFile, 22, 3);
      
      expect(context).toBeDefined();
      expect(context?.testCode).toContain('Line 22');
      expect(context?.testCode).toContain('XCTAssertFalse(result');
      expect(context?.testCode).toContain('→  22'); // Should mark the target line
    });

    it('should extract test method context', async () => {
      const context = await extractSourceCodeContext(testFile, 22);
      
      expect(context).toBeDefined();
      expect(context?.testCode).toContain('func testComplexFeature');
      expect(context?.testCode).toContain('XCTAssertFalse(result');
      expect(context?.testCode).toContain('User should not be adult');
    });

    it('should handle non-existent files gracefully', async () => {
      const context = await extractSourceCodeContext('/nonexistent/file.swift', 10);
      expect(context).toBeUndefined();
    });

    it('should handle invalid line numbers', async () => {
      const context = await extractSourceCodeContext(testFile, 1000);
      expect(context).toBeDefined();
      expect(context?.testCode).toBeDefined(); // Should still extract general content
    });
  });

  describe('enhanceTestFailuresWithSourceContext', () => {
    it('should enhance test failures with source context', async () => {
      const failures: TestFailure[] = [
        {
          testIdentifier: 'MyAppTests.testComplexFeature',
          suiteName: 'MyAppTests',
          file: testFile,
          line: 22,
          message: 'XCTAssertFalse failed: User should not be adult',
          severity: 'medium',
          category: 'assertion'
        }
      ];

      const enhanced = await enhanceTestFailuresWithSourceContext(failures, testDir);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].sourceContext).toBeDefined();
      expect(enhanced[0].sourceContext?.testCode).toContain('func testComplexFeature');
      expect(enhanced[0].sourceContext?.testCode).toContain('XCTAssertFalse(result');
      expect(enhanced[0].sourceContext?.imports).toEqual([
        'import XCTest',
        'import Foundation',
        '@testable import MyApp'
      ]);
    });

    it('should handle failures without file information', async () => {
      const failures: TestFailure[] = [
        {
          testIdentifier: 'SomeTest.testUnknown',
          suiteName: 'SomeTest',
          message: 'Test failed',
          severity: 'medium',
          category: 'other'
        }
      ];

      const enhanced = await enhanceTestFailuresWithSourceContext(failures, testDir);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].sourceContext).toBeUndefined();
    });

    it('should work with relative paths when project root is provided', async () => {
      const failures: TestFailure[] = [
        {
          testIdentifier: 'MyAppTests.testBasicFeature',
          suiteName: 'MyAppTests',
          file: 'TestExample.swift', // Relative path
          line: 13,
          message: 'Test failed',
          severity: 'low',
          category: 'assertion'
        }
      ];

      const enhanced = await enhanceTestFailuresWithSourceContext(failures, testDir);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].sourceContext).toBeDefined();
      expect(enhanced[0].sourceContext?.testCode).toContain('func testBasicFeature');
    });
  });

  describe('extractProjectRoot', () => {
    it('should extract project root from xcodeproj path', () => {
      const root = extractProjectRoot({ xcodeproj: '/path/to/MyProject.xcodeproj' });
      expect(root).toBe('/path/to');
    });

    it('should extract project root from xcworkspace path', () => {
      const root = extractProjectRoot({ xcworkspace: '/path/to/MyProject.xcworkspace' });
      expect(root).toBe('/path/to');
    });

    it('should prefer xcworkspace over xcodeproj', () => {
      const root = extractProjectRoot({ 
        xcodeproj: '/path/to/MyProject.xcodeproj',
        xcworkspace: '/other/path/MyProject.xcworkspace'
      });
      expect(root).toBe('/other/path');
    });

    it('should return undefined when no project files provided', () => {
      const root = extractProjectRoot({});
      expect(root).toBeUndefined();
    });
  });

  describe('Swift Code Parsing Edge Cases', () => {
    it('should handle Swift code with complex syntax', async () => {
      const complexSwiftCode = `import XCTest
@testable import MyApp

class ComplexTests: XCTestCase {
    func testWithClosures() {
        let numbers = [1, 2, 3, 4, 5]
        let result = numbers.filter { $0 % 2 == 0 }
                            .map { $0 * 2 }
        XCTAssertEqual(result, [4, 8])
    }
    
    func testWithGenerics<T: Equatable>(_ value: T, expected: T) {
        XCTAssertEqual(value, expected)
    }
}`;

      const complexFile = path.join(testDir, 'ComplexTest.swift');
      await fs.writeFile(complexFile, complexSwiftCode);

      const context = await extractSourceCodeContext(complexFile, 9);
      expect(context).toBeDefined();
      expect(context?.testCode).toContain('testWithClosures');
      expect(context?.testCode).toContain('numbers.filter');

      await fs.remove(complexFile);
    });

    it('should handle incomplete or malformed Swift code', async () => {
      const malformedSwiftCode = `import XCTest

class IncompleteTest: XCTestCase {
    func testSomething() {
        // Missing closing brace
        XCTAssertTrue(true)
    // Missing closing brace for class too`;

      const malformedFile = path.join(testDir, 'MalformedTest.swift');
      await fs.writeFile(malformedFile, malformedSwiftCode);

      const context = await extractSourceCodeContext(malformedFile, 5);
      expect(context).toBeDefined();
      // Should handle gracefully even with malformed code
      expect(context?.imports).toEqual(['import XCTest']);

      await fs.remove(malformedFile);
    });
  });
});