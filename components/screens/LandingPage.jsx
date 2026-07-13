'use client';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';

const subjects=[
  {name:'Mathematics',image:'mathematics.png',active:true},
  {name:'English A',image:'english-a.png'},
  {name:'Chemistry',image:'chemistry.png'},
  {name:'Physics',image:'physics.png'}
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
          <p>Complete full papers online. Show your working, receive AI marking and track your progress across every subject.</p>
          <button className="button dark hero-button" onClick={()=>navigate('onboarding')}>Start Practicing <ArrowRight size={18}/></button>
        </div>
        <div className="hero-art"><img src="/assets/hero-pals.png" alt="MyCSECPal study companions"/></div>
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
        <div className="demo-intro"><p className="eyebrow">Your working matters</p><h2>See how Paper 2 works</h2><p>Answer a question line by line and receive marks for the method—not only the final answer.</p><button className="link-button">Try a sample question <ArrowRight size={16}/></button></div>
        <div className="exam-sample">
          <div className="question-row"><span className="q-tag">Q3</span><span><b>(a)</b> Factorise completely: <i>2x² − 7x + 3</i></span><small>(3 marks)</small></div>
          <div className="question-row indent"><span><b>(b)</b> Hence, solve: <i>2x² − 7x + 3 = 0</i></span><small>(3 marks)</small></div>
          <div className="working-lines">
            {['2x² − 7x + 3','= 2x² − 6x − x + 3','= 2x(x − 3) − 1(x − 3)','= (2x − 1)(x − 3)'].map((x,i)=><div className="working-line" key={x}><span>{i+1}</span><em>{x}</em></div>)}
          </div>
        </div>
        <div className="mark-card"><div className="mark-head"><span>Your mark</span><span className="success-pill">Great work!</span></div><div className="score">5 <small>/ 6</small></div><h4>Breakdown</h4><div className="score-row"><span>Part (a)</span><b>2 / 3</b></div><div className="score-row"><span>Part (b)</span><b>3 / 3</b></div><div className="feedback"><h4>AI feedback</h4><p>Good factorisation. Correct solutions.</p></div></div>
      </section>
      <section className="container section" id="how"><p className="eyebrow">No complicated setup</p><h2>Simple steps. Serious results.</h2><div className="steps">
        {[["01","Pick a subject","Choose the CSEC subject you want to practice."],["02","Start a paper","Complete a full Paper 1 or Paper 2."],["03","Get marked by AI","Receive marks for answers and working."],["04","Track your growth","See how your performance changes over time."]].map(([n,t,d])=><div className="step" key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></div>)}
      </div></section>
      <section className="container section pricing" id="pricing"><div className="pricing-head"><div><p className="eyebrow">Start free</p><h2>Simple pricing. Built for every student.</h2></div><span><ShieldCheck size={17}/> Secure payments. Cancel anytime.</span></div><div className="pricing-grid">
        <article className="price-card"><div><p className="plan">Free</p><div className="price">$0 <small>/ month</small></div>{['A few complete papers per month','AI marking and feedback','Progress tracking'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><img src="/assets/island.png" alt="Island doodle"/></article>
        <article className="price-card featured"><span className="popular">Most popular</span><div><p className="plan">Pro</p><div className="price">$9.99 <small>/ month</small></div><p className="plan-copy">Unlimited exam practice. Better results.</p>{['Unlimited papers across all subjects','Detailed AI feedback','Full attempt history','Performance insights and trends'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><img src="/assets/ai-marking.png" alt="AI marking doodle"/></article>
      </div></section>
      <section className="container closing-cta"><img src="/assets/island.png" alt="Island doodle"/><div><h2>Ready to sit your first paper?</h2><p>Build confidence one complete paper at a time.</p></div><button className="button dark" onClick={()=>navigate('onboarding')}>Start Practicing <ArrowRight size={17}/></button></section>
    </main>
  </div>
}
