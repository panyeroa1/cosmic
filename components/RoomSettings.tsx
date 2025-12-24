
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Volume2, Globe, ArrowRight, Settings2, Video, VideoOff, MicOff } from 'lucide-react';
import { OrbitLogo } from '../App';

interface RoomSettingsProps {
  roomName: string;
  onJoin: () => void;
}

const LANGUAGES = [
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'es-ES', name: 'Español (España)' },
  { code: 'es-MX', name: 'Español (México)' },
  { code: 'fr-FR', name: 'Français (France)' },
  { code: 'fr-CA', name: 'Français (Canada)' },
  { code: 'de-DE', name: 'Deutsch (Deutschland)' },
  { code: 'zh-CN', name: 'Mandarin (Simplified)' },
  { code: 'zh-TW', name: 'Mandarin (Traditional)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'pt-PT', name: 'Português (Portugal)' },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
  { code: 'hi-IN', name: 'Hindi (India)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'nl-NL', name: 'Nederlands' },
];

export const RoomSettings: React.FC<RoomSettingsProps> = ({ roomName, onJoin }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCam, setSelectedCam] = useState<string>('');
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('en-US');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [volume, setVolume] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const initDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(allDevices);
        
        const firstCam = allDevices.find(d => d.kind === 'videoinput');
        const firstMic = allDevices.find(d => d.kind === 'audioinput');
        if (firstCam) setSelectedCam(firstCam.deviceId);
        if (firstMic) setSelectedMic(firstMic.deviceId);

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const average = sum / dataArray.length;
          setVolume(average);
          requestAnimationFrame(updateVolume);
        };
        updateVolume();

      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };
    initDevices();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6 selection:bg-white/20">
      <div className="w-full max-w-5xl space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OrbitLogo height={40} />
            <div className="h-6 w-px bg-white/10 mx-2" />
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase">Room Lobby</span>
          </div>
          <div className="px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold text-zinc-300">
            Orbit-{roomName}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Left Side: Preview */}
          <div className="space-y-6">
            <div className="relative aspect-video bg-[#0a0a0a]/60 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl group">
              {isVideoOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505]/40 text-zinc-700">
                  <VideoOff size={64} className="mb-4 opacity-50" />
                  <p className="text-sm font-bold tracking-widest uppercase opacity-30">Camera Disabled</p>
                </div>
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover mirror" 
                />
              )}
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <button 
                  onClick={toggleAudio}
                  className={`p-4 rounded-full transition-all active:scale-95 shadow-xl ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-white/10 text-white backdrop-blur-md border border-white/10'}`}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button 
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-all active:scale-95 shadow-xl ${isVideoOff ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-white/10 text-white backdrop-blur-md border border-white/10'}`}
                >
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
              </div>

              <div className="absolute left-6 bottom-6 w-2 h-24 bg-white/5 rounded-full overflow-hidden border border-white/5 backdrop-blur-md">
                <div 
                  className="absolute bottom-0 w-full bg-white transition-all duration-75"
                  style={{ height: `${Math.min(volume * 2, 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-[#0a0a0a]/60 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Visual Refinement</h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Auto-adjustment enabled</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Optimized</span>
              </div>
            </div>
          </div>

          {/* Right Side: Config */}
          <div className="space-y-8 py-4">
            <div className="space-y-6">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white">Configure Entry</h2>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Camera size={12} /> Video Input Source
                </label>
                <select 
                  value={selectedCam}
                  onChange={(e) => setSelectedCam(e.target.value)}
                  className="w-full bg-[#0a0a0a]/60 backdrop-blur-md border border-white/5 rounded-2xl py-4 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none"
                >
                  {devices.filter(d => d.kind === 'videoinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Mic size={12} /> Audio Input Source
                </label>
                <select 
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="w-full bg-[#0a0a0a]/60 backdrop-blur-md border border-white/5 rounded-2xl py-4 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none"
                >
                  {devices.filter(d => d.kind === 'audioinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}`}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={12} /> Interaction Language & Dialect
                </label>
                <select 
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-[#0a0a0a]/60 backdrop-blur-md border border-white/5 rounded-2xl py-4 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none scrollbar-hide"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              onClick={onJoin}
              className="group w-full bg-white hover:bg-zinc-200 text-black py-6 rounded-[2rem] font-black text-lg uppercase tracking-widest transition-all shadow-2xl shadow-white/5 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              Enter Session
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>

            <div className="text-center">
              <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-[0.3em]">
                Secure End-to-End Encrypted Session
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
