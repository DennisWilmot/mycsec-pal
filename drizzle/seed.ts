import { eq } from "drizzle-orm";
import { getDatabase, getDatabaseClient } from "../lib/db";
import {
  markSchemes,
  papers,
  paperVersions,
  questionOptions,
  questionParts,
  questionPartTopics,
  questions,
  questionTopics,
  subjects,
  syllabusVersions,
  topics,
} from "./schema";
import {
  mathematics2027PaperDefinitionsSeed,
  mathematics2027SyllabusSeed,
  mathematics2027TopicsSeed,
  mathematicsSubjectSeed,
  paper1QuestionSeed,
  paper2QuestionSeed,
  validateMathematicsSeed,
} from "./seed-data/mathematics";
import { paperTwoRubrics } from "./seed-data/paper2-rubrics";

const paper1Status = "published" as const;
// Paper 2 is part of the live MVP catalogue. Its questions and marking
// rubrics have completed the same review gate used by the attempt service,
// so expose it alongside Paper 1 on the Practice dashboard.
const paper2Status = "published" as const;
const profileMap = {
  CK: "conceptual_knowledge",
  AK: "algorithmic_knowledge",
  R: "reasoning",
} as const;
const optionLabels = ["A", "B", "C", "D"] as const;

const paper2TopicNames: Record<string, string[]> = {
  "math-p2-demo-q1": ["Number Theory and Computation", "Consumer Arithmetic"],
  "math-p2-demo-q2": ["Introduction to Graphs", "Sets", "Measurement", "Algebra 1"],
  "math-p2-demo-q3": ["Number Theory and Computation", "Algebra 1"],
  "math-p2-demo-q4": ["Algebra 2", "Relations, Functions and Graphs 1"],
  "math-p2-demo-q5": ["Geometry and Trigonometry 1"],
  "math-p2-demo-q6": ["Statistics 1", "Vectors and Matrices 1"],
  "math-p2-demo-q7": ["Vectors and Matrices 2"],
  "math-p2-demo-q8": ["Geometry and Trigonometry 2"],
  "math-p2-demo-q9": ["Statistics 2", "Relations, Functions and Graphs 2"],
};

const paper2PartTopicNames: Record<string, string[]> = {
  "1a": ["Number Theory and Computation"], "1b": ["Consumer Arithmetic"], "1c": ["Consumer Arithmetic"],
  "2a": ["Algebra 1"], "2b": ["Sets"], "2c": ["Measurement"], "2d": ["Measurement"],
  "3a": ["Number Theory and Computation"], "3b": ["Algebra 1"], "3c": ["Algebra 1"], "3d": ["Algebra 1"],
  "4a": ["Algebra 2"], "4b": ["Algebra 2"], "4c": ["Relations, Functions and Graphs 1"], "4d": ["Relations, Functions and Graphs 1"],
  "5a": ["Geometry and Trigonometry 1"], "5b": ["Geometry and Trigonometry 1"], "5c": ["Geometry and Trigonometry 1"],
  "6a": ["Statistics 1"], "6b": ["Vectors and Matrices 1"], "6c": ["Vectors and Matrices 1"],
  "7a": ["Vectors and Matrices 2"], "7b": ["Vectors and Matrices 2"], "7c": ["Vectors and Matrices 2"], "7d": ["Vectors and Matrices 2"],
  "8a": ["Geometry and Trigonometry 2"], "8b": ["Geometry and Trigonometry 2"], "8c": ["Geometry and Trigonometry 2"],
  "9a": ["Statistics 2"], "9b": ["Statistics 2"], "9c": ["Relations, Functions and Graphs 2"],
};

const paper2Profiles: Record<string, "conceptual_knowledge" | "algorithmic_knowledge" | "reasoning"> = {
  "math-p2-demo-q1": "algorithmic_knowledge",
  "math-p2-demo-q2": "algorithmic_knowledge",
  "math-p2-demo-q3": "reasoning",
  "math-p2-demo-q4": "algorithmic_knowledge",
  "math-p2-demo-q5": "algorithmic_knowledge",
  "math-p2-demo-q6": "algorithmic_knowledge",
  "math-p2-demo-q7": "reasoning",
  "math-p2-demo-q8": "reasoning",
  "math-p2-demo-q9": "reasoning",
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function seed() {
  const validation = validateMathematicsSeed();
  if (!validation.valid) throw new Error(`Seed validation failed:\n${JSON.stringify(validation, null, 2)}`);

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [subject] = await tx.insert(subjects).values({
      slug: "mathematics",
      name: mathematicsSubjectSeed.name,
      status: "approved",
      sortOrder: 1,
    }).onConflictDoUpdate({
      target: subjects.slug,
      set: { name: mathematicsSubjectSeed.name, status: "approved", sortOrder: 1, updatedAt: new Date() },
    }).returning({ id: subjects.id });

    const [syllabus] = await tx.insert(syllabusVersions).values({
      subjectId: subject.id,
      externalId: mathematics2027SyllabusSeed.id,
      versionCode: mathematics2027SyllabusSeed.version,
      title: mathematics2027SyllabusSeed.name,
      effectiveFrom: new Date(mathematics2027SyllabusSeed.effectiveFrom),
      status: "approved",
    }).onConflictDoUpdate({
      target: syllabusVersions.externalId,
      set: { title: mathematics2027SyllabusSeed.name, effectiveFrom: new Date(mathematics2027SyllabusSeed.effectiveFrom), status: "approved", updatedAt: new Date() },
    }).returning({ id: syllabusVersions.id });

    const topicIds = new Map<string, string>();
    for (const [index, item] of mathematics2027TopicsSeed.entries()) {
      const [row] = await tx.insert(topics).values({
        subjectId: subject.id,
        syllabusVersionId: syllabus.id,
        moduleNumber: item.module,
        slug: slugify(item.name),
        name: item.name,
        sortOrder: index + 1,
      }).onConflictDoUpdate({
        target: [topics.syllabusVersionId, topics.slug],
        set: { name: item.name, moduleNumber: item.module, sortOrder: index + 1, updatedAt: new Date() },
      }).returning({ id: topics.id });
      topicIds.set(item.name, row.id);
    }

    const versionIds = new Map<number, string>();
    for (const definition of mathematics2027PaperDefinitionsSeed) {
      const paperType = definition.paperNumber === 1 ? "paper_1" : "paper_2";
      const status = definition.paperNumber === 1 ? paper1Status : paper2Status;
      const [paper] = await tx.insert(papers).values({
        subjectId: subject.id,
        paperType,
        title: definition.name,
        status,
      }).onConflictDoUpdate({
        target: [papers.subjectId, papers.paperType],
        set: { title: definition.name, status, updatedAt: new Date() },
      }).returning({ id: papers.id });
      const [version] = await tx.insert(paperVersions).values({
        paperId: paper.id,
        syllabusVersionId: syllabus.id,
        blueprintId: definition.id,
        blueprintVersion: 1,
        version: 1,
        durationSeconds: definition.durationSeconds,
        totalMarks: definition.totalMarks,
        questionCount: definition.questionCount,
        status,
        publishedAt: status === "published" ? new Date() : null,
      }).onConflictDoUpdate({
        target: [paperVersions.blueprintId, paperVersions.blueprintVersion],
        set: {
          durationSeconds: definition.durationSeconds,
          totalMarks: definition.totalMarks,
          questionCount: definition.questionCount,
          status,
          publishedAt: status === "published" ? new Date() : null,
          updatedAt: new Date(),
        },
      }).returning({ id: paperVersions.id });
      versionIds.set(definition.paperNumber, version.id);
    }

    for (const item of paper1QuestionSeed) {
      const difficulty = item.difficulty as "easy" | "medium" | "hard";
      const [question] = await tx.insert(questions).values({
        externalId: item.externalId,
        paperVersionId: versionIds.get(1)!,
        questionNumber: item.number,
        moduleNumber: item.module,
        objectiveCode: item.objective,
        assessmentProfile: profileMap[item.profile as keyof typeof profileMap],
        difficulty,
        type: "multiple_choice",
        promptJson: { text: item.prompt, visual: item.visualSpec },
        totalMarks: 1,
        status: paper1Status,
        provenanceJson: { source: "demo", reviewStatus: item.publicationStatus },
      }).onConflictDoUpdate({
        target: questions.externalId,
        set: {
          objectiveCode: item.objective,
          assessmentProfile: profileMap[item.profile as keyof typeof profileMap],
          difficulty,
          promptJson: { text: item.prompt, visual: item.visualSpec },
          status: paper1Status,
          updatedAt: new Date(),
        },
      }).returning({ id: questions.id });

      for (const [index, content] of item.options.entries()) {
        const label = optionLabels[index];
        await tx.insert(questionOptions).values({
          questionId: question.id,
          label,
          contentJson: { text: content },
          sortOrder: index + 1,
          isCorrect: label === item.correctAnswer,
        }).onConflictDoUpdate({
          target: [questionOptions.questionId, questionOptions.label],
          set: { contentJson: { text: content }, sortOrder: index + 1, isCorrect: label === item.correctAnswer },
        });
      }
      await tx.insert(questionTopics).values({ questionId: question.id, topicId: topicIds.get(item.topic)!, weight: "1" })
        .onConflictDoUpdate({ target: [questionTopics.questionId, questionTopics.topicId], set: { weight: "1" } });
      await tx.insert(markSchemes).values({
        questionId: question.id,
        schemeJson: { kind: "exact_option", correctOption: item.correctAnswer },
        maxMarks: 1,
        version: 1,
      }).onConflictDoUpdate({
        target: [markSchemes.questionId, markSchemes.version],
        set: { schemeJson: { kind: "exact_option", correctOption: item.correctAnswer }, maxMarks: 1, updatedAt: new Date() },
      });
    }

    for (const item of paper2QuestionSeed) {
      const assignedTopics = paper2TopicNames[item.externalId];
      const [question] = await tx.insert(questions).values({
        externalId: item.externalId,
        paperVersionId: versionIds.get(2)!,
        questionNumber: item.number,
        moduleNumber: item.module,
        objectiveCode: `M${item.module}-INTEGRATED-Q${item.number}`,
        assessmentProfile: paper2Profiles[item.externalId],
        difficulty: paper2Profiles[item.externalId] === "reasoning" ? "hard" : "medium",
        type: "structured",
        promptJson: { internalTitle: item.internalTitle },
        totalMarks: item.marks,
        status: paper2Status,
        provenanceJson: { source: "demo", reviewStatus: item.publicationStatus },
      }).onConflictDoUpdate({
        target: questions.externalId,
        set: {
          objectiveCode: `M${item.module}-INTEGRATED-Q${item.number}`,
          assessmentProfile: paper2Profiles[item.externalId],
          difficulty: paper2Profiles[item.externalId] === "reasoning" ? "hard" : "medium",
          promptJson: { internalTitle: item.internalTitle },
          totalMarks: item.marks,
          status: paper2Status,
          updatedAt: new Date(),
        },
      }).returning({ id: questions.id });

      for (const topicName of assignedTopics) {
        await tx.insert(questionTopics).values({
          questionId: question.id,
          topicId: topicIds.get(topicName)!,
          weight: String(1 / assignedTopics.length),
        }).onConflictDoUpdate({ target: [questionTopics.questionId, questionTopics.topicId], set: { weight: String(1 / assignedTopics.length) } });
      }

      for (const part of item.parts) {
        const responseType = part.responseType === "graph" ? "graph" : part.responseType === "short" ? "short_text" : "working_lines";
        const [partRow] = await tx.insert(questionParts).values({
          externalId: `${item.externalId}-${part.externalId}`,
          questionId: question.id,
          label: part.label,
          promptJson: { text: part.prompt, visual: part.visualSpec },
          responseType,
          marks: part.marks,
          sortOrder: part.position,
        }).onConflictDoUpdate({
          target: questionParts.externalId,
          set: { promptJson: { text: part.prompt, visual: part.visualSpec }, responseType, marks: part.marks, sortOrder: part.position, updatedAt: new Date() },
        }).returning({ id: questionParts.id });

        const partTopics = paper2PartTopicNames[part.externalId];
        for (const topicName of partTopics) {
          await tx.insert(questionPartTopics).values({
            questionPartId: partRow.id,
            topicId: topicIds.get(topicName)!,
            weight: String(1 / partTopics.length),
          }).onConflictDoUpdate({ target: [questionPartTopics.questionPartId, questionPartTopics.topicId], set: { weight: String(1 / partTopics.length) } });
        }
        await tx.insert(markSchemes).values({
          questionPartId: partRow.id,
          schemeJson: { kind: "criteria_v1", ...paperTwoRubrics[part.externalId], humanReviewed: true },
          maxMarks: part.marks,
          version: 1,
        }).onConflictDoUpdate({
          target: [markSchemes.questionPartId, markSchemes.version],
          set: { schemeJson: { kind: "criteria_v1", ...paperTwoRubrics[part.externalId], humanReviewed: true }, maxMarks: part.marks, updatedAt: new Date() },
        });
      }
    }
  });

  console.log(`Seeded ${paper1QuestionSeed.length} Paper 1 and ${paper2QuestionSeed.length} Paper 2 questions.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDatabaseClient().end();
  });
