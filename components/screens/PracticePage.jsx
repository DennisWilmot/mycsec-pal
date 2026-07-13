'use client';

import { AlertCircle, ArrowRight, PauseCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppSidebar from '../AppSidebar';

const subjectImages = {
  mathematics: 'mathematics.png',
  'english-a': 'english-a.png',
  chemistry: 'chemistry.png',
  physics: 'physics.png',
  biology: 'biology.png',
  'principles-of-accounts': 'principles-of-accounts.png',
  'principles-of-business': 'principles-of-business.png',
};

function paperRoute(subjectSlug, paperNumber, briefing = false) {
  const routeSlug = subjectSlug === 'csec-mathematics' ? 'mathematics' : subjectSlug;
  const base = `/practice/${routeSlug}/paper-${paperNumber}`;
  return briefing ? `${base}/briefing` : base;
}

function formatRemaining(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}:${String(minutes).padStart(2, '0')} remaining` : `${minutes} min remaining`;
}

async function transitionAttempt(attemptId, action) {
  const response = await fetch(`/api/attempts/${attemptId}/${action}`, { method: 'POST' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || `Unable to ${action} this paper.`);
  return payload.data;
}

let cachedPracticeDashboard = null;

export default function PracticePage({navigate}) {
  const [dashboard, setDashboard] = useState(cachedPracticeDashboard);
  const [loading, setLoading] = useState(!cachedPracticeDashboard);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingPaper, setPendingPaper] = useState(null);
  const [busyAction, setBusyAction] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/me/practice-dashboard', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          window.location.replace(`/onboarding?mode=signin&next=${encodeURIComponent('/practice')}`);
          return;
        }
        if (response.status === 404 && payload.error?.code === 'PROFILE_NOT_FOUND') {
          window.location.replace(`/onboarding?next=${encodeURIComponent('/practice')}`);
          return;
        }
        if (!response.ok) throw new Error(payload.error?.message || 'Unable to load your subjects.');
        if (alive) { cachedPracticeDashboard = payload.data; setDashboard(payload.data); }
      })
      .catch((requestError) => alive && setError(requestError.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const activeAttempt = dashboard?.activeAttempt;
  const openAttempt = (attempt = activeAttempt) => {
    if (!attempt) return;
    window.location.assign(`${paperRoute(attempt.subjectSlug, attempt.paperNumber)}?attemptId=${attempt.id}`);
  };

  const resumeAttempt = async () => {
    if (!activeAttempt) return;
    setActionError('');
    setBusyAction('resume');
    try {
      if (activeAttempt.status === 'paused') await transitionAttempt(activeAttempt.id, 'resume');
      openAttempt();
    } catch (requestError) {
      setActionError(requestError.message);
      setBusyAction('');
    }
  };

  const requestPaper = (subject, paper) => {
    setActionError('');
    const matchesActive = activeAttempt && activeAttempt.paperVersionId === paper.id;
    if (matchesActive) {
      resumeAttempt();
      return;
    }
    const selection = { subject, paper };
    if (activeAttempt) setPendingPaper(selection);
    else window.location.assign(paperRoute(subject.slug, paper.paperNumber, true));
  };

  const cancelAndContinue = async () => {
    if (!activeAttempt || !pendingPaper) return;
    setActionError('');
    setBusyAction('cancel');
    try {
      await transitionAttempt(activeAttempt.id, 'cancel');
      const selection = pendingPaper;
      setPendingPaper(null);
      window.location.assign(paperRoute(selection.subject.slug, selection.paper.paperNumber, true));
    } catch (requestError) {
      setActionError(requestError.message);
      setBusyAction('');
    }
  };

  return <div className="app-shell"><AppSidebar active="practice" onNavigate={navigate}/><main className="app-main"><div className="page-title-row"><div><p className="eyebrow">Pick up where you left off</p><h1>Practice</h1></div><img className="header-doodle" src="/assets/hero-pals.png" alt="Study companions"/></div>
    {actionError && <div className="practice-state-message error" role="alert"><AlertCircle size={18}/><span>{actionError}</span></div>}
    {loading && !dashboard && <section className="practice-loading-shell" aria-label="Loading Practice"><div className="resume-banner skeleton-resume"/><h2 className="section-title">Choose a subject to get started</h2><div className="practice-grid">{[1,2,3,4].map((item)=><div className="practice-card subject-art-card skeleton-card" key={item}><i/><b/><span/></div>)}</div></section>}
    {!dashboard && error && <div className="practice-state-message error" role="alert"><AlertCircle size={19}/><div><strong>We couldn’t load Practice.</strong><p>{error}</p><button className="button outline small" onClick={()=>window.location.reload()}>Try again</button></div></div>}
    {dashboard && activeAttempt && <section className="resume-banner active-attempt-banner"><div className="resume-icon"><PauseCircle size={23}/></div><div><span className="active-attempt-label">{activeAttempt.status === 'paused' ? 'Paused attempt' : 'Active attempt'} · {activeAttempt.displayCode}</span><h2>You have a paper in progress</h2><p>{activeAttempt.subjectName} Paper {activeAttempt.paperNumber} · {formatRemaining(activeAttempt.remainingSeconds)}</p></div><button className="button resume-primary" disabled={busyAction === 'resume'} onClick={resumeAttempt}>{busyAction === 'resume' ? 'Resuming…' : 'Resume paper'} <ArrowRight size={17}/></button></section>}
    {dashboard && <section><h2 className="section-title">Choose a subject to get started</h2>{dashboard.subjects.length === 0 ? <div className="practice-state-message"><span>No subjects are selected yet.</span><button className="button outline small" onClick={()=>navigate('settings')}>Choose subjects</button></div> : <div className="practice-grid">{dashboard.subjects.map((subject) => {
      const image = subject.cardAssetUrl || `/assets/subjects/${subjectImages[subject.slug] || 'mathematics.png'}`;
      return <article className={`practice-card subject-art-card ${subject.papers.length ? 'available' : ''}`} key={subject.id}><img className="subject-card-art" src={image} alt=""/><h3>{subject.name}</h3>{subject.papers.length ? <div className="practice-actions">{subject.papers.map((paper, index) => { const matchesActive = activeAttempt?.paperVersionId === paper.id; return <button key={paper.id} disabled={matchesActive && busyAction === 'resume'} onClick={()=>requestPaper(subject, paper)} className={`button ${index === 0 ? 'dark' : 'outline'}`}>{matchesActive ? (busyAction === 'resume' ? 'Resuming…' : `Resume Paper ${paper.paperNumber}`) : `Start Paper ${paper.paperNumber}`} {!matchesActive || busyAction !== 'resume' ? <ArrowRight size={16}/> : null}</button>; })}</div> : <span className="status-pill">Coming soon</span>}</article>;
    })}</div>}</section>}
  </main>{pendingPaper && <div className="modal-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="attempt-dialog-title"><button className="dialog-close" onClick={()=>setPendingPaper(null)} aria-label="Close dialog"><X size={18}/></button><span className="dialog-icon"><PauseCircle size={26}/></span><p className="eyebrow">One paper at a time</p><h2 id="attempt-dialog-title">You already have an active paper.</h2><p>Resume {activeAttempt.subjectName} Paper {activeAttempt.paperNumber}, or cancel it before starting {pendingPaper.subject.name} Paper {pendingPaper.paper.paperNumber}. Cancelling will end the current attempt.</p>{actionError && <p className="inline-api-error" role="alert">{actionError}</p>}<div className="dialog-actions two-dialog-actions"><button className="button resume-primary" disabled={Boolean(busyAction)} onClick={resumeAttempt}>Resume current paper</button><button className="button danger-button" disabled={Boolean(busyAction)} onClick={cancelAndContinue}>{busyAction === 'cancel' ? 'Cancelling…' : `Cancel attempt and start Paper ${pendingPaper.paper.paperNumber}`}</button></div></section></div>}
  </div>;
}
