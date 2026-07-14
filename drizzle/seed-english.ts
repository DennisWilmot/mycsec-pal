import { getDatabase, getDatabaseClient } from "../lib/db";
import { eq } from "drizzle-orm";
import {
  markSchemes, paperBlueprintSlots, papers, paperVersions, questionOptions, questionParts,
  questionTopics, questions, subjects, syllabusVersions, topics,
} from "./schema";
import {
  englishPaperOneCandidates, englishPaperTwoCandidates, englishSubjectSeed,
  englishSyllabusSeed, validateEnglishCandidates,
} from "./seed-data/english";

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 110);
const optionLabels = ["A", "B", "C", "D"] as const;
const formName = (index: number) => String.fromCharCode(65 + index);

async function seedEnglishRelease() {
  const validation = validateEnglishCandidates();
  if (!validation.valid) throw new Error(`English ingestion blocked by release validation:\n${JSON.stringify(validation, null, 2)}`);
  if (process.env.ENGLISH_SEED_WRITE !== "release") throw new Error("Refusing database write. Set ENGLISH_SEED_WRITE=release only for the approved Forms A-C release.");

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [subject] = await tx.insert(subjects).values({ ...englishSubjectSeed, status: "published" }).onConflictDoUpdate({
      target: subjects.slug, set: { ...englishSubjectSeed, status: "published", updatedAt: new Date() },
    }).returning({ id: subjects.id });
    const [syllabus] = await tx.insert(syllabusVersions).values({ subjectId: subject.id, ...englishSyllabusSeed, status: "approved" }).onConflictDoUpdate({
      target: syllabusVersions.externalId, set: { title: englishSyllabusSeed.title, status: "approved", updatedAt: new Date() },
    }).returning({ id: syllabusVersions.id });

    const topicIds = new Map<number, string>();
    for (const [index, name] of ["Informative Discourse", "Literary Discourse", "Persuasive Discourse"].entries()) {
      const moduleNumber = index + 1;
      const [topic] = await tx.insert(topics).values({ subjectId: subject.id, syllabusVersionId: syllabus.id, moduleNumber, slug: slugify(name), name, syllabusCode: `ENGA-M${moduleNumber}`, sortOrder: moduleNumber }).onConflictDoUpdate({
        target: [topics.syllabusVersionId, topics.slug], set: { name, syllabusCode: `ENGA-M${moduleNumber}`, updatedAt: new Date() },
      }).returning({ id: topics.id });
      topicIds.set(moduleNumber, topic.id);
    }

    const paperIds = new Map<number, string>();
    for (const number of [1, 2]) {
      const paperType = number === 1 ? "paper_1" : "paper_2";
      const [paper] = await tx.insert(papers).values({ subjectId: subject.id, paperType, title: `English A Paper ${number}`, status: "published" }).onConflictDoUpdate({
        target: [papers.subjectId, papers.paperType], set: { title: `English A Paper ${number}`, status: "published", updatedAt: new Date() },
      }).returning({ id: papers.id });
      paperIds.set(number, paper.id);
    }

    const paperOneVersionIds: string[] = [];
    for (const [index, paper] of englishPaperOneCandidates.entries()) {
      const [version] = await tx.insert(paperVersions).values({
        paperId: paperIds.get(1)!, syllabusVersionId: syllabus.id, blueprintId: paper.id,
        blueprintVersion: 1, version: index + 1, durationSeconds: paper.durationSeconds,
        totalMarks: paper.totalMarks, questionCount: paper.questionCount, status: "published", publishedAt: new Date(),
      }).onConflictDoUpdate({ target: [paperVersions.blueprintId, paperVersions.blueprintVersion], set: { status: "published", publishedAt: new Date(), updatedAt: new Date() } }).returning({ id: paperVersions.id });
      paperOneVersionIds.push(version.id);
      const stimuli = new Map(paper.modules.flatMap((module) => module.stimuli.map((stimulus) => [stimulus.id, stimulus] as const)));
      for (const item of paper.questions) {
        const assessmentProfile = item.profile as "understanding" | "analysing" | "evaluating_creating";
        const difficulty = item.difficulty as "easy" | "medium" | "hard";
        const [question] = await tx.insert(questions).values({
          externalId: item.id, paperVersionId: version.id, questionNumber: item.number, moduleNumber: item.module,
          objectiveCode: slugify(item.objective).toUpperCase().slice(0, 80), assessmentProfile,
          difficulty, type: "multiple_choice", promptJson: { text: item.stem, stimulus: item.stimulusId ? stimuli.get(item.stimulusId) : null },
          totalMarks: 1, status: "published", provenanceJson: { source: "original_generated_candidate", form: formName(index), approvedBy: "product_owner", rationale: item.answerRationale, distractorRationales: item.distractorRationales },
        }).onConflictDoUpdate({ target: questions.externalId, set: { promptJson: { text: item.stem, stimulus: item.stimulusId ? stimuli.get(item.stimulusId) : null }, status: "published", updatedAt: new Date() } }).returning({ id: questions.id });
        for (const [optionIndex, content] of item.options.entries()) await tx.insert(questionOptions).values({ questionId: question.id, label: optionLabels[optionIndex], contentJson: { text: content }, sortOrder: optionIndex + 1, isCorrect: item.correctOption === optionLabels[optionIndex] }).onConflictDoUpdate({ target: [questionOptions.questionId, questionOptions.label], set: { contentJson: { text: content }, sortOrder: optionIndex + 1, isCorrect: item.correctOption === optionLabels[optionIndex] } });
        await tx.insert(questionTopics).values({ questionId: question.id, topicId: topicIds.get(item.module)!, weight: "1" }).onConflictDoNothing();
        await tx.insert(markSchemes).values({ questionId: question.id, schemeJson: { kind: "exact_option", correctOption: item.correctOption, humanReviewed: true }, maxMarks: 1, version: 1 }).onConflictDoUpdate({ target: [markSchemes.questionId, markSchemes.version], set: { schemeJson: { kind: "exact_option", correctOption: item.correctOption, humanReviewed: true }, updatedAt: new Date() } });
      }
    }

    const paperTwoVersionIds: string[] = [];
    const routes = [1, 2, 3, 4, 6, 7];
    for (const [index, paper] of englishPaperTwoCandidates.entries()) {
      const [version] = await tx.insert(paperVersions).values({
        paperId: paperIds.get(2)!, syllabusVersionId: syllabus.id, blueprintId: paper.id,
        blueprintVersion: 1, version: index + 1, durationSeconds: paper.durationSeconds,
        totalMarks: paper.totalMarksAnswered, questionCount: routes.length, status: "published", publishedAt: new Date(),
      }).onConflictDoUpdate({ target: [paperVersions.blueprintId, paperVersions.blueprintVersion], set: { status: "published", publishedAt: new Date(), updatedAt: new Date() } }).returning({ id: paperVersions.id });
      paperTwoVersionIds.push(version.id);
      const summaries = new Map(paper.summaryTasks.map((task) => [task.number, task]));
      const writing = new Map(paper.writingTasks.map((task) => [task.number, task]));
      for (const number of routes) {
        const summary = summaries.get(number);
        const choices = number === 4 ? [writing.get(4), writing.get(5)] : [writing.get(number)];
        const primary = summary ?? choices[0]!;
        const totalMarks = summary ? 10 : 30;
        const externalId = `ENGA-P2-F${formName(index)}-Q${number}`;
        const [question] = await tx.insert(questions).values({
          externalId, paperVersionId: version.id, questionNumber: number, moduleNumber: primary.module,
          objectiveCode: `ENGA-M${primary.module}-${summary ? "SUMMARY" : "WRITING"}`, assessmentProfile: "evaluating_creating", difficulty: "hard", type: "structured",
          promptJson: summary ? { title: summary.extractTitle, extract: summary.extract, purposePrompt: summary.purposePrompt, task: summary.summaryPrompt, maxWords: summary.maxSummaryWords } : { title: `Question ${number}`, choices: choices.filter(Boolean).map((task) => ({ number: task!.number, task: task!.task, scenario: task!.scenario, visualSpec: task!.visualSpec, suggestedWords: task!.suggestedWords })) },
          totalMarks, status: "published", provenanceJson: { source: "original_generated_candidate", form: formName(index), approvedBy: "product_owner" },
        }).onConflictDoUpdate({ target: questions.externalId, set: { status: "published", updatedAt: new Date() } }).returning({ id: questions.id });
        const [part] = await tx.insert(questionParts).values({ externalId: `${externalId}-RESPONSE`, questionId: question.id, label: number === 4 ? "Choose 4 or 5" : "Response", promptJson: summary ? { text: summary.summaryPrompt, purposePrompt: summary.purposePrompt, maxWords: summary.maxSummaryWords } : { text: number === 4 ? "Choose either Question 4 or Question 5." : choices[0]!.task, choices: number === 4 ? choices : undefined }, responseType: "long_text", marks: totalMarks, sortOrder: 1 }).onConflictDoUpdate({ target: questionParts.externalId, set: { marks: totalMarks, updatedAt: new Date() } }).returning({ id: questionParts.id });
        const rubric = summary ? summary.rubric : choices[0]!.rubric;
        await tx.insert(markSchemes).values({ questionPartId: part.id, schemeJson: { kind: "criteria_v1", humanReviewed: true, criteria: rubric.criteria }, maxMarks: totalMarks, version: 1 }).onConflictDoUpdate({ target: [markSchemes.questionPartId, markSchemes.version], set: { schemeJson: { kind: "criteria_v1", humanReviewed: true, criteria: rubric.criteria }, maxMarks: totalMarks, updatedAt: new Date() } });
        await tx.insert(questionTopics).values({ questionId: question.id, topicId: topicIds.get(primary.module)!, weight: "1" }).onConflictDoNothing();
      }
    }

    const latestP1 = paperOneVersionIds.at(-1)!;
    for (const item of englishPaperOneCandidates.at(-1)!.questions) {
      const assessmentProfile = item.profile as "understanding" | "analysing" | "evaluating_creating";
      const difficulty = item.difficulty as "easy" | "medium" | "hard";
      await tx.insert(paperBlueprintSlots).values({
        paperVersionId: latestP1, position: item.number, moduleNumber: item.module, topicId: topicIds.get(item.module)!,
        assessmentProfile, difficulty, questionType: "multiple_choice", marks: 1,
        selectionGroup: `block:english-p1-module-${item.module}`,
      }).onConflictDoUpdate({ target: [paperBlueprintSlots.paperVersionId, paperBlueprintSlots.position], set: { moduleNumber: item.module, topicId: topicIds.get(item.module)!, assessmentProfile, difficulty, selectionGroup: `block:english-p1-module-${item.module}`, updatedAt: new Date() } });
    }

    const latestP2 = paperTwoVersionIds.at(-1)!;
    await tx.delete(paperBlueprintSlots).where(eq(paperBlueprintSlots.paperVersionId, latestP2));
    const latestPaperTwo = englishPaperTwoCandidates.at(-1)!;
    const latestSummaries = new Map(latestPaperTwo.summaryTasks.map((task) => [task.number, task]));
    const latestWriting = new Map(latestPaperTwo.writingTasks.map((task) => [task.number, task]));
    for (const [routeIndex, number] of routes.entries()) {
      const task = latestSummaries.get(number) ?? latestWriting.get(number)!;
      await tx.insert(paperBlueprintSlots).values({ paperVersionId: latestP2, position: routeIndex + 1, moduleNumber: task.module, topicId: topicIds.get(task.module)!, assessmentProfile: "evaluating_creating", difficulty: "hard", questionType: "structured", marks: latestSummaries.has(number) ? 10 : 30, selectionGroup: null }).onConflictDoUpdate({ target: [paperBlueprintSlots.paperVersionId, paperBlueprintSlots.position], set: { moduleNumber: task.module, topicId: topicIds.get(task.module)!, marks: latestSummaries.has(number) ? 10 : 30, updatedAt: new Date() } });
    }
  });
  await getDatabaseClient().end();
}

seedEnglishRelease().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
