require('dotenv').config();

const { UtamWdioService } = require('wdio-utam-service');
// use prefix 'DEBUG=true' to run test in debug mode
const { DEBUG } = process.env;
const TIMEOUT = DEBUG ? 60 * 1000 * 30 : 60 * 1000;

exports.config = {
  runner: 'local',
  specs: ['force-app/test/**/*.spec.js'],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      browserName: 'chrome',
      'goog:chromeOptions': {
        // to run chrome headless the following flags are required
        // (see https://developers.google.com/web/updates/2017/04/headless-chrome)
        // to deactivate the headless mode for local development and testing, please comment out the following line
        args: ['--headless=new', '--window-size=1920,1080']
      }
    }
  ],
  logLevel: 'debug',
  bail: 0,
  // timeout for all waitFor commands
  waitforTimeout: TIMEOUT,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  automationProtocol: 'webdriver',
  services: [
    [
      UtamWdioService,
      {
        implicitTimeout: 0,
        injectionConfigs: ['salesforce-pageobjects/ui-global-components.config.json']
      }
    ]
  ],
  before: async function () {
    await browser.setWindowSize(1920, 1080);
    // Register a verified virtual WebAuthn authenticator for the session.
    // Orgs that enforce MFA / passkey (WebAuthn) — e.g. a required passkey
    // enrollment or identity verification on unrecognized devices — otherwise
    // trap the headless browser on the "Create a Passkey" screen, so the login
    // never reaches Lightning ("Did not reach a Lightning page"). A headless CI
    // browser has no real authenticator and that screen has no skip option, and
    // trusted IP ranges don't help (a passkey is a device-bound credential, not
    // an IP challenge). With a verified virtual platform authenticator present,
    // Salesforce satisfies the ceremony automatically and the login proceeds —
    // no org change required. (W3C WebAuthn virtual authenticator, supported by
    // chromedriver.)
    try {
      await browser.addVirtualAuthenticator(
        'ctap2',
        'internal',
        true, // hasResidentKey
        true, // hasUserVerification
        true, // isUserConsenting
        true // isUserVerified
      );
    } catch (error) {
      // older drivers / non-Chromium browsers may not support this; suites that
      // run against orgs without a passkey requirement are unaffected
      console.log(`Virtual authenticator not registered: ${error.message}`);
    }
  },
  framework: 'jasmine',
  reporters: ['spec'],
  jasmineOpts: {
    // max execution time for a script, set to 5 min
    defaultTimeoutInterval: 1000 * 60 * 5
  }
};
