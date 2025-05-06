import ObjectHomeDesktop from 'salesforce-pageobjects/force/pageObjects/objectHome';
import AppLauncherMenu from 'salesforce-pageobjects/global/pageObjects/appLauncherMenu';
import RecordActionWrapper from 'salesforce-pageobjects/global/pageObjects/recordActionWrapper';
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

    // select current list view
    const listView = await (await utam.load(ObjectHomeDesktop)).getListView();
    const listViewHeader = await listView.getHeader();
    const listViewName = await listViewHeader.getSelectedListViewName();

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

    // select current list view
    const listView = await (await utam.load(ObjectHomeDesktop)).getListView();
    const listViewHeader = await listView.getHeader();

    // click on new account action
    await (await listViewHeader.waitForAction('New')).click();

    // select account name input and enter name
    const modal = await utam.load(RecordActionWrapper);
    const recordForm = await modal.getRecordForm();
    const input = await (await (await recordForm.getRecordLayout()).getItem(1, 2, 1)).getTextInput();
    await input.setText('UTAM Test');

    // click modal save button
    await recordForm.clickFooterButton('Save');
    await modal.waitForAbsence();
  });
});
