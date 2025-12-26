
import React, { useEffect, useRef, useState } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, Share, Grid, MoreVertical, PhoneOff, 
  MessageSquare, Loader2, Users, X, Circle, Sparkles, Copy, Check, 
  Clock, Shield, Send, User, Bot, LayoutGrid, Square
} from 'lucide-react';
import { OrbitLogo } from '../App';
import { OrbitAssistant } from './OrbitAssistant';

interface MeetingViewProps {
  roomName: string;
  userId: string;
}

interface Participant {
  id: string;
  displayName: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

type SidebarType = 'none' | 'team' | 'ai' | 'chat';

export const MeetingView: React.FC<MeetingViewProps> = ({ roomName, userId }) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isTileView, setIsTileView] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>('none');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  
  // Meeting Timer
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isReady) {
      interval = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isReady]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!jitsiContainerRef.current) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: `Orbit-${roomName}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        disableDeepLinking: true,
        disableThirdPartyRequests: true,
        dynamicBrandingUrl: '',
        enableInsecureRoomNameWarning: false,
        enableWelcomePage: false,
        enableClosePage: false,
        hideConferenceTimer: true, // We use our own
        hideConferenceSubject: true,
        hideParticipantsStats: true,
        hideLobbyButton: true,
        hideLobbyWatermark: true,
        hideWatermark: true,
        hideAddPassCode: true,
        disabledNotifications: [
          'chatPrivatelyWithParticipant', 'denyRequest', 'error', 'info', 'normal',
          'passwordRequired', 'pwa', 'recordingStatusChanged', 'remoteControl',
          'videoMutedByFocus', 'videoQuality', 'joinedNickname', 'leftNickname',
          'lobby.participantJoined', 'lobby.participantLeft', 'transcriptionStatusChanged',
          'prejoin.errorOnNoMedia', 'prejoin.errorOnMediaFailure', 'hub.participantJoined',
          'hub.participantLeft', 'focus', 'grantModerator', 'kick',
          'screenShareStatusChanged', 'securityOptionsChanged', 'talkWhileMuted'
        ],
        defaultRemoteDisplayName: 'Orbit Member',
        displayName: 'Orbit Explorer',
        prejoinPageEnabled: false,
        prejoinConfig: { enabled: false },
        startWithAudioMuted: false,
        pwa: { enabled: false },
        backgroundColor: '#020202',
        toolbarButtons: [], 
        enableNoisyMicDetection: false,
        enableNoAudioDetection: false,
        disableSelfViewSettings: true,
        disableProfile: true,
        doNotStoreRoom: true,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        HIDE_DEEP_LINKING_LOGO: true,
        APP_NAME: 'Orbit',
        NATIVE_APP_NAME: 'Orbit',
        MOBILE_APP_PROMO: false,
        SHOW_CHROME_EXTENSION_BANNER: false,
        DISPLAY_WELCOME_PAGE_CONTENT: false,
        GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
        RECENT_ROOMS_COUNT: 0,
        DISABLE_VIDEO_BACKGROUND: true,
        DISABLE_FOCUS_INDICATOR: true,
        DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
        SETTINGS_SECTIONS: ['devices', 'language', 'profile'],
        ENABLE_FEEDBACK_ANIMATION: false,
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    setJitsiApi(api);

    api.addEventListeners({
      videoConferenceJoined: () => {
        setTimeout(() => {
          setIsReady(true);
          const info = api.getParticipantsInfo();
          setParticipants(info.map((p: any) => ({ id: p.participantId, displayName: p.displayName || 'Anonymous Explorer' })));
        }, 1500);
      },
      participantJoined: (payload: { id: string, displayName: string }) => {
        setParticipants(prev => {
          if (prev.find(p => p.id === payload.id)) return prev;
          return [...prev, { id: payload.id, displayName: payload.displayName || 'Anonymous Explorer' }];
        });
      },
      participantLeft: (payload: { id: string }) => {
        setParticipants(prev => prev.filter(p => p.id !== payload.id));
      },
      displayNameChange: (payload: { id: string, displayname: string }) => {
        setParticipants(prev => prev.map(p => p.id === payload.id ? { ...p, displayName: payload.displayname } : p));
      },
      audioMuteStatusChanged: (payload: { muted: boolean }) => setIsMuted(payload.muted),
      videoMuteStatusChanged: (payload: { muted: boolean }) => setIsVideoOff(payload.muted),
      screenSharingStatusChanged: (payload: { on: boolean }) => setIsSharingScreen(payload.on),
      tileViewChanged: (payload: { enabled: boolean }) => setIsTileView(payload.enabled),
      readyToClose: () => { window.location.reload(); }
    });

    return () => api.dispose();
  }, [roomName]);

  const toggleAudio = () => jitsiApi?.executeCommand('toggleAudio');
  const toggleVideo = () => jitsiApi?.executeCommand('toggleVideo');
  const toggleShare = () => jitsiApi?.executeCommand('toggleShareScreen');
  const toggleTileView = () => jitsiApi?.executeCommand('toggleTileView');
  const hangup = () => jitsiApi?.executeCommand('hangup');

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomName}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSidebar = (type: SidebarType) => {
    setActiveSidebar(prev => prev === type ? 'none' : type);
  };

  return (
    <div className="w-full h-full bg-[#020202] relative overflow-hidden flex flex-col">
      
      {/* Syncing Overlay */}
      {!isReady && (
        <div className="absolute inset-0 z-[100] bg-[#020202] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
          <div className="relative">
            <OrbitLogo height={300} className="animate-pulse" />
            <div className="absolute -inset-10 bg-white/5 rounded-full blur-3xl -z-10 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.5em] animate-pulse">
              Initialising Orbit Stream
            </p>
          </div>
        </div>
      )}

      {/* Main Container Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        
        {/* Jitsi Main Area (Absolute to fill) */}
        <div 
          className={`absolute inset-0 transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'}`} 
          ref={jitsiContainerRef} 
        />

        {/* Floating Top Header (Jitsi Style) */}
        <div className={`absolute top-0 left-0 right-0 p-6 flex items-start justify-between z-[60] pointer-events-none transition-all duration-700 ${isReady ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-4 shadow-2xl">
              <OrbitLogo height={28} />
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Session</span>
                <span className="text-xs font-bold text-white uppercase tracking-tight">{roomName}</span>
              </div>
            </div>
            
            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
              <Clock size={16} className="text-zinc-500" />
              <span className="text-xs font-black text-white font-mono">{formatTime(seconds)}</span>
            </div>

            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
              <Users size={16} className="text-zinc-500" />
              <span className="text-xs font-black text-white">{participants.length + 1}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            <button 
              onClick={copyRoomLink}
              className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all hover:bg-[#111] shadow-2xl active:scale-95"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? 'Link Copied' : 'Invite'}
            </button>
            
            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 p-3 rounded-2xl shadow-2xl group cursor-help">
              <Shield size={16} className="text-green-500 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </div>

        {/* Sidebars Overlay Container */}
        <div className="absolute inset-0 pointer-events-none flex justify-end z-[70]">
          
          {/* Team Sidebar */}
          <div className={`pointer-events-auto h-full w-80 bg-[#080808]/95 backdrop-blur-3xl border-l border-white/5 transition-transform duration-500 ease-in-out ${activeSidebar === 'team' && isReady ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Orbit Team</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-0.5">Active Session Members</p>
                </div>
                <button 
                  onClick={() => setActiveSidebar('none')}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl group">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-bold border border-white/10 group-hover:bg-zinc-700 transition-colors">ME</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">You</p>
                    <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                      <Circle size={6} className="fill-current" /> Connected
                    </p>
                  </div>
                </div>

                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-xs font-bold border border-white/10 group-hover:bg-zinc-800 transition-colors">
                      {p.displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.displayName}</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">Member</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Assistant Sidebar */}
          <div className={`pointer-events-auto h-full w-96 bg-[#080808]/95 backdrop-blur-3xl border-l border-white/5 transition-transform duration-500 ease-in-out absolute right-0 ${activeSidebar === 'ai' && isReady ? 'translate-x-0' : 'translate-x-full'}`}>
            <OrbitAssistant 
              roomName={roomName} 
              userId={userId} 
              onClose={() => setActiveSidebar('none')} 
            />
          </div>

          {/* Chat Sidebar */}
          <div className={`pointer-events-auto h-full w-96 bg-[#080808]/95 backdrop-blur-3xl border-l border-white/5 transition-transform duration-500 ease-in-out absolute right-0 ${activeSidebar === 'chat' && isReady ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Session Chat</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-0.5">Secure Orbit Messaging</p>
                </div>
                <button 
                  onClick={() => setActiveSidebar('none')}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar opacity-30 pointer-events-none select-none">
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <MessageSquare size={48} className="text-zinc-700" />
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Syncing message history...</p>
                </div>
              </div>

              <div className="mt-4 pt-6 border-t border-white/5">
                <div className="relative group">
                  <input 
                    disabled
                    type="text"
                    placeholder="Messaging disabled in stealth mode..."
                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl py-4 pl-5 pr-14 text-xs focus:outline-none transition-all placeholder:text-zinc-800"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/5 rounded-xl text-zinc-800">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bottom Control Bar (Jitsi Immersive Style) */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-[80] transition-all duration-700 ${isReady ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
          <div className="flex items-center gap-3 px-6 py-4 bg-[#0A0A0A]/85 backdrop-blur-2xl border border-white/5 rounded-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
            <button 
              onClick={toggleAudio}
              className={`p-3.5 rounded-full transition-all active:scale-90 ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            
            <button 
              onClick={toggleVideo}
              className={`p-3.5 rounded-full transition-all active:scale-90 ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}`}
              title={isVideoOff ? "Start Video" : "Stop Video"}
            >
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>

            <button 
              onClick={toggleShare}
              className={`p-3.5 rounded-full transition-all active:scale-90 ${isSharingScreen ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}`}
              title={isSharingScreen ? "Stop Sharing" : "Share Screen"}
            >
              <Share size={22} />
            </button>
            
            <div className="w-px h-8 bg-white/5 mx-1" />
            
            <button 
              onClick={() => toggleSidebar('ai')}
              className={`p-3.5 rounded-full transition-all active:scale-90 group relative ${activeSidebar === 'ai' ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}`}
              title="Orbit AI"
            >
              <Sparkles size={22} className={activeSidebar === 'ai' ? '' : 'group-hover:scale-110 transition-transform'} />
              {activeSidebar !== 'ai' && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white rounded-full border-2 border-[#0A0A0A] animate-pulse" />}
            </button>

            <button 
              onClick={() => toggleSidebar('team')}
              className={`p-3.5 rounded-full transition-all active:scale-90 ${activeSidebar === 'team' ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}`}
              title="Team"
            >
              <Users size={22} />
            </button>

            <button 
              onClick={toggleTileView}
              className={`p-3.5 rounded-full transition-all active:scale-90 ${isTileView ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}`} 
              title="Toggle Tile View"
            >
              {isTileView ? <Square size={22} /> : <Grid size={22} />}
            </button>

            <button 
              onClick={() => toggleSidebar('chat')}
              className={`p-3.5 rounded-full transition-all active:scale-90 ${activeSidebar === 'chat' ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}`}
              title="Chat"
            >
              <MessageSquare size={22} />
            </button>
            
            <div className="w-px h-8 bg-white/5 mx-1" />
            
            <button 
              onClick={hangup}
              className="p-3.5 rounded-full bg-red-600 hover:bg-red-700 transition-all px-8 flex items-center gap-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 active:scale-95 text-white"
            >
              <PhoneOff size={18} className="fill-current" />
              End
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
