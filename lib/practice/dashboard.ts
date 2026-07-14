import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  attempts,
  papers,
  paperVersions,
  profileSubjects,
  profiles,
  subjects,
} from "@/drizzle/schema";
import { getDatabase } from "@/lib/db";
import { getActiveAttempt } from "@/lib/attempts/service";

const VISIBLE_SUBJECT_STATUSES = ["review", "approved", "published"] as const;

export async function readPracticeDashboard(profileId: string) {
  const db = getDatabase();
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  if (!profile) return null;

  const subjectRows = await db
    .select({
      id: subjects.id,
      slug: subjects.slug,
      name: subjects.name,
      cardAssetUrl: subjects.cardAssetUrl,
      sortOrder: profileSubjects.sortOrder,
    })
    .from(profileSubjects)
    .innerJoin(subjects, eq(profileSubjects.subjectId, subjects.id))
    .where(
      and(
        eq(profileSubjects.profileId, profileId),
        eq(profileSubjects.isActive, true),
        inArray(subjects.status, VISIBLE_SUBJECT_STATUSES),
      ),
    )
    .orderBy(asc(profileSubjects.sortOrder), asc(subjects.sortOrder));

  const subjectIds = subjectRows.map((subject) => subject.id);
  const availablePapers = subjectIds.length
    ? await db
        .select({
          subjectId: papers.subjectId,
          paperVersionId: paperVersions.id,
          paperType: papers.paperType,
          title: papers.title,
          durationSeconds: paperVersions.durationSeconds,
          questionCount: paperVersions.questionCount,
          totalMarks: paperVersions.totalMarks,
          version: paperVersions.version,
          status: paperVersions.status,
        })
        .from(paperVersions)
        .innerJoin(papers, eq(paperVersions.paperId, papers.id))
        .where(
          and(
            inArray(papers.subjectId, subjectIds),
            eq(papers.status, "published"),
            eq(paperVersions.status, "published"),
          ),
        )
        .orderBy(asc(papers.paperType), desc(paperVersions.version))
    : [];

  // If multiple versions are available, expose only the newest version of each paper.
  const paperBySubjectAndType = new Map<string, (typeof availablePapers)[number]>();
  for (const paper of availablePapers) {
    const key = `${paper.subjectId}:${paper.paperType}`;
    if (!paperBySubjectAndType.has(key)) paperBySubjectAndType.set(key, paper);
  }

  // This service also atomically expires a timed-out attempt before we render it.
  const activeAttempt = await getActiveAttempt(profileId);
  const [activeRow] = activeAttempt ? await db
    .select({
      id: attempts.id,
      displayCode: attempts.displayCode,
      status: attempts.status,
      expiresAt: attempts.expiresAt,
      elapsedSeconds: attempts.elapsedSeconds,
      remainingSecondsAtPause: attempts.remainingSecondsAtPause,
      paperVersionId: attempts.paperVersionId,
      paperType: papers.paperType,
      paperTitle: papers.title,
      subjectId: subjects.id,
      subjectSlug: subjects.slug,
      subjectName: subjects.name,
    })
    .from(attempts)
    .innerJoin(paperVersions, eq(attempts.paperVersionId, paperVersions.id))
    .innerJoin(papers, eq(paperVersions.paperId, papers.id))
    .innerJoin(subjects, eq(papers.subjectId, subjects.id))
    .where(
      and(
        eq(attempts.profileId, profileId),
        eq(attempts.id, activeAttempt.id),
      ),
    )
    .orderBy(desc(attempts.lastActivityAt))
    .limit(1) : [];

  return {
    subjects: subjectRows.map((subject) => ({
      id: subject.id,
      slug: subject.slug,
      name: subject.name,
      cardAssetUrl: subject.cardAssetUrl,
      papers: Array.from(paperBySubjectAndType.values())
        .filter((paper) => paper.subjectId === subject.id)
        .map((paper) => ({
          id: paper.paperVersionId,
          paperNumber: paper.paperType === "paper_1" ? 1 : 2,
          title: paper.title,
          durationSeconds: paper.durationSeconds,
          questionCount: paper.questionCount,
          totalMarks: paper.totalMarks,
          version: paper.version,
        }))
        .sort((a, b) => a.paperNumber - b.paperNumber),
    })),
    activeAttempt: activeRow
      ? {
          id: activeRow.id,
          displayCode: activeRow.displayCode,
          status: activeRow.status,
          paperVersionId: activeRow.paperVersionId,
          paperNumber: activeRow.paperType === "paper_1" ? 1 : 2,
          paperTitle: activeRow.paperTitle,
          subjectId: activeRow.subjectId,
          subjectSlug: activeRow.subjectSlug,
          subjectName: activeRow.subjectName,
          elapsedSeconds: activeRow.elapsedSeconds,
          remainingSeconds: activeAttempt?.remainingSeconds ?? 0,
        }
      : null,
  };
}
