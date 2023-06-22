const config = {
  preset: "ts-jest",
  resolver: "ts-jest-resolver",
	testPathIgnorePatterns: [".d.ts", ".js"],
	verbose: true,
	roots: ["<rootDir>/test", "<rootDir>/src"],
	collectCoverageFrom: ["src/**/*.ts", "src/**/*.tsx"],
	coveragePathIgnorePatterns: [
    "src/index.ts",
    "src/browser.ts",
    "src/node.ts",
    "src/types/index.ts",
    "src/utils/index.ts",
    "src/widgets/controllers/index.ts",
    "src/widgets/models/index.ts",
    "src/widgets/views/index.ts",
    "src/widgets/views/components/index.ts"
  ],
  coverageProvider: "v8",
	coverageThreshold: {
		global: {
			branches: 69,			
			functions: 68,
			lines: 66,
			statements: 66
		}
	},
  extensionsToTreatAsEsm: [".ts", ".tsx", ".jsx"],
  globals: {
    NODE_ENV: "test"
  },
  moduleNameMapper: {
    uuid: require.resolve('uuid'),
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  testEnvironment: "jest-environment-node",
  testEnvironmentOptions: {
    customExportConditions: ['default'],
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      "tsconfig": "tsconfig.test.json",
      "isolatedModules": true,
      "useESM": true
    }],
    "^.+\\.[jt]s[x]": ["ts-jest", {
      "tsconfig": "tsconfig.test.json",
      "isolatedModules": true,
      "useESM": true
    }]
  },
  transformIgnorePatterns: [
    "\\/node_modules\\/(?!((@tinystacks|@aws-sdk|uuid)\\/))"
  ]
}

module.exports = config;