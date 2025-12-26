
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileText, Calendar, Clock, ChevronRight, Hash, User, Bot, Loader2, ArrowLeft, Sparkles, MessageSquareText, AlertTriangle, Database, Terminal, Check, Copy } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ModulePageHeader } from '../App';

interface TranscriptionRecord {
  id: string;
  room_name: string;
  sender: 'user' | 'ai';
  text: string;
  created_at: string;
}

interface GroupedMeeting {
  id: string; 
  roomName: string;
  date: string;
  timestamp: Date;
  entries: TranscriptionRecord[];
}

interface TranscriptionHistoryProps {
  userId: string;
  onClose: () => void;
}

export const TranscriptionHistory: React.FC<TranscriptionHistoryProps> = ({ userId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMissingTable, setIsMissingTable] = useState(false);
  const [records, setRecords] = useState<TranscriptionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<GroupedMeeting | null>(null);
  const [summaries, setSummaries] = useState<{ [key: string]: { text: string; loading: boolean } }>({});
  const [sqlCopied, setSqlCopied] = useState(false);

  const SQL_SCHEMA = `create table transcriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  room_name text not null,
  sender text not null,
  text text not null,
  created_at timestamptz default now()
);

alter table transcriptions enable row level security;

create policy "Users view own" on transcriptions for select using (auth.uid() = user_id);
create policy "Users insert own" on transcriptions for insert with check (auth.uid() = user_id);`;

  useEffect(() => {
    const fetchHistory = async () => {
      let localMissingTable = false;
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: supabaseError } = await supabase
          .from('transcriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (supabaseError) {
          const msg = supabaseError.message.toLowerCase();
          if (
            supabaseError.code === '42P01' || 
            supabaseError.code === 'PGRST116' ||
            msg.includes('find') || 
            msg.includes('found') ||
            msg.includes('schema cache') ||
            msg.includes('does not exist')
          ) {
            localMissingTable = true;
          }
          throw supabaseError;
        }
        setRecords(data || []);
      } catch (err: any) {
        if (localMissingTable) {
          setIsMissingTable(true);
        } else {
          setError(err?.message || String(err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  const copySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  const groupedMeetings = useMemo(() => {
    const groups: { [key: string]: GroupedMeeting } = {};
    records.forEach(record => {
      const dateObj = new Date(record.created_at);
      const dateKey = dateObj.toLocaleDateString();
      const groupKey = `${record.room_name}-${dateKey}`;
      if (!groups[groupKey]) {
        groups[groupKey] = { id: groupKey, roomName: record.room_name, date: dateKey, timestamp: dateObj, entries: [] };
      }
      groups[groupKey].entries.push(record);
    });
    return Object.values(groups).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [records]);

  const filteredMeetings = useMemo(() => {
    if (!searchTerm.trim()) return groupedMeetings;
    const lowerSearch = searchTerm.toLowerCase();
    return groupedMeetings.filter(m => m.roomName.toLowerCase().includes(lowerSearch) || m.entries.some(e => e.text.toLowerCase().includes(lowerSearch)));
  }, [groupedMeetings, searchTerm]);

  const handleSummarize = async (e: React.MouseEvent, meeting: GroupedMeeting) => {
    e.stopPropagation();
    if (summaries[meeting.id]?.loading) return;
    setSummaries(prev => ({ ...prev, [meeting.id]: { text: '', loading: true } }));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const transcriptionText = meeting.entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(entry => `${entry.sender === 'user' ? 'Participant' : 'Orbit AI'}: ${entry.text}`).join('\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Please provide a concise summary of the following meeting transcription in 3-4 bullet points. Focus on key decisions and highlights. Keep it professional.\n\n${transcriptionText}`,
        config: { temperature: 0.7, topP: 0.95, topK: 40 }
      });
      setSummaries(prev => ({ ...prev, [meeting.id]: { text: response.text || "No summary could be generated.", loading: false } }));
    } catch (err: any) {
      setSummaries(prev => ({ ...prev, [meeting.id]: { text: `Error: ${err?.message || 'AI service unavailable'}`, loading: false } }));
    }
  };

  if (selectedMeeting) {
    return (
      <div className="flex-1 flex flex-col bg-transparent animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#080808]/40 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <button onClick={() => setSelectedMeeting(null)} className="p-3 hover:bg-white/5 rounded-2xl text-zinc-400 hover:text-white transition-all border border-white/5 active:scale-95">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3 italic"><Hash size={28} className="text-zinc-500" /> {selectedMeeting.roomName}</h2>
              <div className="flex items-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> {selectedMeeting.date}</span>
                <span className="flex items-center gap-1.5"><Clock size={12} /> {selectedMeeting.entries.length} Messages</span>
              </div>
            </div>
          </div>
          {!summaries[selectedMeeting.id]?.text && (
            <button onClick={(e) => handleSummarize(e, selectedMeeting)} disabled={summaries[selectedMeeting.id]?.loading} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50">
              {summaries[selectedMeeting.id]?.loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Generate Summary
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {summaries[selectedMeeting.id]?.text && (
            <div className="mb-8 p-8 bg-white/5 border border-white/10 rounded-[2rem] animate-in fade-in zoom-in duration-500">
              <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400"><MessageSquareText size={18} className="text-white" /> Orbit Intelligence Summary</div>
              <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium">{summaries[selectedMeeting.id].text}</div>
            </div>
          )}
          {selectedMeeting.entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((entry) => (
            <div key={entry.id} className={`flex flex-col ${entry.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">{entry.sender === 'user' ? <><User size={10} /> You</> : <><Bot size={10} /> Orbit AI</>}</div>
              <div className={`max-w-[70%] rounded-[1.5rem] px-6 py-4 text-sm leading-relaxed shadow-lg ${entry.sender === 'user' ? 'bg-[#141414] text-white border border-white/5' : 'bg-white text-black font-medium'}`}>{entry.text}</div>
              <span className="text-[10px] text-zinc-700 mt-2 font-black uppercase tracking-widest">{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-transparent animate-in fade-in duration-500">
      <ModulePageHeader icon={FileText} title="Transcription Vault" subtitle="Secure meeting records & AI intelligence" />
      <div className="px-8 mb-8 mt-8">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={24} />
          <input type="text" placeholder="SEARCH ARCHIVE CONTENT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/5 rounded-3xl py-6 pl-16 pr-6 text-sm font-bold uppercase tracking-tight focus:outline-none focus:ring-4 focus:ring-white/5 transition-all placeholder:text-zinc-800" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-50"><Loader2 className="animate-spin text-white" size={48} /><span className="text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing Vault...</span></div>
        ) : isMissingTable ? (
          <div className="h-full flex flex-col items-center justify-center space-y-8 text-center max-w-2xl mx-auto py-10 animate-in zoom-in duration-500">
            <div className="p-8 bg-zinc-900 border border-white/10 rounded-[2.5rem]"><Database size={64} className="text-zinc-500" /></div>
            <div className="space-y-4">
              <p className="text-3xl font-black text-white uppercase tracking-tight italic">System Initialization Required</p>
              <p className="text-xs text-zinc-500 leading-relaxed font-bold uppercase tracking-widest">The database schema for 'transcriptions' has not been provisioned. Run the following SQL in your Supabase dashboard to enable this module.</p>
            </div>
            <div className="w-full bg-black/60 rounded-[2rem] border border-white/5 overflow-hidden text-left font-mono text-[10px] relative group">
              <div className="bg-white/5 px-6 py-3 flex items-center justify-between border-b border-white/5"><span className="flex items-center gap-2 text-zinc-500"><Terminal size={14} /> postgres_setup.sql</span><button onClick={copySql} className="p-2 hover:bg-white/10 rounded-lg transition-all text-zinc-400 hover:text-white">{sqlCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}</button></div>
              <pre className="p-8 overflow-x-auto text-zinc-400">{SQL_SCHEMA}</pre>
            </div>
            <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-[0.4em] text-black bg-white hover:bg-zinc-200 px-12 py-4 rounded-full transition-all active:scale-95 shadow-xl">Verify Connection</button>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto py-20">
            <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-full"><AlertTriangle size={64} className="text-red-500" /></div>
            <div className="space-y-3"><p className="text-2xl font-black text-white uppercase tracking-tight italic">Protocol Failure</p><p className="text-xs text-zinc-500 leading-relaxed font-mono bg-black/40 p-5 rounded-[1.5rem] border border-white/5">{error}</p></div>
            <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-[0.4em] text-white bg-white/5 hover:bg-white/10 px-10 py-4 rounded-full border border-white/10 transition-all active:scale-95">Re-initialise Link</button>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-20 grayscale"><FileText size={128} className="mb-6" /><p className="text-lg font-black uppercase tracking-[0.5em]">Vault Empty</p></div>
        ) : (
          filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="w-full">
              <button onClick={() => setSelectedMeeting(meeting)} className="w-full text-left group bg-[#0a0a0a]/60 backdrop-blur-md hover:bg-[#111] border border-white/5 rounded-3xl p-6 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99] border-l-4 border-l-zinc-800 hover:border-l-white">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-white/10 transition-all border border-white/5"><Hash size={32} /></div>
                  <div>
                    <h3 className="font-black text-white text-xl tracking-tight uppercase group-hover:translate-x-1 transition-transform italic">{meeting.roomName}</h3>
                    <div className="flex items-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2">
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> {meeting.date}</span>
                      <span className="flex items-center gap-1.5"><Clock size={12} /> {meeting.entries.length} messages</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => handleSummarize(e, meeting)} disabled={summaries[meeting.id]?.loading} className={`p-4 rounded-2xl transition-all ${summaries[meeting.id]?.text ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-600 hover:text-white hover:bg-white/10'}`}>
                    {summaries[meeting.id]?.loading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                  </button>
                  <ChevronRight className="text-zinc-800 group-hover:text-white group-hover:translate-x-1 transition-all" size={28} />
                </div>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
