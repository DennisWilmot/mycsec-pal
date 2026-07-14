'use client';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const subjects=[
  {name:'Mathematics',image:'mathematics.png',active:true},
  {name:'English A',image:'english-a.png',active:true},
  {name:'Chemistry',image:'chemistry.png'},
  {name:'Physics',image:'physics.png'}
];
const journeySteps=[
  {number:'01',title:'Pick a subject',description:'Choose the CSEC subject you want to practice.',image:'pick-subject.png'},
  {number:'02',title:'Start a paper',description:'Complete a full Paper 1 or Paper 2.',image:'start-paper.png'},
  {number:'03',title:'Get your report',description:'See your marks, feedback and what to revisit next.',image:'get-report.png'},
  {number:'04',title:'Track your growth',description:'See how your performance changes over time.',image:'track-growth.png'},
];
export default function LandingPage({navigate}){
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, []);
  const beginBeta = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return navigate('onboarding');
    const { data } = await supabase.auth.getSession();
    navigate(data.session ? 'practice' : 'onboarding');
  };
  const betaAction = signedIn ? 'Go to dashboard' : 'Join the beta';
  return <div className="landing">
    <section className="hero">
      <header className="public-nav container">
        <button className="wordmark" aria-label="MyCSECPal home">
          <img src="/assets/brand/mycsecpal-logo.png" alt="MyCSECPal" />
        </button>
        <nav><a href="#subjects">Subjects</a><a href="#how">How It Works</a><a href="#pricing">Beta access</a><button className="text-button" onClick={()=>navigate('practice')}>{signedIn ? 'Dashboard' : 'Sign In'}</button><button className="button dark small" onClick={beginBeta}>{betaAction} <ArrowRight size={16}/></button></nav>
      </header>
      <div className="hero-content container">
        <div className="hero-copy">
          <p className="eyebrow">Now welcoming beta learners</p>
          <h1>Practice for CSEC exams the way they’re actually written.</h1>
          <p>Join our beta to complete full papers online, show your working, receive detailed marking and help shape a better way to prepare for CSEC.</p>
          <div className="hero-beta-actions"><button className="button dark hero-button" onClick={beginBeta}>{betaAction} <ArrowRight size={18}/></button></div>
        </div>
        <div className="hero-art"><img src="/assets/hero-pals-caribbean.png" alt="MyCSECPal study companions with Caribbean flags and palm leaves"/></div>
      </div>
    </section>
    <main className="landing-body">
      <section className="container section" id="subjects">
        <div className="section-heading-row"><div><p className="eyebrow">Choose your starting point</p><h2>Choose a subject to get started</h2></div></div>
        <div className="subject-grid">
          {subjects.map(({name,image,active})=><article key={name} className={`subject-card landing-subject-card ${active?'available':''}`}>
            <img src={`/assets/subjects/${image}`} alt=""/><div className="landing-subject-title"><h3>{name}</h3>{active && <span><Check size={13}/>Available now</span>}</div>
            {active?<><div className="pill-row"><span>Paper 1</span><span>Paper 2</span></div><button className="card-action" onClick={beginBeta}>Start now <ArrowRight size={17}/></button></>:<span className="status-pill">Coming soon</span>}
          </article>)}
        </div>
      </section>
      <section className="container paper-demo section landing-product-proof working-proof">
        <div className="demo-intro"><p className="eyebrow">Your working matters</p><h2>See how Paper 2 works</h2><p>Answer a question line by line and receive marks for the method, not only the final answer. Your feedback also highlights recurring habits and misconceptions so you know what to revisit.</p><button className="link-button">Try a sample question <ArrowRight size={16}/></button></div>
        <figure className="product-shot product-shot-working"><img src="/landing%20page%20images/Short%20Answer%20practice%20paper%20ui%20math.png" alt="Mathematics Paper 2 workspace showing structured questions and line-by-line working fields"/></figure>
      </section>
      <section className="container section journey-section" id="how"><p className="eyebrow">No complicated setup</p><h2>Simple steps. Serious results.</h2><div className="steps journey-steps">
        {journeySteps.map((step)=><article className="step journey-step" key={step.number}><img src={`/assets/steps/${step.image}`} alt=""/><div><span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></div></article>)}
      </div></section>
      <section className="container section landing-progress-showcase">
        <div className="landing-progress-heading"><div><p className="eyebrow">More than a final score</p><h2>See exactly where progress is happening.</h2></div><p>Every learner receives a full report after each paper, with clear insights they can use for the next attempt.</p></div>
        <div className="landing-report-gallery">
          <figure className="product-shot report-shot examiner-shot"><img src="/landing%20page%20images/English%20attempt%20report%20exmainer%20summary.png" alt="English A attempt report with an individualized examiner summary and next actions"/></figure>
          <figure className="product-shot report-shot review-shot"><img src="/landing%20page%20images/Attempt%20Report%20Question%20review.png" alt="Question-by-question report showing a learner response and specific examiner feedback"/></figure>
          <figure className="product-shot report-shot radar-shot"><img src="/landing%20page%20images/my%20progress%20-%20radar%20chart%20for%20math.png" alt="Mathematics progress dashboard with subject radar profile and recommended focus"/></figure>
        </div>
      </section>
      <section className="container section pricing" id="pricing"><div className="pricing-head"><div><p className="eyebrow">Join the beta</p><h2>Real exam practice. Your feedback helps us improve it.</h2></div><span><ShieldCheck size={17}/> Free beta access. No card required.</span></div><div className="pricing-grid">
        <article className="price-card beta-price-card"><span className="popular">Beta access</span><div><p className="plan">Beta learner</p><div className="price">Free <small>/ 14 days</small></div><p className="plan-copy">Use invitation code <b>BETA</b> when you create your account.</p>{['5 paper attempts each day','Practice Mathematics and English A','Full examiner report and analysis','Radar progress and question breakdowns'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button dark" onClick={beginBeta}>{betaAction} <ArrowRight size={16}/></button></article>
        <article className="price-card featured"><span className="popular">Most popular</span><div><p className="plan">Practice</p><div className="price">$9.99 USD <small>/ month</small></div><p className="plan-copy">Unlimited exam practice for serious preparation.</p>{['Unlimited Paper 1 and Paper 2 attempts','Practice across up to 5 subjects','Full examiner report and analysis','Radar progress and question breakdowns'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button dark" onClick={()=>navigate('onboarding')}>Choose Practice <ArrowRight size={16}/></button></article>
        <article className="price-card coming-soon"><span className="popular">Coming soon</span><div><p className="plan">Practice & Learn</p><div className="price">Coming soon</div><p className="plan-copy">Move from diagnosis to guided learning.</p>{['Everything in Practice','Guided topic lessons','Worked examples and study pathways','Full examiner report and analysis'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button outline" disabled>Coming soon</button></article>
      </div><p className="all-plans-note"><Check size={17}/>Every tier includes marking, a complete report, examiner analysis, radar progress and a question-by-question breakdown.</p></section>
      <section className="container closing-cta"><img src="/assets/island.png" alt="Island doodle"/><div><h2>Help us build better CSEC practice.</h2><p>Join the beta, sit a paper and tell us what makes your preparation stronger.</p></div><button className="button dark" onClick={beginBeta}>{betaAction} <ArrowRight size={17}/></button></section>
    </main>
  </div>
}
