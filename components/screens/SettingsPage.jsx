'use client';

import { Check, LoaderCircle, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AppSidebar from '../AppSidebar';
import TopUser from '../TopUser';
import { caribbeanSchools, gradeOrFormOptions } from '@/data/caribbean-schools';

const countries = [
  ['AG', 'Antigua and Barbuda'], ['BS', 'The Bahamas'], ['BB', 'Barbados'], ['BZ', 'Belize'],
  ['DM', 'Dominica'], ['DO', 'Dominican Republic'], ['GD', 'Grenada'], ['GY', 'Guyana'],
  ['HT', 'Haiti'], ['JM', 'Jamaica'], ['KN', 'Saint Kitts and Nevis'], ['LC', 'Saint Lucia'],
  ['SR', 'Suriname'], ['TT', 'Trinidad and Tobago'], ['VC', 'Saint Vincent and the Grenadines'],
];

function messageFrom(response, payload, fallback) {
  if (payload?.error?.message) return payload.error.message;
  if (response.status === 401) return 'Sign in again to update your settings.';
  return fallback;
}

let settingsCache = null;

export default function SettingsPage({ navigate }) {
  const [profile, setProfile] = useState(settingsCache?.profile || { displayName: '', phone: '', countryCode: '', gradeForm: '', institutionName: '' });
  const [identity, setIdentity] = useState(settingsCache?.identity || { email: '', avatarUrl: null });
  const [catalogue, setCatalogue] = useState(settingsCache?.catalogue || []);
  const [selectedSubjects, setSelectedSubjects] = useState(settingsCache?.selectedSubjects || []);
  const [subjectLimit, setSubjectLimit] = useState(settingsCache?.subjectLimit || 5);
  const [loading, setLoading] = useState(!settingsCache);
  const [profileSaving, setProfileSaving] = useState(false);
  const [subjectsSaving, setSubjectsSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [subjectsNotice, setSubjectsNotice] = useState('');
  const [billing, setBilling] = useState(settingsCache?.billing || { plan: 'guest', subscription: null });
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/me/profile'), fetch('/api/catalog/subjects'), fetch('/api/me/subscription')])
      .then(async ([profileResponse, catalogueResponse, billingResponse]) => {
        const [profilePayload, cataloguePayload, billingPayload] = await Promise.all([profileResponse.json().catch(() => ({})), catalogueResponse.json().catch(() => ({})), billingResponse.json().catch(() => ({}))]);
        if (!profileResponse.ok) throw new Error(messageFrom(profileResponse, profilePayload, 'We could not load your profile.'));
        if (!catalogueResponse.ok) throw new Error(messageFrom(catalogueResponse, cataloguePayload, 'We could not load the subject catalogue.'));
        if (!active) return;
        const data = profilePayload.data;
        const nextProfile = { displayName: data.displayName || '', phone: data.phone || '', countryCode: data.countryCode || '', gradeForm: data.gradeForm || '', institutionName: data.institutionName || data.institution?.name || '' };
        const nextIdentity = { email: data.email || '', avatarUrl: data.avatarUrl || null };
        const nextSubjects = (data.subjects || []).map((subject) => subject.id);
        const nextLimit = data.subjectLimit || 5;
        const nextCatalogue = cataloguePayload.data || [];
        const nextBilling = billingResponse.ok ? (billingPayload.data || { plan: 'guest', subscription: null }) : billing;
        settingsCache = { profile: nextProfile, identity: nextIdentity, selectedSubjects: nextSubjects, subjectLimit: nextLimit, catalogue: nextCatalogue, billing: nextBilling };
        setProfile(nextProfile); setIdentity(nextIdentity); setSelectedSubjects(nextSubjects); setSubjectLimit(nextLimit); setCatalogue(nextCatalogue); setBilling(nextBilling);
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const initials = useMemo(() => profile.displayName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'U', [profile.displayName]);
  const countryName = countries.find(([code]) => code === profile.countryCode)?.[1];
  const schoolOptions = ['Homeschooled', ...(caribbeanSchools[countryName] || [])];
  const update = (field, value) => { setProfile((current) => ({ ...current, [field]: value })); setError(''); setProfileNotice(''); };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!profile.displayName.trim()) return setError('Enter your full name.');
    setProfileSaving(true); setError(''); setProfileNotice('');
    try {
      const response = await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: profile.displayName.trim(), phone: profile.phone.trim() || null, countryCode: profile.countryCode || null, gradeForm: profile.gradeForm.trim() || null, institutionName: profile.institutionName.trim() || null }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageFrom(response, payload, 'We could not save your profile.'));
      const data = payload.data;
      setProfile((current) => ({ ...current, displayName: data.displayName || current.displayName, phone: data.phone || '', countryCode: data.countryCode || '', gradeForm: data.gradeForm || '', institutionName: data.institutionName || data.institution?.name || current.institutionName }));
      setProfileNotice('Profile saved.');
    } catch (saveError) { setError(saveError.message); } finally { setProfileSaving(false); }
  };

  const toggleSubject = (id) => {
    setSubjectsNotice(''); setError('');
    setSelectedSubjects((current) => {
      if (current.includes(id)) return current.filter((subjectId) => subjectId !== id);
      if (current.length >= subjectLimit) { setError(`You can select up to ${subjectLimit} subjects.`); return current; }
      return [...current, id];
    });
  };

  const saveSubjects = async () => {
    if (!selectedSubjects.length) return setError('Choose at least one subject.');
    setSubjectsSaving(true); setSubjectsNotice(''); setError('');
    try {
      const response = await fetch('/api/me/subjects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectIds: selectedSubjects }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageFrom(response, payload, 'We could not save your subjects.'));
      setSelectedSubjects((payload.data?.subjects || []).map((subject) => subject.id));
      setSubjectLimit(payload.data?.subjectLimit || subjectLimit);
      setSubjectsNotice('Subjects saved.');
    } catch (saveError) { setError(saveError.message); } finally { setSubjectsSaving(false); }
  };

  const openBilling = async () => {
    setBillingBusy(true); setError('');
    try {
      const endpoint = billing.plan === 'practice' ? '/api/billing/portal' : '/api/billing/checkout';
      const response = await fetch(endpoint, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.data?.url) throw new Error(messageFrom(response, payload, 'Billing is not available yet.'));
      window.location.assign(payload.data.url);
    } catch (billingError) { setError(billingError.message); setBillingBusy(false); }
  };

  return <div className="app-shell"><AppSidebar active="settings" onNavigate={navigate}/><main className="app-main"><TopUser/><h1 className="app-title">Profile & Settings</h1>
    {loading && <div className="settings-state" role="status"><LoaderCircle className="spin" size={20}/> Loading your settings…</div>}
    {!loading && error && <div className="settings-state error" role="alert">{error}</div>}
    {!loading && <section className="settings-grid">
      <article className="settings-card"><div className="settings-card-heading"><div><h2>Profile</h2><p>Keep your learner details up to date.</p></div><div className="settings-avatar" aria-label={identity.avatarUrl ? 'Google profile picture' : 'Profile initials'}>{identity.avatarUrl ? <img src={identity.avatarUrl} alt="" referrerPolicy="no-referrer"/> : initials ? <span>{initials}</span> : <UserRound size={22}/>}</div></div>
        <form onSubmit={saveProfile}><label>Full name<input value={profile.displayName} onChange={(event) => update('displayName', event.target.value)} autoComplete="name"/></label><label>Email address<input value={identity.email} readOnly aria-readonly="true"/><small>Email is managed by your sign-in account.</small></label>
          <div className="settings-field-row"><label>Phone number<input value={profile.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" placeholder="Optional"/></label><label>Country<select value={profile.countryCode} onChange={(event) => update('countryCode', event.target.value)}><option value="">Choose a country</option>{countries.map(([code, name]) => <option value={code} key={code}>{name}</option>)}</select></label></div>
          <div className="settings-field-row"><label>Grade or form<select value={profile.gradeForm} onChange={(event) => update('gradeForm', event.target.value)}><option value="">Choose your grade or form</option>{gradeOrFormOptions.map((option)=><option key={option}>{option}</option>)}</select></label><label>School or institution<input list="settings-school-options" value={profile.institutionName} onChange={(event) => update('institutionName', event.target.value)} placeholder="Search or enter your school"/><datalist id="settings-school-options">{schoolOptions.map((school)=><option value={school} key={school}/>)}</datalist><small>Choose a suggestion or enter a school that is not listed.</small></label></div>
          <div className="settings-actions"><button className="button dark" disabled={profileSaving}>{profileSaving ? <><LoaderCircle className="spin" size={16}/> Saving…</> : 'Save profile'}</button>{profileNotice && <span className="settings-success"><Check size={15}/>{profileNotice}</span>}</div></form>
      </article>
      <div className="settings-side-stack"><article className="settings-card"><div className="settings-card-heading"><div><h2>Your subjects</h2><p>{selectedSubjects.length} of {subjectLimit} selected</p></div></div><div className="settings-subject-list">{catalogue.map((subject) => <label className={selectedSubjects.includes(subject.id) ? 'selected' : ''} key={subject.id}><input type="checkbox" checked={selectedSubjects.includes(subject.id)} onChange={() => toggleSubject(subject.id)}/><span>{subject.name}</span>{selectedSubjects.includes(subject.id) && <Check size={16}/>}</label>)}</div><div className="settings-actions"><button type="button" className="button dark" onClick={saveSubjects} disabled={subjectsSaving}>{subjectsSaving ? <><LoaderCircle className="spin" size={16}/> Saving…</> : 'Save subjects'}</button>{subjectsNotice && <span className="settings-success"><Check size={15}/>{subjectsNotice}</span>}</div></article>
        <article className="settings-card plan-card"><h2>Current access</h2><div className="plan-summary"><div><b>{billing.plan === 'practice' ? 'Practice' : 'Guest'}</b><span>{billing.plan === 'practice' ? 'Unlimited Paper 1 and Paper 2 attempts for five subjects' : 'One Paper 1 and one Paper 2 attempt each day'}</span></div><span className="success-pill">{billing.subscription?.status || 'Active'}</span></div><p>{billing.plan === 'practice' ? 'Manage payment details, invoices or cancellation in the secure billing portal.' : 'Reports, AI analysis, radar progress and question breakdowns are included. Upgrade for unlimited attempts.'}</p><button type="button" className="button dark" disabled={billingBusy} onClick={openBilling}>{billingBusy ? 'Opening…' : billing.plan === 'practice' ? 'Manage billing' : 'Upgrade to Practice'}</button></article>
      </div>
    </section>}
  </main></div>;
}
