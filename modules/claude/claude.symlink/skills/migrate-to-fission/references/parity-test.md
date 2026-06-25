# Step 3d — Generate side-by-side parity test (mandatory for every migration)

Every service-repo PR must ship a parity test that proves the new Express (or Flask) server
behaves identically to the existing Lambda handler for the same input. This is the strongest
local "functionality works as expected" check available before infra deploys: the Lambda
handler stays in the repo as the reference until Phase 5 decommission, so the test can keep
asserting equivalence throughout the migration.

**This step applies to every app being migrated, regardless of language, runtime, or trigger
type.** No service-repo PR is opened without the parity test passing locally. The test is
built from the inventory captured in Step 1b — every event type listed there must appear as
a fixture and be exercised against both the Lambda handler and the Express/Flask server. If
Step 1b could not produce a sample payload for a handler, the migration is blocked on that
handler until one is captured.

The test loads both entrypoints in the same process, replays each fixture through both, and
compares the outputs. No captured baseline file — the Lambda handler is the reference, so any
divergence fails the build immediately.

Generate three artifacts:

1. **`tests/fixtures/{event-name}.json`** — one fixture per event type the Lambda currently
   handles. Source: sanitize a recent production payload from CloudWatch logs (mask PII /
   secrets). For zuora-callouts: `subscription-created.json`, `subscription-cancelled.json`,
   `payment-succeeded.json`, `payment-failed.json`, `invalid-payload.json`. For SQS apps: one
   fixture per message shape (SNS-wrapped vs plain SQS). For schedule apps: an empty `{}`
   fixture is enough — the cron payload is empty.

2. **`tests/integration/parity.test.js`** — runs both paths and asserts byte equivalence.
   Skeleton (HTTP trigger):

   ```javascript
   const path = require('path');
   const fs = require('fs');
   const request = require('supertest');
   const AWS = require('aws-sdk-mock');
   const lambdaHandler = require('../../functions/handler');
   const buildApp = require('../../server'); // must export the Express app builder

   const fixtures = fs
     .readdirSync(path.join(__dirname, '../fixtures'))
     .filter((f) => f.endsWith('.json'));

   describe('Lambda <-> Express parity', () => {
     fixtures.forEach((file) => {
       test(file, async () => {
         const body = JSON.parse(
           fs.readFileSync(`tests/fixtures/${file}`, 'utf8'),
         );

         // 1. Capture Lambda handler output
         const lambdaSnsCalls = [];
         AWS.mock('SNS', 'publish', (params, cb) => {
           lambdaSnsCalls.push(params);
           cb(null, {});
         });
         const lambdaResult = await lambdaHandler.HandleZuoraCallout({
           request_body: JSON.stringify(body),
         });
         AWS.restore('SNS');

         // 2. Capture Express server output
         const expressSnsCalls = [];
         AWS.mock('SNS', 'publish', (params, cb) => {
           expressSnsCalls.push(params);
           cb(null, {});
         });
         const app = buildApp();
         const expressResult = await request(app).post('/').send(body);
         AWS.restore('SNS');

         // 3. Assert equivalence
         expect(expressResult.status).toBe(lambdaResult.statusCode);
         expect(expressResult.text).toBe(lambdaResult.body);
         expect(expressSnsCalls).toEqual(lambdaSnsCalls);
       });
     });
   });
   ```

   For SQS apps, replace the `request(app).post('/')` call with a POST to the Express
   handler's MQ route (e.g. `/sqs`) and feed the fixture as the SQS message body. For
   schedule apps, POST to the time-trigger route (e.g. `/trigger-{function-name}`) and
   assert the same side effects (DB writes, SNS publishes) the Lambda produces.

3. **`npm run test:parity` script in `package.json`** + **CircleCI job** that runs it on
   every push:

   ```yaml
   jobs:
     test_parity:
       executor: node
       steps:
         - checkout
         - run: npm ci
         - run: npm run test:parity
   ```

   Wire the job into the existing workflow so merges are blocked on a green parity run.

If `server.js` does not yet export an `Express` app factory, refactor it so it can be both
imported by the test (as a function returning the configured `app`) and run as the entrypoint
when invoked directly.

**Run the test before opening the PR.** Generation is not enough — the runner must execute
`npm run test:parity` (or the language equivalent) on the populated fixtures and confirm
every fixture passes. If any fixture diverges, fix the divergence in `server.js` (or the
underlying handler) and re-run until the suite is green. The Verification checkbox in the
service-repo PR template is flipped to `[x]` only after a passing local run.
