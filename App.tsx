
import React, { useState, useEffect, useMemo } from 'react';
import { MeetingView } from './components/MeetingView';
import { Auth } from './components/Auth';
import { RoomSettings } from './components/RoomSettings';
import { TranscriptionHistory } from './components/TranscriptionHistory';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Settings, Users, Shield, Calendar, Search, Check, Copy, LogOut, FileText, UserPlus, Globe, Key, Activity, User as UserIcon, Bot } from 'lucide-react';

const ORBIT_LOGO_URL = 'https://eburon.ai/orbit/1.png';

type AppStep = 'auth' | 'settings' | 'meeting';

const GalaxyBackground: React.FC = () => {
  const generateStars = (count: number) => {
    let stars = "";
    for (let i = 0; i < count; i++) {
      stars += `${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #fff${i % 2 === 0 ? '' : ','}`;
    }
    return stars.trim().replace(/,$/, '');
  };

  const stars1 = useMemo(() => generateStars(400), []);
  const stars2 = useMemo(() => generateStars(200), []);
  const stars3 = useMemo(() => generateStars(100), []);

  return (
    <div className="galaxy-container">
      <div className="stars-layer stars-1" style={{ boxShadow: stars1 }} />
      <div className="stars-layer stars-2" style={{ boxShadow: stars2 }} />
      <div className="stars-layer stars-3" style={{ boxShadow: stars3 }} />
      <div className="nebula w-[600px] h-[600px] top-1/4 left-1/4" />
      <div className="nebula w-[800px] h-[800px] bottom-1/4 right-1/4" />
    </div>
  );
};

export const OrbitLogo: React.FC<{ height?: number | string, className?: string }> = ({ height = 24, className = "" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <img 
      src={ORBIT_LOGO_URL} 
      alt="Orbit Logo" 
      style={{ height: height, width: 'auto' }} 
      className="object-contain"
    />
    <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl -z-10 animate-pulse" />
  </div>
);

export const ModulePageHeader: React.FC<{ icon: React.ElementType, title: string, subtitle: string, action?: React.ReactNode }> = ({ icon: Icon, title, subtitle, action }) => (
  <div className="p-8 pb-10 flex items-start justify-between border-b border-white/5 bg-[#080808]/10">
    <div className="flex items-start gap-8">
      <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shadow-xl">
        <Icon size={36} />
      </div>
      <div className="space-y-1">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white">
          {title}
        </h2>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em]">
          {subtitle}
        </p>
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const ModulePage: React.FC<{ 
  icon: React.ElementType, 
  title: string, 
  subtitle: string, 
  children?: React.ReactNode,
  action?: React.ReactNode
}> = ({ icon, title, subtitle, children, action }) => (
  <div className="flex-1 flex flex-col bg-transparent animate-in fade-in duration-500">
    <ModulePageHeader icon={icon} title={title} subtitle={subtitle} action={action} />
    <div className="flex-1 px-8 pb-8 overflow-y-auto custom-scrollbar pt-10">
      {children}
    </div>
  </div>
);

const Sidebar: React.FC<{ activeTab: string, setActiveTab: (t: string) => void, onLogout: () => void }> = ({ activeTab, setActiveTab, onLogout }) => {
  const tabs = [
    { id: 'meeting', icon: Calendar, label: 'Session' },
    { id: 'history', icon: FileText, label: 'Vault' },
    { id: 'users', icon: Users, label: 'Team' },
    { id: 'security', icon: Shield, label: 'Safe' },
    { id: 'search', icon: Search, label: 'Explore' },
  ];

  return (
    <div className="w-20 bg-[#050505]/60 backdrop-blur-md border-r border-white/5 flex flex-col items-center py-8 gap-10 z-50">
      <div className="group cursor-pointer">
        <div className="transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          <OrbitLogo height={40} />
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-8">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            title={tab.label}
            onClick={() => setActiveTab(tab.id)}
            className={`transition-all p-3 rounded-2xl relative group ${activeTab === tab.id ? 'text-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'text-zinc-600 hover:text-white hover:bg-white/5'}`}
          >
            <tab.icon size={22}/>
            {activeTab === tab.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        <button 
          onClick={onLogout}
          className="text-zinc-600 hover:text-red-500 transition-colors p-3 rounded-xl hover:bg-red-500/5"
        >
          <LogOut size={22}/>
        </button>
        <button className="text-zinc-600 hover:text-white transition-colors p-3 rounded-xl hover:bg-white/5">
          <Settings size={22}/>
        </button>
      </div>
    </div>
  );
};

const Header: React.FC = () => {
  return (
    <header className="h-16 bg-[#080808]/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
           <OrbitLogo height={32} />
        </div>
      </div>
      {/* Right side left clean for panel docking as per user request */}
      <div className="flex items-center gap-6" />
    </header>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('meeting');
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<AppStep>('auth');
  
  const [roomName] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) return roomFromUrl;
    const stored = sessionStorage.getItem('orbit_room');
    if (stored) return stored;
    const fresh = Math.random().toString(36).substring(7).toUpperCase();
    sessionStorage.setItem('orbit_room', fresh);
    return fresh;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setStep('settings');
        setIsGuest(false);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setStep('settings');
        setIsGuest(false);
      } else if (!isGuest) {
        setStep('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  const handleGuestAccess = () => {
    setIsGuest(true);
    setStep('settings');
  };

  const handleLogout = () => {
    if (isGuest) {
      setIsGuest(false);
      setStep('auth');
    } else {
      supabase.auth.signOut();
    }
  };

  const effectiveSession = useMemo(() => {
    if (session) return session;
    if (isGuest) {
      return {
        user: {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'guest@orbit.internal',
          user_metadata: { full_name: 'Guest Explorer' }
        },
        access_token: '',
        refresh_token: '',
        expires_in: 0,
        token_type: 'bearer'
      } as unknown as Session;
    }
    return null;
  }, [session, isGuest]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#020202] flex items-center justify-center">
        <GalaxyBackground />
        <div className="animate-pulse">
          <OrbitLogo height={250} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden text-[#f8fafc] selection:bg-white/20">
      <GalaxyBackground />
      
      {step === 'auth' && !session && !isGuest ? (
        <Auth onGuestAccess={handleGuestAccess} />
      ) : step === 'settings' ? (
        <RoomSettings roomName={roomName} onJoin={() => setStep('meeting')} />
      ) : (
        <div className="flex h-full w-full">
          {effectiveSession && (
            <>
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
              <div className="flex-1 flex flex-col relative">
                {activeTab !== 'meeting' && (
                  <Header />
                )}
                <main className="flex-1 relative bg-black/40 backdrop-blur-sm flex flex-col">
                  {activeTab === 'meeting' ? (
                    <MeetingView roomName={roomName} userId={effectiveSession.user.id} />
                  ) : activeTab === 'history' ? (
                    <TranscriptionHistory 
                      userId={effectiveSession.user.id} 
                      onClose={() => setActiveTab('meeting')} 
                    />
                  ) : activeTab === 'users' ? (
                    <ModulePage 
                      icon={Users} 
                      title="Team Intelligence" 
                      subtitle="Active organization members & session protocols"
                      action={
                        <button className="bg-white text-black px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-200 transition-all">
                          <UserPlus size={14} /> Invite Member
                        </button>
                      }
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl space-y-4">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/10 text-zinc-500">
                            <UserIcon size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-white uppercase tracking-tight">Active Explorer</h4>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Primary Session Owner</p>
                          </div>
                          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                            <span>Status</span>
                            <span className="text-green-500">Online</span>
                          </div>
                        </div>
                      </div>
                    </ModulePage>
                  ) : activeTab === 'security' ? (
                    <ModulePage 
                      icon={Shield} 
                      title="Safety & Compliance" 
                      subtitle="End-to-end encryption & secure protocol management"
                    >
                       <div className="space-y-6 max-w-2xl">
                          <div className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                              <Key size={32} />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-white uppercase tracking-tight">Session Encryption</h4>
                              <p className="text-xs text-zinc-500 mt-1">Advanced 256-bit AES protection is currently active for all voice and video streams.</p>
                            </div>
                          </div>
                          <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500">
                              <Activity size={32} />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-white uppercase tracking-tight">Log Integrity</h4>
                              <p className="text-xs text-zinc-500 mt-1">Audit logs are being recorded with tamper-proof timestamps on the secure vault.</p>
                            </div>
                          </div>
                       </div>
                    </ModulePage>
                  ) : activeTab === 'search' ? (
                    <ModulePage 
                      icon={Search} 
                      title="Global Discovery" 
                      subtitle="Cross-session exploration & intelligence mapping"
                    >
                      <div className="space-y-8">
                        <div className="relative">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={24} />
                          <input 
                            type="text" 
                            placeholder="QUERY ARCHIVE OR GLOBAL KNOWLEDGE..."
                            className="w-full bg-[#0a0a0a] border border-white/5 rounded-[2rem] py-8 pl-16 pr-8 text-xl font-bold uppercase tracking-tight focus:outline-none focus:ring-4 focus:ring-white/5 transition-all placeholder:text-zinc-800"
                          />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {['Recent', 'Starred', 'AI Summaries', 'Transcripts'].map(t => (
                            <button key={t} className="p-6 bg-white/5 border border-white/10 rounded-3xl text-center hover:bg-white/10 transition-all group">
                              <Globe size={24} className="mx-auto mb-3 text-zinc-600 group-hover:text-white transition-colors" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">{t}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </ModulePage>
                  ) : (
                    <div className="flex-1 h-full flex items-center justify-center text-zinc-700 font-bold uppercase tracking-[0.5em] text-xs">
                      Module Offline
                    </div>
                  )}
                </main>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
