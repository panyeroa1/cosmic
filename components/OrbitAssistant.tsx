
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Volume2, AlertCircle, Loader2, X, Sparkles, Bot, User } from 'lucide-react';
import { createBlob, decode, decodeAudioData } from '../utils/audioConverter';
import { ConnectionStatus, TranscriptionEntry } from '../types';
import { supabase } from '../lib/supabase';

interface OrbitAssistantProps {
  roomName: string;
  userId: string;
  onClose?: () => void;
}

export const OrbitAssistant: React.FC<OrbitAssistantProps> = ({ roomName, userId, onClose }) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDbReady, setIsDbReady] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    setStatus(ConnectionStatus.DISCONNECTED);
  }, []);

  const saveTranscriptionToDb = async (entry: TranscriptionEntry) => {
    if (!isDbReady) return;
    try {
      const { error } = await supabase.from('transcriptions').insert([{
        user_id: userId,
        room_name: roomName,
        sender: entry.sender,
        text: entry.text,
        created_at: entry.timestamp.toISOString()
      }]);
      if (error) {
        const msg = error.message.toLowerCase();
        if (error.code === '42P01' || msg.includes('find') || msg.includes('found') || msg.includes('schema cache') || msg.includes('does not exist')) {
          setIsDbReady(false);
        } else {
          throw error;
        }
      }
    } catch (err) {
      console.warn('Persistence bypassed.');
    }
  };

  const startSession = async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are Orbit, a helpful meeting assistant. Be concise and professional.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            else if (message.serverContent?.inputTranscription) currentInputTranscription.current += message.serverContent.inputTranscription.text;
            if (message.serverContent?.turnComplete) {
              const text = currentInputTranscription.current || currentOutputTranscription.current;
              if (text.trim()) {
                const entry: TranscriptionEntry = { id: Math.random().toString(36).substring(7), sender: currentInputTranscription.current ? 'user' : 'ai', text: text, timestamp: new Date() };
                setTranscriptions(prev => [...prev, entry]);
                saveTranscriptionToDb(entry);
              }
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: () => setStatus(ConnectionStatus.ERROR),
          onclose: () => setStatus(ConnectionStatus.DISCONNECTED)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setStatus(ConnectionStatus.ERROR);
    }
  };

  useEffect(() => { return () => stopSession(); }, [stopSession]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white ${status === ConnectionStatus.CONNECTED ? 'shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''}`}><Sparkles size={20} className={status === ConnectionStatus.CONNECTING ? 'animate-pulse' : ''} /></div>
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#080808] ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : status === ConnectionStatus.CONNECTING ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          <div><h3 className="text-sm font-black text-white uppercase tracking-widest">Orbit Assistant</h3><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">AI Intelligence</p></div>
        </div>
        <div className="flex items-center gap-2">
          {status === ConnectionStatus.CONNECTED && <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>{isMuted ? <MicOff size={18} /> : <Mic size={18} />}</button>}
          {onClose && <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {transcriptions.length === 0 && status === ConnectionStatus.CONNECTED && <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20 text-center px-4"><Volume2 className="w-16 h-16 text-white mb-2" /><p className="text-xs font-bold uppercase tracking-widest leading-relaxed">System ready.<br/>Initiate verbal command.</p></div>}
        {transcriptions.map((t) => (
          <div key={t.id} className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}>
            {/* Fix: Replaced UserCircle with already imported User icon */}
            <div className="flex items-center gap-2 mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">{t.sender === 'user' ? <><User size={10} /> User</> : <><Bot size={10} /> Orbit</>}</div>
            <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${t.sender === 'user' ? 'bg-[#141414] text-white border border-white/5' : 'bg-white text-black font-medium shadow-[0_10px_30px_-10px_rgba(255,255,255,0.1)]'}`}>{t.text}</div>
            <span className="text-[9px] text-zinc-700 mt-2 font-bold">{t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        {!isDbReady && <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 text-[9px] font-bold text-zinc-600 uppercase tracking-widest text-center">Persistence Offline</div>}
        {status === ConnectionStatus.CONNECTING && <div className="h-full flex flex-col items-center justify-center space-y-4"><Loader2 className="w-10 h-10 text-white animate-spin opacity-50" /><p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em]">Booting AI Kernel</p></div>}
        {status === ConnectionStatus.ERROR && <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider flex gap-3"><AlertCircle size={16} className="flex-shrink-0" /><p>Sync failure.</p></div>}
      </div>
      <div className="p-6 border-t border-white/5 bg-[#0a0a0a]/50">
        {status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.ERROR ? <button onClick={startSession} className="w-full bg-white hover:bg-zinc-200 text-black py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]"><Sparkles size={16} />Initialize AI Sync</button> : <button onClick={stopSession} className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all border border-white/10">Terminate Link</button>}
      </div>
    </div>
  );
};
