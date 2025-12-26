
import React, { useState, useEffect, useMemo } from 'react';
import { MeetingView } from './components/MeetingView';
import { OrbitAssistant } from './components/OrbitAssistant';
import { Auth } from './components/Auth';
import { RoomSettings } from './components/RoomSettings';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Settings, Users, Shield, Calendar, Search, Check, Copy, LogOut } from 'lucide-react';

const ORBIT_LOGO_URL = 'https://eburon.ai/orbit/1.png';

// Galaxy Background Component
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

const Sidebar: React.FC<{ activeTab: string, setActiveTab: (t: string) => void, onLogout: () => void }> = ({ activeTab, setActiveTab, onLogout }) => {
  const tabs = [
    { id: 'calendar', icon: Calendar },
    { id: 'users', icon: Users },
    { id: 'security', icon: Shield },
    { id: 'search', icon: Search },
  ];

  return (
    <div className="w-20 bg-[#050505]/60 backdrop-blur-md border-r border-white/5 flex flex-col items-center py-8 gap-10">
      <div className="group cursor-pointer">
        <div className="transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          <OrbitLogo height={40} />
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-8">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`transition-all p-3 rounded-2xl ${activeTab === tab.id ? 'text-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}
          >
            <tab.icon size={22}/>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        <button 
          onClick={onLogout}
          title="Exit Session"
          className="text-gray-600 hover:text-red-500 transition-colors p-3 rounded-xl hover:bg-red-500/5"
        >
          <LogOut size={22}/>
        </button>
        <button className="text-gray-600 hover:text-white transition-colors p-3 rounded-xl hover:bg-white/5">
          <Settings size={22}/>
        </button>
      </div>
    </div>
  );
};

const Header: React.FC<{ roomName: string, session: Session }> = ({ roomName, session }) => {
  const [copied, setCopied] = useState(false);
  const isGuest = session.user.id === 'guest';
  const displayName = isGuest ? 'Guest Explorer' : session.user.email?.split('@')[0];
  const emailPlaceholder = isGuest ? 'No Account' : session.user.email;

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomName}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 bg-[#080808]/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
           <OrbitLogo height={32} />
        </div>
        <div className="h-5 w-px bg-white/10 mx-2" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
          {roomName.replace(/-/g, ' ')}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            <div title={emailPlaceholder} className={`w-9 h-9 rounded-full border-2 border-[#080808] flex items-center justify-center text-xs font-bold cursor-help uppercase shadow-lg shadow-black/40 ${isGuest ? 'bg-zinc-800' : 'bg-zinc-700'}`}>
              {isGuest ? 'G' : session.user.email?.substring(0, 2)}
            </div>
            <div title="Orbit AI Assistant" className="w-9 h-9 rounded-full border-2 border-[#080808] bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center text-[10px] font-bold text-black cursor-help shadow-lg shadow-white/10">AI</div>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-white">{displayName}</div>
            <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter">{isGuest ? 'Guest Access' : 'Professional Plan'}</div>
          </div>
        </div>
        <button 
          onClick={copyRoomLink}
          className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-white/5"
        >
          {copied ? <Check size={14} className="animate-in zoom-in" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Invite'}
        </button>
      </div>
    </header>
  );
};

type AppStep = 'auth' | 'settings' | 'meeting';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<AppStep>('auth');
  const [roomName] = useState(() => {
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

  // Construct a dummy session for guest users to satisfy child component requirements
  const effectiveSession = useMemo(() => {
    if (session) return session;
    if (isGuest) {
      return {
        user: {
          id: 'guest',
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
              <div className="flex-1 flex flex-col">
                <Header roomName={roomName} session={effectiveSession} />
                <main className="flex-1 flex overflow-hidden bg-black/40 backdrop-blur-sm">
                  <MeetingView roomName={roomName} />
                  <OrbitAssistant roomName={roomName} userId={effectiveSession.user.id} />
                </main>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
