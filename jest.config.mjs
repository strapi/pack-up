/**
 * @type {import('jest').Config}
 */
export default {
  modulePathIgnorePatterns: ['dist'],
  testMatch: ['**/__tests__/**/*.{js,ts}'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  displayName: 'Pack up',
  collectCoverageFrom: ['src/**/*.ts'],
};
