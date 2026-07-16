import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const users = new SharedArray("load users", () => JSON.parse(open(__ENV.LOAD_USERS_FILE || "./load-users.json")));
const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const defaultStages = [
  { duration: "2m", target: 100 }, { duration: "3m", target: 100 },
  { duration: "2m", target: 250 }, { duration: "3m", target: 250 },
  { duration: "2m", target: 500 }, { duration: "3m", target: 500 },
  { duration: "3m", target: 1000 }, { duration: "5m", target: 1000 },
  { duration: "2m", target: 0 },
];
const stages = __ENV.LOAD_STAGES_JSON ? JSON.parse(__ENV.LOAD_STAGES_JSON) : defaultStages;
const iterationPauseSeconds = Number(__ENV.ITERATION_PAUSE_SECONDS || 30);

export const options = {
  scenarios: {
    staged_exam_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages,
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000", "p(99)<2500"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const user = users[(__VU - 1) % users.length];
  const params = { headers: { Cookie: user.cookie, "content-type": "application/json" }, tags: { flow: user.paperType || "paper" } };
  const session = http.get(`${baseUrl}/api/attempts/${user.attemptId}/session`, params);
  check(session, { "session loaded": (response) => response.status === 200 });

  const heartbeat = http.post(`${baseUrl}/api/attempts/${user.attemptId}/heartbeat`, null, params);
  check(heartbeat, { "heartbeat accepted": (response) => response.status === 200 });

  if (user.attemptQuestionId) {
    const revision = (__ITER + 1) * 10_000 + __VU;
    const answer = user.selectedOptionId
      ? { clientRevision: revision, selectedOptionId: user.selectedOptionId }
      : { clientRevision: revision, response: { parts: user.parts || {} } };
    const saved = http.put(`${baseUrl}/api/attempts/${user.attemptId}/questions/${user.attemptQuestionId}/response`, JSON.stringify(answer), params);
    check(saved, { "answer saved": (response) => response.status === 200 });
  }
  sleep(iterationPauseSeconds);
}
