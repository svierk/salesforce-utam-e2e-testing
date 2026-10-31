# 🧪 Salesforce UTAM E2E Testing

[![Validation](https://github.com/svierk/salesforce-utam-e2e-testing/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/svierk/salesforce-utam-e2e-testing/actions/workflows/ci.yml)

## About the project

This repository provides a template for setting up E2E UI test automation with [UTAM](https://developer.salesforce.com/docs/platform/utam) (UI Test Automation Model) in Salesforce DX projects.
In addition to the basic test setup configuration, a number of sample test cases are included to help you get started with UTAM. The configuration shown here was set up based on the contents of the following two repositories:

- [UTAM JavaScript Recipes](https://github.com/salesforce/utam-js-recipes) | Various examples of how to test the Salesforce UI with UTAM
- [Salesforce E-Bikes App](https://github.com/trailheadapps/ebikes-lwc) | LWC sample application with UTAM UI tests

## Prerequisites

To use this template, the [Node](https://nodejs.org/en/) version specified in the _package.json_ and the latest version of the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) should already be installed.

## Getting started

Follow the steps below to get the template running and manually execute the sample tests already included. The sample tests should be generic enough to run in any Salesforce Org without specific configuration, such as a Trailhead Playground - in whatever language its user has set, because they address fields, actions and picklist values by their API names.

1. First clone the repository and open it with VS Code, install all the recommended extensions and run the following command to install all required dependencies:

   ```
   npm install
   ```

2. Next you need to authorize an org for which you want to run the tests. In VS Code this can be done by pressing **Command + Shift + P**, enter "sfdx", and select **SFDX: Authorize an Org**. Alternatively you can also run the following command from the command line:

   ```
   sf org login web
   ```

3. Compile all UTAM page objects:

   ```
   npm run test:ui:compile
   ```

4. Finally, execute all existing UI tests:

   ```
   npm run test:ui
   ```

   Every spec file logs in to the authorized default org with a fresh login URL from the Salesforce CLI - such a URL works only once, so each browser session gets its own. To test another org without changing your default, prefix the command: `SF_TARGET_ORG=<alias> npm run test:ui`. If you need a login URL outside the tests, `npm run test:ui:generate:login` writes one to _.env_ - it opens a session without a password, so never share or commit it.

**Note:** By default, the tests are executed in headless mode with the given configuration, i.e. the browser does not open visibly but runs tests in the background. This configuration is primarily intended for automatic execution in CI/CD pipelines. To deactivate the headless mode for local development and testing purposes, please comment out the following line in _wdio.conf.js_:

```
args: ['--headless=new', '--window-size=1920,1080']
```

## How to write your own tests

Creating UTAM tests is not trivial and the setup may involve one or two hurdles. Fortunately, there is a handy [UTAM Chrome Browser Extension](https://developer.salesforce.com/docs/platform/utam/guide/browser-extension.html) to help with writing the tests. This extension helps to identify the page objects of interest directly in the Salesforce org and generates the corresponding test code in the selected language:

<img src="https://cdn-images-1.medium.com/v2/resize:fit:1600/1*gQH6S45TfI0evZ_JsnpHHA.png" alt="custom-slider" width="500"/>

Where the Salesforce page objects do not cover a step, write a page object of your own: a _.utam.json_ file in a `__utam__` folder - next to the Lightning web component it describes, or in _force-app/test/utam/\_\_utam\_\__ for test-only page objects such as _recordModal.utam.json_ in this repository. `npm run test:ui:compile` compiles them into _pageObjects/_, from where the specs import them.

For AI coding agents, [svierk/salesforce-skills](https://github.com/svierk/salesforce-skills) packages the know-how of this template as an agent skill: the [🧪 E2E Automator](https://github.com/svierk/salesforce-skills/tree/main/plugins/e2e-automator) brings this setup into an existing Salesforce DX project, turns stories and tickets into UTAM UI tests, writes page objects for custom components, and fixes and upgrades the test suite with every Salesforce release.

## Automated test execution with GitHub Actions

UTAM tests can also be executed automatically in headless mode within a pipeline. The following Medium article describes how to an automated UTAM test execution in detail:

[Automate Salesforce E2E Testing using UTAM & GitHub Actions](https://medium.com/capgemini-salesforce-architects/automate-salesforce-e2e-testing-using-utam-github-actions-b11906fefc85)

Below is an example with GitHub Actions, which is also used in this repository and can be found in the _.github_ directory:

```yaml
# least-privilege token: the workflow only reads the repository
permissions:
  contents: read

jobs:
  tests:
    name: E2E UI Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7.0.1
        with:
          persist-credentials: false # the GITHUB_TOKEN is not needed after the checkout
      - name: Select Node Version
        uses: svierk/get-node-version@v1.5.1
      - name: Install Dependencies
        run: npm ci
      - name: Install SF CLI
        uses: svierk/sfdx-cli-setup@v1.1.2
      - name: Salesforce Org Login
        uses: svierk/sfdx-login@v1.4.2
        with:
          client-id: ${{ secrets.SFDX_CONSUMER_KEY }}
          jwt-secret-key: ${{ secrets.SFDX_JWT_SECRET_KEY }}
          username: ${{ vars.SFDX_USERNAME }}
      - name: Compile UTAM Page Objects
        run: npm run test:ui:compile
      - name: UTAM E2E Tests
        run: npm run test:ui
```

A few conventions worth copying along with the snippet:

- **Pin every action to an exact release tag** (`@v7.0.1`, not `@main` or `@v7`). A floating branch or major-version tag silently changes what runs in your pipeline; an exact tag makes every update a reviewable commit. [Dependabot](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference) keeps the pins current - see _.github/dependabot.yml_ for the `github-actions` ecosystem configuration used here.
- **Keep the org username in a repository variable, not a secret.** Only the connected app's consumer key (`SFDX_CONSUMER_KEY`) and the JWT private key (`SFDX_JWT_SECRET_KEY`) are confidential; `vars.SFDX_USERNAME` documents itself in the run log and keeps the secret list to what actually needs masking.
- **Never interpolate a secret into a `run:` script.** Pass it as an action input as shown above, or expose it through `env:` - inlining `${{ secrets.* }}` into a shell command puts it into the command line and, with the wrong quoting, into the log.
- **Grant the workflow only `contents: read`** and add further permissions per job, where they are needed.
- **Guard secret-dependent jobs against fork pull requests.** Those runs get no secrets by design, so an org login would fail for reasons unrelated to the change. In this repository the E2E job carries `if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository`.

## AI-driven failure analysis with GitHub Agentic Workflows

A red E2E run raises one question first: is the test broken, the application, or the environment? Answering it means reading a long WebdriverIO log, the error and the page the test stopped on - routine work an AI agent can take over. This repository does it with [GitHub Agentic Workflows](https://github.github.com/gh-aw/): _.github/workflows/e2e-failure-analyst.md_ describes the task in natural language, and `gh aw compile` turns it into the GitHub Actions workflow _e2e-failure-analyst.lock.yml_ next to it.

Whenever the _Validation_ workflow fails, the analyst:

1. collects the evidence of the run - the logs of the failed jobs, the JUnit results and the screenshot of every failed test, which _wdio.conf.js_ writes to _reports/_ and the CI uploads as the `e2e-reports` artifact
2. reads it together with the code at the tested commit, using the [🧪 E2E Automator](https://github.com/svierk/salesforce-skills/tree/main/plugins/e2e-automator) skill to check what the installed Salesforce page objects offer
3. classifies the failure as a **test defect** (with the concrete fix), an **application defect** (with the question for whoever knows the expected behaviour), an **environment** problem (login, org, browser) or **unclear**
4. reports it as a comment on the pull request of the run, or - for runs on `main` - in an issue labelled `e2e-failure`, adding to an open issue when the same failure occurs again

The agent analyses and recommends; it changes no code, and the team decides. Failures of the _Code Quality_ job are left alone.

**Security model.** The org credentials never reach the agent: the E2E tests keep running in the ordinary CI job, and the analyst only reads what that job left behind. The agent runs in a sandbox behind the Agent Workflow Firewall with read-only repository access and no secrets - the Anthropic API key stays in a proxy outside it. Its only way to write is the declared safe outputs (one comment or one issue per run), and a threat detection job checks them before they are applied. The login URL of the test user opens a session without a password, so _wdio.conf.js_ redacts it from the JUnit results, and the analyst redacts it from the logs before reading them.

**Setup.**

1. Install the CLI: `gh extension install github/gh-aw`
2. Store an [Anthropic API key](https://console.anthropic.com/) as repository secret: `gh aw secrets set ANTHROPIC_API_KEY --value "<key>"`
3. Adjust `branches` in the trigger of _e2e-failure-analyst.md_ to your branch naming, and run `gh aw compile` after every change to the file - commit both the _.md_ and the _.lock.yml_.
4. Try it on a past failure before relying on it: `gh aw run e2e-failure-analyst --raw-field run_id=<id of a failed run>`. With `staged: true` under `safe-outputs:` the run shows what it would post without posting it.

`gh aw logs e2e-failure-analyst` shows tokens, AI credits and turns per run, and `gh aw forecast` projects the monthly cost from them. To report to Jira or Xray instead of GitHub, gh-aw offers Jira safe outputs such as `jira-add-comment`.

## References

### Documentation

- [UTAM Developer Guide](https://developer.salesforce.com/docs/platform/utam) | Official UTAM documentation on Salesforce Developers
- [Run End-to-End Tests with the UI Test Automation Model (UTAM)](https://developer.salesforce.com/blogs/2022/05/run-end-to-end-tests-with-the-ui-test-automation-model-utam) | Post in Salesforce Developers' Blog

### Articles

- [Streamline E2E Testing with UTAM: Salesforce's UI Test Automation Model](https://medium.com/capgemini-salesforce-architects/streamline-e2e-testing-with-utam-salesforces-ui-test-automation-model-51c0effb1e67) | Medium post
- [Automate Salesforce E2E Testing using UTAM & GitHub Actions](https://medium.com/capgemini-salesforce-architects/automate-salesforce-e2e-testing-using-utam-github-actions-b11906fefc85) | Medium post
- [From a Jira Ticket to a Running Salesforce UI Test Written by an AI](https://medium.com/capgemini-salesforce-architects/from-a-jira-ticket-to-a-running-salesforce-ui-test-written-by-an-ai-f18be3108130) | Medium post

### Videos & Talks

- [Run End-to-End Tests With UTAM](https://www.youtube.com/watch?v=rxZfsjIwWeU) | YouTube video, 15min UTAM overview
- [Getting Started with UTAM](https://www.youtube.com/watch?v=YMxeCJexgMY) | YouTube video, 1h step by step guide for writing a UTAM test
- [Streamline Salesforce E2E UI Testing with UTAM](https://www.youtube.com/watch?v=xnoZ2Lc_WnQ) | Apex Hours session, August 2025 ([slides](https://svierk.github.io/slides/apex-hours-25-utam.pdf))
- [Automate UI Testing with AI and UTAM](https://www.youtube.com/watch?v=-PaSb-zWjbQ) | Apex Hours session, August 2026 ([slides](https://svierk.github.io/slides/apex-hours-26-utam-ai.pdf))
