import AppLauncherMenu from 'salesforce-pageobjects/global/pageobjects/appLauncherMenu';
import DesktopLayoutContainer from 'salesforce-pageobjects/navex/pageobjects/desktopLayoutContainer';
import { logInSalesforce } from './utam-helper';

describe('app-navigation', () => {
  beforeEach(async () => {
    await logInSalesforce();
  });

  it('navigate to service app', async () => {
    // navigate to the app launcher
    const container = await utam.load(DesktopLayoutContainer);
    const appNav = await container.getAppNav();
    const appLauncher = await (await appNav.getAppLauncherHeader()).getButton();
    await appLauncher.click();

    // search for the sales app
    const menu = await utam.load(AppLauncherMenu);
    const search = await (await menu.getSearchBar()).getLwcInput();
    search.setText('Service');

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
    tab.clickAndWaitForUrl('lightning/o/Account/list?filterName=Recent');
  });
});
