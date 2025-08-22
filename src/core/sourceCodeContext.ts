import fs from 'fs-extra';
import path from 'path';
import type { TestFailure } from './testRunner.js';

// Source code context extraction utilities
export interface SourceCodeContext {
  testCode?: string;
  relatedCode?: string;
  imports?: string[];
}

// Helper function to extract source code context from a file
export async function extractSourceCodeContext(
  filePath: string,
  lineNumber?: number,
  contextLines: number = 10
): Promise<SourceCodeContext | undefined> {
  try {
    if (!filePath || !await fs.pathExists(filePath)) {
      return undefined;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const context: SourceCodeContext = {
      imports: extractImports(lines),
    };

    // Extract code around the specific line if provided
    if (lineNumber && lineNumber > 0 && lineNumber <= lines.length) {
      const startLine = Math.max(0, lineNumber - contextLines - 1);
      const endLine = Math.min(lines.length, lineNumber + contextLines);
      
      const contextCode = lines
        .slice(startLine, endLine)
        .map((line, index) => {
          const actualLineNum = startLine + index + 1;
          const marker = actualLineNum === lineNumber ? '→ ' : '  ';
          return `${marker}${actualLineNum.toString().padStart(3, ' ')}: ${line}`;
        })
        .join('\n');

      context.testCode = contextCode;

      // Try to extract the test method or class context
      const methodContext = extractTestMethodContext(lines, lineNumber - 1);
      if (methodContext) {
        context.testCode = methodContext;
      }
    } else {
      // If no specific line, extract key parts of the file
      const testMethods = extractTestMethods(lines);
      if (testMethods.length > 0) {
        context.testCode = testMethods.join('\n\n');
      }
    }

    return context;
  } catch (error) {
    console.warn(`[MCP] Failed to extract source context from ${filePath}:`, error);
    return undefined;
  }
}

// Extract import statements from Swift code
function extractImports(lines: string[]): string[] {
  const imports: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('@testable import ')) {
      imports.push(trimmed);
    } else if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('@')) {
      // Stop at first non-import, non-comment, non-attribute line
      break;
    }
  }
  
  return imports;
}

// Extract test method context around a specific line
function extractTestMethodContext(lines: string[], targetLine: number): string | undefined {
  // Find the test method that contains the target line
  let methodStart = -1;
  let methodEnd = -1;
  let braceCount = 0;
  let inMethod = false;

  // Scan backwards to find method start
  for (let i = targetLine; i >= 0; i--) {
    const line = lines[i].trim();
    
    if (line.includes('func test') || line.includes('func ') && line.includes('test')) {
      methodStart = i;
      break;
    }
  }

  if (methodStart === -1) {
    return undefined;
  }

  // Find method end by tracking braces
  for (let i = methodStart; i < lines.length; i++) {
    const line = lines[i];
    
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        inMethod = true;
      } else if (char === '}') {
        braceCount--;
        if (inMethod && braceCount === 0) {
          methodEnd = i;
          break;
        }
      }
    }
    
    if (methodEnd !== -1) {
      break;
    }
  }

  if (methodEnd === -1) {
    methodEnd = Math.min(lines.length - 1, methodStart + 50); // Fallback limit
  }

  // Extract the method with line numbers
  const methodLines = lines
    .slice(methodStart, methodEnd + 1)
    .map((line, index) => {
      const lineNum = methodStart + index + 1;
      const marker = lineNum === targetLine + 1 ? '→ ' : '  ';
      return `${marker}${lineNum.toString().padStart(3, ' ')}: ${line}`;
    })
    .join('\n');

  return methodLines;
}

// Extract all test methods from a file
function extractTestMethods(lines: string[]): string[] {
  const methods: string[] = [];
  let currentMethod: string[] = [];
  let inMethod = false;
  let braceCount = 0;
  let methodStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is a test method declaration
    if ((trimmed.includes('func test') || (trimmed.includes('func ') && trimmed.includes('test'))) && 
        !inMethod) {
      inMethod = true;
      braceCount = 0;
      currentMethod = [];
      methodStartLine = i;
    }

    if (inMethod) {
      currentMethod.push(`${(i + 1).toString().padStart(3, ' ')}: ${line}`);
      
      // Track braces to find method end
      for (const char of line) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            // Method ended
            methods.push(currentMethod.join('\n'));
            currentMethod = [];
            inMethod = false;
            break;
          }
        }
      }
      
      // Safety limit to prevent infinite methods
      if (currentMethod.length > 100) {
        methods.push(currentMethod.join('\n') + '\n  ... (truncated)');
        currentMethod = [];
        inMethod = false;
      }
    }
  }

  // Handle case where method didn't close properly
  if (inMethod && currentMethod.length > 0) {
    methods.push(currentMethod.join('\n') + '\n  ... (incomplete)');
  }

  return methods;
}

// Enhanced function to add source context to test failures
export async function enhanceTestFailuresWithSourceContext(
  testFailures: TestFailure[],
  projectRoot?: string
): Promise<TestFailure[]> {
  const enhanced = await Promise.all(
    testFailures.map(async (failure) => {
      if (!failure.file) {
        return failure;
      }

      let filePath = failure.file;
      
      // If we have a project root and the file path is relative, make it absolute
      if (projectRoot && !path.isAbsolute(filePath)) {
        filePath = path.resolve(projectRoot, filePath);
      }

      // Extract source context
      const sourceContext = await extractSourceCodeContext(filePath, failure.line);
      
      if (sourceContext) {
        return {
          ...failure,
          sourceContext
        };
      }

      return failure;
    })
  );

  return enhanced;
}

// Helper to find project root from workspace/project file
export function extractProjectRoot(options: { xcodeproj?: string; xcworkspace?: string }): string | undefined {
  const projectFile = options.xcworkspace || options.xcodeproj;
  if (!projectFile) {
    return undefined;
  }
  
  return path.dirname(path.resolve(projectFile));
}