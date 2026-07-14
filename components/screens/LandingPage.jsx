'use client';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const subjects=[
  {name:'Mathematics',image:'mathematics.png',active:true},
  {name:'English A',image:'english-a.png',active:true},
  {name:'More subjects',image:'chemistry.png',roadmap:true}
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
          <p>Complete full CSEC papers online. Get marks for your answers, feedback on your Paper 2 working and a clear explanation of what to improve.</p>
          <div className="hero-beta-actions"><button className="button dark hero-button" onClick={beginBeta}>{betaAction} <ArrowRight size={18}/></button></div>
          <p className="parent-facing-line">Practice at home, at any time, with detailed marking after every completed paper.</p>
        </div>
        <div className="hero-art"><img src="/assets/hero-pals-caribbean.png" alt="MyCSECPal study companions with Caribbean flags and palm leaves"/></div>
      </div>
    </section>
    <main className="landing-body">
      <section className="container section" id="subjects">
        <div className="section-heading-row landing-carousel-heading"><div><p className="eyebrow">Choose your starting point</p><h2>Choose a subject to get started</h2><p>Start with what you are studying now. More subjects are on the way.</p></div></div>
        <div className="subject-carousel-stage">
          <div className="landing-subject-rail">
            {subjects.map(({name,shortName,image,active,roadmap})=><article key={name} tabIndex="0" className={`subject-card landing-subject-card ${active?'available':''} ${roadmap?'roadmap-card':''}`}>
              <img src={`/assets/subjects/${image}`} alt=""/><div className="landing-subject-title"><h3><span className="subject-full-name">{name}</span>{shortName&&<span className="subject-short-name">{shortName}</span>}</h3>{active && <span><Check size={13}/>Available now</span>}</div>
              {active?<><div className="pill-row"><span>Paper 1</span><span>Paper 2</span></div><button className="card-action" onClick={beginBeta}>Start now <ArrowRight size={17}/></button></>:<><p className="roadmap-subjects">Chemistry · Physics · Biology · POA · POB</p><span className="status-pill">Coming soon</span></>}
            </article>)}
          </div>
        </div>
      </section>
      <section className="container paper-demo section landing-product-proof working-proof">
        <div className="demo-intro"><p className="eyebrow">Your working matters</p><h2>Paper 2 is not only about the final answer.</h2><p>Show each step as you work. You receive marks and feedback for the method you used, not only your final answer.</p><button className="button dark working-proof-action" onClick={beginBeta}>Try now <ArrowRight size={16}/></button></div>
        <figure className="product-shot product-shot-working"><img src="/landing%20page%20images/Short%20Answer%20practice%20paper%20ui%20math.png" alt="Mathematics Paper 2 workspace showing structured questions and line-by-line working fields"/></figure>
      </section>
      <section className="container section journey-section" id="how"><div className="journey-heading"><div><p className="eyebrow">No complicated setup</p><h2>Simple steps. Serious results.</h2><p className="journey-description">From choosing a subject to knowing what to improve next, every step moves your preparation forward.</p></div></div><div className="journey-map">
        {journeySteps.map((step,index)=><article className={`journey-map-step journey-map-step-${index+1}`} key={step.number}><div className="journey-circle"><img src={`/assets/steps/${step.image}`} alt=""/><span>{step.number}</span></div><div className="journey-map-copy"><h3>{step.title}</h3><p>{step.description}</p></div></article>)}
      </div></section>
      <section className="container section landing-progress-showcase">
        <div className="landing-progress-heading"><div><p className="eyebrow">Your detailed report</p><h2>See what you got right, what went wrong and what to do next.</h2></div><p>After every paper, you receive a report based on the answers you submitted.</p></div>
        <div className="landing-report-tour">
          <article className="report-tour-row"><div><span>01</span><p className="eyebrow">Examiner summary</p><h3>Get a clear analysis of your performance.</h3><p>Your examiner summary is created from your responses. It explains your strengths, knowledge gaps, repeated mistakes and the most useful topic to study next.</p></div><figure className="product-shot report-shot examiner-shot"><img src="/landing%20page%20images/English%20attempt%20report%20exmainer%20summary.png" alt="English A attempt report with an individualized examiner summary and next actions"/></figure></article>
          <article className="report-tour-row reverse"><div><span>02</span><p className="eyebrow">Review every answer</p><h3>Receive specific feedback for every answer you submit.</h3><p>See whether each answer was correct, what went wrong, why you lost marks and how you can improve it.</p></div><figure className="product-shot report-shot review-shot"><img src="/landing%20page%20images/Attempt%20Report%20Question%20review.png" alt="Question-by-question report showing a learner response and specific examiner feedback"/></figure></article>
          <article className="report-tour-row progress-summary-row"><div><span>03</span><p className="eyebrow">Track your progress</p><h3>See your strongest and weakest topics.</h3><p>Your completed papers show which topics you understand and which ones need more practice.</p></div><figure className="product-shot report-shot radar-shot"><img src="/landing%20page%20images/my%20progress%20-%20radar%20chart%20for%20math.png" alt="Mathematics progress dashboard with subject radar profile and recommended focus"/></figure></article>
        </div>
      </section>
      <section className="container section pricing" id="pricing"><div className="pricing-head"><div><p className="eyebrow">Join the beta</p><h2>Real exam practice. Your feedback helps us improve it.</h2></div><span><ShieldCheck size={17}/> Free beta access. No card required.</span></div><div className="pricing-grid">
        <article className="price-card beta-price-card"><span className="popular">Beta access</span><div><p className="plan">Free Practice</p><div className="price">Free</div><p className="plan-copy">Your free account does not expire. Use invitation code <b>BETA</b> when you sign up.</p>{['5 paper attempts each day for your first 14 days','2 paper attempts each day afterward','Practice Mathematics and English A','Full examiner report and progress tracking'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button dark" onClick={beginBeta}>{betaAction} <ArrowRight size={16}/></button></article>
        <article className="price-card featured"><span className="popular">Most popular</span><div><p className="plan">Unlimited Practice</p><div className="price">$9.99 USD <small>/ month</small></div><p className="plan-copy">Unlimited exam practice for regular preparation.</p>{['Unlimited Paper 1 and Paper 2 attempts','Practice across up to 5 subjects','Full examiner report and analysis','Radar progress and question breakdowns'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button dark" onClick={()=>navigate('onboarding')}>Choose Unlimited <ArrowRight size={16}/></button></article>
        <article className="price-card coming-soon"><span className="popular">Coming soon</span><div><p className="plan">Guided Practice</p><div className="price">Coming soon</div><p className="plan-copy">Add guided lessons and worked examples to your practice.</p>{['Everything in Unlimited Practice','Guided topic lessons','Worked examples and study pathways','Full examiner report and analysis'].map(x=><p className="feature" key={x}><Check size={16}/>{x}</p>)}</div><button className="button outline" disabled>Coming soon</button></article>
      </div><p className="all-plans-note"><Check size={17}/>Every tier includes marking, a complete report, examiner analysis, radar progress and a question-by-question breakdown.</p></section>
      <section className="container closing-cta"><img src="/assets/island.png" alt="Island doodle"/><div><h2>Help us build better CSEC practice.</h2><p>Join the beta, sit a paper and tell us what makes your preparation stronger.</p></div><button className="button dark" onClick={beginBeta}>{betaAction} <ArrowRight size={17}/></button></section>
    </main>
  </div>
}
