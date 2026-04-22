import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "../store";
import { Coins, HeartHandshake, Leaf, ArrowRight, UserPlus, LogIn, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { API_URL } from "../config";

export function Landing() {
  const { setAuth } = useAppStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [view, setView] = useState<"onboard" | "login" | "register" | "role" | "parent-pin">(
    useAppStore.getState().token ? "role" : "onboard"
  );
  
  // Forms
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [pin, setPin] = useState("");
  
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setView('login');
      setSuccessMsg('Email verified successfully! You can now log in.');
      searchParams.delete('verified');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleRegister = async (e: React.FormEvent) => {
     e.preventDefault();
     setError("");
     setSuccessMsg("");
     try {
       const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: familyName, pin })
       });
       let data;
       try {
         data = await res.json();
       } catch (err) {
         throw new Error("Invalid response from server. Are you running the Node.js backend (server.ts), or just a static frontend? To fix: run 'npm run dev'");
       }
       if (res.ok) {
          setSuccessMsg(data.message || "Registration successful! Please check your email.");
          setView('login');
       } else {
          setError(data.error || "Registration failed");
       }
     } catch (err: any) {
       console.error('Registration error:', err);
       setError(err.message || "Could not connect to the server. Please ensure the backend is running.");
     }
  };

  const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     setError("");
     try {
       const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
       });
       let data;
       try {
         data = await res.json();
       } catch (err) {
         throw new Error("Invalid response. Are you running the Node backend?");
       }
       if (res.ok) {
          setAuth(data.token, data.familyId, null);
          setView('role');
       } else {
          setError(data.error || "Login failed");
       }
     } catch (err: any) {
       console.error('Login error:', err);
       setError(err.message || "Could not connect to the server.");
     }
  };

  const handleSelectRole = async (selectedRole: "parent" | "child") => {
    if (selectedRole === "parent") {
       setView("parent-pin");
       return;
    }
    const token = localStorage.getItem('token');
    const familyId = localStorage.getItem('familyId');
    if (token && familyId) {
      setAuth(token, familyId, selectedRole);
      navigate(`/${selectedRole}`);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-pin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ pin })
      });
      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error("Invalid response. Are you running the Node backend?");
      }
      if (data.success) {
        const token = localStorage.getItem('token');
        const familyId = localStorage.getItem('familyId');
        if (token && familyId) {
          setAuth(token, familyId, 'parent');
          navigate('/parent');
        }
      } else {
        setError("Incorrect PIN.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify PIN");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <AnimatePresence mode="wait">
        {view === "onboard" && (
          <motion.div 
            key="onboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-md w-full bg-[var(--card)] p-8 rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[var(--line)] text-center relative z-10"
          >
            <div className="w-20 h-20 bg-[var(--primary-light)] rounded-[24px] flex items-center justify-center mx-auto mb-6">
              <Leaf className="w-10 h-10 text-[var(--primary)]" />
            </div>
            
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">PandaSave</h1>
            <p className="text-[var(--muted)] mb-10 text-lg leading-relaxed">
              The smart family platform to grow wealth, step by step like bamboo!
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => setView('register')}
                className="w-full flex items-center justify-between p-5 bg-[var(--primary)] text-white rounded-[16px] transition-transform active:scale-95 group border-none cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <UserPlus className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-bold text-[18px]">Create Family Account</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => setView('login')}
                className="w-full flex items-center justify-between p-5 bg-[var(--card)] border border-[var(--line)] text-[var(--text)] rounded-[16px] shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-transform active:scale-95 group hover:border-[var(--primary)] cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <LogIn className="w-6 h-6 text-[var(--primary)]" />
                  <div className="text-left font-bold text-[18px]">
                    Log In
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--primary)] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </motion.div>
        )}

        {view === "register" && (
           <motion.div 
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="max-w-md w-full bg-[var(--card)] p-8 rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[var(--line)] relative z-10"
          >
             <h2 className="text-2xl font-bold mb-6 text-center">New Family Setup</h2>
             <form onSubmit={handleRegister} className="flex flex-col gap-4">
               <div>
                  <label className="text-sm font-bold text-[var(--muted)] mb-1 block">Family Name</label>
                  <input required type="text" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="e.g. The Smiths" className="w-full p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[12px] outline-none focus:border-[var(--primary)]" />
               </div>
               <div>
                  <label className="text-sm font-bold text-[var(--muted)] mb-1 block">Parent Email</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[12px] outline-none focus:border-[var(--primary)]" />
               </div>
               <div>
                  <label className="text-sm font-bold text-[var(--muted)] mb-1 block">Password</label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[12px] outline-none focus:border-[var(--primary)]" />
               </div>
               <div>
                  <label className="text-sm font-bold text-[var(--muted)] mb-1 block">Parent PIN (4 digits for passing child blocks)</label>
                  <input required type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} className="w-full p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[12px] outline-none focus:border-[var(--primary)]" />
               </div>
               {error && <p className="text-red-500 text-sm">{error}</p>}
               <div className="flex gap-2 mt-4">
                 <button type="button" onClick={() => setView('onboard')} className="flex-1 p-4 rounded-[12px] font-bold text-[var(--muted)] hover:bg-black/5">Back</button>
                 <button type="submit" className="flex-[2] bg-[var(--primary)] text-white p-4 rounded-[12px] font-bold">Sign Up</button>
               </div>
             </form>
          </motion.div>
        )}

        {view === "login" && (
           <motion.div 
            key="login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="max-w-md w-full bg-[var(--card)] p-8 rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[var(--line)] relative z-10"
          >
             <h2 className="text-2xl font-bold mb-6 text-center">Welcome Back</h2>
             {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-[12px] border border-green-200 text-sm font-medium">{successMsg}</div>}
             <form onSubmit={handleLogin} className="flex flex-col gap-4">
               <div>
                  <label className="text-sm font-bold text-[var(--muted)] mb-1 block">Email</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[12px] outline-none focus:border-[var(--primary)]" />
               </div>
               <div>
                  <div className="flex justify-between items-center mb-1">
                     <label className="text-sm font-bold text-[var(--muted)] block">Password</label>
                     <button type="button" onClick={() => setView('forgot-password')} className="text-sm font-medium text-[var(--primary)] hover:underline">Forgot password?</button>
                  </div>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[12px] outline-none focus:border-[var(--primary)]" />
               </div>
               {error && <p className="text-red-500 text-sm">{error}</p>}
               <div className="flex gap-2 mt-4">
                 <button type="button" onClick={() => setView('onboard')} className="flex-1 p-4 rounded-[12px] font-bold text-[var(--muted)] hover:bg-black/5">Back</button>
                 <button type="submit" className="flex-[2] bg-[var(--primary)] text-white p-4 rounded-[12px] font-bold">Log In</button>
               </div>
             </form>
          </motion.div>
        )}

        {view === "forgot-password" && (
           <motion.div 
            key="forgot-password"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="max-w-md w-full bg-[var(--card)] p-8 rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[var(--line)] relative z-10"
          >
             <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
             <p className="text-[var(--muted)] text-center text-sm mb-6">Enter your email to receive a password reset link.</p>
             {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-[12px] border border-green-200 text-sm font-medium">{successMsg}</div>}
             <form onSubmit={async (e) => {
               e.preventDefault();
               setError("");
               setSuccessMsg("");
               if (!email) return;
               try {
                  const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                  });
                  let data;
                  try {
                    data = await res.json();
                  } catch (err) {
                    throw new Error("Invalid response. Make sure the Node backend is running.");
                  }
                  if (res.ok) {
                    setSuccessMsg(data.message);
                    setTimeout(() => setView('login'), 3000);
                  } else {
                    setError(data.error || "Failed to send reset link.");
                  }
               } catch (e: any) {
                 console.error('Forgot password error:', e);
                 setError(e.message || 'Could not connect to the server.');
               }
             }} className="flex flex-col gap-4">
               <div>
                  <label className="text-sm font-bold text-[var(--muted)] mb-1 block">Email</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[12px] outline-none focus:border-[var(--primary)]" />
               </div>
               {error && <p className="text-red-500 text-sm">{error}</p>}
               <div className="flex gap-2 mt-4">
                 <button type="button" onClick={() => setView('login')} className="flex-1 p-4 rounded-[12px] font-bold text-[var(--muted)] hover:bg-black/5">Back</button>
                 <button type="submit" className="flex-[2] bg-[var(--primary)] text-white p-4 rounded-[12px] font-bold">Send Link</button>
               </div>
             </form>
          </motion.div>
        )}

        {view === "role" && (
          <motion.div 
            key="role"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-md w-full bg-[var(--card)] p-8 rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[var(--line)] text-center relative z-10"
          >
            <h2 className="text-2xl font-bold mb-6">Who is playing?</h2>
            <div className="space-y-4">
              <button 
                onClick={() => handleSelectRole('child')}
                className="w-full flex items-center justify-between p-5 bg-[var(--secondary)] text-[var(--primary)] rounded-[16px] transition-transform active:scale-95 group border-none cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/40 p-2 rounded-[12px]">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div className="text-left font-bold text-[18px]">I'm a Kid</div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => handleSelectRole('parent')}
                className="w-full flex items-center justify-between p-5 bg-[var(--card)] border border-[var(--line)] text-[var(--text)] rounded-[16px] shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-transform active:scale-95 group hover:border-[var(--primary)] cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[var(--primary-light)] p-2 rounded-[12px]">
                    <HeartHandshake className="w-6 h-6 text-[var(--primary)]" />
                  </div>
                  <div className="text-left font-bold text-[18px]">I'm a Parent</div>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--primary)] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
             <button onClick={() => { useAppStore.getState().logout(); setView('onboard'); }} className="mt-8 text-sm text-[var(--muted)] hover:text-red-500">Log out of family</button>
          </motion.div>
        )}

        {view === "parent-pin" && (
          <motion.div 
            key="pin"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="max-w-md w-full bg-[var(--card)] p-8 rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[var(--line)] text-center relative z-10"
          >
             <h2 className="text-2xl font-bold mb-2">Parent Access</h2>
             <p className="text-[var(--muted)] mb-6 text-sm">Enter your 4-digit parent PIN.</p>
             {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-[12px] border border-green-200 text-sm font-medium">{successMsg}</div>}
             
             <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
               <input 
                 type="password"
                 maxLength={4}
                 value={pin}
                 onChange={e => setPin(e.target.value)}
                 className="w-full text-center tracking-[1em] text-2xl p-4 bg-[var(--bg)] border border-[var(--line)] rounded-[16px] outline-none focus:border-[var(--primary)]"
                 placeholder="****"
                 autoFocus
               />
               <div className="flex justify-end">
                  <button type="button" onClick={async () => {
                     setError("");
                     setSuccessMsg("");
                     try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${API_URL}/api/auth/forgot-pin`, {
                           method: 'POST',
                           headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                           }
                        });
                        let data;
                        try {
                          data = await res.json();
                        } catch (err) {
                           throw new Error("Invalid response. Check if backend is running.");
                        }
                        setSuccessMsg(data.message || 'If you have an email registered, a link has been sent to it.');
                     } catch(e: any) {
                        setError(e.message || 'Failed to request PIN reset.');
                     }
                  }} className="text-sm font-medium text-[var(--primary)] hover:underline -mt-2">Forgot PIN?</button>
               </div>
               {error && <p className="text-red-500 text-sm">{error}</p>}
               <div className="flex gap-2 mt-2">
                 <button 
                   type="button"
                   onClick={() => setView('role')}
                   className="flex-1 p-4 rounded-[12px] font-bold text-[var(--muted)] hover:bg-black/5"
                 >
                   Back
                 </button>
                 <button 
                   type="submit"
                   className="flex-[2] bg-[var(--primary)] text-white p-4 rounded-[12px] font-bold"
                 >
                   Unlock
                 </button>
               </div>
             </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center text-[var(--muted)] text-[12px] max-w-2xl px-4 z-10"
      >
        <p className="font-semibold mb-2 text-[14px]">Developed by students from BHOS (Baku Higher Oil School)</p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>Mahammad Gulmammadov (<a href="mailto:mahammad.gulmammadov.std@bhos.edu.az" className="hover:text-[var(--primary)] transition-colors">email</a>)</span>
          <span>Amil Alakbarov (<a href="mailto:amil.alakbarov.std@bhos.edu.az" className="hover:text-[var(--primary)] transition-colors">email</a>)</span>
          <span>Amil Alasgarov (<a href="mailto:amil.alasgarov.std@bhos.edu.az" className="hover:text-[var(--primary)] transition-colors">email</a>)</span>
          <span>Amin İsmayilli (<a href="mailto:amin.ismayilli.std@bhos.edu.az" className="hover:text-[var(--primary)] transition-colors">email</a>)</span>
          <span>Nasib Suleymanov (<a href="mailto:nasib.suleymanov.std@bhos.edu.az" className="hover:text-[var(--primary)] transition-colors">email</a>)</span>
        </div>
      </motion.footer>
    </div>
  );
}
