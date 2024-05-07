# 🧪 Salesforce UTAM E2E Testing

![GitHub CI](https://github.com/svierk/salesforce-utam-e2e-testing/actions/workflows/ci.yml/badge.svg)

## About the project

This repository provides a template for setting up E2E UI test automation with [UTAM](https://utam.dev/) (UI Test Automation Model) in Salesforce DX projects.
In addition to the basic test setup configuration, a number of sample test cases are included to help you get started with UTAM. The configuration shown here was set up based on the contents of the following two repositories:

- [UTAM JavaScript Recipes](https://github.com/salesforce/utam-js-recipes) | Various examples of how to test the Salesforce UI with UTAM
- [Salesforce E-Bikes App](https://github.com/trailheadapps/ebikes-lwc) | LWC sample application with UTAM UI tests

## Prerequisites

To use this template, the [Node](https://nodejs.org/en/) version specified in the _package.json_ and the latest version of the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) should already be installed.

## Getting started

Follow the steps below to get the template running and manually execute the sample tests already included. The sample tests should be generic enough to run in any Salesforce Org without specific configuration, such as a Trailhead Playground.

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

4. Prepare the Salesforce login information:

   ```
   npm run test:ui:generate:login
   ```

5. Finally, execute all existing UI tests:

   ```
   npm run test:ui
   ```

**Note:** By default, the tests are executed in headless mode with the given configuration, i.e. the browser does not open visibly but runs tests in the background. This configuration is primarily intended for automatic execution in CI/CD pipelines. To deactivate the headless mode for local development and testing purposes, please comment out the following line in _wdio.conf.js_:

```
args: ['--headless']
```

## How to write your own tests

Creating UTAM tests is not trivial and the setup may involve one or two hurdles. Fortunately, there is a handy [UTAM Chrome Browser Extension](https://utam.dev/tools/browser-extension) to help with writing the tests. This extension helps to identify the page objects of interest directly in the Salesforce org and generates the corresponding test code in the selected language:

<img src="https://cdn-images-1.medium.com/v2/resize:fit:1600/1*gQH6S45TfI0evZ_JsnpHHA.png" alt="custom-slider" width="500"/>

## Automated test execution with GitHub Actions

UTAM tests can also be executed automatically in headless mode within a pipeline. The following Medium article describes how to an automated UTAM test execution in detail:
sdf

Below is an example with GitHub Actions, which is also used in this repository and can be found in the _.github_ directory:

```
tests:
  name: E2E UI Tests
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@main
      with:
        fetch-depth: 0
    - name: Select Node Version
      uses: svierk/get-node-version@main
    - name: Install Dependencies
      run: npm ci
    - name: Install SF CLI
      uses: svierk/sfdx-cli-setup@main
    - name: Salesforce Org Login
      uses: svierk/sfdx-login@main
      with:
        client-id: ${{ secrets.SFDX_CONSUMER_KEY }}
        jwt-secret-key: ${{ secrets.SFDX_JWT_SECRET_KEY }}
        username: ${{ secrets.SFDX_USERNAME }}
    - name: Compile UTAM Page Objects
      run: npm run test:ui:compile
    - name: Prepare Login Details
      run: npm run test:ui:generate:login
    - name: UTAM E2E Tests
      run: npm run test:ui
```

## Learn more about UTAM

- [UTAM Website](https://utam.dev/) | Official UTAM Documentation
- [Run End-to-End Tests with the UI Test Automation Model (UTAM)](https://developer.salesforce.com/blogs/2022/05/run-end-to-end-tests-with-the-ui-test-automation-model-utam) | Post in Salesforce Developers' Blog
- [Run End-to-End Tests With UTAM](https://www.youtube.com/watch?v=rxZfsjIwWeU) | YouTube video that provides a 15min UTAM overview
- [Getting Started with UTAM](https://www.youtube.com/watch?v=YMxeCJexgMY) | YouTube video about a 1h step by step guide for writing a UTAM test
- [Streamline E2E Testing with UTAM: Salesforce’s UI Test Automation Model](https://medium.com/capgemini-salesforce-architects/streamline-e2e-testing-with-utam-salesforces-ui-test-automation-model-51c0effb1e67) | Medium Post
- [Automate Salesforce E2E Testing using UTAM & GitHub Actions](https://medium.com/capgemini-salesforce-architects/automate-salesforce-e2e-testing-using-utam-github-actions-b11906fefc85) | Medium Post
