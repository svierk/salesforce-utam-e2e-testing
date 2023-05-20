const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');
const setupFilesAfterEnv = jestConfig.setupFilesAfterEnv || [];
setupFilesAfterEnv.push('<rootDir>/jest-sa11y-setup.js');

module.exports = {
  ...jestConfig,
  testRegex: '/__tests__/.*.test.js$',
  coverageReporters: ['clover', 'json', 'text', 'lcov', 'cobertura'],
  modulePathIgnorePatterns: ['/.localdevserver'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'tests',
        outputName: 'test-results-lwc.xml'
      }
    ]
  ],
  setupFilesAfterEnv
};
