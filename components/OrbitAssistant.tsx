
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Volume2, AlertCircle, Loader2 } from 'lucide-react';
import { createBlob, decode, decodeAudioData } from '../utils/audioConverter';
import { ConnectionStatus, TranscriptionEntry } from '../types';
import { supabase } from '../lib/supabase';

interface OrbitAssistantProps {
  roomName: string;
  userId: string;
}

export const OrbitAssistant: React.FC<OrbitAssistantProps> = ({ roomName, userId }) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  
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
    try {
      await supabase.from('transcriptions').insert([{
        user_id: userId,
        room_name: roomName,
        sender: entry.sender,
        text: entry.text,
        created_at: entry.timestamp.toISOString()
      }]);
    } catch (err) {
      console.warn('Could not save transcription to Supabase:', err);
    }
  };

  const startSession = async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are Orbit, a helpful meeting assistant. You help users with meeting tasks, notes, and general conversation. Be concise and professional.',
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
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const text = currentInputTranscription.current || currentOutputTranscription.current;
              if (text.trim()) {
                const entry: TranscriptionEntry = {
                  id: Math.random().toString(36).substring(7),
                  sender: currentInputTranscription.current ? 'user' : 'ai',
                  text: text,
                  timestamp: new Date()
                };
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

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Gemini error:', e);
            setStatus(ConnectionStatus.ERROR);
          },
          onclose: () => {
            setStatus(ConnectionStatus.DISCONNECTED);
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start session:', err);
      setStatus(ConnectionStatus.ERROR);
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="w-80 border-l border-white/5 bg-[#0F0F0F] flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500' : status === ConnectionStatus.CONNECTING ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
          <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Orbit Assistant</h2>
        </div>
        {status === ConnectionStatus.CONNECTED && (
          <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-gray-400'}`}>
            <Mic size={16} className={isMuted ? 'text-red-500' : 'text-gray-400'} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {transcriptions.length === 0 && status === ConnectionStatus.CONNECTED && (
          <div className="text-center text-gray-500 mt-10">
            <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-20 text-white" />
            <p className="text-sm">Start speaking to talk with Orbit...</p>
          </div>
        )}

        {transcriptions.map((t) => (
          <div key={t.id} className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${t.sender === 'user' ? 'bg-white/5 text-white border border-white/5' : 'bg-white text-black shadow-lg shadow-white/5 font-medium'}`}>
              {t.text}
            </div>
            <span className="text-[10px] text-gray-600 mt-1">{t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}

        {status === ConnectionStatus.CONNECTING && (
          <div className="flex flex-col items-center justify-center h-40 space-y-3">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Orbit AI Syncing...</p>
          </div>
        )}

        {status === ConnectionStatus.ERROR && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <p>Connection failed. Verify API key and mic access.</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5">
        {status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.ERROR ? (
          <button
            onClick={startSession}
            className="w-full bg-white hover:bg-zinc-200 text-black py-3 rounded-xl font-bold transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Mic size={18} />
            Connect Assistant
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold transition-all border border-white/10"
          >
            Disconnect AI
          </button>
        )}
      </div>
    </div>
  );
};
