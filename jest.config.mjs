import presets from 'ts-jest/presets/index.js';
const { defaultsESM } = presets;

export default {
  ...defaultsESM,
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.mts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {},
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.mts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(p-queue|eventemitter3)/)'
  ],
};
