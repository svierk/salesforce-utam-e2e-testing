---
description: Analyses a failed UTAM E2E test run, finds the likely cause and reports it on the pull request or in an issue
on:
  workflow_run:
    workflows: [Validation]
    types: [completed]
    # the branch of the failed run - main and the work branches of pull
    # requests; adjust the prefixes to your team's branch naming
    branches: [main, 'feature/**', 'feat/**', 'fix/**', 'chore/**', 'dependabot/**']
  # Re-analyse a past run by hand - start it from the branch the run tested
  workflow_dispatch:
    inputs:
      run_id:
        description: ID of the failed Validation run to analyse
        required: true
        type: string
  # A run Dependabot started keeps it as actor, and gh-aw lets only users with
  # write access trigger a workflow_run - allow Dependabot explicitly, as its
  # updates of salesforce-pageobjects are what breaks tests after a release
  bots: ['dependabot[bot]']
# Failed runs of this repository only: fork pull requests get no org secrets,
# so their E2E job never runs, and their logs are not worth an agent's time
if: ${{ github.event_name == 'workflow_dispatch' || (github.event.workflow_run.conclusion == 'failure' && github.event.workflow_run.head_repository.full_name == github.repository) }}
permissions:
  contents: read
  actions: read
  issues: read
  pull-requests: read
engine: claude
timeout-minutes: 15
concurrency:
  job-discriminator: ${{ github.run_id }}
checkout:
  ref: ${{ github.event.workflow_run.head_sha || github.sha }}
skills:
  - svierk/salesforce-skills/salesforce-e2e-automator@d6fc346af36161b28beff698e0bff641dfbcb934
tools:
  github:
    mode: gh-proxy
    toolsets: [default]
# npm only - to compare the installed salesforce-pageobjects with the latest release
network:
  allowed:
    - defaults
    - node
steps:
  - name: Select Node Version
    uses: svierk/get-node-version@v1.6.0
    with:
      node-version: ${{ vars.NODE_VERSION_OVERRIDE }}
  # node_modules for the page object search of the skill, pageObjects/ for the
  # compiled page objects of the project - no org and no secret needed for either
  - name: Install Dependencies and Compile Page Objects
    run: |
      npm ci --ignore-scripts
      npm run test:ui:compile
  # Everything the agent works from lands in /tmp/gh-aw/e2e. The debug log of
  # WebdriverIO contains the single-use login URL of the test user - redact it
  # before an agent ever reads the log.
  - name: Collect Failure Evidence
    env:
      GH_TOKEN: ${{ github.token }}
      RUN_ID: ${{ inputs.run_id || github.event.workflow_run.id }}
    run: |
      set -euo pipefail
      dir=/tmp/gh-aw/e2e
      mkdir -p "$dir"
      gh run view "$RUN_ID" --repo "$GITHUB_REPOSITORY" \
        --json databaseId,url,event,headBranch,headSha,conclusion,createdAt,jobs \
        --jq '{id: .databaseId, url, event, headBranch, headSha, conclusion, createdAt,
               jobs: [.jobs[] | {name, conclusion, failedSteps: [.steps[] | select(.conclusion == "failure") | .name]}]}' \
        > "$dir/run.json"
      gh api "repos/$GITHUB_REPOSITORY/actions/runs/$RUN_ID" --jq '[.pull_requests[].number]' > "$dir/pull-requests.json"
      git rev-parse HEAD > "$dir/checked-out-sha.txt"
      gh run view "$RUN_ID" --repo "$GITHUB_REPOSITORY" --log-failed \
        | sed -E 's#(frontdoor\.jsp\?)[^"[:space:]]*#\1<redacted>#g; s#((otp|sid)=)[^&"[:space:]]*#\1<redacted>#g' \
        > "$dir/failed-jobs.log" || true
      gh run download "$RUN_ID" --repo "$GITHUB_REPOSITORY" --name e2e-reports --dir "$dir/reports" \
        || echo "The run has no e2e-reports artifact - the E2E job stopped before the first test." > "$dir/reports-missing.txt"
safe-outputs:
  add-comment:
    target: '*'
    max: 1
    hide-older-comments: true
  create-issue:
    title-prefix: '[e2e-failure] '
    labels: [e2e-failure]
    max: 1
---

# E2E Failure Analyst

A run of the **Validation** workflow failed. Find out why its **E2E UI Tests** job failed and tell the team - with evidence, a classification and the next step. You analyse and recommend; you never change code, and the team decides.

## Evidence

Everything is prepared in `/tmp/gh-aw/e2e`:

- `run.json` - the run: URL, event, branch, commit, and each job with its conclusion and failed steps
- `pull-requests.json` - numbers of the pull requests the run belongs to (empty for pushes to `main` and manual runs)
- `checked-out-sha.txt` - the commit checked out in the workspace; if it differs from `headSha` in `run.json`, say so in the report
- `failed-jobs.log` - logs of the failed jobs, login URLs redacted; WebdriverIO logs at debug level, so search it (`grep -n`, `tail`) instead of reading it whole
- `reports/junit/*.xml` - JUnit results: every test with its error message and stack
- `reports/screenshots/*.png` - the page each failed test stopped on, named after suite and test; look at them
- `reports-missing.txt` - present when the job failed before the first test ran

The workspace holds the repository at the tested commit, with `node_modules` installed and the project's page objects compiled to `pageObjects/`. Use the **salesforce-e2e-automator** skill - its _Fix a test_ mode and its page object search script - to check what a Salesforce page object offers in the installed `salesforce-pageobjects` version.

## Task

1. Read `run.json`. If the **E2E UI Tests** job did not fail - only _Code Quality_ failed, or the run was cancelled - call `noop` and stop: other failures are not yours.
2. For each failed test, find the failing step: JUnit error, the spec line in the stack, the screenshot, the log around the error.
3. Classify the failure as exactly one of:
   - **Test defect** - the test or a page object no longer fits the UI: an element not found, a page object method changed or removed (check `git log` on `package.json` for a recent `salesforce-pageobjects` bump), a missing wait. Name the file, the line and the fix - a page object or method you have confirmed with the skill's search script, never one from memory.
   - **Application defect** - the UI was reached and behaved differently from what the test expects: a wrong value, a missing record, a validation error on save. Never recommend weakening or removing an assertion; this needs a decision by someone who knows the expected behaviour.
   - **Environment** - the run could not test at all: org login or JWT authentication failed, the login stopped at a password change or identity verification, `Did not reach a Lightning page`, an expired org, browser or driver errors, org limits, network timeouts.
   - **Unclear** - the evidence does not support one cause. Say what is missing and whether a re-run is worth it.
4. Build a failure key: `e2e-failure:<classification>:<spec file>:<test title or "login">`, lower case.
5. Report - once:
   - The run belongs to a pull request (`pull-requests.json` is not empty): comment on that pull request with `add_comment`, setting its number as the target. Never comment on any other pull request or issue.
   - Otherwise: search the open issues labelled `e2e-failure` for the failure key. If one has it, comment there with `add_comment` that the failure occurred again, with the run link. If none has it, open an issue with `create_issue`.
   - If the evidence holds nothing you could act on - no log, no reports, no failed test - call `noop` with the reason instead.

## Report

Write for the developer who owns the change. Keep it short:

- First line: the classification in bold and your confidence (high, medium, low).
- A table of the failed tests: spec file, test, the step that failed, the error in a few words.
- **Cause** - what happened, with evidence: up to five quoted log or JUnit lines, the name of the screenshot, the commit or dependency change that explains it.
- **Next step** - the concrete fix for a test defect; for an application defect, the question for the person who decides; for an environment failure, what to fix in the org or the pipeline.
- A link to the run, and the note that the screenshots are in its `e2e-reports` artifact.
- The failure key as an HTML comment on the last line: `<!-- e2e-failure-key: ... -->`.

Never quote a whole log, and never write a login URL, session ID, token or anything else that looks like a credential into the report.
