# 🧪 Salesforce UTAM E2E Testing

![GitHub CI](https://github.com/svierk/salesforce-utam-e2e-testing/actions/workflows/ci.yaml/badge.svg)

## About the project

This repository provides a template for setting up E2E UI test automation with [UTAM](https://utam.dev/) (UI Test Automation Model) in Salesforce DX projects.
In addition to the basic test setup configuration, a number of sample test cases are included to help you get started with UTAM. The configuration shown here was set up based on the contents of the following two repositories:

- [UTAM JavaScript Recipes](https://github.com/salesforce/utam-js-recipes) | Various examples of how to test the Salesforce UI with UTAM
- [Salesforce E-Bikes App](https://github.com/trailheadapps/ebikes-lwc) | LWC sample application with UTAM UI tests

## Prerequisites

To use this template, the [Node](https://nodejs.org/en/) version specified in the _package.json_ and the latest version of the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) should already be installed.

## Getting started

Follow the steps below to get the template running and manually execute the sample tests already included. The sample tests are generic enough to run in any Salesforce Org without specific configuration, such as a Trailhead Playground.

1. First clone the repository and open it with VS Code, install all the recommended extensions and run the following command to install all required dependencies:

   ```
   npm install
   ```

2. Next you need to authorize an org for which you want to run the tests. In VS Code this can be done by pressing **Command + Shift + P**, enter "sfdx", and select **SFDX: Authorize an Org**. Alternatively you can also run the following command from the command line:

   ```
   sfdx force:auth:web:login
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

## How to write your own tests

Creating UTAM tests is not trivial and the setup may involve one or two hurdles. Fortunately, there is a handy [UTAM Chrome Browser Extension](https://utam.dev/tools/browser-extension) to help with writing the tests. This extension helps to identify the page objects of interest directly in the Salesforce org and generates the corresponding test code in the selected language:

<img src="https://cdn-images-1.medium.com/v2/resize:fit:1600/1*gQH6S45TfI0evZ_JsnpHHA.png" alt="custom-slider" width="500"/>

## Learn more about UTAM

- [UTAM Website](https://utam.dev/) | Official UTAM Documentation
- [Run End-to-End Tests with the UI Test Automation Model (UTAM)](https://developer.salesforce.com/blogs/2022/05/run-end-to-end-tests-with-the-ui-test-automation-model-utam) | Post in Salesforce Developers' Blog
- [Run End-to-End Tests With UTAM](https://www.youtube.com/watch?v=rxZfsjIwWeU) | YouTube video that provides a 15min UTAM overview
- [Getting Started with UTAM](https://www.youtube.com/watch?v=YMxeCJexgMY) | YouTube video about a 1h step by step guide for writing a UTAM test
