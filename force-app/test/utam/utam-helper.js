const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours by default

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
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return url.includes('.force.com/lightning') && !url.includes('frontdoor') && !url.includes('contentDoor');
    },
    { timeout: 60000, interval: 500, timeoutMsg: 'Did not reach a Lightning page within 60s after login' }
  );
  return domDocument;
}
