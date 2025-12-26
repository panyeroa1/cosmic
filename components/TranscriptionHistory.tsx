
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileText, Calendar, Clock, ChevronRight, Hash, User, Bot, Loader2, ArrowLeft } from 'lucide-react';

interface TranscriptionRecord {
  id: string;
  room_name: string;
  sender: 'user' | 'ai';
  text: string;
  created_at: string;
}

interface GroupedMeeting {
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
  const [records, setRecords] = useState<TranscriptionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<GroupedMeeting | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('transcriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRecords(data || []);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  const groupedMeetings = useMemo(() => {
    const groups: { [key: string]: GroupedMeeting } = {};
    
    records.forEach(record => {
      const dateObj = new Date(record.created_at);
      // Group by room name and date (to separate sessions in the same room on different days)
      const dateKey = dateObj.toLocaleDateString();
      const groupKey = `${record.room_name}-${dateKey}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          roomName: record.room_name,
          date: dateKey,
          timestamp: dateObj,
          entries: []
        };
      }
      groups[groupKey].entries.push(record);
    });

    return Object.values(groups).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [records]);

  const filteredMeetings = useMemo(() => {
    if (!searchTerm.trim()) return groupedMeetings;
    const lowerSearch = searchTerm.toLowerCase();
    
    return groupedMeetings.filter(m => 
      m.roomName.toLowerCase().includes(lowerSearch) || 
      m.entries.some(e => e.text.toLowerCase().includes(lowerSearch))
    );
  }, [groupedMeetings, searchTerm]);

  if (selectedMeeting) {
    return (
      <div className="flex-1 flex flex-col bg-[#050505] animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#080808]/40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedMeeting(null)}
              className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <Hash size={18} className="text-zinc-500" /> {selectedMeeting.roomName}
              </h2>
              <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                <span className="flex items-center gap-1"><Calendar size={10} /> {selectedMeeting.date}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {selectedMeeting.entries.length} Messages</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {selectedMeeting.entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((entry) => (
            <div key={entry.id} className={`flex flex-col ${entry.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                {entry.sender === 'user' ? (
                  <>You <User size={10} /></>
                ) : (
                  <><Bot size={10} /> Orbit AI</>
                )}
              </div>
              <div className={`max-w-[70%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                entry.sender === 'user' 
                ? 'bg-[#141414] text-white border border-white/5' 
                : 'bg-white text-black font-medium shadow-xl'
              }`}>
                {entry.text}
              </div>
              <span className="text-[10px] text-zinc-700 mt-2 font-medium">
                {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#050505] animate-in fade-in duration-300">
      <div className="p-8 pb-4">
        <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-3">
          <FileText className="text-zinc-500" size={32} />
          Transcription Archive
        </h2>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em] mt-2 ml-1">
          Secure meeting records & AI intelligence
        </p>
      </div>

      <div className="px-8 mb-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search rooms, dates, or message content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-zinc-700"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-3">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
            <Loader2 className="animate-spin text-white" size={32} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Accessing Vault...</span>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
            <FileText size={64} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">No meeting history found</p>
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <button 
              key={`${meeting.roomName}-${meeting.date}`}
              onClick={() => setSelectedMeeting(meeting)}
              className="w-full text-left group bg-[#0a0a0a] hover:bg-[#111] border border-white/5 rounded-2xl p-5 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99] border-l-4 border-l-zinc-800 hover:border-l-white"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-white/10 transition-all">
                  <Hash size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight uppercase group-hover:translate-x-1 transition-transform">{meeting.roomName}</h3>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {meeting.date}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {meeting.entries.length} messages</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
