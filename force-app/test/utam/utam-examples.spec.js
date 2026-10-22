import RecordActionWrapper from 'salesforce-pageobjects/global/pageObjects/recordActionWrapper';
import DesktopLayoutContainer from 'salesforce-pageobjects/navex/pageObjects/desktopLayoutContainer';
import RecordModal from '../../../pageObjects/recordModal.js';
import { deleteRecord, getField, logInSalesforce, openPath, query, selectPicklistValue } from './utam-helper.js';

describe('utam-examples', () => {
  // a run marker keeps the records of repeated or parallel runs apart
  const runId = Date.now();
  const createdRecords = [];

  beforeEach(async () => {
    await logInSalesforce();
  });

  afterAll(() => {
    for (const { sobject, id } of createdRecords) deleteRecord(sobject, id);
  });

  it('opens the accounts tab from the navigation bar of the sales app', async () => {
    // app and tab labels follow the user's language - take them from the org
    const [app] = query("SELECT Label FROM AppDefinition WHERE DeveloperName = 'LightningSales'");
    const [tab] = query("SELECT Label FROM TabDefinition WHERE Name = 'standard-Account'");

    // open the app by url, then wait until the navigation bar shows it
    await openPath('/lightning/app/standard__LightningSales');
    const appNav = await (await utam.load(DesktopLayoutContainer)).getAppNav();
    await utam.waitFor(async () => (await (await appNav.getAppName()).getText()) === app.Label, {
      message: `The navigation bar does not show the app ${app.Label}`
    });

    // click the accounts tab and wait for the list view
    const navItem = await (await appNav.getAppNavBar()).getNavItem(tab.Label);
    await navItem.clickAndWaitForUrl('lightning/o/Account/');
  });

  it('creates an account through the new record form', async () => {
    const accountName = `UTAM Account ${runId}`;

    // open the new record form directly
    await openPath('/lightning/o/Account/new');
    const modal = await utam.load(RecordActionWrapper);
    const recordForm = await modal.getRecordForm();
    const recordLayout = await recordForm.getRecordLayout();

    // fill the name and save - by API names, independent of labels and the user's language
    const nameField = await getField(recordLayout, 'Account', 'Name');
    await (await nameField.getTextInput()).setText(accountName);
    await (await utam.load(RecordModal)).clickAction('SaveEdit');
    await modal.waitForAbsence();

    // the database, not the screen, confirms what was saved
    const [account] = query(`SELECT Id FROM Account WHERE Name = '${accountName}'`);
    expect(account).toBeDefined();
    createdRecords.push({ sobject: 'Account', id: account.Id });
  });

  it('creates a case with its subject and origin', async () => {
    const subject = `UTAM Case ${runId}`;

    await openPath('/lightning/o/Case/new');
    const modal = await utam.load(RecordActionWrapper);
    const recordForm = await modal.getRecordForm();
    const recordLayout = await recordForm.getRecordLayout();

    // picklist values by their API names, so the test runs in every language
    await (await (await getField(recordLayout, 'Case', 'Subject')).getTextInput()).setText(subject);
    await selectPicklistValue(await getField(recordLayout, 'Case', 'Origin'), 'Phone');
    await (await utam.load(RecordModal)).clickAction('SaveEdit');
    await modal.waitForAbsence();

    const [caseRecord] = query(`SELECT Id, Origin FROM Case WHERE Subject = '${subject}'`);
    expect(caseRecord).toBeDefined();
    createdRecords.push({ sobject: 'Case', id: caseRecord.Id });
    expect(caseRecord.Origin).toBe('Phone');
  });
});
