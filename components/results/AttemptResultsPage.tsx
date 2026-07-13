"use client";

import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clock3, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppSidebar from "@/components/AppSidebar";

type Report = {
  attempt: { id: string; displayCode: string; state: "queued" | "marking" | "failed" | "marked" | "not_submitted"; subjectName: string; paperTitle: string; submittedAt: string | null };
  result: null | { rawScore: number; maxScore: number; percentage: number; questionsCompleted: number; totalQuestions: number; timeUsedSeconds: number };
  examinerSummary: null | { summary: string; strengths: string[]; misconceptions: string[]; timeObservation: string | null; patterns: string[]; nextSteps: string[] };
  failure: null | { message: string; reference: string };
  questions: Array<{ id: string; position: number; awardedMarks: number; maxMarks: number; isCorrect: boolean; feedback: string | null; snapshot: any; response: { selectedOptionId: string | null; value: unknown }; correctOptionId: string | null }>;
};

const destinations: Record<string, string> = { landing: "/", practice: "/practice", progress: "/progress", settings: "/settings" };

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function text(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
  return "";
}

function optionDetails(snapshot: any, optionId: string | null) {
  const option = Array.isArray(snapshot?.options) ? snapshot.options.find((item: any) => item.id === optionId) : null;
  return option ? `${option.label}. ${text(option.content)}` : "No answer submitted";
}

function WorkingResponse({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return <span>No answer submitted</span>;
  const response = value as any;
  const lines = Array.isArray(response.workingLines) ? response.workingLines.filter(Boolean) : [];
  return <div className="review-working">
    {lines.map((line: string, index: number) => <span key={index}>{line}</span>)}
    {response.finalAnswer && <strong>Final answer: {response.finalAnswer}</strong>}
    {!lines.length && !response.finalAnswer && <span>Response recorded</span>}
  </div>;
}

export default function AttemptResultsPage({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/results/${attemptId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not load this report.");
      setReport(payload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this report.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!report || ["marked", "failed", "not_submitted"].includes(report.attempt.state)) return;
    const events = new EventSource(`/api/attempts/${attemptId}/events`);
    const refresh = () => void load();
    const refreshFromSnapshot = (event: MessageEvent) => {
      try {
        const snapshot = JSON.parse(event.data);
        if (snapshot.status && snapshot.status !== report.attempt.state) void load();
      } catch {}
    };
    events.addEventListener("snapshot", refreshFromSnapshot as EventListener);
    ["attempt/marked", "marked", "attempt/marking-failed", "marking_failed", "attempt/marking"].forEach((name) => events.addEventListener(name, refresh));
    return () => events.close();
  }, [attemptId, load, report?.attempt.state]);

  const summaryPoints = useMemo(() => report?.examinerSummary ? [
    ...report.examinerSummary.strengths.map((item) => `Strength: ${item}`),
    ...report.examinerSummary.misconceptions.map((item) => `Watch: ${item}`),
    ...report.examinerSummary.patterns,
    ...report.examinerSummary.nextSteps.map((item) => `Next: ${item}`),
  ] : [], [report]);
  const navigate = (screen: string) => router.push(destinations[screen] ?? "/");

  return <div className="app-shell"><AppSidebar active="practice" onNavigate={navigate}/><main className="app-main results-page dynamic-results">
    {loading && <StateCard icon={<LoaderCircle className="state-spin"/>} title="Loading your report" copy="Retrieving the latest marking status…"/>}
    {!loading && error && <StateCard icon={<AlertCircle/>} title="We could not open this report" copy={error}/>}
    {!loading && report && report.attempt.state !== "marked" && <PendingReport report={report}/>}
    {!loading && report?.attempt.state === "marked" && report.result && <>
      <header className="results-title"><div><p className="eyebrow">Attempt report · {report.attempt.displayCode}</p><h1>{report.attempt.paperTitle}</h1><p>Completed {report.attempt.submittedAt ? new Date(report.attempt.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}</p></div><img src="/assets/math-pal.png" alt="Mathematics companion"/></header>
      <section className="attempt-summary-card"><article><span>Score</span><strong>{report.result.rawScore} <small>/ {report.result.maxScore}</small></strong><em>{Math.round(report.result.percentage)}%</em></article><article><span>Questions completed</span><strong>{report.result.questionsCompleted} <small>/ {report.result.totalQuestions}</small></strong><em className={report.result.questionsCompleted === report.result.totalQuestions ? "positive" : ""}>{report.result.questionsCompleted === report.result.totalQuestions ? "Complete" : `${report.result.totalQuestions - report.result.questionsCompleted} unanswered`}</em></article><article><span>Time used</span><strong>{formatDuration(report.result.timeUsedSeconds)}</strong><em>Recorded at submission</em></article></section>
      <section className="examiner-summary detailed-summary"><img src="/assets/ai-marking.png" alt="Examiner notes"/><div><p className="eyebrow">Examiner summary</p>{report.examinerSummary ? <><h2>Your performance notes</h2><p>{report.examinerSummary.summary}</p>{report.examinerSummary.timeObservation && <p><strong>Time:</strong> {report.examinerSummary.timeObservation}</p>}{summaryPoints.length > 0 && <ul className="examiner-keynotes">{summaryPoints.map((point, index) => <li key={index}>{point}</li>)}</ul>}</> : <><h2>Your paper has been marked.</h2><p>Your score and question-by-question feedback are ready below. A personalised examiner summary has not been generated for this attempt.</p></>}</div></section>
      <section className="breakdown"><div className="breakdown-title"><h2>Question review</h2></div>{report.questions.map((question) => {
        const isOpen = open === question.id;
        const isMcq = Array.isArray(question.snapshot?.options) && question.snapshot.options.length > 0;
        return <article key={question.id} className={`breakdown-row paper1-review-row ${isOpen ? "expanded" : ""}`}><div className={`status-dot ${question.isCorrect ? "good" : "bad"}`}>{question.isCorrect ? "✓" : "×"}</div><b>Q{question.position}</b><span className="marks-total">{text(question.snapshot?.prompt) || `Question ${question.position}`}</span><strong>{question.awardedMarks} / {question.maxMarks}</strong><span>{question.isCorrect ? "Correct" : question.awardedMarks > 0 ? "Partly correct" : "Review"}</span><button onClick={() => setOpen(isOpen ? null : question.id)}>{isOpen ? "Hide details" : "Review"} {isOpen ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button>{isOpen && <div className="expanded-detail paper1-review-detail"><div className="answer-comparison"><p><span>Your answer</span><strong className={question.isCorrect ? "correct-answer" : "incorrect-answer"}>{isMcq ? optionDetails(question.snapshot, question.response.selectedOptionId) : <WorkingResponse value={question.response.value}/>}</strong></p>{isMcq && <p><span>Correct answer</span><strong className="correct-answer">{optionDetails(question.snapshot, question.correctOptionId)}</strong></p>}</div><div className="what-happened"><h3>Examiner note</h3><p>{question.feedback ?? "No additional note was recorded."}</p></div></div>}</article>;
      })}</section>
    </>}
  </main></div>;
}

function StateCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <section className="result-state-card"><div className="result-state-icon">{icon}</div><p className="eyebrow">Attempt report</p><h1>{title}</h1><p>{copy}</p></section>;
}

function PendingReport({ report }: { report: Report }) {
  if (report.attempt.state === "failed") return <StateCard icon={<AlertCircle/>} title="Marking is taking longer than expected" copy={report.failure?.message ?? "Your answers are safe. Please try again shortly."}/>;
  if (report.attempt.state === "not_submitted") return <StateCard icon={<Clock3/>} title="This paper has not been submitted" copy="Submit the paper before opening its report."/>;
  return <StateCard icon={report.attempt.state === "marking" ? <LoaderCircle className="state-spin"/> : <CheckCircle2/>} title={report.attempt.state === "marking" ? "Marking your paper" : "Your paper is in the marking queue"} copy="You can keep this page open. Your report will appear automatically when marking is complete."/>;
}
