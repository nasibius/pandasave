import { Link, Navigate } from "react-router-dom";
import { useAppStore } from "../store";
import { CheckCircle2, CircleDashed, Leaf, LogOut, Coins, Target } from "lucide-react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { useState, useEffect } from "react";

export function ChildDashboard() {
  const { children, selectedChildId, goals, tasks, updateTaskStatus, addFundsToGoal, logout } = useAppStore();
  
  const selectedChild = children.find(c => c.id === selectedChildId);

  const childGoals = goals.filter(g => g.childId === selectedChildId);
  const childTasks = tasks.filter(t => t.childId === selectedChildId);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (childGoals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(childGoals[0]?.id || null);
    }
  }, [childGoals, selectedGoalId]);

  useEffect(() => {
    // Check if hasn't saved in 3 days
    if (selectedChild?.lastSavedDate) {
      const msSinceLastSave = Date.now() - selectedChild.lastSavedDate;
      const daysSinceLastSave = msSinceLastSave / (1000 * 60 * 60 * 24);
      if (daysSinceLastSave >= 3) {
        setShowReminder(true);
      }
    } else if (selectedChild) {
      setShowReminder(true); // If never saved, remind
    }
  }, [selectedChild]);

  if (!selectedChild) {
     return (
       <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-[var(--text)]">
          <h2 className="text-2xl font-bold mb-6">Who is playing?</h2>
          {children.length === 0 ? (
            <div className="text-center">
              <p className="text-[var(--muted)] mb-4">No kids found in this family.</p>
              <button onClick={() => logout()} className="bg-[var(--card)] border border-[var(--line)] px-4 py-2 rounded-xl">Back</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
               {children.map(child => (
                  <button 
                    key={child.id}
                    onClick={() => useAppStore.getState().setSelectedChild(child.id)}
                    className="bg-[var(--card)] border border-[var(--line)] p-6 rounded-[24px] flex flex-col items-center gap-3 transition-transform active:scale-95 shadow-sm"
                  >
                     <div className="text-4xl">🐼</div>
                     <div className="font-bold">{child.name}</div>
                  </button>
               ))}
               <button onClick={() => logout()} className="col-span-2 mt-4 text-[var(--muted)] font-bold">Sign out</button>
            </div>
          )}
       </div>
     );
  }

  const balance = selectedChild.balance;
  const pendingTasks = childTasks.filter(t => t.status === 'pending');
  const completedTasks = childTasks.filter(t => t.status === 'completed' || t.status === 'approved');
  
  const level = Math.floor(balance / 50) + 1;
  const levelTitles = ["Novice Saver", "Bamboo Tracker", "Bamboo Ranger", "Bamboo Master", "Bamboo King"];
  const rankTitle = level <= 5 ? levelTitles[level - 1] : "Ultimate Saver";
  
  const handleCompleteTask = (id: string) => {
    if (completingTaskId) return;
    setCompletingTaskId(id);
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#5fc574', '#3ba752', '#f6f6f6']
    });

    setTimeout(() => {
      updateTaskStatus(id, 'completed');
      setCompletingTaskId(null);
    }, 1000); // 1 second flourish delay
  };

  const handleFundGoal = (goalId: string, amount: number) => {
    if (balance >= amount) {
      addFundsToGoal(goalId, selectedChild.id, amount);
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#ffd700', '#3ba752']
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24 text-[var(--text)]">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="px-6 pt-8 pb-4 z-20 flex justify-between items-center">
        <div className="user-greeting">
          <p className="text-[var(--muted)] font-medium mb-1">Good morning,</p>
          <h1 className="text-[28px] font-bold">Hi, {selectedChild.name}! 👋</h1>
        </div>
        <button onClick={() => useAppStore.getState().setAuth(useAppStore.getState().token!, useAppStore.getState().familyId!, null)} className="p-2 text-[var(--muted)] hover:bg-black/5 rounded-full transition-colors flex items-center gap-2">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Simulated Push Notification */}
      {showReminder && (
        <div className="px-6 mb-4">
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-[var(--primary)] text-[var(--card)] p-4 rounded-[16px] shadow-lg flex items-start gap-4 relative"
           >
             <div className="text-[24px]">🔔</div>
             <div>
               <h4 className="font-bold">Don't forget to save!</h4>
               <p className="text-[14px] opacity-90 leading-tight mt-1">
                 It's been a while since you fed your bamboo. Feed your goals to reach them faster!
               </p>
             </div>
             <button 
               onClick={() => setShowReminder(false)}
               className="absolute top-2 right-2 p-1 opacity-70 hover:opacity-100"
             >
               ✖
             </button>
           </motion.div>
        </div>
      )}

      <main className="px-6 space-y-8 flex flex-col pt-2">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[var(--primary)] to-[#1E3A1A] text-white flex flex-col items-center text-center p-6 rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden">
           <div className="w-[140px] h-[140px] bg-white rounded-full flex items-center justify-center text-[80px] border-[6px] border-[var(--secondary)] z-10">
             🐼
           </div>
           <div className="bg-[var(--accent)] px-4 py-1 rounded-[20px] text-sm font-semibold -mt-4 z-20 shadow-sm">
             Level {level}
           </div>
           <div className="mt-4 z-10">
              <h3 className="text-[18px] font-bold">{rankTitle}</h3>
              <p className="opacity-80 text-[14px]">Balance: ₼{balance}</p>
           </div>
           <div className="absolute -bottom-8 -right-4 text-[120px] opacity-10 pointer-events-none z-0">
             🎋
           </div>
        </div>
        
        {/* Goals Section */}
        <section className="bg-[var(--card)] border border-[var(--line)] rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[18px] font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-[var(--primary)]" /> 
              Savings Goals
            </h2>
          </div>
          
          <div className="flex flex-col gap-6">
            {childGoals.map(goal => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const isSelected = selectedGoalId === goal.id;
              
              return (
                <div 
                  key={goal.id}
                  onClick={() => setSelectedGoalId(goal.id)}
                  className={`flex flex-col gap-4 cursor-pointer transition-opacity ${isSelected ? 'opacity-100' : 'opacity-60'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-[16px]">{goal.emoji} {goal.title}</span>
                    <span className="text-[var(--text)] font-semibold">₼{goal.currentAmount} / ₼{goal.targetAmount}</span>
                  </div>
                  
                  <div className="relative w-full h-[28px] bg-[var(--progress-bg)] rounded-[14px] mt-1 mb-2 shadow-inner overflow-visible">
                    {/* Bamboo Stalk (The progress fill) */}
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-[14px] flex items-center overflow-hidden"
                    >
                      {/* Bamboo nodes to make it look like a stalk */}
                      <div className="absolute inset-0 flex justify-evenly items-center">
                        {[...Array(12)].map((_, i) => {
                           const nodeProgress = (i + 1) * (100 / 12);
                           const isReached = progress >= nodeProgress;
                           return (
                             <div key={i} className="relative h-full flex items-center justify-center">
                               <div className="w-[3px] bg-black/20 h-full skew-x-[-15deg]" />
                               {isReached && (
                                  <motion.div 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2, type: 'spring' }}
                                    className="absolute -top-1 -right-3 text-[14px] drop-shadow-sm z-20"
                                  >
                                    🍃
                                  </motion.div>
                               )}
                             </div>
                           );
                        })}
                      </div>
                    </motion.div>
                    
                    {/* Panda Face tracking the progress tip */}
                    <motion.div
                       initial={{ left: 0 }}
                       animate={{ left: progress > 0 ? `min(calc(${progress}% - 16px), calc(100% - 32px))` : '0px' }}
                       className="absolute top-1/2 -translate-y-1/2 text-[32px] drop-shadow-md z-30 transition-all duration-300"
                    >
                       🐼
                    </motion.div>
                  </div>
                  {isSelected && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleFundGoal(goal.id, 5); }}
                      disabled={balance < 5 || progress >= 100}
                      className="self-end px-4 py-2 bg-[var(--secondary)] text-[var(--primary)] font-bold rounded-[8px] text-[14px] disabled:opacity-50 transition-transform active:scale-95 z-40"
                    >
                      {progress >= 100 ? "Goal Reached!" : "Feed Bamboo (₼5)"}
                    </button>
                  )}
                </div>
              )
            })}
            
            {childGoals.length === 0 && (
               <div className="text-center p-6 text-[var(--muted)] border border-[var(--line)] rounded-[16px]">
                  No goals set yet! Ask your parent to create one.
               </div>
            )}
          </div>
        </section>

        {/* Tasks Section */}
        <section className="bg-[var(--card)] border border-[var(--line)] rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-[18px] font-bold flex items-center gap-2">
               <CheckCircle2 className="w-5 h-5 text-[var(--primary)]" /> 
               Today's Tasks
             </h2>
           </div>

           <div className="flex flex-col gap-3">
             {pendingTasks.map((task, i) => {
                const isCompleting = completingTaskId === task.id;
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0, scale: isCompleting ? 1.02 : 1 }}
                    transition={{ delay: i * 0.1, duration: 0.2 }}
                    key={task.id} 
                    className={`bg-[var(--card-alt)] border border-[var(--line)] p-4 rounded-[16px] flex items-center gap-4 transition-colors ${isCompleting ? 'bg-[var(--primary-light)] border-[var(--primary)]' : ''}`}
                  >
                    <div className="w-[40px] h-[40px] bg-[var(--primary-light)] text-[var(--primary)] rounded-[10px] grid place-items-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-[15px]">{task.title}</div>
                      <div className="text-[13px] text-[var(--muted)]">Reward: ₼{task.reward}</div>
                    </div>
                    <button 
                       onClick={() => handleCompleteTask(task.id)}
                       disabled={completingTaskId !== null}
                       className={`px-3 py-2 rounded-[8px] font-bold text-[14px] transition-all border-none flex justify-center items-center min-w-[70px] ${isCompleting ? 'bg-transparent text-[var(--primary)] scale-110' : 'bg-[var(--secondary)] text-[var(--primary)] active:scale-95 disabled:opacity-50'}`}
                    >
                      {isCompleting ? (
                        <motion.div 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1, rotate: [0, 20, 0] }} 
                          transition={{ duration: 0.4 }}
                        >
                          <CheckCircle2 className="w-6 h-6" />
                        </motion.div>
                      ) : (
                        "Claim"
                      )}
                    </button>
                  </motion.div>
                )
             })}

             {pendingTasks.length === 0 && (
                <div className="text-center p-6 text-[var(--muted)] border border-[var(--line)] rounded-[16px]">
                  All quests complete! 🎉
                </div>
             )}
             
             {completedTasks.length > 0 && completedTasks.map(task => (
                <div key={task.id} className="bg-[var(--card-alt)] border border-[var(--line)] p-4 rounded-[16px] flex items-center gap-4 opacity-70">
                  <div className="w-[40px] h-[40px] bg-[var(--disabled-bg)] text-[#AAAAAA] rounded-[10px] grid place-items-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[15px] line-through truncate">{task.title}</div>
                    <div className="text-[13px] text-[var(--muted)]">Reward: ₼{task.reward}</div>
                  </div>
                  <button className="bg-[var(--disabled-bg)] text-[#AAAAAA] px-3 py-2 rounded-[8px] font-bold text-[13px] border-none cursor-default">
                    {task.status === 'completed' ? 'Pending' : 'Approved'}
                  </button>
                </div>
             ))}
           </div>
        </section>

      </main>
      </div>

      {/* Floating Action / Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm bg-[var(--card)] border border-[var(--line)] shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-2 rounded-[24px] flex justify-around items-center z-50">
        <button className="flex flex-col items-center p-2 text-[var(--primary)] hover:bg-black/5 rounded-[12px] transition-colors w-20">
           <span className="text-[20px] mb-1">🏠</span>
           <span className="text-[11px] font-bold">Home</span>
        </button>
        <Link to="/game" className="flex flex-col items-center p-2 text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 rounded-[12px] transition-colors w-20">
           <span className="text-[20px] mb-1">🎮</span>
           <span className="text-[11px] font-bold">Play</span>
        </Link>
      </div>

    </div>
  );
}
