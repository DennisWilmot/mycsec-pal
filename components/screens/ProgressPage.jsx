'use client';

import { ArrowUpRight, ChevronRight, LoaderCircle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppSidebar from '../AppSidebar';
import RadarChart from '../RadarChart';

function scoreState(score) {
  if (score >= 70) return { label: 'Strong', className: 'up', Icon: TrendingUp };
  if (score < 55) return { label: 'Needs work', className: 'down', Icon: TrendingDown };
  return { label: 'Steady', className: 'flat', Icon: Minus };
}

function hours(seconds) {
  const value = Number(seconds) || 0;
  return value < 3600 ? `${Math.round(value / 60)} min` : `${(value / 3600).toFixed(1)} hrs`;
}

function date(value, short = false) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', short
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

const progressCache = new Map();

export default function ProgressPage({ navigate }) {
  const [subjectId, setSubjectId] = useState('overall');
  const [tableView, setTableView] = useState('attempts');
  const [data, setData] = useState(progressCache.get('overall') || null);
  const [loading, setLoading] = useState(!progressCache.has('overall'));
  const [error, setError] = useState('');

  const load = useCallback(async (scope = subjectId) => {
    const cached = progressCache.get(scope);
    if (cached) setData(cached);
    setLoading(!cached); setError('');
    try {
      const query = scope === 'overall' ? '' : `?subjectId=${encodeURIComponent(scope)}`;
      const response = await fetch(`/api/me/progress${query}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'We could not load your progress.');
      progressCache.set(scope, payload.data); setData(payload.data);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [subjectId]);

  useEffect(() => { load(subjectId); }, [subjectId, load]);
  const currentSubject = subjectId === 'overall' ? { name: 'Overall' } : data?.subjects.find((subject) => subject.id === subjectId) || { name: 'Subject' };
  const axes = useMemo(() => data?.scope.axes || [], [data]);
  const hasEvidence = axes.length > 0;

  return <div className="app-shell"><AppSidebar active="progress" onNavigate={navigate}/><main className="app-main progress-page">
    <div className="page-title-row progress-title-row"><div><p className="eyebrow">See how far you’ve come</p><h1>My Progress</h1></div><img className="header-doodle" src="/assets/hero-pals.png" alt="Study companions"/></div>
    {loading && !data && <div className="practice-state-message"><LoaderCircle className="spin" size={19}/>Loading your marked attempts…</div>}
    {error && <div className="practice-state-message error" role="alert"><div><strong>We couldn’t load Progress.</strong><p>{error}</p><button className="button outline small" onClick={()=>load(subjectId)}>Try again</button></div></div>}
    {data && <>
      <section className="progress-overview" aria-labelledby="month-heading"><div className="progress-overview-heading"><div><p className="eyebrow">Your month so far</p><h2 id="month-heading">{data.summary.papersCompleted ? 'You’ve been making progress this month.' : 'Your marked papers will appear here.'}</h2></div><p>{data.summary.papersCompleted ? 'Keep the momentum going.' : 'Complete a published paper to begin your profile.'}</p></div>
        <div className="progress-stat-grid"><article><span>Papers completed</span><strong>{data.summary.papersCompleted}</strong><small className={data.summary.papersChange > 0 ? 'positive' : ''}>{data.summary.papersChange > 0 && <ArrowUpRight size={14}/>} {data.summary.papersChange === 0 ? 'No change from last month' : `${Math.abs(data.summary.papersChange)} ${data.summary.papersChange > 0 ? 'more' : 'fewer'} than last month`}</small></article>
          <article><span>Average score</span><strong>{data.summary.papersCompleted ? `${data.summary.average}%` : '—'}</strong><small className={data.summary.averageChange > 0 ? 'positive' : ''}>{data.summary.papersCompleted ? `${data.summary.averageChange > 0 ? 'Up ' : ''}${data.summary.averageChange}% from last month` : 'Awaiting evidence'}</small></article>
          <article><span>Time practising</span><strong>{hours(data.summary.timeSeconds)}</strong><small>Marked attempts this month</small></article>
          <article><span>Last activity</span><strong>{date(data.summary.lastActivity?.at, true)}</strong><small>{data.summary.lastActivity ? `${data.summary.lastActivity.subjectName} Paper ${data.summary.lastActivity.paperNumber}` : 'No marked attempts yet'}</small></article></div>
      </section>
      <div className="subject-tabs progress-subject-tabs" aria-label="Filter progress by subject"><button className={subjectId === 'overall' ? 'active' : ''} onClick={()=>setSubjectId('overall')}>Overall</button>{data.subjects.map((subject)=><button key={subject.id} className={subjectId === subject.id ? 'active' : ''} onClick={()=>setSubjectId(subject.id)}>{subject.name}</button>)}</div>
      <section className="progress-profile-card"><div className="progress-section-heading"><div><p className="eyebrow">{currentSubject.name}</p><h2>{subjectId === 'overall' ? 'Overall CSEC profile' : `${currentSubject.name} profile`}</h2></div><span/></div>
        {hasEvidence ? <div className="profile-visual-grid insight-first"><aside className="profile-insight"><h3>{data.scope.average >= 70 ? 'A strong current profile.' : data.scope.average >= 55 ? 'You’re building a steady profile.' : 'There is room to grow.'}</h3><div className="average-highlight"><span>Current average</span><strong>{data.scope.average}%</strong></div>{data.scope.strongest ? <p>Your strongest reliable area is <strong>{data.scope.strongest.label}</strong> at {data.scope.strongest.value}%.</p> : <p>Complete more questions before we name a strongest area.</p>}{data.scope.focus ? <div className="focus-callout"><small>Recommended focus</small><strong>{data.scope.focus.label}</strong><span>{data.scope.focus.value}% · Based on {data.scope.focus.evidence} pieces of evidence</span></div> : <p className="percentile-note">Recommendations appear after at least {data.scope.minimumEvidence} pieces of evidence.</p>}</aside><RadarChart key={subjectId} axes={axes}/></div> : <div className="practice-state-message"><span>No marked evidence exists for this view yet.</span><button className="button dark small" onClick={()=>navigate('practice')}>Start practising</button></div>}
      </section>
      <section className="progress-data-card"><div className="progress-data-header"><div className="data-view-tabs" role="tablist" aria-label="Progress details"><button role="tab" aria-selected={tableView === 'attempts'} className={tableView === 'attempts' ? 'active' : ''} onClick={()=>setTableView('attempts')}>Recent attempts</button><button role="tab" aria-selected={tableView === 'topics'} className={tableView === 'topics' ? 'active' : ''} onClick={()=>setTableView('topics')}>Topic status</button></div><span>{tableView === 'attempts' ? data.attempts.length : data.topics.length} records · {currentSubject.name}</span></div>
        {tableView === 'attempts' ? <div className="progress-table" role="table" aria-label="Recent paper attempts"><div className="progress-table-head" role="row"><span>Subject</span><span>Paper</span><span>Date</span><span>Score</span><span>Status</span><span>Report</span></div>{data.attempts.map((attempt)=>{const state=scoreState(attempt.percentage);const viewReport=()=>window.location.assign(`/results/${attempt.id}`);return <div className="progress-table-row" role="link" tabIndex={0} aria-label={`View ${attempt.subjectName} Paper ${attempt.paperNumber} report`} key={attempt.id} onClick={viewReport} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();viewReport();}}}><strong>{attempt.subjectName}</strong><span>Paper {attempt.paperNumber}</span><span>{date(attempt.publishedAt)}</span><b>{attempt.percentage}%</b><em className={state.className}><state.Icon size={14}/>{state.label}</em><button type="button" className="report-row-action" onClick={(event)=>{event.stopPropagation();viewReport();}}>View report<ChevronRight size={15}/></button></div>})}{!data.attempts.length && <div className="practice-state-message">No marked attempts in this view.</div>}</div>
        : <div className="progress-table" role="table" aria-label="Topic status"><div className="progress-table-head topic-table-head" role="row"><span>Topic</span><span>Subject</span><span>Score</span><span>Evidence</span><span/></div>{data.topics.map((topic)=>{const state=scoreState(topic.score);return <div className="progress-table-row topic-table-row" role="row" key={topic.id}><strong>{topic.topicName}</strong><span>{topic.subjectName}</span><b>{topic.score}%</b><em className={state.className}><state.Icon size={14}/>{topic.evidence} questions</em><span>{date(topic.lastPractised, true)}</span></div>})}{!data.topics.length && <div className="practice-state-message">No topic evidence in this view.</div>}</div>}
      </section>
    </>}
  </main></div>;
}
