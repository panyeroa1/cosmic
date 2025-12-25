
import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Share, Grid, MoreVertical, PhoneOff, MessageSquare, Loader2 } from 'lucide-react';
import { OrbitLogo } from '../App';

interface MeetingViewProps {
  roomName: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const MeetingView: React.FC<MeetingViewProps> = ({ roomName }) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!jitsiContainerRef.current) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: `Orbit-${roomName}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        // Deep White-Label Configuration
        disableDeepLinking: true,
        disableThirdPartyRequests: true,
        dynamicBrandingUrl: '',
        enableInsecureRoomNameWarning: false,
        enableWelcomePage: false,
        enableClosePage: false,
        
        // Hide all conference details that might leak "Jitsi"
        hideConferenceTimer: false,
        hideConferenceSubject: true,
        hideParticipantsStats: true,
        hideLobbyButton: true,
        hideLobbyWatermark: true,
        hideWatermark: true,
        hideAddPassCode: true,
        
        // Disable almost all notifications to hide "embedding" alerts
        disabledNotifications: [
          'chatPrivatelyWithParticipant',
          'denyRequest',
          'error',
          'info',
          'normal',
          'passwordRequired',
          'pwa',
          'recordingStatusChanged',
          'remoteControl',
          'videoMutedByFocus',
          'videoQuality',
          'joinedNickname',
          'leftNickname',
          'lobby.participantJoined',
          'lobby.participantLeft',
          'transcriptionStatusChanged',
          'prejoin.errorOnNoMedia',
          'prejoin.errorOnMediaFailure',
          'hub.participantJoined',
          'hub.participantLeft',
          'focus',
          'grantModerator',
          'kick',
          'screenShareStatusChanged',
          'securityOptionsChanged',
          'talkWhileMuted'
        ],

        // Identity
        defaultRemoteDisplayName: 'Orbit Member',
        displayName: 'Orbit Explorer',
        
        // Disable Jitsi Pre-join (We have our own)
        prejoinPageEnabled: false,
        prejoinConfig: { enabled: false },
        
        // App Experience
        startWithAudioMuted: false,
        pwa: { enabled: false },
        backgroundColor: '#141414',
        toolbarButtons: [], // Use our custom React controls below
        
        // Quality & System
        enableNoisyMicDetection: false,
        enableNoAudioDetection: false,
        disableSelfViewSettings: true,
        disableProfile: true,
        doNotStoreRoom: true,
      },
      interfaceConfigOverwrite: {
        // Force-disable all Jitsi watermarks and links
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        JITSI_WATERMARK_LINK: '',
        BRAND_WATERMARK_LINK: '',
        HIDE_DEEP_LINKING_LOGO: true,
        
        // Clear all logos with transparent placeholders
        DEFAULT_LOGO_URL: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        DEFAULT_WELCOME_PAGE_LOGO_URL: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        
        // Replace "Jitsi Meet" strings
        APP_NAME: 'Orbit',
        NATIVE_APP_NAME: 'Orbit',
        
        // UI Cleanup
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
        // Small delay to ensure any transient Jitsi toast finishes its initial cycle while hidden
        setTimeout(() => setIsReady(true), 1500);
      },
      audioMuteStatusChanged: (payload: { muted: boolean }) => setIsMuted(payload.muted),
      videoMuteStatusChanged: (payload: { muted: boolean }) => setIsVideoOff(payload.muted),
      readyToClose: () => {
        window.location.reload(); 
      }
    });

    return () => api.dispose();
  }, [roomName]);

  const toggleAudio = () => jitsiApi?.executeCommand('toggleAudio');
  const toggleVideo = () => jitsiApi?.executeCommand('toggleVideo');
  const toggleShare = () => jitsiApi?.executeCommand('toggleShareScreen');
  const hangup = () => jitsiApi?.executeCommand('hangup');

  return (
    <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
      
      {/* Syncing Overlay (Hides Jitsi Initialization) */}
      {!isReady && (
        <div className="absolute inset-0 z-[100] bg-[#020202] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
          <div className="relative">
            <OrbitLogo height={300} className="animate-pulse" />
            <div className="absolute -inset-10 bg-white/5 rounded-full blur-3xl -z-10 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.5em] animate-pulse">
              Syncing Secure Session
            </p>
          </div>
        </div>
      )}

      {/* Jitsi IFrame Container */}
      <div 
        className={`flex-1 w-full h-full transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'}`} 
        ref={jitsiContainerRef} 
      />

      {/* Control Bar (Only show when ready) */}
      <div className={`h-20 bg-[#0A0A0A] border-t border-white/5 flex items-center justify-center gap-4 px-6 relative z-50 transition-all duration-500 ${isReady ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <button 
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white'}`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        
        <button 
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white'}`}
          title={isVideoOff ? "Start Video" : "Stop Video"}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <button 
          onClick={toggleShare}
          className="p-3 rounded-full bg-[#2D2D2D] hover:bg-[#3D3D3D] transition-colors"
          title="Share Screen"
        >
          <Share className="w-6 h-6 text-white" />
        </button>
        
        <div className="w-px h-8 bg-white/10 mx-2" />
        
        <button className="p-3 rounded-full bg-[#2D2D2D] hover:bg-[#3D3D3D] transition-colors" title="Toggle Chat">
          <MessageSquare className="w-6 h-6 text-white" />
        </button>
        
        <button className="p-3 rounded-full bg-[#2D2D2D] hover:bg-[#3D3D3D] transition-colors" title="Toggle Grid">
          <Grid className="w-6 h-6 text-white" />
        </button>
        
        <button className="p-3 rounded-full bg-[#2D2D2D] hover:bg-[#3D3D3D] transition-colors" title="More">
          <MoreVertical className="w-6 h-6 text-white" />
        </button>
        
        <button 
          onClick={hangup}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors px-6 flex items-center gap-2 font-semibold shadow-lg shadow-red-600/20"
        >
          <PhoneOff className="w-5 h-5 fill-current" />
          Leave
        </button>
      </div>
    </div>
  );
};
