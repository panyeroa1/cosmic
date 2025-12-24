
import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Share, Grid, MoreVertical, PhoneOff, MessageSquare } from 'lucide-react';

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

  useEffect(() => {
    if (!jitsiContainerRef.current) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: `Orbit-${roomName}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: false,
        disableDeepLinking: true,
        toolbarButtons: [], // Use custom controls only
        prejoinPageEnabled: false,
        backgroundColor: '#141414',
        hideConferenceTimer: false,
        subject: `Orbit Session`,
        // Branding & UI Toggles
        disableThirdPartyRequests: true,
        enableNoisyMicDetection: false,
        enableWelcomePage: false,
        isClickToJoinEnabled: false,
        logoClickUrl: 'https://orbit.ai',
        // Hide specific UI elements
        hideConferenceSubject: true,
        hideParticipantsStats: true,
      },
      interfaceConfigOverwrite: {
        DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
        DEFAULT_BACKGROUND: '#141414',
        // Complete Branding Removal
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        JITSI_WATERMARK_LINK: '',
        BRAND_WATERMARK_LINK: '',
        // Logo Overwrites
        DEFAULT_LOGO_URL: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Transparent 1x1
        DEFAULT_WELCOME_PAGE_LOGO_URL: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        // App Identity
        APP_NAME: 'Orbit',
        NATIVE_APP_NAME: 'Orbit',
        // Layout and Mobile
        MOBILE_APP_PROMO: false,
        SHOW_CHROME_EXTENSION_BANNER: false,
        DISPLAY_WELCOME_PAGE_CONTENT: false,
        GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    setJitsiApi(api);

    api.addEventListeners({
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
    <div className="flex-1 flex flex-col bg-[#141414] relative overflow-hidden">
      {/* Jitsi IFrame Container */}
      <div className="flex-1 w-full h-full" ref={jitsiContainerRef} />

      {/* Control Bar */}
      <div className="h-20 bg-[#0A0A0A] border-t border-white/5 flex items-center justify-center gap-4 px-6 relative z-50">
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
