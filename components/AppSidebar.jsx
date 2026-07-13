'use client';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bell, BookOpen, LogOut, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const COLLAPSE_KEY = 'mycsecpal:sidebar-collapsed';

export default function AppSidebar({ active, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [identity, setIdentity] = useState({ displayName: '', avatarUrl: null });
  const [signingOut, setSigningOut] = useState(false);
  const items = [
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'progress', label: 'My Progress', icon: BarChart3 },
    { id: 'settings', label: 'Profile & Settings', icon: Settings },
  ];

  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === 'true'); } catch {}
    let activeRequest = true;
    fetch('/api/me/profile', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({}));
        return payload.data ?? null;
      })
      .then((profile) => {
        if (activeRequest && profile) setIdentity({ displayName: profile.displayName || '', avatarUrl: profile.avatarUrl || null });
      })
      .catch(() => {});
    return () => { activeRequest = false; };
  }, []);

  const initials = useMemo(() => identity.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U', [identity.displayName]);
  const greeting = identity.displayName ? `Hi, ${identity.displayName.trim().split(/\s+/)[0]}` : 'Your account';
  const toggleCollapsed = () => setCollapsed((value) => {
    const next = !value;
    try { window.localStorage.setItem(COLLAPSE_KEY, String(next)); } catch {}
    return next;
  });
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut().catch(() => {});
    window.location.assign('/');
  };
  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <button className="wordmark sidebar-wordmark" onClick={() => onNavigate('landing')} aria-label="Go to MyCSECPal home">
          <img src="/assets/brand/mycsecpal-logo.png" alt="MyCSECPal" />
        </button>
        <button className="sidebar-compact-brand" onClick={() => onNavigate('landing')} aria-label="Go to MyCSECPal home">
          <img src="/assets/brand/mycsecpal-logo.png" alt="" />
        </button>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="sidebar-navigation"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      <nav className="sidebar-nav" id="sidebar-navigation">
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`sidebar-link ${active === id ? 'active' : ''}`} onClick={() => onNavigate(id)} title={collapsed ? label : undefined}>
            <Icon size={19} strokeWidth={1.8}/><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <img className="sidebar-island" src="/assets/island.png" alt="Caribbean island doodle" />
      <div className="sidebar-quote">
        <p>Small steps today,<br/>strong results tomorrow.</p>
        <span>✦ ✧ ✦</span>
      </div>
      <button className="sidebar-account" onClick={() => onNavigate('settings')} title={collapsed ? (identity.displayName || 'Your account') : undefined}>
        <Bell size={18} className="sidebar-account-bell" />
        <span>{greeting}</span>
        <strong>{identity.avatarUrl ? <img src={identity.avatarUrl} alt="" referrerPolicy="no-referrer"/> : initials}</strong>
      </button>
      <button className="sidebar-link signout" onClick={signOut} disabled={signingOut} title={collapsed ? 'Sign out' : undefined}><LogOut size={18}/><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button>
    </aside>
  );
}
