import { and, asc, desc, eq } from 'drizzle-orm';
import { getDatabase, getDatabaseClient } from '../lib/db/index.ts';
import schemaModule from '../drizzle/schema/index.ts';

const { paperBlueprintSlots, papers, paperVersions, questions, subjects } = schemaModule;

const db = getDatabase();
try {
  await db.transaction(async (tx) => {
    const [latest] = await tx.select({ id: paperVersions.id }).from(paperVersions)
      .innerJoin(papers, eq(papers.id, paperVersions.paperId))
      .innerJoin(subjects, eq(subjects.id, papers.subjectId))
      .where(and(eq(subjects.slug, 'english-a'), eq(papers.paperType, 'paper_2'), eq(paperVersions.status, 'published')))
      .orderBy(desc(paperVersions.version)).limit(1);
    if (!latest) throw new Error('Published English Paper 2 version not found.');
    const source = await tx.select().from(questions)
      .where(and(eq(questions.paperVersionId, latest.id), eq(questions.status, 'published')))
      .orderBy(asc(questions.questionNumber));
    if (source.length !== 6) throw new Error(`Expected six English Paper 2 route questions; received ${source.length}.`);
    await tx.delete(paperBlueprintSlots).where(eq(paperBlueprintSlots.paperVersionId, latest.id));
    await tx.insert(paperBlueprintSlots).values(source.map((question, index) => ({
      paperVersionId: latest.id, position: index + 1, moduleNumber: question.moduleNumber,
      assessmentProfile: question.assessmentProfile, difficulty: question.difficulty,
      questionType: question.type, marks: question.totalMarks,
    })));
  });
  console.log(JSON.stringify({ updated: true, subject: 'english-a', paper: 2, spineSlots: 6 }));
} finally {
  await getDatabaseClient().end();
}
