'use client';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import RadarChart from '../RadarChart';

const subjects=[
  {name:'Mathematics',image:'mathematics.png',active:true},
  {name:'English A',image:'english-a.png'},
  {name:'Chemistry',image:'chemistry.png'},
  {name:'Physics',image:'physics.png'}
];
const sampleProgress=[
  {label:'Number',value:78},
  {label:'Algebra',value:64},
  {label:'Graphs',value:52},
  {label:'Geometry',value:71},
  {label:'Statistics',value:59},
];
const sampleBreakdown=[
  {question:'Question 8',type:'Conceptual knowledge',result:'Correct',score:'1 / 1',state:'good'},
  {question:'Question 19',type:'Algorithmic knowledge',result:'Review',score:'0 / 1',state:'bad'},
  {question:'Question 42',type:'Reasoning',result:'Partly correct',score:'3 / 5',state:'mid'},
];
const journeySteps=[
  {number:'01',title:'Pick a subject',description:'Choose the CSEC subject you want to practice.',image:'pick-subject.png'},
  {number:'02',title:'Start a paper',description:'Complete a full Paper 1 or Paper 2.',image:'start-paper.png'},
  {number:'03',title:'Get your report',description:'See your marks, feedback and what to revisit next.',image:'get-report.png'},
  {number:'04',title:'Track your growth',description:'See how your performance changes over time.',image:'track-growth.png'},
];
export default function LandingPage({navigate}){
  return <div className="landing">
    <section className="hero">
      <header className="public-nav container">
        <button className="wordmark" aria-label="MyCSECPal home">
          <img src="/assets/brand/mycsecpal-logo.png" alt="MyCSECPal" />
        </button>
        <nav><a href="#subjects">Subjects</a><a href="#how">How It Works</a><a href="#pricing">Pricing</a><button className="text-button" onClick={()=>navigate('practice')}>Sign In</button><button className="button dark small" onClick={()=>navigate('onboarding')}>Start Practicing <ArrowRight size={16}/></button></nav>
      </header>
      <div className="hero-content container">
        <div className="hero-copy">
          <p className="eyebrow">Made for Caribbean students</p>
          <h1>Practice for CSEC exams the way they’re actually written.</h1>
          <p>Complete full papers online. Show your working, receive marking and track your progress across every subject.</p>
          <button className="button dark hero-button" onClick={()=>navigate('onboarding')}>Start Practicing <ArrowRight size={18}/></button>
        </div>
        <div className="hero-art"><img src="/assets/hero-pals-caribbean.png" alt="MyCSECPal study companions with Caribbean flags and palm leaves"/></div>
      </div>
    </section>
    <main className="landing-body">
      <section className="container section" id="subjects">
        <div className="section-heading-row"><div><p className="eyebrow">Choose your starting point</p><h2>Choose a subject to get started</h2></div></div>
        <div className="subject-grid">
          {subjects.map(({name,image,active})=><article key={name} className={`subject-card landing-subject-card ${active?'available':''}`}>
            <img src={`/assets/subjects/${image}`} alt=""/><h3>{name}</h3>
            {active?<><div className="pill-row"><span>Paper 1</span><span>Paper 2</span></div><button className="card-action" onClick={()=>navigate('onboarding')}>Start now <ArrowRight size={17}/></button></>:<span className="status-pill">Coming soon</span>}
          </article>)}
        </div>
      </section>
      <section className="container paper-demo section">
        <div className="demo-intro"><p className="eyebrow">Your working matters</p><h2>See how Paper 2 works</h2><p>Answer a question line by line and receive marks for the method—not only the final answer. Your feedback also highlights recurring habits and misconceptions so you know what to revisit.</p><button className="link-button">Try a sample question <ArrowRight size={16}/></button></div>
        <div className="exam-sample">
          <div className="question-row"><span className="q-tag">Q3</span><span><b>(a)</b> Factorise completely: <i>2x² − 7x + 3</i></span><small>(3 marks)</small></div>
          <div className="question-row indent"><span><b>(b)</b> Hence, solve: <i>2x² − 7x + 3 = 0</i></span><small>(3 marks)</small></div>
          <div className="working-lines">
            {['2x² − 7x + 3','= 2x² − 6x − x + 3','= 2x(x − 3) − 1(x − 3)','= (2x − 1)(x − 3)'].map((x,i)=><div className="working-line" key={x}><span>{i+1}</span><em>{x}</em></div>)}
          </div>
        </div>
        <div className="mark-card"><div className="mark-head"><span>Your mark</span><span className="success-pill">Great work!</span></div><div className="score">5 <small>/ 6</small></div><h4>Breakdown</h4><div className="score-row"><span>Part (a)</span><b>2 / 3</b></div><div className="score-row"><span>Part (b)</span><b>3 / 3</b></div><div className="feedback"><h4>Examiner feedback</h4><p>Good factorisation. Correct solutions.</p></div></div>
      </section>
      <section className="container section journey-section" id="how"><p className="eyebrow">No complicated setup</p><h2>Simple steps. Serious results.</h2><div className="steps journey-steps">
        {journeySteps.map((step)=><article className="step journey-step" key={step.number}><img src={`/assets/steps/${step.image}`} alt=""/><div><span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></div></article>)}
      </div></section>
      <section className="container section landing-progress-showcase">
        <div className="landing-progress-heading"><div><p className="eyebrow">More than a final score</p><h2>See exactly where progress is happening.</h2></div><p>Every learner receives a full report after each paper, with clear insights they can use for the next attempt.</p></div>
        <div className="landing-progress-grid">
          <article className="landing-radar-preview"><div><span className="preview-label">Student progress</span><h3>Your CSEC Mathematics profile</h3><p>Radar graphs turn marked attempts into a clear view of strengths and areas that need more practice.</p></div><RadarChart axes={sampleProgress}/></article>
          <article className="landing-breakdown-preview"><div className="preview-card-heading"><div><span className="preview-label">Question-by-question report</span><h3>Understand every response</h3></div><span>68%</span></div><p className="preview-description">Review the result, marks and examiner feedback for each question and question type.</p><div className="preview-breakdown-head"><span>Question</span><span>Question type</span><span>Marks</span></div>{sampleBreakdown.map((row)=><div className="preview-breakdown-row" key={row.question}><span className={`preview-state ${row.state}`}>{row.state==='good'?'✓':row.state==='mid'?'~':'×'}</span><strong>{row.question}</strong><span><b>{row.type}</b><small>{row.result}</small></span><b>{row.score}</b></div>)}</article>
        </div>
      </section>
      <section className="container section pricing" id="pricing"><div className="pricing-head"><div><p className="eyebrow">Start free</p><h2>Simple pricing. Built for every student.</h2></div><span><ShieldCheck size={17}/> Secure payments. Cancel anytime.</span></div><div className="pricing-grid">
        <article className="price-card"><div><p className="plan">Guest</p><div className="price">Free</div><p className="plan-copy">Build a daily practice habit.</p>{['1 Paper 1 attempt each day','1 Paper 2 attempt each day','Full examiner report and analysis','Radar progress and question breakdowns'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button outline" onClick={()=>navigate('onboarding')}>Start free <ArrowRight size={16}/></button></article>
        <article className="price-card featured"><span className="popular">Most popular</span><div><p className="plan">Practice</p><div className="price">$9.99 USD <small>/ month</small></div><p className="plan-copy">Unlimited exam practice for serious preparation.</p>{['Unlimited Paper 1 and Paper 2 attempts','Practice across up to 5 subjects','Full examiner report and analysis','Radar progress and question breakdowns'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button dark" onClick={()=>navigate('onboarding')}>Choose Practice <ArrowRight size={16}/></button></article>
        <article className="price-card coming-soon"><span className="popular">Coming soon</span><div><p className="plan">Practice & Learn</p><div className="price">Coming soon</div><p className="plan-copy">Move from diagnosis to guided learning.</p>{['Everything in Practice','Guided topic lessons','Worked examples and study pathways','Full examiner report and analysis'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button outline" disabled>Coming soon</button></article>
      </div><p className="all-plans-note"><Check size={17}/>Every tier includes marking, a complete report, examiner analysis, radar progress and a question-by-question breakdown.</p></section>
      <section className="container closing-cta"><img src="/assets/island.png" alt="Island doodle"/><div><h2>Ready to sit your first paper?</h2><p>Build confidence one complete paper at a time.</p></div><button className="button dark" onClick={()=>navigate('onboarding')}>Start Practicing <ArrowRight size={17}/></button></section>
    </main>
  </div>
}
