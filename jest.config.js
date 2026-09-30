/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  silent: true,
  testMatch: ['<rootDir>/**/__tests__/**/*.test.js'],
};
