#!/usr/bin/env node

import { Command } from 'commander';
import { orchestrateTask, TaskType } from '../core/taskOrchestrator.js';
import { validateTestFixOptions, validateLintFixOptions, TestFixOptions, LintFixOptions, ValidationResult } from '../core/taskOptions.js';
import { formatTestResultResponse } from '../core/formatTestResultResponse.js';
import { logger } from '../utils/logger.js';

const program = new Command();

// Configure the main program
program
  .name('ios-mcp-quality')
  .description('iOS MCP Code Quality CLI - Run tests and linting for iOS projects')
  .version('0.1.1');

/**
 * CLI Test Command
 * Maps to the existing 'test' MCP tool functionality
 */
program
  .command('test')
  .description('Run iOS tests and analyze failures')
  .option('--xcworkspace <path>', 'Path to .xcworkspace file')
  .option('--xcodeproj <path>', 'Path to .xcodeproj file') 
  .option('--scheme <name>', 'Scheme name for testing')
  .option('--destination <destination>', 'Test destination (e.g., "platform=iOS Simulator,name=iPhone 15")', 'platform=iOS Simulator')
  .option('--json', 'Output results in JSON format')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      if (options.verbose) {
        logger.info('Starting iOS test execution...');
      }

      // Build TestFixOptions from CLI arguments
      const testOptions: Partial<TestFixOptions> = {
        xcworkspace: options.xcworkspace,
        xcodeproj: options.xcodeproj,
        scheme: options.scheme || '',
        destination: options.destination
      };

      // Validate options
      const validationResult: ValidationResult = validateTestFixOptions(testOptions);
      if (!validationResult.valid) {
        console.error('❌ Invalid test options:');
        if (validationResult.error) {
          console.error(`  • ${validationResult.error}`);
        }
        process.exit(1);
      }

      // Execute the test task
      const result = await orchestrateTask(TaskType.TestFix, testOptions as TestFixOptions);

      if (options.json) {
        // Output JSON format
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Output human-readable format using the same formatter as MCP
        const formattedResponse = formatTestResultResponse(testOptions as TestFixOptions, validationResult, result);
        console.log(formattedResponse.text);
      }

      // Exit with appropriate code
      if (!result.success) {
        process.exit(1);
      }

    } catch (error) {
      logger.error('Test command failed:', error);
      console.error('❌ Test execution failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * CLI Lint Command  
 * Maps to the existing 'lint' MCP tool functionality
 */
program
  .command('lint')
  .description('Run SwiftLint on iOS project files')
  .option('--changed-files <files>', 'Comma-separated list of changed files to lint')
  .option('--config-path <path>', 'Path to SwiftLint configuration file')
  .option('--json', 'Output results in JSON format')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      if (options.verbose) {
        logger.info('Starting SwiftLint execution...');
      }

      // Build LintFixOptions from CLI arguments
      const lintOptions: Partial<LintFixOptions> = {
        changedFiles: options.changedFiles ? options.changedFiles.split(',').map((f: string) => f.trim()) : [],
        configPath: options.configPath
      };

      // Validate options
      const validationResult: ValidationResult = validateLintFixOptions(lintOptions);
      if (!validationResult.valid) {
        console.error('❌ Invalid lint options:');
        if (validationResult.error) {
          console.error(`  • ${validationResult.error}`);
        }
        process.exit(1);
      }

      // Execute the lint task
      const result = await orchestrateTask(TaskType.LintFix, lintOptions as LintFixOptions);

      if (options.json) {
        // Output JSON format
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Output human-readable format using the same formatter as MCP
        const formattedResponse = formatTestResultResponse(lintOptions as any, validationResult, result);
        console.log(formattedResponse.text);
      }

      // Exit with appropriate code
      if (!result.success) {
        process.exit(1);
      }

    } catch (error) {
      logger.error('Lint command failed:', error);
      console.error('❌ Lint execution failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * CLI Server Command
 * Start the MCP server (existing functionality)
 */
program
  .command('server')
  .description('Start the MCP server mode')
  .option('--port <port>', 'Port to run the server on', '3000')
  .action(async (options) => {
    try {
      console.log('🚀 Starting MCP server mode...');
      
      // Set the port in environment before importing
      process.env.PORT = options.port;
      
      // Import and start the existing server from index.ts
      const { startMcpServer } = await import('../index.js');
      await startMcpServer();
      
    } catch (error) {
      logger.error('Server startup failed:', error);
      console.error('❌ Server startup failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', function (operands) {
  console.error('❌ Unknown command: %s', operands[0]);
  console.log('See --help for a list of available commands.');
  process.exit(1);
});

// Parse CLI arguments and execute commands
export async function runCLI(): Promise<void> {
  await program.parseAsync(process.argv);
}

// If running directly (not imported), execute CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI().catch(error => {
    logger.error('CLI execution failed:', error);
    console.error('❌ CLI failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}