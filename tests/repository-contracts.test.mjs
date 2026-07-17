import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("agent router links the mandatory workflow and validation gates", async () => {
  const agents = await read("AGENTS.md");
  assert.match(agents, /AGENT_WORKFLOW\.md/);
  assert.match(agents, /validate:precommit/);
  assert.match(agents, /validate:full/);
  assert.match(agents, /Never mutate production data/);
});

test("workflow requires app execution and honest independent review", async () => {
  const workflow = await read("agent/skills/mycsecpal-workflow/SKILL.md");
  assert.match(workflow, /Run the actual application/);
  assert.match(workflow, /different model\/provider/);
  assert.match(workflow, /must not be labelled independent review/);
});

test("environment files and local load users remain ignored", async () => {
  const ignore = await read(".gitignore");
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\.env\.local$/m);
  assert.match(ignore, /^load\/load-users\.json$/m);
});

test("security model keeps credentials server-only", async () => {
  const conventions = await read("docs/coding-conventions.md");
  const security = await read("docs/security.md");
  assert.match(conventions, /client-supplied user ID is never authority/);
  assert.match(security, /service-role/);
  assert.match(security, /correct answers and rubrics out of active exam payloads/);
});

test("session replay masks learner input and strips query strings", async () => {
  const instrumentation = await read("instrumentation-client.js");
  const identity = await read("components/PostHogIdentity.jsx");
  const config = await read("next.config.mjs");
  assert.match(instrumentation, /maskAllInputs:\s*true/);
  assert.match(instrumentation, /request\.name\.split\('\?'\)\[0\]/);
  assert.match(instrumentation, /recordHeaders:\s*false/);
  assert.match(instrumentation, /recordBody:\s*false/);
  assert.match(instrumentation, /captureCanvas:\s*\{\s*recordCanvas:\s*false\s*\}/);
  assert.match(identity, /posthog\.identify\(userId\)/);
  assert.doesNotMatch(identity, /posthog\.identify\([^\n]*(email|displayName)/);
  assert.match(config, /posthogHost/);
});
