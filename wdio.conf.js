require('dotenv').config();

const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { UtamWdioService } = require('wdio-utam-service');
const { getScratchOrgLoginUrl } = require('./scripts/generate-login-url');
// use prefix 'DEBUG=true' to run test in debug mode
const { DEBUG } = process.env;
const TIMEOUT = DEBUG ? 60 * 1000 * 30 : 60 * 1000;
// JUnit results and failure screenshots - the CI uploads this folder, and the
// E2E failure analyst (.github/workflows/e2e-failure-analyst.md) reads it
const REPORTS_DIR = join(__dirname, 'reports');

exports.config = {
  runner: 'local',
  specs: ['force-app/test/**/*.spec.js'],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      browserName: 'chrome',
      // @wdio/cli v9+ auto-negotiates a WebDriver Bidi session (webSocketUrl: true)
      // unless this is set. wdio-utam-service drives raw classic WebDriver commands
      // (findElements/execute) and its shadow-DOM traversal timing assumptions were
      // built against v8's classic-only protocol; Bidi changes that timing enough to
      // break dynamic UI flows (e.g. App Launcher search-as-you-type). Force classic.
      'wdio:enforceWebDriverClassic': true,
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
  // The CLI's frontdoor url logs in once. Every spec file runs in a new browser
  // session, so each session gets a fresh url before it starts - a second spec
  // file would otherwise end on the login page.
  beforeSession: async function () {
    process.env.SALESFORCE_LOGIN_URL = await getScratchOrgLoginUrl();
    process.env.SALESFORCE_LOGIN_TIME = `${new Date().getTime()}`;
  },
  before: async function () {
    await browser.setWindowSize(1920, 1080);
    // Register a verified virtual WebAuthn authenticator for the session.
    // Orgs that enforce MFA / passkey (WebAuthn) - e.g. a required passkey
    // enrollment or identity verification on unrecognized devices - otherwise
    // trap the headless browser on the "Create a Passkey" screen, so the login
    // never reaches Lightning ("Did not reach a Lightning page"). A headless CI
    // browser has no real authenticator and that screen has no skip option, and
    // trusted IP ranges don't help (a passkey is a device-bound credential, not
    // an IP challenge). With a verified virtual platform authenticator present,
    // Salesforce satisfies the ceremony automatically and the login proceeds -
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
  // A failed test leaves a screenshot of the page it stopped on, named after
  // the suite and the test, next to the JUnit results.
  afterTest: async function (test, context, { passed }) {
    if (passed) return;
    const dir = join(REPORTS_DIR, 'screenshots');
    mkdirSync(dir, { recursive: true });
    const name = test.fullName.replace(/[^a-z0-9-]+/gi, '-').slice(0, 120);
    await browser.saveScreenshot(join(dir, `${name}.png`));
  },
  // The JUnit reporter records every WebDriver command, the navigation to the
  // login URL included - and that URL opens a session without a password.
  // Redact it before the reports are uploaded or read by anyone.
  onComplete: function () {
    const dir = join(REPORTS_DIR, 'junit');
    if (!existsSync(dir)) return;
    for (const file of readdirSync(dir)) {
      const path = join(dir, file);
      const xml = readFileSync(path, 'utf8')
        .replace(/(frontdoor\.jsp\?)[^"\s]*/g, '$1<redacted>')
        .replace(/((?:otp|sid)=)[^&"\s]*/g, '$1<redacted>');
      writeFileSync(path, xml);
    }
  },
  framework: 'jasmine',
  reporters: [
    'spec',
    [
      'junit',
      {
        outputDir: join(REPORTS_DIR, 'junit'),
        outputFileFormat: ({ cid }) => `results-${cid}.xml`
      }
    ]
  ],
  jasmineOpts: {
    // max execution time for a script, set to 5 min
    defaultTimeoutInterval: 1000 * 60 * 5
  }
};
