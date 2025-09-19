/**
 * CLI Integration Tests
 * Tests the actual CLI behavior using child_process execution
 * This avoids complex mocking and tests real functionality
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('CLI Integration', () => {
  const cliPath = path.resolve(__dirname, '../../dist/cli/index.js');
  const timeout = 10000; // 10 second timeout for CLI commands

  describe('help and version', () => {
    it('should show help when --help flag is provided', () => {
      try {
        const output = execSync(`node ${cliPath} --help`, { encoding: 'utf8' });
        expect(output).toContain('iOS MCP Code Quality CLI');
        expect(output).toContain('test');
        expect(output).toContain('lint'); 
        expect(output).toContain('server');
      } catch (error: any) {
        // commander.js help exits with code 0 but execSync might capture it differently
        if (error.status === 0) {
          expect(error.stdout).toContain('iOS MCP Code Quality CLI');
        } else {
          throw error;
        }
      }
    }, timeout);

    it('should show version when --version flag is provided', () => {
      try {
        const output = execSync(`node ${cliPath} --version`, { encoding: 'utf8' });
        expect(output.trim()).toBe('0.1.1');
      } catch (error: any) {
        // commander.js version exits with code 0 but execSync might capture it differently  
        if (error.status === 0) {
          expect(error.stdout.trim()).toBe('0.1.1');
        } else {
          throw error;
        }
      }
    }, timeout);
  });

  describe('test command', () => {
    it('should show test command help', () => {
      try {
        const output = execSync(`node ${cliPath} test --help`, { encoding: 'utf8' });
        expect(output).toContain('Run iOS tests and analyze failures');
        expect(output).toContain('--xcworkspace');
        expect(output).toContain('--scheme');
        expect(output).toContain('--destination');
      } catch (error: any) {
        if (error.status === 0) {
          expect(error.stdout).toContain('Run iOS tests and analyze failures');
        } else {
          throw error;
        }
      }
    }, timeout);

    it('should fail with validation error for invalid test options', () => {
      try {
        execSync(`node ${cliPath} test`, { encoding: 'utf8' });
        // If we get here, the command didn't fail as expected
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr || error.stdout).toContain('Invalid test options');
      }
    }, timeout);
  });

  describe('lint command', () => {
    it('should show lint command help', () => {
      try {
        const output = execSync(`node ${cliPath} lint --help`, { encoding: 'utf8' });
        expect(output).toContain('Run SwiftLint on iOS project files');
        expect(output).toContain('--changed-files');
        expect(output).toContain('--config-path');
      } catch (error: any) {
        if (error.status === 0) {
          expect(error.stdout).toContain('Run SwiftLint on iOS project files');
        } else {
          throw error;
        }
      }
    }, timeout);

    it('should fail with validation error for invalid lint options', () => {
      try {
        execSync(`node ${cliPath} lint`, { encoding: 'utf8' });
        // If we get here, the command didn't fail as expected
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr || error.stdout).toContain('Invalid lint options');
      }
    }, timeout);
  });

  describe('server command', () => {
    it('should show server command help', () => {
      try {
        const output = execSync(`node ${cliPath} server --help`, { encoding: 'utf8' });
        expect(output).toContain('Start the MCP server mode');
        expect(output).toContain('--port');
      } catch (error: any) {
        if (error.status === 0) {
          expect(error.stdout).toContain('Start the MCP server mode');
        } else {
          throw error;
        }
      }
    }, timeout);
  });

  describe('error handling', () => {
    it('should show error for unknown commands', () => {
      try {
        execSync(`node ${cliPath} unknown-command`, { encoding: 'utf8' });
        // If we get here, the command didn't fail as expected
        expect(false).toBe(true);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr || error.stdout).toContain('Unknown command');
      }
    }, timeout);
  });
});