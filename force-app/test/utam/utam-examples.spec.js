import AppLauncherMenu from 'salesforce-pageobjects/global/pageObjects/appLauncherMenu';
import RecordActionWrapper from 'salesforce-pageobjects/global/pageObjects/recordActionWrapper';
import ObjectHome from 'salesforce-pageobjects/lists/pageObjects/objectHome';
import DesktopLayoutContainer from 'salesforce-pageobjects/navex/pageObjects/desktopLayoutContainer';
import { logInSalesforce } from './utam-helper.js';

describe('utam-examples', () => {
  beforeEach(async () => {
    await logInSalesforce();
  });

  it('navigate to accounts tab in the sales app and create an account record', async () => {
    // navigate to the app launcher
    const container = await utam.load(DesktopLayoutContainer);
    const appNav = await container.getAppNav();
    const appLauncher = await (await appNav.getAppLauncherHeader()).getButton();
    await appLauncher.click();

    // search for the sales app
    const menu = await utam.load(AppLauncherMenu);
    const search = await (await menu.getSearchBar()).getLwcInput();
    await search.setText('Sales');

    // retry getItems() until search results are available — implicitTimeout is 0
    // so UTAM does not wait internally when search results are still loading
    let items;
    await browser.waitUntil(
      async () => {
        try {
          items = await menu.getItems();
          return items.length > 0;
        } catch {
          return false;
        }
      },
      { timeout: 15000, interval: 500, timeoutMsg: 'App Launcher search returned no items' }
    );

    // find the item whose first line matches exactly 'Sales' to avoid clicking
    // 'Sales Console' or other apps with 'Sales' in the name
    let targetItem = items[0];
    for (const item of items) {
      try {
        const text = await (await item.getRoot()).getText();
        if (text.split('\n')[0].trim() === 'Sales') {
          targetItem = item;
          break;
        }
      } catch {
        // skip unreadable item
      }
    }
    await (await targetItem.getRoot()).click();

    // the app context switch is asynchronous — the URL changes immediately but
    // the nav bar app name updates shortly after; retry until it shows 'Sales'
    await browser.waitUntil(
      async () => {
        try {
          const c = await utam.load(DesktopLayoutContainer);
          const nav = await c.getAppNav();
          const name = await (await nav.getAppName()).getText();
          return name === 'Sales';
        } catch {
          return false;
        }
      },
      { timeout: 30000, interval: 1000, timeoutMsg: 'App context did not switch to Sales within 30s' }
    );

    // reload the container after the context switch to get fresh UTAM references
    const appNavAfterNav = await (await utam.load(DesktopLayoutContainer)).getAppNav();

    // assert that you have navigated to the correct app
    const appName = await (await appNavAfterNav.getAppName()).getText();
    expect(appName).toEqual('Sales');

    // select and click the accounts tab
    const appNavBar = await appNavAfterNav.getAppNavBar();
    const tab = await appNavBar.getNavItem('Accounts');
    await tab.clickAndWaitForUrl('lightning/o/Account/list?filterName=__Recent');

    // with implicitTimeout: 0 the list view title may be empty while the LWC
    // component is still rendering — retry the full chain until the title loads
    let listViewHeader;
    let listViewName;
    await browser.waitUntil(
      async () => {
        try {
          const lv = await utam.load(ObjectHome);
          const lvm = await lv.getListViewManager();
          const cl = await lvm.getCommonListInternal();
          listViewHeader = await cl.getHeader();
          listViewName = await listViewHeader.getListViewTitleViaPicker();
          return listViewName && listViewName.length > 0;
        } catch {
          return false;
        }
      },
      { timeout: 15000, interval: 500, timeoutMsg: 'List view title did not load within 15s' }
    );

    // assert that you have selected the correct list view
    expect(listViewName).toEqual('Recently Viewed');

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
                  input.value = 'UTAM Test Account';
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

    // click modal save button and wait for modal to close
    await recordForm.clickFooterButton('Save');
    await modal.waitForAbsence();
  });

  it('navigate to service app and create a case', async () => {
    // navigate to the app launcher
    const container = await utam.load(DesktopLayoutContainer);
    const appNav = await container.getAppNav();
    const appLauncher = await (await appNav.getAppLauncherHeader()).getButton();
    await appLauncher.click();

    // search for the service app
    const menu = await utam.load(AppLauncherMenu);
    const search = await (await menu.getSearchBar()).getLwcInput();
    await search.setText('Service');

    // retry getItems() until search results are available — implicitTimeout is 0
    // so UTAM does not wait internally when search results are still loading
    let items;
    await browser.waitUntil(
      async () => {
        try {
          items = await menu.getItems();
          return items.length > 0;
        } catch {
          return false;
        }
      },
      { timeout: 15000, interval: 500, timeoutMsg: 'App Launcher search returned no items' }
    );

    // click the first search result — 'Service' is consistently items[0]
    await (await items[0].getRoot()).click();

    // the app context switch is asynchronous — retry until the nav bar shows 'Service'
    await browser.waitUntil(
      async () => {
        try {
          const c = await utam.load(DesktopLayoutContainer);
          const nav = await c.getAppNav();
          const name = await (await nav.getAppName()).getText();
          return name === 'Service';
        } catch {
          return false;
        }
      },
      { timeout: 30000, interval: 1000, timeoutMsg: 'App context did not switch to Service within 30s' }
    );

    // reload the container after the context switch to get fresh UTAM references
    const appNavAfterNav = await (await utam.load(DesktopLayoutContainer)).getAppNav();

    // assert that you have navigated to the correct app
    const appName = await (await appNavAfterNav.getAppName()).getText();
    expect(appName).toEqual('Service');

    // select and click the cases tab
    const appNavBar = await appNavAfterNav.getAppNavBar();
    const tab = await appNavBar.getNavItem('Cases');
    await tab.clickAndWaitForUrl('lightning/o/Case/list?filterName=__Recent');

    // with implicitTimeout: 0 the list view title may be empty while the LWC
    // component is still rendering — retry the full chain until the title loads
    let listViewHeader;
    let listViewName;
    await browser.waitUntil(
      async () => {
        try {
          const lv = await utam.load(ObjectHome);
          const lvm = await lv.getListViewManager();
          const cl = await lvm.getCommonListInternal();
          listViewHeader = await cl.getHeader();
          listViewName = await listViewHeader.getListViewTitleViaPicker();
          return listViewName && listViewName.length > 0;
        } catch {
          return false;
        }
      },
      { timeout: 15000, interval: 500, timeoutMsg: 'List view title did not load within 15s' }
    );

    // assert that you have selected the correct list view
    expect(listViewName).toEqual('Recently Viewed');

    // click on new case action
    const actionsContainer = await listViewHeader.getAuraActionsContainer();
    await (await actionsContainer.getActionLink('New')).click();

    // load the new case modal
    const modal = await utam.load(RecordActionWrapper);
    const recordForm = await modal.getRecordForm();
    const recordLayout = await recordForm.getRecordLayout();

    // wait for the form items to be available
    await recordLayout.getAllItems();

    // Fill the Subject input and all blank picklists (select and lightning-combobox).
    // lightning-combobox exposes @api properties `value` and `options` accessible
    // from outside the component, so we can set them without opening the dropdown.
    await browser.waitUntil(
      async () => {
        return await browser.execute(() => {
          function fillCaseFields(root) {
            let subjectFilled = false;

            // fill Subject text input
            const inputs = Array.from(root.querySelectorAll('input:not([type="hidden"])'));
            for (const input of inputs) {
              if (input.readOnly || input.disabled) continue;
              const id = input.id;
              if (id) {
                const label = root.querySelector(`label[for="${id}"]`);
                if (label && label.textContent?.trim().includes('Subject')) {
                  input.focus();
                  input.value = 'UTAM Test Case';
                  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                  subjectFilled = true;
                }
              }
            }

            // fill blank native select picklists (e.g. lightning-select)
            for (const select of root.querySelectorAll('select')) {
              if (select.disabled || select.value) continue;
              const firstOption = Array.from(select.options).find((o) => o.value);
              if (firstOption) {
                select.value = firstOption.value;
                select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
              }
            }

            // fill blank lightning-combobox picklists (e.g. Case Origin, Status)
            // lightning-combobox exposes @api `value` and `options` properties
            for (const cb of root.querySelectorAll('lightning-combobox')) {
              if (cb.value) continue;
              const opts = cb.options;
              if (!opts || !opts.length) continue;
              const firstOpt = opts.find((o) => o.value);
              if (!firstOpt) continue;
              cb.value = firstOpt.value;
              cb.dispatchEvent(
                new CustomEvent('change', {
                  detail: { value: firstOpt.value },
                  bubbles: true,
                  composed: true
                })
              );
            }

            // recurse into shadow roots
            for (const el of root.querySelectorAll('*')) {
              if (el.shadowRoot) {
                if (fillCaseFields(el.shadowRoot)) subjectFilled = true;
              }
            }

            return subjectFilled;
          }
          return fillCaseFields(document.body);
        });
      },
      { timeout: 15000, interval: 500, timeoutMsg: 'Subject input not found in shadow DOM' }
    );

    // click modal save button and wait for modal to close
    await recordForm.clickFooterButton('Save');
    await modal.waitForAbsence();
  });
});
