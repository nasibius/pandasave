import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { API_URL } from '../config';

export function ResetPin() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const familyId = searchParams.get('familyId');
  const navigate = useNavigate();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null, message: string }>({ type: null, message: '' });
  const [loading, setLoading] = useState(false);

  if (!token || !familyId) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="bg-[var(--card)] p-8 rounded-[24px] border border-[var(--line)] max-w-md w-full text-center">
           <h2 className="text-2xl font-bold mb-4">Invalid Link</h2>
           <p className="text-[var(--muted)] mb-6">The PIN reset link is invalid or incomplete.</p>
           <button onClick={() => navigate('/')} className="px-6 py-3 bg-[var(--primary)] text-white rounded-[12px] font-bold">Return Home</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirmPin) {
      setStatus({ type: 'error', message: 'PINs do not match.' });
      return;
    }
    if (pin.length !== 4) {
      setStatus({ type: 'error', message: 'PIN must be exactly 4 digits.' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, token, newPin: pin })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'PIN reset successful! You can now log in.' });
        setTimeout(() => navigate('/'), 3000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to reset PIN.' });
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
        
        <h2 className="text-2xl font-extrabold mb-2 text-center tracking-tight">Reset Parent PIN</h2>
        <p className="text-[var(--muted)] mb-8 text-center text-sm">Enter a new 4-digit PIN for your parent account.</p>

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
              <label className="block text-[13px] font-bold mb-2 uppercase tracking-wider text-[var(--muted)]">New PIN</label>
              <input
                type="password"
                maxLength={4}
                required
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full text-center tracking-[1em] text-2xl p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[16px] outline-none focus:border-[var(--primary)]"
                placeholder="••••"
                disabled={status.type === 'success'}
              />
           </div>
           <div>
              <label className="block text-[13px] font-bold mb-2 uppercase tracking-wider text-[var(--muted)]">Confirm PIN</label>
              <input
                type="password"
                maxLength={4}
                required
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                className="w-full text-center tracking-[1em] text-2xl p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[16px] outline-none focus:border-[var(--primary)]"
                placeholder="••••"
                disabled={status.type === 'success'}
              />
           </div>
           <button 
             type="submit" 
             disabled={loading || status.type === 'success'}
             className="w-full bg-[var(--primary)] text-white p-4 rounded-[16px] font-bold mt-4 transition-transform active:scale-95 disabled:opacity-50"
           >
             {loading ? 'Processing...' : 'Reset PIN'}
           </button>
        </form>
      </motion.div>
    </div>
  );
}
