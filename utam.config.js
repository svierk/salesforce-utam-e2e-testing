module.exports = {
  // file masks for utam page objects
  pageObjectsFileMask: ['force-app/**/__utam__/**/*.utam.json'],
  // remap custom elements imports
  alias: {
    'utam-sfdx/': 'salesforce-utam-e2e-testing/'
  }
};
