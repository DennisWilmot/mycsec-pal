'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import AppSidebar from '../AppSidebar';
import RadarChart from '../RadarChart';

const subjects = [
  { id: 'overall', label: 'Overall' },
  { id: 'mathematics', label: 'Mathematics' },
  { id: 'english', label: 'English A' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'physics', label: 'Physics' },
  { id: 'biology', label: 'Biology' },
  { id: 'accounts', label: 'Principles of Accounts' },
  { id: 'business', label: 'Principles of Business' },
];

const profiles = {
  overall: [
    { label: 'Mathematics', value: 78 }, { label: 'English A', value: 64 },
    { label: 'Chemistry', value: 58 }, { label: 'Physics', value: 61 },
    { label: 'Biology', value: 70 }, { label: 'Accounts', value: 55 },
    { label: 'Business', value: 67 },
  ],
  mathematics: [
    { label: 'Algebra', value: 84 }, { label: 'Number', value: 76 },
    { label: 'Geometry', value: 46 }, { label: 'Trigonometry', value: 52 },
    { label: 'Statistics', value: 68 }, { label: 'Measurement', value: 62 },
  ],
  english: [
    { label: 'Comprehension', value: 74 }, { label: 'Grammar', value: 68 },
    { label: 'Summary', value: 61 }, { label: 'Argument', value: 70 },
    { label: 'Vocabulary', value: 77 }, { label: 'Writing', value: 66 },
  ],
  chemistry: [
    { label: 'Atomic theory', value: 63 }, { label: 'Bonding', value: 58 },
    { label: 'Stoichiometry', value: 49 }, { label: 'Acids', value: 71 },
    { label: 'Organic', value: 54 }, { label: 'Energetics', value: 60 },
  ],
  physics: [
    { label: 'Mechanics', value: 66 }, { label: 'Waves', value: 57 },
    { label: 'Electricity', value: 62 }, { label: 'Thermal', value: 71 },
    { label: 'Optics', value: 55 }, { label: 'Nuclear', value: 51 },
  ],
  biology: [
    { label: 'Cells', value: 78 }, { label: 'Genetics', value: 64 },
    { label: 'Ecology', value: 72 }, { label: 'Nutrition', value: 69 },
    { label: 'Transport', value: 61 }, { label: 'Reproduction', value: 67 },
  ],
  accounts: [
    { label: 'Ledgers', value: 62 }, { label: 'Journals', value: 58 },
    { label: 'Statements', value: 67 }, { label: 'Ratios', value: 53 },
    { label: 'Control', value: 60 }, { label: 'Partnerships', value: 49 },
  ],
  business: [
    { label: 'Enterprise', value: 73 }, { label: 'Marketing', value: 68 },
    { label: 'Finance', value: 57 }, { label: 'Operations', value: 64 },
    { label: 'People', value: 72 }, { label: 'Economy', value: 61 },
  ],
};

const topicNames = {
  mathematics: ['Algebra', 'Number theory', 'Geometry', 'Trigonometry', 'Statistics', 'Measurement', 'Functions', 'Matrices', 'Vectors', 'Consumer arithmetic'],
  english: ['Comprehension', 'Grammar', 'Summary writing', 'Argumentative writing', 'Vocabulary', 'Narrative writing', 'Expository writing', 'Poetry', 'Prose', 'Drama'],
  chemistry: ['Atomic structure', 'Bonding', 'Stoichiometry', 'Acids and bases', 'Organic chemistry', 'Energetics', 'Rates', 'Equilibrium', 'Electrochemistry', 'Metals'],
  physics: ['Mechanics', 'Waves', 'Electricity', 'Thermal physics', 'Optics', 'Nuclear physics', 'Magnetism', 'Energy', 'Measurement', 'Electronics'],
  biology: ['Cells', 'Genetics', 'Ecology', 'Nutrition', 'Transport', 'Reproduction', 'Respiration', 'Coordination', 'Disease', 'Evolution'],
  accounts: ['Ledgers', 'Journals', 'Financial statements', 'Ratios', 'Control accounts', 'Partnerships', 'Manufacturing', 'Cash books', 'Adjustments', 'Incomplete records'],
  business: ['Enterprise', 'Marketing', 'Finance', 'Operations', 'Human resources', 'The economy', 'Communication', 'Business law', 'Trade', 'Technology'],
};

const overallAttempts = [
  ['Mathematics', 'Paper 2', '12 Jul 2026', 72], ['English A', 'Paper 1', '10 Jul 2026', 68],
  ['Biology', 'Paper 1', '8 Jul 2026', 76], ['Chemistry', 'Paper 2', '5 Jul 2026', 59],
  ['Physics', 'Paper 1', '2 Jul 2026', 64], ['Mathematics', 'Paper 1', '29 Jun 2026', 65],
  ['Principles of Business', 'Paper 1', '26 Jun 2026', 71], ['English A', 'Paper 2', '23 Jun 2026', 62],
  ['Principles of Accounts', 'Paper 2', '20 Jun 2026', 55], ['Biology', 'Paper 2', '17 Jun 2026', 69],
];

function makeAttempts(subjectId) {
  if (subjectId === 'overall') return overallAttempts;
  const subject = subjects.find((item) => item.id === subjectId).label;
  return Array.from({ length: 10 }, (_, index) => [
    subject,
    `Paper ${index % 2 ? 2 : 1}`,
    `${12 - index} Jul 2026`,
    Math.max(42, profiles[subjectId][index % profiles[subjectId].length].value - (index % 3) * 3),
  ]);
}

function makeTopics(subjectId) {
  if (subjectId === 'overall') {
    return subjects.slice(1).flatMap((subject) => profiles[subject.id].slice(0, 2).map((axis) => ({
      topic: axis.label,
      subject: subject.label,
      score: axis.value,
    }))).slice(0, 10);
  }
  return topicNames[subjectId].map((topic, index) => ({
    topic,
    subject: subjects.find((item) => item.id === subjectId).label,
    score: Math.max(38, profiles[subjectId][index % profiles[subjectId].length].value - (index % 4) * 3),
  }));
}

function scoreState(score) {
  if (score >= 70) return { label: 'Strong', className: 'up', Icon: TrendingUp };
  if (score < 55) return { label: 'Needs work', className: 'down', Icon: TrendingDown };
  return { label: 'Steady', className: 'flat', Icon: Minus };
}

export default function ProgressPage({ navigate }) {
  const [subject, setSubject] = useState('overall');
  const [tableView, setTableView] = useState('attempts');
  const currentSubject = subjects.find((item) => item.id === subject);
  const attempts = useMemo(() => makeAttempts(subject), [subject]);
  const topics = useMemo(() => makeTopics(subject), [subject]);
  const profileSummary = useMemo(() => {
    const axes = profiles[subject];
    const sorted = [...axes].sort((a,b) => b.value-a.value);
    const average = Math.round(axes.reduce((total,axis)=>total+axis.value,0)/axes.length);
    return {average,best:sorted[0],focus:sorted[sorted.length-1]};
  }, [subject]);

  return (
    <div className="app-shell">
      <AppSidebar active="progress" onNavigate={navigate} />
      <main className="app-main progress-page">
        <div className="page-title-row progress-title-row">
          <div>
            <p className="eyebrow">See how far you’ve come</p>
            <h1>My Progress</h1>
          </div>
          <img className="header-doodle" src="/assets/hero-pals.png" alt="Study companions" />
        </div>

        <section className="progress-overview" aria-labelledby="month-heading">
          <div className="progress-overview-heading">
            <div><p className="eyebrow">Your month so far</p><h2 id="month-heading">You’ve been making good progress this month.</h2></div>
            <p>Keep the momentum going, Quin!</p>
          </div>
          <div className="progress-stat-grid">
            <article><span>Papers completed</span><strong>6</strong><small className="positive"><ArrowUpRight size={14}/> 2 more than June</small></article>
            <article><span>Average score</span><strong>68%</strong><small className="positive"><ArrowUpRight size={14}/> Up 4%</small></article>
            <article><span>Time practising</span><strong>5.2 hrs</strong><small>Across all subjects</small></article>
            <article><span>Last activity</span><strong>12 Jul</strong><small>Mathematics Paper 2</small></article>
          </div>
        </section>

        <div className="subject-tabs progress-subject-tabs" aria-label="Filter progress by subject">
          {subjects.map((item) => <button key={item.id} className={subject === item.id ? 'active' : ''} onClick={() => setSubject(item.id)}>{item.label}</button>)}
        </div>

        <section className="progress-profile-card">
          <div className="progress-section-heading">
            <div><p className="eyebrow">{currentSubject.label}</p><h2>{subject === 'overall' ? 'Overall CSEC profile' : `${currentSubject.label} profile`}</h2></div>
            <span />
          </div>
          <div className="profile-visual-grid insight-first"><aside className="profile-insight"><h3>{profileSummary.average >= 70 ? 'A strong overall profile.' : profileSummary.average >= 55 ? 'You’re building a steady profile.' : 'There is room to grow.'}</h3><div className="average-highlight"><span>Current average</span><strong>{profileSummary.average}%</strong></div><p>Your strongest area is <strong>{profileSummary.best.label}</strong> at {profileSummary.best.value}%.</p><div className="focus-callout"><small>Recommended focus</small><strong>{profileSummary.focus.label}</strong><span>{profileSummary.focus.value}% · Practice this area next</span></div><p className="percentile-note">Platform ranking will appear when learner comparison data is connected.</p></aside><RadarChart key={subject} axes={profiles[subject]} /></div>
        </section>

        <section className="progress-data-card">
          <div className="progress-data-header">
            <div className="data-view-tabs" role="tablist" aria-label="Progress details">
              <button role="tab" aria-selected={tableView === 'attempts'} className={tableView === 'attempts' ? 'active' : ''} onClick={() => setTableView('attempts')}>Recent attempts</button>
              <button role="tab" aria-selected={tableView === 'topics'} className={tableView === 'topics' ? 'active' : ''} onClick={() => setTableView('topics')}>Topic status</button>
            </div>
            <span>Showing 10 {tableView === 'attempts' ? 'attempts' : 'topics'} · {currentSubject.label}</span>
          </div>

          {tableView === 'attempts' ? <div className="progress-table" role="table" aria-label="Recent paper attempts">
            <div className="progress-table-head" role="row"><span>Subject</span><span>Paper</span><span>Date</span><span>Score</span><span>Status</span><span /></div>
            {attempts.map(([name, paper, date, score], index) => {
              const state = scoreState(score);
              return <button className="progress-table-row" role="row" key={`${name}-${date}-${index}`} onClick={() => navigate('results')}>
                <strong>{name}</strong><span>{paper}</span><span>{date}</span><b>{score}%</b><em className={state.className}><state.Icon size={14}/>{state.label}</em><ChevronRight size={17}/>
              </button>;
            })}
          </div> : <div className="progress-table" role="table" aria-label="Topic status">
            <div className="progress-table-head topic-table-head" role="row"><span>Topic</span><span>Subject</span><span>Recent score</span><span>Trend</span><span /></div>
            {topics.map(({ topic, subject: topicSubject, score }) => {
              const state = scoreState(score);
              return <button className="progress-table-row topic-table-row" role="row" key={`${topicSubject}-${topic}`} onClick={() => setSubject(subjects.find((item) => item.label === topicSubject)?.id || subject)}>
                <strong>{topic}</strong><span>{topicSubject}</span><b>{score}%</b><em className={state.className}><state.Icon size={14}/>{state.label}</em><ChevronRight size={17}/>
              </button>;
            })}
          </div>}
        </section>
      </main>
    </div>
  );
}
