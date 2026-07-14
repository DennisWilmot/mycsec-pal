'use client';

import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Calculator, Clock3, FileQuestion, Layers3, LoaderCircle, MonitorUp, PenLine, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AppSidebar from '../AppSidebar';

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (!hours) return `${minutes} minutes`;
  return `${hours} hour${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} minutes` : ''}`;
}

function attemptFromPayload(payload) {
  return payload?.data?.attempt || payload?.data || payload?.attempt || null;
}

export default function ExamBriefingPage({ navigate, paper, subjectSlug = 'mathematics', subjectName = 'Mathematics', variant = 'default' }) {
  const isPaperOne = paper === 1;
  const isEnglishPaperTwo = variant === 'english-paper-two';
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [error, setError] = useState('');
  const [planLimit, setPlanLimit] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/me/practice-dashboard', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message || 'Unable to load this paper.');
        if (alive) setDashboard(payload.data);
      })
      .catch((requestError) => alive && setError(requestError.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const subject = useMemo(() => dashboard?.subjects?.find((item) => item.slug === subjectSlug), [dashboard, subjectSlug]);
  const paperVersion = useMemo(() => subject?.papers?.find((item) => item.paperNumber === paper), [subject, paper]);
  const activeAttempt = dashboard?.activeAttempt;
  const matchesActiveAttempt = activeAttempt?.paperVersionId === paperVersion?.id;

  const resumePaper = async () => {
    if (!activeAttempt) return;
    setStarting(true);
    setError('');
    try {
      if (activeAttempt.status === 'paused') {
        const response = await fetch(`/api/attempts/${activeAttempt.id}/resume`, { method: 'POST' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error?.message || 'Unable to resume this paper.');
      }
      window.location.assign(`/practice/${activeAttempt.subjectSlug}/paper-${activeAttempt.paperNumber}?attemptId=${activeAttempt.id}`);
    } catch (requestError) {
      setError(requestError.message);
      setStarting(false);
    }
  };

  const startPaper = async () => {
    if (!paperVersion) return;
    setStarting(true);
    setError('');
    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${paperVersion.id}`;
      const response = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ paperVersionId: paperVersion.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429 && payload.error?.code === 'DAILY_ATTEMPT_LIMIT_REACHED') {
        setPlanLimit({ paperNumber: payload.error.details?.paperNumber || paper });
        setStarting(false);
        return;
      }
      if (!response.ok) throw new Error(payload.error?.message || 'Unable to start this paper.');
      const attempt = attemptFromPayload(payload);
      if (!attempt?.id) throw new Error('The paper was created, but its attempt ID was not returned.');
      window.location.assign(`/practice/${subjectSlug}/paper-${paper}?attemptId=${attempt.id}`);
    } catch (requestError) {
      setError(requestError.message);
      setStarting(false);
    }
  };

  const upgradePlan = async () => {
    setBillingBusy(true);
    setError('');
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.data?.url) throw new Error(payload.error?.message || 'Billing is not available right now.');
      window.location.assign(payload.data.url);
    } catch (requestError) {
      setError(requestError.message);
      setBillingBusy(false);
    }
  };

  return <div className="app-shell briefing-shell">
    <AppSidebar active="practice" onNavigate={navigate}/>
    <main className="app-main briefing-main">
      <button className="briefing-back" onClick={()=>navigate('practice')}><ArrowLeft size={17}/>Back to subjects</button>
      <section className="briefing-card briefing-card-shell">
        <div className="briefing-copy"><p className="eyebrow">Before you begin</p><h1>{subjectName} · Paper {paper}</h1>
          {loading && <div className="briefing-background-status" role="status"><LoaderCircle className="spin" size={15}/>Checking availability…</div>}
          <p className="briefing-lead">{isEnglishPaperTwo ? 'You’re about to begin the timed CSEC English A writing and summary paper.' : `You’re about to begin a timed CSEC-style ${isPaperOne?'multiple-choice paper':'structured-response paper'}.`}</p>
          {isEnglishPaperTwo ? <div className="briefing-facts english-paper-two-facts"><article><Clock3/><div><strong>{paperVersion ? formatDuration(paperVersion.durationSeconds) : '2 hours 45 minutes'}</strong><span>A visible timer will count down.</span></div></article><article><FileQuestion/><div><strong>Answer 6 questions</strong><span>Questions 1, 2, 3, 6 and 7 are compulsory. Answer either Question 4 or Question 5.</span></div></article><article><Layers3/><div><strong>3 modules · 120 marks</strong><span>Each module includes a 10-mark summary task and a 30-mark extended response.</span></div></article><article><BookOpen/><div><strong>Read, plan, then write</strong><span>Use the source passages, follow each audience and format, and observe the stated word limits.</span></div></article><article><MonitorUp/><div><strong>Stay in this tab</strong><span>Your responses save automatically while you work.</span></div></article></div> : <div className="briefing-facts"><article><Clock3/><div><strong>{paperVersion ? formatDuration(paperVersion.durationSeconds) : isPaperOne ? '60 minutes' : '2 hours 40 minutes'}</strong><span>A visible timer will count down.</span></div></article><article><FileQuestion/><div><strong>{paperVersion ? `${paperVersion.questionCount} questions` : isPaperOne ? '60 questions' : '9 questions'}</strong><span>{isPaperOne?'Choose one answer for each question.':'Show your working for method marks.'}</span></div></article><article><PenLine/><div><strong>Get pen and paper ready</strong><span>You may pause here before starting.</span></div></article><article><Calculator/><div><strong>{isPaperOne?'Calculator guidance':'Calculator permitted'}</strong><span>{isPaperOne?'Use one only when the question allows it.':'Keep it nearby for calculations.'}</span></div></article><article><MonitorUp/><div><strong>Stay in this tab</strong><span>Tab switches are noted to protect exam integrity.</span></div></article></div>}
          <div className="briefing-note"><strong>Good to know</strong><p>Your answers save automatically. You may pause the paper and return later.</p></div>
          {activeAttempt && <div className="briefing-api-notice"><AlertCircle size={18}/><span>{matchesActiveAttempt ? `Your ${activeAttempt.subjectName} Paper ${activeAttempt.paperNumber} is ready to resume.` : `You already have ${activeAttempt.subjectName} Paper ${activeAttempt.paperNumber} in progress. Resume or cancel it from Practice before starting another paper.`}</span></div>}
          {planLimit && <section className="briefing-upgrade-panel" aria-labelledby="plan-limit-title"><span className="upgrade-panel-icon"><Sparkles size={23}/></span><div><p className="eyebrow">Daily practice complete</p><h2 id="plan-limit-title">You’ve used today’s Paper {planLimit.paperNumber} attempt.</h2><p>Come back tomorrow for another free attempt, or upgrade to Practice for unlimited Paper 1 and Paper 2 attempts across five subjects.</p><div className="upgrade-panel-actions"><button className="button dark" disabled={billingBusy} onClick={upgradePlan}>{billingBusy ? 'Opening secure checkout…' : 'Upgrade to Practice'}</button><button className="button outline" onClick={()=>navigate('practice')}>Back to subjects</button></div></div></section>}
          {error && <div className="briefing-api-notice error" role="alert"><AlertCircle size={18}/><span>{error}</span></div>}
        </div>
        <img src={`/assets/subjects/${subjectSlug}.png`} alt={`${subjectName} study illustration`}/>
        <footer className="briefing-card-actions"><span>{planLimit ? 'Your free allowance resets tomorrow.' : matchesActiveAttempt ? 'Continue from your last saved response.' : 'Make sure you are comfortable and ready before starting.'}</span>{planLimit ? <button className="button briefing-start" disabled={billingBusy} onClick={upgradePlan}>Upgrade to Practice <ArrowRight size={18}/></button> : activeAttempt && !matchesActiveAttempt ? <button className="button briefing-start" onClick={()=>navigate('practice')}>Return to Practice <ArrowRight size={18}/></button> : <button className="button briefing-start" disabled={loading || starting || !paperVersion} onClick={matchesActiveAttempt ? resumePaper : startPaper}>{starting ? (matchesActiveAttempt ? 'Resuming paper…' : 'Starting paper…') : (matchesActiveAttempt ? `Resume Paper ${paper}` : `Start Paper ${paper}`)} {!starting && <ArrowRight size={18}/>}</button>}</footer>
      </section>
    </main>
  </div>;
}
