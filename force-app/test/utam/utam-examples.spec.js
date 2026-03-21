import AppLauncherMenu from 'salesforce-pageobjects/global/pageObjects/appLauncherMenu';
import RecordActionWrapper from 'salesforce-pageobjects/global/pageObjects/recordActionWrapper';
import ObjectHome from 'salesforce-pageobjects/lists/pageObjects/objectHome';
import DesktopLayoutContainer from 'salesforce-pageobjects/navex/pageObjects/desktopLayoutContainer';
import { logInSalesforce } from './utam-helper.js';

describe('utam-examples', () => {
  beforeEach(async () => {
    await logInSalesforce();
  });

  it('navigate to service app', async () => {
    // navigate to the app launcher
    const container = await utam.load(DesktopLayoutContainer);
    const appNav = await container.getAppNav();
    const appLauncher = await (await appNav.getAppLauncherHeader()).getButton();
    await appLauncher.click();

    // search for the service app
    const menu = await utam.load(AppLauncherMenu);
    const search = await (await menu.getSearchBar()).getLwcInput();
    await search.setText('Service');

    // get all items and click first search result
    const items = await menu.getItems();
    await (await items[0].getRoot()).click();

    // get the name of the currently active app
    const appName = await (await appNav.getAppName()).getText();

    // assert that you have navigated to the correct app
    expect(appName).toEqual('Service');
  });

  it('navigate to accounts tab', async () => {
    // select the navigation bar of the current app
    const container = await utam.load(DesktopLayoutContainer);
    const appNav = await container.getAppNav();
    const appNavBar = await appNav.getAppNavBar();

    // select and click the accounts tab
    const tab = await appNavBar.getNavItem('Accounts');
    await tab.clickAndWaitForUrl('lightning/o/Account/list?filterName=__Recent');

    // select current list view using LWC page objects
    const objectHome = await utam.load(ObjectHome);
    const listViewManager = await objectHome.getListViewManager();
    const commonList = await listViewManager.getCommonListInternal();
    const listViewHeader = await commonList.getHeader();
    const listViewName = await listViewHeader.getListViewTitleViaPicker();

    // assert that you have selected the correct list view
    expect(listViewName).toEqual('Recently Viewed');
  });

  it('create an account', async () => {
    // navigate to the app launcher
    const container = await utam.load(DesktopLayoutContainer);
    const appNav = await container.getAppNav();

    // select the navigation bar of the current app
    const appNavBar = await appNav.getAppNavBar();

    // select and click the accounts tab
    const tab = await appNavBar.getNavItem('Accounts');
    await tab.clickAndWaitForUrl('lightning/o/Account/list?filterName=__Recent');

    // select current list view using LWC page objects
    const objectHome = await utam.load(ObjectHome);
    const listViewManager = await objectHome.getListViewManager();
    const commonList = await listViewManager.getCommonListInternal();
    const listViewHeader = await commonList.getHeader();

    // click on new account action
    const actionsContainer = await listViewHeader.getAuraActionsContainer();
    await (await actionsContainer.getActionLink('New')).click();

    // select account name input and enter name
    const modal = await utam.load(RecordActionWrapper);
    const recordForm = await modal.getRecordForm();
    const recordLayout = await recordForm.getRecordLayout();

    // wait for the form items to be available
    await recordLayout.getAllItems();

    // Find the Account Name input by matching each input against its <label>
    // (label[for=id] in the same shadow root). This is layout-order-independent
    // and does not rely on LWC field-name attribute reflection.
    // waitUntil retries until the field is ready, then sets the value in the
    // same execute call to avoid WebElement serialisation issues.
    await browser.waitUntil(
      async () => {
        return await browser.execute(() => {
          function findAndFillAccountName(root) {
            const inputs = Array.from(root.querySelectorAll('input:not([type="hidden"])'));
            for (const input of inputs) {
              if (input.readOnly || input.disabled) continue;
              const id = input.id;
              if (id) {
                const label = root.querySelector(`label[for="${id}"]`);
                if (label && label.textContent?.trim().includes('Account Name')) {
                  input.focus();
                  input.value = 'UTAM Test';
                  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                  return true;
                }
              }
            }
            const all = Array.from(root.querySelectorAll('*'));
            for (const el of all) {
              if (el.shadowRoot) {
                if (findAndFillAccountName(el.shadowRoot)) return true;
              }
            }
            return false;
          }
          return findAndFillAccountName(document.body);
        });
      },
      { timeout: 15000, interval: 500, timeoutMsg: 'Account Name input not found in shadow DOM' }
    );

    // click modal save button
    await recordForm.clickFooterButton('Save');
    await modal.waitForAbsence();
  });
});
