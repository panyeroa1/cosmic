
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, UserCircle } from 'lucide-react';

const ORBIT_LOGO_URL = 'https://eburon.ai/orbit/1.png';

interface AuthProps {
  onGuestAccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onGuestAccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-transparent">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-md w-full space-y-8 bg-[#0a0a0a]/40 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2">
            <img 
              src={ORBIT_LOGO_URL} 
              alt="Orbit Logo" 
              style={{ height: '250px', width: 'auto' }}
              className="object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-transform duration-700 hover:rotate-3" 
            />
            <div className="absolute -inset-4 bg-white/5 rounded-full blur-xl -z-10" />
          </div>
          <p className="mt-1 text-sm font-medium text-gray-500 tracking-tight">
            {isSignUp ? 'Create your professional account' : 'Welcome back to the future of meetings'}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleAuth}>
          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-zinc-200 transition-colors w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-[#121212]/50 border border-white/5 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 focus:bg-[#161616]/50 transition-all backdrop-blur-md"
                placeholder="Email address"
              />
            </div>
            
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-zinc-200 transition-colors w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-12 pr-12 py-4 bg-[#121212]/50 border border-white/5 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 focus:bg-[#161616]/50 transition-all backdrop-blur-md"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {isSignUp && (
              <div className="relative group animate-in slide-in-from-top-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-zinc-200 transition-colors w-5 h-5" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-4 bg-[#121212]/50 border border-white/5 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 focus:bg-[#161616]/50 transition-all backdrop-blur-md"
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-500/5 p-4 rounded-xl border border-red-500/10 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-4 px-4 text-sm font-bold rounded-2xl text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_-10px_rgba(255,255,255,0.2)] active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <div className="flex items-center">
                {isSignUp ? 'Launch Workspace' : 'Enter Workspace'}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </button>
        </form>

        <div className="flex flex-col gap-4 mt-6">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            {isSignUp ? 'Already an explorer? Sign in' : "New to orbit? Join the mission"}
          </button>

          <div className="h-px bg-white/5 w-full my-2" />

          <button
            onClick={onGuestAccess}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#121212]/50 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold group"
          >
            <UserCircle size={18} className="group-hover:scale-110 transition-transform" />
            Continue as Guest
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-800 uppercase tracking-[0.3em]">
        EBURON.AI • WHITELISTED ACCESS ONLY
      </div>
    </div>
  );
};
