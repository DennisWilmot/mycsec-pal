"use client";

import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clock3, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppSidebar from "@/components/AppSidebar";

type Report = {
  attempt: { id: string; displayCode: string; state: "queued" | "marking" | "failed" | "marked" | "not_submitted"; subjectName: string; paperTitle: string; submittedAt: string | null };
  result: null | { rawScore: number; maxScore: number; percentage: number; questionsCompleted: number; totalQuestions: number; timeUsedSeconds: number };
  examinerSummary: null | { summary: string; findings: Array<{ heading: string; insight: string; evidence: string[]; action: string | null }>; strengths: string[]; misconceptions: string[]; timeObservation: string | null; patterns: string[]; nextSteps: string[] };
  failure: null | { message: string; reference: string };
  questions: Array<{ id: string; position: number; awardedMarks: number; maxMarks: number; isCorrect: boolean; feedback: string | null; markingEvidence: any; snapshot: any; response: { selectedOptionId: string | null; value: unknown }; correctOptionId: string | null }>;
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

function WorkingResponse({ value, snapshot }: { value: unknown; snapshot: any }) {
  if (!value || typeof value !== "object") return <span>No answer submitted</span>;
  const response = value as any;
  if (response.parts && typeof response.parts === "object") return <div className="review-working">{Object.entries(response.parts).map(([partId, part]: [string, any], index) => {
    const definition = Array.isArray(snapshot?.parts) ? snapshot.parts.find((item: any) => item.id === partId) : null;
    const partLines = Array.isArray(part?.workingLines) ? part.workingLines.filter(Boolean) : [];
    return <section className="review-part" key={partId}><strong>Part {definition?.label ?? index + 1}</strong><div>{partLines.map((line: string, lineIndex: number) => <span key={lineIndex}>{line}</span>)}{Array.isArray(part?.graphPoints) && part.graphPoints.length > 0 && <span>{part.graphPoints.length} plotted points recorded</span>}{!partLines.length && !part?.graphPoints?.length && <em>No response</em>}</div></section>;
  })}</div>;
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
  const [retrying, setRetrying] = useState(false);

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

  const retryMarking = useCallback(async () => {
    setRetrying(true);
    setError("");
    try {
      const response = await fetch(`/api/attempts/${attemptId}/retry-marking`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not retry marking.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not retry marking.");
    } finally {
      setRetrying(false);
    }
  }, [attemptId, load]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!report || ["marked", "failed", "not_submitted"].includes(report.attempt.state)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const interval = report.attempt.state === "marking" ? 5_000 : 10_000;
    const schedule = () => { timer = setTimeout(poll, interval); };
    const poll = async () => {
      if (cancelled) return;
      if (!document.hidden) await load();
      if (!cancelled) schedule();
    };
    const onVisibility = () => { if (!document.hidden) void load(); };
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [attemptId, load, report]);

  const navigate = (screen: string) => router.push(destinations[screen] ?? "/");

  return <div className="app-shell"><AppSidebar active="practice" onNavigate={navigate}/><main className="app-main results-page dynamic-results">
    {loading && <StateCard icon={<LoaderCircle className="state-spin"/>} title="Loading your report" copy="Retrieving the latest marking status…"/>}
    {!loading && error && <StateCard icon={<AlertCircle/>} title="We could not open this report" copy={error}/>}
    {!loading && !error && report && report.attempt.state !== "marked" && <PendingReport report={report} retrying={retrying} onRetry={retryMarking}/>}
    {!loading && report?.attempt.state === "marked" && report.result && <>
      <header className="results-title"><div><p className="eyebrow">Attempt report · {report.attempt.displayCode}</p><h1>{report.attempt.paperTitle}</h1><p>Completed {report.attempt.submittedAt ? new Date(report.attempt.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}</p></div><img src="/assets/math-pal.png" alt="Mathematics companion"/></header>
      <section className="attempt-summary-card"><article><span>Score</span><strong>{report.result.rawScore} <small>/ {report.result.maxScore}</small></strong><em>{Math.round(report.result.percentage)}%</em></article><article><span>Questions completed</span><strong>{report.result.questionsCompleted} <small>/ {report.result.totalQuestions}</small></strong><em className={report.result.questionsCompleted === report.result.totalQuestions ? "positive" : ""}>{report.result.questionsCompleted === report.result.totalQuestions ? "Complete" : `${report.result.totalQuestions - report.result.questionsCompleted} unanswered`}</em></article><article><span>Time used</span><strong>{formatDuration(report.result.timeUsedSeconds)}</strong><em>Recorded at submission</em></article></section>
      <section className="examiner-summary detailed-summary"><img src="/assets/ai-marking.png" alt="Examiner notes"/><div><p className="eyebrow">Examiner summary</p>{report.examinerSummary ? <><h2>What this attempt shows</h2><p className="summary-narrative">{report.examinerSummary.summary}</p>{report.examinerSummary.timeObservation && <p className="summary-time"><Clock3 size={16}/><span>{report.examinerSummary.timeObservation}</span></p>}{report.examinerSummary.findings.length ? <div className="dynamic-findings">{report.examinerSummary.findings.map((finding,index)=><article key={`${finding.heading}-${index}`}><span>{String(index+1).padStart(2,"0")}</span><div><h3>{finding.heading}</h3><p>{finding.insight}</p><ul>{finding.evidence.map((item,evidenceIndex)=><li key={evidenceIndex}>{item}</li>)}</ul>{finding.action&&<p className="finding-action"><strong>Next move</strong>{finding.action}</p>}</div></article>)}</div> : <div className="summary-insights"><InsightGroup title="What is working" items={report.examinerSummary.strengths}/><InsightGroup title="Ideas to rebuild" items={report.examinerSummary.misconceptions}/><InsightGroup title="Patterns across the paper" items={report.examinerSummary.patterns}/><InsightGroup title="Your next practice" items={report.examinerSummary.nextSteps}/></div>}</> : <><h2>Your paper has been marked.</h2><p>Your score and question-by-question feedback are ready below. A personalised examiner summary has not been generated for this attempt.</p></>}</div></section>
      <section className="breakdown"><div className="breakdown-title"><h2>Question review</h2></div>{report.questions.map((question) => {
        const isOpen = open === question.id;
        const isMcq = Array.isArray(question.snapshot?.options) && question.snapshot.options.length > 0;
        return <article key={question.id} className={`breakdown-row paper1-review-row ${isOpen ? "expanded" : ""}`}><div className={`status-dot ${question.isCorrect ? "good" : "bad"}`}>{question.isCorrect ? "✓" : "×"}</div><b>Q{question.position}</b><span className="marks-total">{text(question.snapshot?.prompt) || `Question ${question.position}`}</span><strong>{question.awardedMarks} / {question.maxMarks}</strong><span>{question.isCorrect ? "Correct" : question.awardedMarks > 0 ? "Partly correct" : "Review"}</span><button onClick={() => setOpen(isOpen ? null : question.id)}>{isOpen ? "Hide details" : "Review"} {isOpen ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button>{isOpen && <div className="expanded-detail paper1-review-detail"><div className="answer-comparison"><p><span>Your answer</span><strong className={question.isCorrect ? "correct-answer" : "incorrect-answer"}>{isMcq ? optionDetails(question.snapshot, question.response.selectedOptionId) : <WorkingResponse value={question.response.value} snapshot={question.snapshot}/>}</strong></p>{isMcq && <p><span>Correct answer</span><strong className="correct-answer">{optionDetails(question.snapshot, question.correctOptionId)}</strong></p>}</div><div className="what-happened"><h3>Examiner note</h3><p>{question.feedback ?? "No additional note was recorded."}</p></div></div>}</article>;
      })}</section>
    </>}
  </main></div>;
}

function InsightGroup({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <section><h3>{title}</h3><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></section>;
}

function StateCard({ icon, title, copy, children }: { icon: React.ReactNode; title: string; copy: string; children?: React.ReactNode }) {
  return <section className="result-state-card"><div className="result-state-icon">{icon}</div><p className="eyebrow">Attempt report</p><h1>{title}</h1><p>{copy}</p>{children}</section>;
}

function PendingReport({ report, retrying, onRetry }: { report: Report; retrying: boolean; onRetry: () => Promise<void> }) {
  if (report.attempt.state === "failed") return <StateCard icon={<AlertCircle/>} title="Marking is taking longer than expected" copy={report.failure?.message ?? "Your answers are safe. Please try again shortly."}><button className="button dark" type="button" disabled={retrying} onClick={() => void onRetry()}>{retrying ? "Retrying…" : "Retry marking"}</button></StateCard>;
  if (report.attempt.state === "not_submitted") return <StateCard icon={<Clock3/>} title="This paper has not been submitted" copy="Submit the paper before opening its report."/>;
  return <StateCard icon={report.attempt.state === "marking" ? <LoaderCircle className="state-spin"/> : <CheckCircle2/>} title={report.attempt.state === "marking" ? "Marking your paper" : "Your paper is in the marking queue"} copy="You can keep this page open. Your report will appear automatically when marking is complete."/>;
}
