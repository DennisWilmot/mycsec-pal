'use client';
import { useState } from 'react';
import { BarChart3, Bell, BookOpen, LogOut, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';

export default function AppSidebar({ active, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const items = [
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'progress', label: 'My Progress', icon: BarChart3 },
    { id: 'settings', label: 'Profile & Settings', icon: Settings },
  ];
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
          onClick={() => setCollapsed((value) => !value)}
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
      <button className="sidebar-account" onClick={() => onNavigate('settings')} title={collapsed ? 'Quin Brown' : undefined}>
        <Bell size={18} className="sidebar-account-bell" />
        <span>Hi, Quin</span>
        <strong>Q</strong>
      </button>
      <button className="sidebar-link signout" onClick={() => onNavigate('landing')} title={collapsed ? 'Sign out' : undefined}><LogOut size={18}/><span>Sign out</span></button>
    </aside>
  );
}
