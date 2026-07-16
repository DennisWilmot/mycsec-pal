import assert from "node:assert/strict";

const baseUrl = process.env.AUTHZ_TEST_BASE_URL ?? "http://localhost:3000";
const aliceCookie = process.env.AUTHZ_TEST_ALICE_COOKIE;
const bobAttemptId = process.env.AUTHZ_TEST_BOB_ATTEMPT_ID;
const bobQuestionId = process.env.AUTHZ_TEST_BOB_ATTEMPT_QUESTION_ID;
const bobOptionId = process.env.AUTHZ_TEST_BOB_OPTION_ID;

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl) && process.env.AUTHZ_TEST_ALLOW_NONLOCAL !== "1") {
  throw new Error("Cross-user mutation tests only run against localhost unless AUTHZ_TEST_ALLOW_NONLOCAL=1 is explicit.");
}
for (const [name,value] of Object.entries({AUTHZ_TEST_ALICE_COOKIE:aliceCookie,AUTHZ_TEST_BOB_ATTEMPT_ID:bobAttemptId,AUTHZ_TEST_BOB_ATTEMPT_QUESTION_ID:bobQuestionId,AUTHZ_TEST_BOB_OPTION_ID:bobOptionId})) {
  if (!value) throw new Error(`${name} is required. Use disposable Alice and Bob accounts.`);
}

async function expectHidden(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { cookie: aliceCookie, ...(init.headers ?? {}) } });
  const body = await response.text();
  assert.equal(response.status, 404, `${init.method ?? "GET"} ${path} exposed Bob's resource (${response.status}): ${body.slice(0,240)}`);
}

await expectHidden(`/api/attempts/${bobAttemptId}/session`);
await expectHidden(`/api/results/${bobAttemptId}`);
await expectHidden(`/api/attempts/${bobAttemptId}/questions/${bobQuestionId}/response`, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ clientRevision: 999_999, selectedOptionId: bobOptionId }),
});
await expectHidden(`/api/attempts/${bobAttemptId}/cancel`, { method: "POST" });
await expectHidden(`/api/attempts/${bobAttemptId}/retry-marking`, { method: "POST" });

const admin = await fetch(`${baseUrl}/api/admin/operations`, { headers: { cookie: aliceCookie } });
assert.equal(admin.status, 403, `Non-admin Alice unexpectedly accessed operations (${admin.status}).`);
console.log("Cross-user authorization checks passed.");
