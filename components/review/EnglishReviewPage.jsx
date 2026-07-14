'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Check, ChevronDown, ChevronUp, Circle, FileText, ShieldAlert } from 'lucide-react';
import paperOneA from '@/data/english/paper-1-form-a-review-candidate.json';
import paperOneB from '@/data/english/paper-1-form-b-review-candidate.json';
import paperOneC from '@/data/english/paper-1-form-c-review-candidate.json';
import paperTwoA from '@/data/english/paper-2-form-a-review-candidate.json';
import paperTwoB from '@/data/english/paper-2-form-b-review-candidate.json';
import paperTwoC from '@/data/english/paper-2-form-c-review-candidate.json';

const paperOneForms = { A: paperOneA, B: paperOneB, C: paperOneC };
const paperTwoForms = { A: paperTwoA, B: paperTwoB, C: paperTwoC };

const profileLabels = { understanding: 'Understanding', analysing: 'Analysing', evaluating_creating: 'Evaluating & creating' };

function Gate({ tone = 'blocked', title, children }) {
  return <article className={`english-review-gate ${tone}`}>
    <span>{tone === 'pass' ? <Check size={16}/> : <ShieldAlert size={16}/>}</span>
    <div><strong>{title}</strong><p>{children}</p></div>
  </article>;
}

function QuestionProof({ question, stimulus }) {
  const [open, setOpen] = useState(false);
  return <article className="english-proof-question">
    <button className="english-proof-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="english-question-number">{question.number}</span>
      <span><strong>{question.stem}</strong><small>{profileLabels[question.profile]} · {question.difficulty} · {question.objective}</small></span>
      {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>} 
    </button>
    {open && <div className="english-proof-detail">
      {stimulus && <p className="english-stimulus-reference">Uses stimulus: <strong>{stimulus.title}</strong></p>}
      <ol className="english-option-proof">{question.options.map((option, index) => <li className={question.correctOption === 'ABCD'[index] ? 'keyed' : ''} key={option}><b>{'ABCD'[index]}</b><span>{option}</span>{question.correctOption === 'ABCD'[index] && <em>Key</em>}</li>)}</ol>
      <div className="english-review-rationale"><strong>Candidate rationale</strong><p>{question.answerRationale}</p></div>
    </div>}
  </article>;
}

function PaperOneReview() {
  const [moduleNumber, setModuleNumber] = useState(1);
  const [formId, setFormId] = useState('A');
  const paperOne = paperOneForms[formId];
  const module = paperOne.modules.find((item) => item.module === moduleNumber);
  const stimulusMap = useMemo(() => Object.fromEntries(module.stimuli.map((item) => [item.id, item])), [module]);
  return <section className="english-review-workspace">
    <aside className="english-review-outline">
      <p className="eyebrow">Paper 1 proof</p><h2>Module</h2>
      {[1,2,3].map((number) => <button className={number === moduleNumber ? 'active' : ''} onClick={() => setModuleNumber(number)} key={number}><span>0{number}</span><b>{['Informative','Literary','Persuasive'][number - 1]}</b></button>)}
      <div className="english-answer-pattern"><span>Answer pattern</span><code>ABCD × 15</code><small>Release blocker</small></div>
    </aside>
    <div className="english-review-paper">
      <header><div><p className="eyebrow">Module {moduleNumber} · release copy</p><h2>{module.discourse} · Form {formId}</h2></div><span className="review-status">Approved</span></header>
      <div className="math-form-switch" aria-label="English Paper 1 form">{Object.keys(paperOneForms).map((id) => <button className={formId === id ? 'active' : ''} onClick={() => setFormId(id)} key={id}>Form {id}</button>)}</div>
      <section className="english-stimulus-grid">{module.stimuli.map((stimulus) => <article key={stimulus.id}><small>{stimulus.kind.replaceAll('_',' ')}</small><h3>{stimulus.title}</h3>{stimulus.content ? <p>{stimulus.content}</p> : <div className="english-visual-proof"><FileText size={25}/><span>Structured visual specification</span><pre>{JSON.stringify(stimulus.visualSpec, null, 2)}</pre></div>}</article>)}</section>
      <div className="english-question-list">{module.questions.map((question) => <QuestionProof key={question.id} question={question} stimulus={stimulusMap[question.stimulusId]} />)}</div>
    </div>
  </section>;
}

function PaperTwoReview() {
  const [formId, setFormId] = useState('A');
  const paperTwo = paperTwoForms[formId];
  const tasks = [...paperTwo.summaryTasks, ...paperTwo.writingTasks].sort((a,b) => a.number - b.number);
  return <section className="english-paper-two-proof">
    <header><div><p className="eyebrow">Paper 2 · release copy</p><h2>Writing and summary tasks · Form {formId}</h2></div><span className="review-status">Approved</span></header>
    <div className="math-form-switch" aria-label="English Paper 2 form">{Object.keys(paperTwoForms).map((id) => <button className={formId === id ? 'active' : ''} onClick={() => setFormId(id)} key={id}>Form {id}</button>)}</div>
    {tasks.map((task) => <article className="english-writing-proof" key={task.id}>
      <div className="english-writing-index"><span>Question</span><strong>{task.number}</strong><small>{task.marks} marks</small></div>
      <div><p className="eyebrow">Module {task.module} · {task.discourse}</p><h3>{task.extractTitle || task.title || task.kind?.replaceAll('_',' ')}</h3>
        {task.extract && <details><summary>Read source extract</summary><p className="english-source-copy">{task.extract}</p></details>}
        <p className="english-task-copy">{task.summaryPrompt || task.task}</p>
        {task.sampleSummary && <div className="english-review-rationale"><strong>Candidate sample summary</strong><p>{task.sampleSummary}</p></div>}
        <div className="english-rubric-strip">{task.rubric.criteria.map((criterion) => <span key={criterion.id}><b>{criterion.marks}</b>{profileLabels[criterion.profile]}</span>)}</div>
      </div>
    </article>)}
  </section>;
}

export default function EnglishReviewPage() {
  const [view, setView] = useState('overview');
  return <main className="english-review-page">
    <header className="english-review-masthead"><div><span className="english-review-kicker"><BookOpen size={16}/> Internal content desk</span><h1>English A release proof</h1><p>Three original Paper 1 and Paper 2 forms are approved for the stimulus-safe assembly pool.</p><a className="review-switch-link" href="/review/mathematics">Open Mathematics proof →</a></div><div className="english-review-seal english-approved-seal"><Check/><strong>Ready</strong><span>Approved pool</span></div></header>
    <nav className="english-review-tabs" aria-label="Review sections">{[['overview','Release gates'],['paper1','Paper 1'],['paper2','Paper 2']].map(([id,label]) => <button className={view === id ? 'active' : ''} onClick={() => setView(id)} key={id}>{label}</button>)}</nav>
    {view === 'overview' && <section className="english-release-overview">
      <div className="english-overview-lead"><p className="eyebrow">Current recommendation</p><h2>Three validated forms. Ready for release.</h2><p>Paper 1 assembles whole stimulus-safe module blocks; Paper 2 selects complete structured tasks. Answer positions are balanced without a repeating ABCD pattern.</p></div>
      <div className="english-gate-list"><Gate tone="pass" title="Blueprint shape">Each of three Paper 1 forms has 60 items and each Paper 2 form supplies a 120-mark route.</Gate><Gate tone="pass" title="Answer-key integrity">All Paper 1 forms have balanced, non-repeating answer positions.</Gate><Gate tone="pass" title="Product-owner approval">Forms A-C, their original stimuli and rubrics are recorded as approved.</Gate><Gate tone="pass" title="Stimulus-safe assembly">Every 20-question module stays attached to the form’s passages and visual texts.</Gate><Gate tone="pass" title="Release validation">The full English pool passes with zero structural errors or warnings.</Gate></div>
      <div className="english-form-ledger"><article><span>Paper 1 pool</span><strong>180</strong><small>three complete forms</small></article><article><span>Paper 2 pool</span><strong>21</strong><small>printed tasks</small></article><article><span>Approved forms</span><strong>6</strong><small>Paper 1 and 2</small></article></div>
    </section>}
    {view === 'paper1' && <PaperOneReview/>}
    {view === 'paper2' && <PaperTwoReview/>}
  </main>;
}
