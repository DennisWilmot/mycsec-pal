'use client';

import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Flag, Pause, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppSidebar from '../AppSidebar';
import InteractiveGraphResponse from '../InteractiveGraphResponse';
import MathWorkingField from '../MathWorkingField';
import QuestionVisual from '../QuestionVisual';
import { mathPaper2Demo } from '../../data/math-paper-2-demo';
import { useAttemptSession } from '../../lib/attempts/use-attempt-session';
import { useAttemptCountdown } from '../../lib/attempts/use-attempt-countdown';

function EnglishQuestionContext({ context, selectedChoiceId, onSelectChoice }) {
  if (!context || typeof context !== 'object') return null;
  const choices = Array.isArray(context.choices) ? context.choices : [];
  if (!context.extract && !context.purposePrompt && !context.scenario && !context.task && !choices.length) return null;
  return <section className="english-question-context">
    {context.title && context.extract && <h3>{context.title}</h3>}
    {context.extract && <div className="english-exam-passage">{String(context.extract).split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
    {context.scenario && <div className="english-writing-scenario"><strong>Scenario</strong><p>{context.scenario}</p></div>}
    {context.task && !choices.length && <div className="english-context-question"><strong>Writing task</strong><p>{context.task}</p></div>}
    {choices.length > 0 && <div className="english-writing-choices">{choices.map((choice, index) => choices.length > 1 ? <button type="button" className={String(selectedChoiceId) === String(choice.number) ? 'selected' : ''} onClick={() => onSelectChoice(String(choice.number))} key={choice.number || index}><span>Question {choice.number || index + 1}</span>{choice.scenario && <p>{choice.scenario}</p>}<strong>{choice.task}</strong><em>{String(selectedChoiceId) === String(choice.number) ? 'Selected' : 'Choose this prompt'}</em></button> : <article key={choice.number || index}><span>Writing task</span>{choice.scenario && <p>{choice.scenario}</p>}<strong>{choice.task}</strong></article>)}</div>}
  </section>;
}

function EnglishSummaryResponse({ purposePrompt, summaryPrompt, value, onChange, inputGuards }) {
  const purpose = value[0] || '';
  const summary = value.slice(1).join('\n');
  const words = summary.trim() ? summary.trim().split(/\s+/).length : 0;
  return <div className="english-summary-response">
    <label><span>Part A response</span><small>{purposePrompt}</small><input {...inputGuards} value={purpose} onChange={(event) => onChange([event.target.value, summary])} placeholder="State the writer’s purpose or describe the setting…" /></label>
    <label><span>Part B response</span><small>{summaryPrompt}</small><textarea {...inputGuards} value={summary} onChange={(event) => onChange([purpose, event.target.value])} rows={12} placeholder="Write your summary here…" /></label>
    <p className={words > 50 ? 'over' : ''}>{words} / 50 words in your summary</p>
  </div>;
}

export default function Paper2Page({ navigate, subjectName = 'Mathematics' }) {
  const [attemptId, setAttemptId] = useState(null);
  useEffect(() => setAttemptId(new URLSearchParams(window.location.search).get('attemptId')), []);
  const { session, loading, error, saveResponse, setFlag, pause, submit, syncState, queuedCount } = useAttemptSession(attemptId);
  const seconds = useAttemptCountdown(session?.attempt, mathPaper2Demo.durationSeconds);
  const [responses, setResponses] = useState({});
  const [current, setCurrent] = useState(1);
  const [submitNotice, setSubmitNotice] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [graphResponses, setGraphResponses] = useState({});
  const [selectedChoices, setSelectedChoices] = useState({});
  const [pasteNotice, setPasteNotice] = useState('');
  const saveTimers = useRef(new Map());
  const pendingSaves = useRef(new Map());
  const hydratedAttemptId = useRef(null);
  const liveQuestions = (session?.questions || []).map((item) => ({
    id: item.id,
    number: item.position,
    displayNumber: item.snapshot?.questionNumber || item.position,
    marks: item.maxMarks,
    flagged: Boolean(item.response?.isFlagged),
    context: item.snapshot?.prompt || null,
    parts: (item.snapshot?.parts || []).map((part) => ({
      id: part.id,
      label: part.label,
      prompt: part.prompt?.text || '',
      visual: part.prompt?.visual || null,
      responseType: part.responseType === 'graph' ? 'graph' : part.responseType === 'short_text' ? 'short' : part.responseType === 'long_text' ? 'long' : 'working',
      marks: part.marks,
    })),
  }));
  const questions = attemptId ? liveQuestions : mathPaper2Demo.questions;
  const question = questions[current - 1];
  const resolvedSubjectName = session?.attempt?.subjectName || subjectName;
  const isEnglish = resolvedSubjectName.toLowerCase().includes('english');
  const blockExternalText = (event) => {
    event.preventDefault();
    setPasteNotice('Pasting or dropping text is disabled for Paper 2 responses. Type your answer directly.');
  };
  const responseInputGuards = isEnglish ? {
    onPaste: blockExternalText,
    onDrop: blockExternalText,
    onBeforeInput: (event) => {
      const inputType = event.nativeEvent?.inputType;
      if (inputType === 'insertFromPaste' || inputType === 'insertFromDrop') blockExternalText(event);
    },
  } : {};

  useEffect(() => {
    if (!session) return;
    const nextAttemptId = session.attempt?.id || attemptId;
    // Autosaves update the shared session object. Rehydrating the controlled
    // inputs after each save resets their values and can move the caret.
    if (hydratedAttemptId.current === nextAttemptId) return;
    hydratedAttemptId.current = nextAttemptId;
    const savedLines = {};
    const savedGraphs = {};
    const savedChoices = {};
    session.questions.forEach((item) => {
      const parts = item.response?.response?.parts || {};
      Object.entries(parts).forEach(([partId, value]) => {
        savedLines[partId] = value.workingLines || (value.finalAnswer ? [value.finalAnswer] : []);
        savedGraphs[partId] = value.graphPoints || [];
        if (value.selectedChoiceId) savedChoices[item.id] = value.selectedChoiceId;
      });
    });
    setResponses(savedLines);
    setGraphResponses(savedGraphs);
    setSelectedChoices(savedChoices);
  }, [attemptId, session]);
  useEffect(() => {
    if (attemptId && ['submitted', 'marking', 'marked', 'marking_failed'].includes(session?.attempt?.status)) {
      window.location.assign(`/results/${attemptId}`);
    }
  }, [attemptId, session?.attempt?.status]);

  const format = (value) => `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value % 3600 / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const persistQuestion = (questionId, nextResponses, nextGraphs, nextChoices = selectedChoices) => {
    if (!attemptId) return;
    window.clearTimeout(saveTimers.current.get(questionId));
    const persist = () => {
      const target = questions.find((item) => item.id === questionId);
      const parts = Object.fromEntries(target.parts.map((part) => [part.id, {
        workingLines: nextResponses[part.id] || [],
        graphPoints: nextGraphs[part.id] || [],
        selectedChoiceId: nextChoices[questionId] || undefined,
      }]));
      pendingSaves.current.delete(questionId);
      return saveResponse(questionId, { response: { parts } }).catch(() => {});
    };
    pendingSaves.current.set(questionId, persist);
    saveTimers.current.set(questionId, window.setTimeout(persist, 700));
  };
  const setResponse = (partId, value) => setResponses((saved) => {
    const next = { ...saved, [partId]: value };
    persistQuestion(question.id, next, graphResponses);
    return next;
  });
  const setGraphResponse = (partId, points) => setGraphResponses((saved) => {
    const next = { ...saved, [partId]: points };
    persistQuestion(question.id, responses, next);
    return next;
  });
  const setSelectedChoice = (questionId, choiceId) => setSelectedChoices((saved) => {
    const next = { ...saved, [questionId]: choiceId };
    persistQuestion(questionId, responses, graphResponses, next);
    return next;
  });
  const hasResponse = (partId) => (responses[partId] || []).some((line) => line.trim()) || (graphResponses[partId] || []).length > 0;
  const answeredQuestions = questions.filter((item) => item.parts.some((itemPart) => hasResponse(itemPart.id))).length;
  const incompleteQuestions = questions.filter((item) => item.parts.some((itemPart) => !hasResponse(itemPart.id)) || ((item.context?.choices?.length || 0) > 1 && !selectedChoices[item.id]));
  const flushPendingSaves = useCallback(async () => {
    for (const [questionId, persist] of Array.from(pendingSaves.current.entries())) {
      window.clearTimeout(saveTimers.current.get(questionId));
      await persist();
    }
  }, []);
  useEffect(() => {
    if (!attemptId) return undefined;
    const flushWhenHidden = () => { if (document.hidden) void flushPendingSaves(); };
    const flushWhenLeaving = () => { void flushPendingSaves(); };
    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('pagehide', flushWhenLeaving);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      window.removeEventListener('pagehide', flushWhenLeaving);
    };
  }, [attemptId, flushPendingSaves]);
  const pausePaper = async () => { if (attemptId) { try { await flushPendingSaves(); await pause(); } catch { return; } } navigate('practice'); };
  const submitPaper = async () => {
    if (!attemptId) { setShowSubmit(false); setSubmitNotice(true); return; }
    setSubmitting(true);
    try {
      await flushPendingSaves();
      await submit();
      window.location.assign(`/results/${attemptId}`);
    } catch {
      setSubmitting(false);
    }
  };
  const toggleFlag = async () => { if (!attemptId) return; try { await setFlag(question.id, !question.flagged); } catch {} };

  if (attemptId && loading) return <div className="app-shell exam-shell"><AppSidebar active="practice" onNavigate={navigate} /><main className="app-main paper2-workspace"><p>Loading your paper…</p></main></div>;
  if (attemptId && (error && !session || !question)) return <div className="app-shell exam-shell"><AppSidebar active="practice" onNavigate={navigate} /><main className="app-main paper2-workspace"><div className="integrity-note">{error || 'This paper has no questions available.'}</div><button className="button outline" onClick={() => navigate('practice')}>Back to practice</button></main></div>;

  return <div className="app-shell exam-shell">
    <AppSidebar active="practice" onNavigate={navigate} />
    <main className={`app-main paper2-workspace ${isEnglish ? 'english-paper2-workspace' : ''}`}>
      <header className="exam-workspace-header simplified-exam-header">
        <div><p className="eyebrow">CSEC practice paper</p><h1>{resolvedSubjectName} · Paper 2</h1></div>
        <div className="exam-workspace-controls">{attemptId && <span className={`answer-sync-state ${syncState}`} role="status">{syncState === 'offline' ? `${queuedCount} change${queuedCount === 1 ? '' : 's'} saved on this device` : syncState === 'saving' ? 'Saving…' : 'Saved'}</span>}<div className="compact-status exam-clock"><Clock size={18} /><span><strong>{format(seconds)}</strong><small>Time remaining</small></span></div><button className="icon-action" onClick={pausePaper} title="Pause paper" aria-label="Pause paper"><Pause size={18} /></button></div>
      </header>
      {error && <div className="integrity-note">{error}</div>}
      {pasteNotice && <div className="integrity-note paste-blocked-notice" role="alert">{pasteNotice}</div>}
      <div className="paper2-layout symmetric-paper2-layout">
        <aside className="question-sidebar symmetric-question-sidebar" aria-label="Paper questions">
          <div className="paper2-sidebar-progress"><strong>{answeredQuestions}/{questions.length}</strong><span>questions started</span></div>
          {questions.map((item) => {
            const started = item.parts.some((itemPart) => hasResponse(itemPart.id));
            const label = (item.context?.choices?.length || 0) > 1 ? item.context.choices.map((choice) => choice.number).join(' or ') : item.displayNumber || item.number;
            return <button onClick={async () => { await flushPendingSaves(); setCurrent(item.number); }} className={`${started ? 'done' : ''} ${item.number === current ? 'current' : ''}`} key={item.id}><span><b>Question {label}</b></span><em>{started ? '✓' : item.number === current ? '●' : '○'}</em></button>;
          })}
        </aside>
        <article className={`paper-sheet symmetric-paper-sheet paper2-generated-sheet ${isEnglish ? 'english-paper2-sheet' : ''}`}>
          <div className="paper2-question-heading"><div><p className="eyebrow">{resolvedSubjectName} · Paper 2</p><h2>Question {(question.context?.choices?.length || 0) > 1 ? question.context.choices.map((choice) => choice.number).join(' or ') : question.displayNumber || current}</h2></div><span>{question.marks} marks</span></div>
          {isEnglish && <EnglishQuestionContext context={question.context} selectedChoiceId={selectedChoices[question.id]} onSelectChoice={(choiceId) => setSelectedChoice(question.id, choiceId)} />}
          {question.parts.map((itemPart) => <section className="paper-question generated-paper2-part" key={itemPart.id}>
            {!isEnglish && <div className="prompt-row"><span><b>{itemPart.label}</b> {itemPart.prompt}</span><small>({itemPart.marks} {itemPart.marks === 1 ? 'mark' : 'marks'})</small></div>}
            {itemPart.visual && itemPart.responseType !== 'graph' && <QuestionVisual spec={itemPart.visual} />}
            {itemPart.visual && itemPart.responseType === 'graph' && <InteractiveGraphResponse spec={itemPart.visual} points={graphResponses[itemPart.id] || []} onChange={(points) => setGraphResponse(itemPart.id, points)} />}
            {itemPart.responseType === 'long' ? (question.context?.purposePrompt ? <EnglishSummaryResponse purposePrompt={question.context.purposePrompt} summaryPrompt={itemPart.prompt} value={responses[itemPart.id] || []} onChange={(lines) => setResponse(itemPart.id, lines)} inputGuards={responseInputGuards} /> : <label className="english-long-response"><span>Your response</span><small>Type your response directly. Pasting and dropped text are disabled.</small><textarea {...responseInputGuards} value={(responses[itemPart.id] || []).join('\n')} onChange={(event) => setResponse(itemPart.id, event.target.value.split('\n'))} rows={18} placeholder="Write your response here…"/></label>) : <MathWorkingField value={responses[itemPart.id] || []} onChange={(lines) => setResponse(itemPart.id, lines)} label={itemPart.responseType === 'graph' ? 'Estimate and final answer' : 'Show your working and answer'} minimumLines={itemPart.responseType === 'short' ? 2 : 4} />}
          </section>)}
          <div className="paper-bottom functional-paper2-footer"><button className={`link-button ${question.flagged ? 'active' : ''}`} onClick={toggleFlag}><Flag size={15} />{question.flagged ? 'Flagged for review' : 'Flag this question'}</button><div><button className="button outline" disabled={current === 1} onClick={async () => { await flushPendingSaves(); setCurrent(Math.max(1, current - 1)); }}><ArrowLeft size={17} />Previous</button><button className="button dark" disabled={current === questions.length} onClick={async () => { await flushPendingSaves(); setCurrent(Math.min(questions.length, current + 1)); }}>Next<ArrowRight size={17} /></button></div></div>
          <footer className="paper2-submit-footer"><div><h2>Ready to finish Paper 2?</h2><p>{incompleteQuestions.length ? `${incompleteQuestions.length} questions still have blank parts.` : 'Every part has a response.'}</p>{submitNotice && <p className="paper2-submit-notice" role="status">Start this paper from Practice to save and mark your responses.</p>}</div><button className="button dark" disabled={submitting} onClick={() => setShowSubmit(true)}><Send size={17} />{submitting ? 'Submitting…' : 'Submit paper'}</button></footer>
        </article>
      </div>
    </main>
    {showSubmit && <div className="modal-backdrop"><section className="confirm-dialog paper2-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="paper2-submit-title"><button className="dialog-close" onClick={() => setShowSubmit(false)} aria-label="Close submission confirmation"><X size={18} /></button><span className="dialog-icon"><AlertTriangle size={24} /></span><p className="eyebrow">Submit Paper 2</p><h2 id="paper2-submit-title">{incompleteQuestions.length ? `You still have ${blankParts} blank ${blankParts === 1 ? 'part' : 'parts'}.` : 'Your paper is ready to submit.'}</h2><p>{incompleteQuestions.length ? `Questions ${incompleteQuestions.map((item) => item.number).join(', ')} are incomplete. You can return to finish them, or submit now if you are done.` : 'Once submitted, your responses cannot be changed.'}</p><div className="submission-check"><span><strong>{questions.length - incompleteQuestions.length}</strong> complete</span><span><strong>{incompleteQuestions.length}</strong> incomplete</span><span><strong>{blankParts}</strong> blank parts</span></div><div className="dialog-actions"><button className="button outline" disabled={submitting} onClick={() => setShowSubmit(false)}>Return to paper</button><button className="button dark" disabled={submitting} onClick={submitPaper}>{submitting ? 'Submitting…' : incompleteQuestions.length ? 'Submit anyway' : 'Submit paper'}</button></div></section></div>}
  </div>;
}
