import { execFileSync } from 'node:child_process';

const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours by default

// Pages Salesforce shows instead of Lightning when the test user has to act
// first - a headless test cannot get past them, so it stops right away
const LOGIN_BLOCKERS = [
  { path: '/ChangePassword', reason: 'the test user has to set a new password' },
  { path: '/_ui/identity/', reason: 'the test user has to verify their identity or register a phone' }
];

/**
 * Checks environment variables, session timeout and logs into Salesforce
 * @returns {DocumentUtamElement} the UTAM DOM handle
 */
export async function logInSalesforce() {
  // Check environment variables
  ['SALESFORCE_LOGIN_URL', 'SALESFORCE_LOGIN_TIME'].forEach((varName) => {
    if (!process.env[varName]) {
      throw new Error(`Missing ${varName} environment variable`);
    }
  });
  const { SALESFORCE_LOGIN_URL, SALESFORCE_LOGIN_TIME } = process.env;

  // Check for Salesforce session timeout
  if (new Date().getTime() - parseInt(SALESFORCE_LOGIN_TIME, 10) > SESSION_TIMEOUT) {
    throw new Error(`Salesforce session timed out. Re-authenticate before running tests.`);
  }

  // Navigate to login URL
  await browser.navigateTo(SALESFORCE_LOGIN_URL);

  // Wait until the OTP/frontdoor redirect completes and we are on a Lightning page.
  // The URL transitions: frontdoor.jsp → contentDoor → lightning.force.com/lightning[/...]
  // We accept any lightning.force.com URL that is not an intermediate redirect page.
  const domDocument = utam.getCurrentDocument();
  let blocker;
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      blocker = LOGIN_BLOCKERS.find(({ path }) => new URL(url).pathname.includes(path));
      return (
        Boolean(blocker) ||
        (url.includes('.force.com/lightning') && !url.includes('frontdoor') && !url.includes('contentDoor'))
      );
    },
    { timeout: 60000, interval: 500, timeoutMsg: 'Did not reach a Lightning page within 60s after login' }
  );
  if (blocker) {
    throw new Error(`Login stopped at ${blocker.path}: ${blocker.reason}. Log in once in a browser and complete it.`);
  }
  return domDocument;
}

/**
 * Opens a path in the org the test is logged in to
 * @param {string} path the path after the domain, e.g. '/lightning/o/Account/new'
 */
export async function openPath(path) {
  const { origin } = new URL(await browser.getUrl());
  await browser.navigateTo(`${origin}${path}`);
}

/**
 * Waits for a field on a record form and returns its layout item - by API name,
 * so it does not depend on the layout's order or the user's language
 * @param {object} recordLayout the records-lwc-record-layout page object
 * @param {string} objectApiName e.g. 'Account'
 * @param {string} fieldApiName e.g. 'Name'
 * @returns {Promise<object>} the records-record-layout-item page object
 */
export async function getField(recordLayout, objectApiName, fieldApiName) {
  const target = `.${objectApiName}.${fieldApiName}`;
  return utam.waitFor(
    async () => {
      for (const item of await recordLayout.getAllItems()) {
        const field = await item.getTargetField().catch(() => null);
        if (field?.endsWith(target)) return item;
      }
      return null;
    },
    { message: `Field ${objectApiName}.${fieldApiName} is not on the layout` }
  );
}

/**
 * Picks a picklist value of a field by its API value, not its translated label
 * @param {object} field the layout item returned by getField
 * @param {string} value the picklist value's API name, e.g. 'Phone'
 */
export async function selectPicklistValue(field, value) {
  // the form renders its picklists after the other fields - wait until this one is there
  const combobox = await utam.waitFor(async () => (await field.getPicklist()).getBaseCombobox(), {
    message: `Picklist ${await field.getTargetField()} did not render`
  });
  await combobox.expand();
  await combobox.selectItemByValue(value);
}

// Test data goes through the Salesforce CLI and its target org - the org the
// login was generated for, as long as both use the same default or SF_TARGET_ORG
const sf = (...args) =>
  JSON.parse(execFileSync('sf', [...args, '--json'], { encoding: 'utf8', shell: process.platform === 'win32' })).result;

/**
 * Runs a SOQL query
 * @param {string} soql the query
 * @returns {object[]} the records
 */
export const query = (soql) => sf('data', 'query', '--query', soql).records;

/**
 * Deletes a record the test created
 * @param {string} sobject e.g. 'Account'
 * @param {string} id the record id
 */
export const deleteRecord = (sobject, id) => sf('data', 'delete', 'record', '--sobject', sobject, '--record-id', id);
