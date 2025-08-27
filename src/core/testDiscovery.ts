import { exec } from "child_process";
import util from "util";
import { TestFixOptions } from "./taskOptions.js";

const execAsync = util.promisify(exec);

export interface TestInfo {
  identifier: string;
  className: string;
  methodName?: string;
  target: string;
}

export interface TestDiscoveryResult {
  success: boolean;
  tests: TestInfo[];
  error?: string;
}

/**
 * Discovers available tests in an iOS project using xcodebuild
 */
export async function discoverAvailableTests(options: TestFixOptions): Promise<TestDiscoveryResult> {
  try {
    // Build xcodebuild command for test discovery
    const workspaceArg = options.xcworkspace ? `-workspace "${options.xcworkspace}"` : "";
    const projectArg = options.xcodeproj ? `-project "${options.xcodeproj}"` : "";
    const schemeArg = options.scheme ? `-scheme "${options.scheme}"` : "";
    const destinationArg = `-destination "${options.destination || "generic/platform=iOS Simulator"}"`;
    
    // Use xcodebuild with -dry-run to get test discovery without running tests
    const cmd = `xcodebuild test ${workspaceArg} ${projectArg} ${schemeArg} ${destinationArg} -dry-run`.replace(/\s+/g, " ").trim();
    
    console.log(`[MCP] Discovering tests with: ${cmd}`);
    
    const { stdout, stderr } = await execAsync(cmd);
    const output = `${stdout}\n${stderr}`;
    
    // Parse the output to extract test information
    const tests = parseTestDiscoveryOutput(output);
    
    return {
      success: true,
      tests,
      error: undefined
    };
    
  } catch (error: any) {
    console.error(`[MCP] Test discovery failed:`, error.message);
    return {
      success: false,
      tests: [],
      error: error.message || "Test discovery failed"
    };
  }
}

/**
 * Parses xcodebuild dry-run output to extract test information
 */
function parseTestDiscoveryOutput(output: string): TestInfo[] {
  const tests: TestInfo[] = [];
  
  // Look for test method patterns in the output
  // xcodebuild dry-run typically shows lines like:
  // "Test Case '-[MyAppTests.LoginTest testValidLogin]' started."
  const testCasePattern = /Test Case '-\[([^.]+)\.([^.\s]+)\s+([^]]+)\]'/g;
  
  let match;
  while ((match = testCasePattern.exec(output)) !== null) {
    const [, target, className, methodName] = match;
    tests.push({
      identifier: `${target}/${className}/${methodName}`,
      className,
      methodName,
      target
    });
  }
  
  // Also look for class-level patterns
  const classPattern = /Test Suite '([^.]+)\.([^']+)'/g;
  while ((match = classPattern.exec(output)) !== null) {
    const [, target, className] = match;
    // Only add if we don't already have this class from method parsing
    if (!tests.some(t => t.target === target && t.className === className && !t.methodName)) {
      tests.push({
        identifier: `${target}/${className}`,
        className,
        target
      });
    }
  }
  
  // Remove duplicates and sort
  const uniqueTests = tests.filter((test, index, self) => 
    index === self.findIndex(t => t.identifier === test.identifier)
  );
  
  return uniqueTests.sort((a, b) => a.identifier.localeCompare(b.identifier));
}

/**
 * Validates that the provided test names exist in the project
 */
export async function validateTestNames(testNames: string[], options: TestFixOptions): Promise<{
  valid: string[];
  invalid: string[];
  suggestions: { [invalid: string]: string[] };
}> {
  const discoveryResult = await discoverAvailableTests(options);
  
  if (!discoveryResult.success) {
    console.warn(`[MCP] Could not discover tests for validation: ${discoveryResult.error}`);
    // If discovery fails, assume all tests are valid (best effort)
    return {
      valid: testNames,
      invalid: [],
      suggestions: {}
    };
  }
  
  const availableTests = discoveryResult.tests;
  const valid: string[] = [];
  const invalid: string[] = [];
  const suggestions: { [invalid: string]: string[] } = {};
  
  for (const testName of testNames) {
    // Check for exact match first
    const exactMatch = availableTests.find(t => 
      t.identifier === testName || 
      t.identifier.endsWith(`/${testName}`) ||
      t.className === testName
    );
    
    if (exactMatch) {
      valid.push(testName);
      continue;
    }
    
    // Check for partial matches to provide suggestions
    const partialMatches = availableTests.filter(t =>
      t.identifier.toLowerCase().includes(testName.toLowerCase()) ||
      t.className.toLowerCase().includes(testName.toLowerCase()) ||
      (t.methodName && t.methodName.toLowerCase().includes(testName.toLowerCase()))
    );
    
    if (partialMatches.length > 0) {
      // If there are partial matches, suggest them
      suggestions[testName] = partialMatches.map(t => t.identifier);
      invalid.push(testName);
    } else {
      invalid.push(testName);
      suggestions[testName] = [];
    }
  }
  
  return { valid, invalid, suggestions };
}

/**
 * Formats test discovery results for display
 */
export function formatTestList(tests: TestInfo[]): string {
  if (tests.length === 0) {
    return "No tests found.";
  }
  
  const grouped = tests.reduce((acc, test) => {
    const target = test.target;
    if (!acc[target]) {
      acc[target] = [];
    }
    acc[target].push(test);
    return acc;
  }, {} as { [target: string]: TestInfo[] });
  
  let result = `Found ${tests.length} test(s):\n\n`;
  
  for (const [target, targetTests] of Object.entries(grouped)) {
    result += `📱 Target: ${target}\n`;
    
    const classGroups = targetTests.reduce((acc, test) => {
      const className = test.className;
      if (!acc[className]) {
        acc[className] = [];
      }
      acc[className].push(test);
      return acc;
    }, {} as { [className: string]: TestInfo[] });
    
    for (const [className, classTests] of Object.entries(classGroups)) {
      result += `  📝 ${className}\n`;
      
      const methods = classTests.filter(t => t.methodName);
      if (methods.length > 0) {
        methods.forEach(method => {
          result += `    • ${method.methodName} (${method.identifier})\n`;
        });
      } else {
        result += `    (${classTests[0].identifier})\n`;
      }
    }
    result += "\n";
  }
  
  return result;
}