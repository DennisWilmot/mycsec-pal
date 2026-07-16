'use client';

import { useState } from 'react';
import { Calculator, Check, ChevronDown, ChevronUp, GitBranch, ShieldAlert } from 'lucide-react';
import { mathPaper1Demo as paperOne } from '@/data/math-paper-1-demo';
import { mathPaper2Demo as paperTwo } from '@/data/math-paper-2-demo';
import { mathPaper1FormB } from '@/data/mathematics/paper-1-form-b-review-candidate';
import { mathPaper2FormB } from '@/data/mathematics/paper-2-form-b-review-candidate';

function Gate({ pass = false, title, children }) {
  return <article className={`english-review-gate ${pass ? 'pass' : ''}`}>
    <span>{pass ? <Check size={16}/> : <ShieldAlert size={16}/>}</span><div><strong>{title}</strong><p>{children}</p></div>
  </article>;
}

function MultipleChoiceProof({ question }) {
  const [open, setOpen] = useState(false);
  return <article className="english-proof-question">
    <button className="english-proof-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="english-question-number">{question.number}</span>
      <span><strong>{question.prompt}</strong><small>Module {question.module} · {question.topic} · {question.profile} · {question.difficulty}</small></span>
      {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
    </button>
    {open && <div className="english-proof-detail">
      {question.visual && <div className="math-visual-spec"><strong>Visual specification</strong><pre>{JSON.stringify(question.visual, null, 2)}</pre></div>}
      <ol className="english-option-proof">{question.options.map((option, index) => <li className={question.correctAnswer === 'ABCD'[index] ? 'keyed' : ''} key={`${question.id}-${index}`}><b>{'ABCD'[index]}</b><span>{option}</span>{question.correctAnswer === 'ABCD'[index] && <em>Key</em>}</li>)}</ol>
    </div>}
  </article>;
}

function PaperOneReview() {
  const [moduleNumber, setModuleNumber] = useState(1);
  const [formId, setFormId] = useState('A');
  const selectedPaper = formId === 'A' ? paperOne : mathPaper1FormB;
  const questions = selectedPaper.questions.filter((question) => question.module === moduleNumber);
  return <section className="english-review-workspace">
    <aside className="english-review-outline"><p className="eyebrow">Paper 1 proof</p><h2>Module</h2>
      {[1,2,3].map((number) => <button className={number === moduleNumber ? 'active' : ''} onClick={() => setModuleNumber(number)} key={number}><span>0{number}</span><b>{20} questions</b></button>)}
      <div className="english-answer-pattern"><span>Release state</span><code>Review candidate</code><small>Not learner-visible</small></div>
    </aside>
    <div className="english-review-paper"><header><div><p className="eyebrow">Module {moduleNumber} · release copy</p><h2>Mathematics Paper 1 · Form {formId}</h2></div><span className="review-status">Approved</span></header>
      <div className="math-form-switch" aria-label="Paper 1 form">{['A','B'].map((id) => <button className={formId === id ? 'active' : ''} onClick={() => setFormId(id)} key={id}>Form {id}</button>)}</div>
      <div className="math-paper-meta"><span>20 slots</span><span>20 marks</span><span>CK · AK · R</span></div>
      <div className="english-question-list">{questions.map((question) => <MultipleChoiceProof question={question} key={question.id}/>)}</div>
    </div>
  </section>;
}

function PaperTwoReview() {
  const [formId, setFormId] = useState('A');
  const selectedPaper = formId === 'A' ? paperTwo : mathPaper2FormB;
  return <section className="english-paper-two-proof"><header><div><p className="eyebrow">Paper 2 · release copy</p><h2>Structured Mathematics · Form {formId}</h2></div><span className="review-status">Approved</span></header>
    <div className="math-form-switch" aria-label="Paper 2 form">{['A','B'].map((id) => <button className={formId === id ? 'active' : ''} onClick={() => setFormId(id)} key={id}>Form {id}</button>)}</div>
    {selectedPaper.questions.map((question) => <article className="english-writing-proof" key={question.id}>
      <div className="english-writing-index"><span>Question</span><strong>{question.number}</strong><small>{question.marks} marks</small></div>
      <div><p className="eyebrow">Module {question.module}</p><h3>{question.title}</h3>
        <div className="math-part-list">{question.parts.map((part) => <section key={part.id}><b>{part.label}</b><div><p>{part.prompt}</p><small>{part.marks} marks · {part.responseType}</small>{part.visual && <details><summary>Inspect visual specification</summary><pre>{JSON.stringify(part.visual, null, 2)}</pre></details>}</div></section>)}</div>
      </div>
    </article>)}
  </section>;
}

export default function MathematicsReviewPage() {
  const [view, setView] = useState('overview');
  return <main className="english-review-page math-review-page">
    <header className="english-review-masthead"><div><span className="english-review-kicker"><Calculator size={16}/> Internal content desk</span><h1>Mathematics release proof</h1><p>The 2027 Forms A-B pool and operational exam spine are approved for release.</p><a className="review-switch-link" href="/review/english">Open English A proof →</a></div><div className="english-review-seal english-approved-seal"><Check/><strong>Ready</strong><span>Approved pool</span></div></header>
    <nav className="english-review-tabs" aria-label="Review sections">{[['overview','Exam spine'],['paper1','Paper 1'],['paper2','Paper 2']].map(([id,label]) => <button className={view === id ? 'active' : ''} onClick={() => setView(id)} key={id}>{label}</button>)}</nav>
    {view === 'overview' && <section className="english-release-overview">
      <div className="english-overview-lead"><p className="eyebrow">Assembly design</p><h2>A real spine, not one frozen form.</h2><p>Each numbered slot defines module, topic where required, assessment profile, difficulty, response type and marks. At attempt creation the assembler chooses the least-exposed eligible question and avoids items the learner saw recently.</p><div className="math-spine-flow"><GitBranch/><span>Blueprint slot</span><i>→</i><span>Eligible bank</span><i>→</i><span>Attempt snapshot</span></div></div>
      <div className="english-gate-list"><Gate pass title="Operational slot schema">The migration stores every Paper 1 and Paper 2 spine position as queryable data.</Gate><Gate pass title="Deterministic assembly">Retries resolve to the same selection while new attempts can receive different eligible questions.</Gate><Gate pass title="Exposure protection">Never-seen and lower-exposure items rank before recently seen questions.</Gate><Gate pass title="Alternate form approved">Form B adds 60 Paper 1 and 9 Paper 2 questions to the eligible pool.</Gate><Gate pass title="Release validation">Both Mathematics forms pass the structural release validator.</Gate></div>
      <div className="english-form-ledger"><article><span>Paper 1 pool</span><strong>120</strong><small>two approved forms</small></article><article><span>Paper 2 pool</span><strong>18</strong><small>180 marks across forms</small></article><article><span>Approved forms</span><strong>4</strong><small>Paper 1 and 2</small></article></div>
    </section>}
    {view === 'paper1' && <PaperOneReview/>}{view === 'paper2' && <PaperTwoReview/>}
  </main>;
}
