module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
  moduleNameMapper: {
    '^astro:content$': '<rootDir>/tests/mocks/astro-content.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
