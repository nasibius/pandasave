import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { API_URL } from '../config';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null, message: string }>({ type: null, message: '' });
  const [loading, setLoading] = useState(false);

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="bg-[var(--card)] p-8 rounded-[24px] border border-[var(--line)] max-w-md w-full text-center">
           <h2 className="text-2xl font-bold mb-4">Invalid Link</h2>
           <p className="text-[var(--muted)] mb-6">The password reset link is invalid or incomplete.</p>
           <button onClick={() => navigate('/')} className="px-6 py-3 bg-[var(--primary)] text-white rounded-[12px] font-bold">Return Home</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'Password reset successful! You can now log in.' });
        setTimeout(() => navigate('/'), 3000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to reset password.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 text-[var(--text)]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card)] p-8 rounded-[32px] border border-[var(--line)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[var(--primary-light)] rounded-[16px] flex flex-col items-center justify-center border border-[var(--line)]">
             <Lock className="w-8 h-8 text-[var(--primary)]" />
          </div>
        </div>
        
        <h2 className="text-2xl font-extrabold mb-2 text-center tracking-tight">Reset Password</h2>
        <p className="text-[var(--muted)] mb-8 text-center text-sm">Enter a new secure password for {email}</p>

        {status.type === 'error' && (
           <div className="bg-[var(--danger-light)] text-red-600 p-4 rounded-[12px] mb-6 text-sm font-medium text-center">
              {status.message}
           </div>
        )}

        {status.type === 'success' && (
           <div className="bg-[var(--primary-light)] text-[var(--primary)] p-4 rounded-[12px] mb-6 text-sm font-medium text-center">
              {status.message}
           </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
              <label className="block text-[13px] font-bold mb-2 uppercase tracking-wider text-[var(--muted)]">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-[16px] px-4 py-4 outline-none transition-colors focus:border-[var(--primary)]"
                placeholder="••••••••"
                disabled={status.type === 'success'}
              />
           </div>
           <div>
              <label className="block text-[13px] font-bold mb-2 uppercase tracking-wider text-[var(--muted)]">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-[16px] px-4 py-4 outline-none transition-colors focus:border-[var(--primary)]"
                placeholder="••••••••"
                disabled={status.type === 'success'}
              />
           </div>
           <button 
             type="submit" 
             disabled={loading || status.type === 'success'}
             className="w-full bg-[var(--primary)] text-white p-4 rounded-[16px] font-bold mt-4 transition-transform active:scale-95 disabled:opacity-50"
           >
             {loading ? 'Processing...' : 'Reset Password'}
           </button>
        </form>
      </motion.div>
    </div>
  );
}
