'use client';

import { ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, HeartHandshake, KeyRound, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { gradeOrFormOptions, schoolsForCountry } from '@/data/caribbean-schools';

const roles = [
  { id: 'student', label: 'Student', copy: 'I’m preparing for my CSEC exams.', Icon: GraduationCap },
  { id: 'teacher', label: 'Teacher', copy: 'I support students and track learning.', Icon: BookOpen },
  { id: 'parent', label: 'Parent or guardian', copy: 'I’m helping my child prepare.', Icon: HeartHandshake },
];
const countryCodes = {
  'Antigua and Barbuda': 'AG', 'The Bahamas': 'BS', Barbados: 'BB', Belize: 'BZ', Dominica: 'DM',
  'Dominican Republic': 'DO', Grenada: 'GD', Guyana: 'GY', Haiti: 'HT', Jamaica: 'JM',
  'Saint Kitts and Nevis': 'KN', 'Saint Lucia': 'LC', Suriname: 'SR', 'Trinidad and Tobago': 'TT',
  'Saint Vincent and the Grenadines': 'VC',
};
const onboardingFieldMap = { displayName: 'name', gradeForm: 'grade', institutionName: 'school', subjectIds: 'subjects' };

function authErrorMessage(error) {
  const message = error?.message || '';
  if (/already registered|already exists/i.test(message)) return 'An account already exists for this email. Sign in instead.';
  if (/invalid login credentials/i.test(message)) return 'The email or password is incorrect.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email using the link we sent, then sign in.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a moment, then try again.';
  if (/fetch|network/i.test(message)) return 'We could not reach the sign-in service. Check your connection and try again.';
  return message || 'Authentication could not be completed. Please try again.';
}

export default function OnboardingPage({ navigate }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('signup');
  const [role, setRole] = useState('student');
  const [selectedSubjects, setSelectedSubjects] = useState(['Mathematics']);
  const [showPassword, setShowPassword] = useState(false);
  const [linkChild, setLinkChild] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [catalogue, setCatalogue] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', grade: '', school: '', country: 'Jamaica', childName: '', childEmail: '', couponCode: '' });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signin') setMode('signin');
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      setAuthenticated(true);
      window.sessionStorage.removeItem('mycsecpal-auth-mode');
      // OAuth can return through either the sign-in or sign-up entry point.
      // Always ask the server whether this identity already has a completed
      // profile before deciding to show onboarding again.
      continueAfterSignIn(data.session.user).catch((error) => setNotice(error.message));
    });
    // RouteScreen recreates its navigation callback on render; session restore
    // should run once when this screen mounts, not after each form update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== 4) return;
    setCatalogueLoading(true);
    fetch('/api/catalog/subjects')
      .then(async (response) => {
        if (!response.ok) throw new Error('Subject catalogue is unavailable.');
        const payload = await response.json();
        setCatalogue(payload.data?.subjects || payload.subjects || payload.data || []);
      })
      .catch(() => setNotice('We could not load the live subject list. Check your connection and try again.'))
      .finally(() => setCatalogueLoading(false));
  }, [step]);

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    setNotice('');
  };
  const toggleSubject = (subject) => setSelectedSubjects((current) => current.includes(subject) ? current.filter((item) => item !== subject) : current.length < 5 ? [...current, subject] : current);

  const validateAccount = () => {
    const next = {};
    if (mode === 'signup' && !form.name.trim()) next.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address, for example name@example.com.';
    if (form.password.length < 8) next.password = 'Password must contain at least 8 characters.';
    if (mode === 'signup' && form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    if (mode === 'signup' && !terms) next.terms = 'You must accept the Terms of Use and Privacy Policy.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const validateDetails = () => {
    const next = {};
    if (!form.school.trim()) next.school = 'Enter a school or institution.';
    if (!form.country) next.country = 'Choose a country.';
    if (role === 'student' && !form.grade.trim()) next.grade = 'Enter your grade or form.';
    if (role === 'parent' && !form.childName.trim()) next.childName = 'Enter your child’s name.';
    if (role === 'parent' && linkChild && !/^\S+@\S+\.\S+$/.test(form.childEmail)) next.childEmail = 'Enter the email used for your child’s account.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const getClient = () => {
    const client = createSupabaseBrowserClient();
    if (!client) setNotice('Sign-in is not configured yet. Add the Supabase project URL and public anon key, then restart the app.');
    return client;
  };

  const continueAfterSignIn = async (user) => {
    const response = await fetch('/api/me/profile', { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json();
      if (payload.data?.onboardingCompletedAt) {
        const next = new URLSearchParams(window.location.search).get('next');
        if (next?.startsWith('/') && !next.startsWith('//')) window.location.assign(next);
        else navigate('practice');
        return;
      }
    } else if (response.status !== 404) {
      throw new Error('We signed you in, but could not load your profile. Check your connection and try again.');
    }
    setMode('signup');
    setAuthenticated(true);
    setForm((current) => ({ ...current, name: current.name || user?.user_metadata?.full_name || user?.user_metadata?.name || '' }));
    setStep(2);
    setNotice('Finish these details before going to your dashboard.');
  };

  const authenticateWithEmail = async () => {
    if (!validateAccount()) return;
    const supabase = getClient();
    if (!supabase) return;
    setBusy(true);
    setNotice('');
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        await continueAfterSignIn(data.user);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (error) throw error;
      if (!data.session) {
        setNotice('Check your inbox and confirm your email. Return here afterwards to finish setting up your profile.');
        return;
      }
      setAuthenticated(true);
      setStep(2);
    } catch (error) {
      setNotice(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const authenticateWithGoogle = async () => {
    const supabase = getClient();
    if (!supabase) return;
    setBusy(true);
    setNotice('');
    window.sessionStorage.setItem('mycsecpal-auth-mode', mode);
    // Never let a previous MyCSECPal session determine which profile receives
    // the next OAuth callback. This clears only this browser's app session;
    // Google then presents its account chooser explicitly.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      window.sessionStorage.removeItem('mycsecpal-auth-mode');
      setNotice(authErrorMessage(error));
      setBusy(false);
    }
  };

  const completeOnboarding = async () => {
    if (!authenticated) {
      setStep(1);
      setNotice('Your session expired. Sign in again to finish onboarding.');
      return;
    }
    const resolved = selectedSubjects.map((name) => catalogue.find((subject) => subject.name === name)).filter(Boolean);
    if (resolved.length !== selectedSubjects.length) {
      setErrors({ subjects: 'Some selected subjects are not available yet. Choose from the live subject list and try again.' });
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.name.trim(), role, countryCode: countryCodes[form.country],
          gradeForm: role === 'student' ? form.grade.trim() : null,
          institutionName: form.school.trim(),
          subjectIds: resolved.map((subject) => subject.id),
          couponCode: form.couponCode.trim() || undefined,
          termsVersion: '2026-07-12', privacyVersion: '2026-07-12',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fieldErrors = {};
        Object.entries(payload.error?.fields || {}).forEach(([field, messages]) => { fieldErrors[onboardingFieldMap[field] || field] = Array.isArray(messages) ? messages[0] : messages; });
        setErrors(fieldErrors);
        throw new Error(payload.error?.message || 'Your profile could not be saved.');
      }
      navigate('practice');
    } catch (error) {
      setNotice(/fetch|network/i.test(error.message) ? 'Your details are safe on this screen, but we could not reach the server. Check your connection and try again.' : error.message);
    } finally {
      setBusy(false);
    }
  };

  const continueFlow = async () => {
    if (step === 1) return authenticateWithEmail();
    if (step === 3 && !validateDetails()) return;
    if (step === 4) {
      if (selectedSubjects.length === 0) return setErrors({ subjects: 'Choose at least one subject.' });
      return completeOnboarding();
    }
    setErrors({});
    setStep(step + 1);
  };

  const visibleSubjects = catalogue.map((subject) => subject.name);
  const schoolOptions = schoolsForCountry(form.country);
  return <main className="onboarding-page split-onboarding"><section className="onboarding-visual"><button className="wordmark" onClick={() => navigate('landing')}><img src="/assets/brand/mycsecpal-logo.png" alt="MyCSECPal" /></button><div><p className="eyebrow">Built for Caribbean learners</p><h2>{mode === 'signin' ? 'Welcome back.' : 'Your CSEC progress starts here.'}</h2><p>Practise full papers, receive detailed feedback and see exactly where to focus next.</p></div><img src="/assets/hero-pals.png" alt="MyCSECPal study companions" /><blockquote>“Small steps today, strong results tomorrow.”</blockquote></section><section className="onboarding-form-side"><header className="onboarding-mobile-head"><button className="wordmark" onClick={() => navigate('landing')}><img src="/assets/brand/mycsecpal-logo.png" alt="MyCSECPal" /></button><span>{mode === 'signin' ? 'Sign in' : `Step ${step} of 4`}</span></header><section className="onboarding-card split-form-card">{mode === 'signup' && <div className="onboarding-progress"><i style={{ width: `${step / 4 * 100}%` }} /></div>}
    {step === 1 && <>{mode === 'signup' ? <><p className="eyebrow">Create your account</p><h1>Start practising.</h1><p className="onboarding-intro">Create an account to save papers and view your results.</p></> : <><p className="eyebrow">Welcome back</p><h1>Sign in to MyCSECPal.</h1><p className="onboarding-intro">Continue from where you left off.</p></>}<button type="button" className="google-auth" disabled={busy} onClick={authenticateWithGoogle}><span>G</span>{busy ? 'Connecting…' : mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</button>{notice && <p className="form-notice" role="status">{notice}</p>}<div className="auth-divider"><span>or continue with email</span></div><div className="onboarding-fields two-column-fields">{mode === 'signup' && <label className="full-field">Full name<input className={errors.name ? 'invalid' : ''} value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Enter your full name" />{errors.name && <small className="field-error">{errors.name}</small>}</label>}<label className="full-field">Email address<input className={errors.email ? 'invalid' : ''} type="email" value={form.email} onChange={(event) => set('email', event.target.value)} placeholder="you@example.com" />{errors.email && <small className="field-error">{errors.email}</small>}</label><label className={mode === 'signin' ? 'full-field' : ''}>Password<div className={`password-field ${errors.password ? 'invalid' : ''}`}><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => set('password', event.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label>{mode === 'signup' && <label>Confirm password<input className={errors.confirm ? 'invalid' : ''} type="password" value={form.confirm} onChange={(event) => set('confirm', event.target.value)} placeholder="Re-enter password" />{errors.confirm && <small className="field-error">{errors.confirm}</small>}</label>}{mode === 'signup' && <label className="link-account full-field"><input type="checkbox" checked={terms} onChange={(event) => { setTerms(event.target.checked); setErrors((current) => ({ ...current, terms: '' })); }} /> I agree to the Terms of Use and Privacy Policy.</label>}{errors.terms && <small className="field-error full-field">{errors.terms}</small>}</div><p className="signin-prompt">{mode === 'signup' ? 'Already have an account?' : 'Need an account?'} <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErrors({}); setNotice(''); }}>{mode === 'signup' ? 'Sign in' : 'Create one'}</button></p></>}
    {step === 2 && <><p className="eyebrow">Let’s personalise your experience</p><h1>How will you use MyCSECPal?</h1><p className="onboarding-intro">Choose the option that fits you best. You can change this later.</p><div className="role-grid">{roles.map(({ id, label, copy, Icon }) => <button type="button" className={role === id ? 'active' : ''} onClick={() => setRole(id)} key={id}><Icon size={24} /><strong>{label}</strong><span>{copy}</span></button>)}</div></>}
    {step === 3 && <><p className="eyebrow">A little more detail</p><h1>{role === 'parent' ? 'Tell us about your child' : role === 'teacher' ? 'Set up your teaching profile' : 'Set up your student profile'}</h1><div className="onboarding-fields two-column-fields">{role === 'parent' && <label>Child’s name<input className={errors.childName ? 'invalid' : ''} value={form.childName} onChange={(event) => set('childName', event.target.value)} placeholder="Enter your child’s name" />{errors.childName && <small className="field-error">{errors.childName}</small>}</label>}{role === 'student' && <label>Grade or form<select className={errors.grade ? 'invalid' : ''} value={form.grade} onChange={(event) => set('grade', event.target.value)}><option value="">Choose your grade or form</option>{gradeOrFormOptions.map((option)=><option key={option}>{option}</option>)}</select>{errors.grade && <small className="field-error">{errors.grade}</small>}</label>}<label>School or institution<input list="caribbean-school-options" className={errors.school ? 'invalid' : ''} value={form.school} onChange={(event) => set('school', event.target.value)} placeholder="Search or enter your school" autoComplete="organization" /><datalist id="caribbean-school-options">{schoolOptions.map((school)=><option value={school} key={school}/>)}</datalist><small className="field-hint">Choose a suggestion or type a school that is not listed.</small>{errors.school && <small className="field-error">{errors.school}</small>}</label><label>Country<select value={form.country} onChange={(event) => { set('country', event.target.value); set('school', ''); }}>{Object.keys(countryCodes).map((country) => <option key={country}>{country}</option>)}</select></label>{role === 'parent' && <><label className="link-account full-field"><input type="checkbox" checked={linkChild} onChange={(event) => setLinkChild(event.target.checked)} /> Link an existing child account</label>{linkChild ? <div className="child-link-panel full-field"><Link2 size={20} /><div><strong>Send a link request</strong><p>Enter the email used for your child’s existing MyCSECPal account.</p><input className={errors.childEmail ? 'invalid' : ''} type="email" value={form.childEmail} onChange={(event) => set('childEmail', event.target.value)} placeholder="child@example.com" />{errors.childEmail && <small className="field-error">{errors.childEmail}</small>}</div></div> : <div className="child-link-panel full-field"><GraduationCap size={20} /><div><strong>A child account will be created</strong><p>Your child will receive their own dashboard after onboarding. Login details can be configured from Settings.</p></div></div>}</>}</div></>}
    {step === 4 && <><p className="eyebrow">Choose your focus</p><h1>{role === 'teacher' ? 'Which subjects do you teach?' : role === 'parent' ? 'Which subjects is your child studying?' : 'Which subjects are you studying?'}</h1><p className="onboarding-intro">Select one to five available subjects. More can be added later with a paid plan.</p><div className={`onboarding-subjects ${catalogueLoading ? 'is-loading' : ''}`} aria-busy={catalogueLoading}>{catalogueLoading ? ['Mathematics','English A','Chemistry','Physics'].map((subject)=><div className="subject-choice-skeleton" style={{position:'relative',overflow:'hidden'}} key={subject}><span>{subject}</span><i/></div>) : visibleSubjects.map((subject) => <button type="button" key={subject} className={selectedSubjects.includes(subject) ? 'active' : ''} onClick={() => { toggleSubject(subject); setErrors({}); }}>{subject}<span>{selectedSubjects.includes(subject) ? '✓' : '+'}</span></button>)}</div>{errors.subjects && <small className="field-error">{errors.subjects}</small>}<div className="beta-code-panel"><div><span className="beta-code-kicker">Beta invitation</span><strong>Have an access code?</strong><p>Unlock five paper attempts a day for your first 14 days.</p></div><label className="access-code-field"><span>Access code</span><div className={`access-code-input ${errors.couponCode ? 'invalid' : ''}`}><KeyRound size={18}/><input value={form.couponCode} onChange={(event) => set('couponCode', event.target.value)} placeholder="Enter your code" autoCapitalize="none" autoCorrect="off" aria-invalid={Boolean(errors.couponCode)} /></div>{errors.couponCode && <small className="field-error">{errors.couponCode}</small>}</label></div>{notice && <p className="form-notice" role="status">{notice}</p>}</>}
    <footer className="onboarding-actions">{step > 1 ? <button type="button" className="button outline" disabled={busy} onClick={() => { setStep(step - 1); setErrors({}); setNotice(''); }}><ArrowLeft size={17} />Back</button> : <span />}<button type="button" className="button dark" disabled={busy} onClick={continueFlow}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : step < 4 ? 'Continue' : 'Go to my dashboard'}<ArrowRight size={17} /></button></footer></section></section></main>;
}
