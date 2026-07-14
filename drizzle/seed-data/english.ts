import paperOneA from "../../data/english/paper-1-form-a-review-candidate.json";
import paperOneB from "../../data/english/paper-1-form-b-review-candidate.json";
import paperOneC from "../../data/english/paper-1-form-c-review-candidate.json";
import paperTwoA from "../../data/english/paper-2-form-a-review-candidate.json";
import paperTwoB from "../../data/english/paper-2-form-b-review-candidate.json";
import paperTwoC from "../../data/english/paper-2-form-c-review-candidate.json";
import reviewDecisions from "../../data/english/review-decisions.json";

export type EnglishValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  itemId?: string;
};

const labels = ["A", "B", "C", "D"] as const;
const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export const englishSubjectSeed = {
  slug: "english-a",
  name: "English A",
  status: "review" as const,
  sortOrder: 2,
  cardAssetUrl: "/assets/subjects/english-a.png",
};

export const englishSyllabusSeed = {
  externalId: "CXC-01-G-SYLL-25",
  versionCode: "2025",
  title: "CSEC English A Syllabus (Revised 2025)",
  status: "review" as const,
};

export const englishPaperOneCandidates = [paperOneA, paperOneB, paperOneC];
export const englishPaperTwoCandidates = [paperTwoA, paperTwoB, paperTwoC];
export const englishPaperOneCandidate = paperOneA;
export const englishPaperTwoCandidate = paperTwoA;

export function validateEnglishCandidates() {
  const issues: EnglishValidationIssue[] = [];
  for (const [formIndex, paperOne] of englishPaperOneCandidates.entries()) {
    const form = String.fromCharCode(65 + formIndex);
    const p1Questions = paperOne.questions;
    if (!['review_pending', 'approved'].includes(paperOne.status)) issues.push({ severity: "error", code: "UNSAFE_STATUS", message: `English Paper 1 Form ${form} has an unsupported source status.` });
    if (paperOne.durationSeconds !== 5_400) issues.push({ severity: "error", code: "P1_DURATION", message: `English Paper 1 Form ${form} must allow 90 minutes.` });
    if (p1Questions.length !== 60) issues.push({ severity: "error", code: "P1_COUNT", message: `Paper 1 Form ${form} has ${p1Questions.length} questions; expected 60.` });
    for (const moduleNumber of [1, 2, 3]) {
      const moduleQuestions = p1Questions.filter((question) => question.module === moduleNumber);
      const profileCounts = Object.groupBy(moduleQuestions, (question) => question.profile);
      if (moduleQuestions.length !== 20 || profileCounts.understanding?.length !== 7 || profileCounts.analysing?.length !== 7 || profileCounts.evaluating_creating?.length !== 6) {
        issues.push({ severity: "error", code: "P1_BLUEPRINT", message: `Form ${form} Module ${moduleNumber} does not satisfy the 20-item 7/7/6 profile blueprint.` });
      }
    }
    for (const question of p1Questions) {
      if (question.options.length !== 4 || new Set(question.options).size !== 4) issues.push({ severity: "error", code: "P1_OPTIONS", itemId: question.id, message: "Question must have four distinct options." });
      const keyed = question.options[labels.indexOf(question.correctOption as (typeof labels)[number])];
      if (keyed !== question.correctAnswer) issues.push({ severity: "error", code: "P1_KEY", itemId: question.id, message: "Correct option and answer text do not match." });
    }
    const answerSequence = p1Questions.map((question) => question.correctOption).join("");
    if (answerSequence === "ABCD".repeat(15)) issues.push({ severity: "error", code: "P1_PREDICTABLE_KEY", message: `Paper 1 Form ${form} has a predictable answer key.` });
  }

  for (const [formIndex, paperTwo] of englishPaperTwoCandidates.entries()) {
    const form = String.fromCharCode(65 + formIndex);
    if (!['review_pending', 'approved'].includes(paperTwo.status)) issues.push({ severity: "error", code: "UNSAFE_STATUS", message: `English Paper 2 Form ${form} has an unsupported source status.` });
    if (paperTwo.durationSeconds !== 9_900 || paperTwo.totalMarksAnswered !== 120) issues.push({ severity: "error", code: "P2_BLUEPRINT", message: `Paper 2 Form ${form} duration or marks do not match the blueprint.` });
    for (const task of paperTwo.summaryTasks) {
      if (words(task.sampleSummary) > task.maxSummaryWords) issues.push({ severity: "error", code: "P2_SUMMARY_LIMIT", itemId: task.id, message: "Sample summary exceeds its word limit." });
    }
  }
  const approvedPools = (reviewDecisions as any).approvedPools;
  if (!reviewDecisions.reviewer || !reviewDecisions.reviewedAt || !reviewDecisions.paperOne.approved || !reviewDecisions.paperTwo.approved || approvedPools?.englishPaperOne?.join('') !== 'ABC' || approvedPools?.englishPaperTwo?.join('') !== 'ABC') issues.push({ severity: "error", code: "HUMAN_REVIEW_REQUIRED", message: "The product owner must approve English Forms A-C in review-decisions.json." });
  if (!reviewDecisions.rightsApproved) issues.push({ severity: "error", code: "RIGHTS_REVIEW_REQUIRED", message: "Originality and rights review is not approved." });
  if (!reviewDecisions.spineApproved) issues.push({ severity: "error", code: "SPINE_REVIEW_REQUIRED", message: "Canonical objective/spine mapping is not approved." });

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
    summary: {
      paperOneQuestions: englishPaperOneCandidates.reduce((sum, paper) => sum + paper.questions.length, 0),
      paperTwoPrintedTasks: englishPaperTwoCandidates.reduce((sum, paper) => sum + paper.summaryTasks.length + paper.writingTasks.length, 0),
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
  };
}
