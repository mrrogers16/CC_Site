const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    customExportConditions: [""],
  },
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/tests/e2e/",
  ],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^lodash-es$": "lodash",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@auth/prisma-adapter|@auth/core|oauth4webapi|preact-render-to-string|preact)/)",
  ],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}",
    "<rootDir>/tests/unit/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/tests/integration/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/tests/components/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/tests/app/**/*.{js,jsx,ts,tsx}",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!src/generated/**/*",
    "!src/app/**/page.tsx",
    "!src/app/**/layout.tsx",
    "!src/components/sections/**/*",
    "!src/components/providers/**/*",
    "!src/lib/config/**/*",
    "!src/lib/utils/**/*",
  ],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 35,
      statements: 35,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
