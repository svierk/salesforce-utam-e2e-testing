module.exports = {
  // file masks for utam page objects
  pageObjectsFileMask: ['force-app/**/__utam__/**/*.utam.json'],
  // remap custom elements imports - compiled page objects land in pageObjects/,
  // so a relative alias lets one custom page object import another
  alias: {
    'utam-sfdx/': '../'
  }
};
