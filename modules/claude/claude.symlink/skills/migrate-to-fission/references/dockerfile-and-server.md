# Step 3c — Generate `Dockerfile` and `server.js` for the service repo

If the service repo does not have a `Dockerfile`, generate one based on the runtime
from `serverless.yml`:

**Node.js (detect package manager from lockfile):**

**Match the existing runtime version** declared in `serverless.yml` `provider.runtime` or
the per-function `runtime:`. Do NOT upgrade as part of the migration — runtime jumps belong
in a separate, dedicated PR. Map the serverless runtime to the matching Docker base image:

| `serverless.yml` runtime                                                                | Docker base image                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nodejs14.x`                                                                            | `node:14-alpine`                                                                                                                                                                                                   |
| `nodejs16.x`                                                                            | `node:16-alpine`                                                                                                                                                                                                   |
| `nodejs18.x`                                                                            | `node:18-alpine`                                                                                                                                                                                                   |
| `nodejs20.x`                                                                            | `node:20-alpine`                                                                                                                                                                                                   |
| `python3.7`                                                                             | `python:3.7-slim` (EOL upstream — still pullable)                                                                                                                                                                  |
| `python3.8`                                                                             | `python:3.8-slim`                                                                                                                                                                                                  |
| `python3.10`                                                                            | `python:3.10-slim`                                                                                                                                                                                                 |
| `python3.12`                                                                            | `python:3.12-slim`                                                                                                                                                                                                 |
| _(no `runtime:` — Lambda container image, e.g. `FROM public.ecr.aws/lambda/nodejs:18`)_ | Match the Node / Python major from the existing Lambda base, e.g. `node:18-alpine` for `public.ecr.aws/lambda/nodejs:18`. Drop the AWS Lambda Runtime Interface Client; Express / Flask is the entrypoint instead. |

If `yarn.lock` exists:

```dockerfile
FROM node:{runtime-major}-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

If `package-lock.json` exists (npm):

```dockerfile
FROM node:{runtime-major}-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Python (substitute the matching base image from the runtime mapping table — never upgrade as part of the migration, even if the source runtime is EOL):**

```dockerfile
FROM python:{python-major-minor}-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3000
CMD ["python", "server.py"]
```

Also generate a `server.js` (or `server.py`) HTTP entrypoint that wraps the existing
Lambda handlers in an Express (or Flask) HTTP server. This is required because Fission
invokes functions over HTTP — each Lambda handler becomes a route:

- HTTP trigger handlers: map to the same logical path used in your Kong/API GW route
- TimeTrigger (schedule) handlers: map to a dedicated path (e.g. `/trigger-{function-name}`)
  invoked by Fission's timer internally

**Node.js Express template:**

```javascript
'use strict';

const express = require('express');
// Import existing Lambda handlers
// const handler = require('./functions/handler');

const app = express();
app.use(express.json());

// Health endpoint — required for readiness/liveness probes in fission.yml
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
// For apps with database connections (e.g. teach-data-api with knex/MySQL), verify the
// connection in the health check:
// app.get('/health', async (req, res) => {
//   try { await knex.raw('SELECT 1'); res.json({ status: 'ok' }); }
//   catch (err) { res.status(503).json({ status: 'error', message: err.message }); }
// });

// HTTP trigger handler
// app.post('/webhook', async (req, res) => {
//   const result = await handler.MyHttpFunction({ request_body: JSON.stringify(req.body) });
//   res.status(result.statusCode).send(result.body);
// });

// TimeTrigger (schedule) handler
// app.post('/trigger-my-schedule', (req, res) => {
//   handler.MyScheduleFunction();
//   res.status(200).send();
// });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
```

**Existing health endpoints:** Some Lambda handlers already have health checks built into
their handler logic (zuora-callouts checks `request_uri.includes('/health')`,
compliance-shenanigans checks `requestURI.includes('/health')`). When wrapping these in
Express, expose the health check as a dedicated `GET /health` route rather than routing
through the Lambda handler — this gives Kubernetes a clean probe endpoint.

**Important adapter note for Lambda proxy integration:** If the existing Lambda handler
reads `event.request_body` (Kong `aws-lambda` plugin with `forward_request_body: true`),
wrap the Express body: `{ request_body: JSON.stringify(req.body) }`.

**SNS-wrapped SQS payloads (double-parse):** When an SNS topic publishes to an SQS queue,
the Lambda `event.Records[0].body` is a JSON string of the SNS envelope, whose `Message`
field is itself a JSON string of the original publisher payload. Lambda handlers commonly
do `JSON.parse(JSON.parse(body).Message)`. Fission delivers the SQS body verbatim as the
HTTP request body, so the Express adapter must apply the same double-parse before handing
it to the existing handler:

```javascript
app.post('/sqs', async (req, res) => {
  // Fission MQ trigger forwards the raw SQS message body in req.body
  const sqsBody =
    typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  let payload;
  try {
    const envelope = JSON.parse(sqsBody);
    // SNS-wrapped: envelope.Message is a JSON string of the publisher payload
    payload = envelope.Message ? JSON.parse(envelope.Message) : envelope;
  } catch (err) {
    return res
      .status(400)
      .json({ error: 'invalid payload', detail: err.message });
  }
  await handler.MySqsFunction({ Records: [{ body: JSON.stringify(payload) }] });
  res.status(200).send();
});
```

If the upstream is plain SQS (no SNS), the inner parse is unnecessary — detect by checking
for `envelope.Type === 'Notification'` before parsing `Message`.

**github-student-pack-authenticator — HTTP 302 redirects:** This app returns 302 redirects
as part of the GitHub OAuth callback flow. In Express, use `res.redirect(302, url)` instead
of returning a Lambda-style `statusCode: 302` + `headers.Location` object. Verify in staging
that Fission Router, Istio, and Kong all pass through 302 responses and `Location` headers
without modification.

**Python Flask template (content-similarity):**

`content-similarity` is the only Python Lambda in scope. **Preserve its existing runtime
and dependency versions exactly** — match the `python{X.Y}` from `serverless.yml`'s
per-function `runtime:` and reuse the current `requirements.txt` verbatim. Even if the
runtime is end-of-life, the upgrade is a separate PR (PR S0) that lands before this
migration; bundling the runtime jump with the Lambda → Fission migration multiplies the
blast radius and is forbidden by Step 7's "Runtime version" rule. The Flask wrapper below
is the only structural change in this PR — no library version bumps:

```python
from flask import Flask, request, jsonify
from functions.top3 import handler

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    try:
        # Verify MySQL connection is alive (SQLAlchemy engine from top3 module)
        from core.knex import engine
        with engine.connect() as conn:
            conn.execute('SELECT 1')
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 503

@app.route('/top3', methods=['GET'])
def top3():
    result = handler({'request_uri_args': request.args.to_dict()})
    return result['body'], result['statusCode']

if __name__ == '__main__':
    import os
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3000)))
```

**Existing server.js / Dockerfile:** If the service repo already has a `server.js` and
`Dockerfile` (e.g. notifications-api-lambdas), review them instead of generating new ones.
Verify:

- The HTTP server listens on `process.env.PORT || 3000`
- A `GET /health` endpoint exists and returns 200
- All Lambda handler functions are exposed as HTTP routes
- The Dockerfile exposes the correct port and runs `server.js`

Do not overwrite existing files unless they are incompatible with Fission requirements.

After generating `server.js` (or `server.py` for content-similarity), also:

- Add `express` (or `flask`) to `package.json` / `requirements.txt` in the service repo
- Update `.circleci/config.yml` in the service repo: add `build_and_push_image_to_artifactory`
  alongside the existing `build_and_push_serverless_zip_to_artifactory` (keep both — Lambda
  still needs the zip artifact for rollback until decommissioned in Phase 5)
