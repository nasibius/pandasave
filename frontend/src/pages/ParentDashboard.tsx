import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "../store";
import { Check, X, Plus, LogOut, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function ParentDashboard() {
  const { children, tasks, goals, updateTaskStatus, addTask, setSpendingLimit, addChild, logout } = useAppStore();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskReward, setNewTaskReward] = useState("");
  const [newChildName, setNewChildName] = useState("");
  const [isAddingChild, setIsAddingChild] = useState(false);
  
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalAmount, setNewGoalAmount] = useState("");

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const selectedChild = children.find(c => c.id === selectedChildId);
  const childTasks = tasks.filter(t => t.childId === selectedChildId);
  const childGoals = goals.filter(g => g.childId === selectedChildId);

  const needsApproval = childTasks.filter(t => t.status === 'completed');
  const activeTasks = childTasks.filter(t => t.status === 'pending');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskReward || !selectedChildId) return;
    addTask({
      id: Math.random().toString(36).substring(7),
      childId: selectedChildId,
      title: newTaskTitle,
      reward: Number(newTaskReward),
      status: 'pending'
    });
    setNewTaskTitle("");
    setNewTaskReward("");
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newChildName) {
      await addChild(newChildName);
      setNewChildName("");
      setIsAddingChild(false);
    }
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle || !newGoalAmount || !selectedChildId) return;
    useAppStore.getState().addGoal({
      id: Math.random().toString(36).substring(7),
      childId: selectedChildId,
      title: newGoalTitle,
      targetAmount: Number(newGoalAmount),
      currentAmount: 0,
      emoji: '🎯'
    });
    setNewGoalTitle("");
    setNewGoalAmount("");
    setIsAddingGoal(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-12 text-[var(--text)]">
      <div className="max-w-4xl mx-auto">
        <header className="px-6 pt-8 pb-4 flex justify-between items-center">
          <div className="user-greeting">
            <h1 className="text-[28px] font-bold flex items-center gap-2">
              Family Dashboard
            </h1>
          </div>
          <button onClick={() => { useAppStore.getState().setAuth(useAppStore.getState().token!, useAppStore.getState().familyId!, null); }} className="p-2 text-[var(--muted)] hover:bg-black/5 rounded-full transition-colors flex items-center gap-2">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="p-6 space-y-8 flex flex-col pt-2">
          
          {/* Child Selector */}
          <section className="bg-[var(--card)] border border-[var(--line)] shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-4 rounded-[24px]">
             <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Children</h2>
                <button onClick={() => setIsAddingChild(!isAddingChild)} className="text-[var(--primary)] font-bold text-sm bg-[var(--primary-light)] px-3 py-1 rounded-full">+ Add Child</button>
             </div>
             
             <AnimatePresence>
                {isAddingChild && (
                   <motion.form 
                     initial={{ height: 0, opacity: 0 }} 
                     animate={{ height: 'auto', opacity: 1 }} 
                     exit={{ height: 0, opacity: 0 }} 
                     onSubmit={handleAddChild} 
                     className="overflow-hidden flex gap-2 mb-4 px-2"
                   >
                     <input value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="Child's Name" className="flex-1 bg-[var(--bg)] border border-[var(--line)] rounded-xl px-4 py-2 outline-none focus:border-[var(--primary)]" />
                     <button type="submit" className="bg-[var(--primary)] text-white px-4 rounded-xl font-bold">Add</button>
                   </motion.form>
                )}
             </AnimatePresence>

             <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
               {children.map(child => (
                 <button 
                   key={child.id}
                   onClick={() => setSelectedChildId(child.id)}
                   className={`shrink-0 border snap-start px-6 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${selectedChildId === child.id ? 'bg-[var(--primary-light)] border-[var(--primary)]' : 'bg-[var(--bg)] border-[var(--line)] hover:border-[var(--primary)]'}`}
                 >
                   <div className="text-3xl">🐼</div>
                   <div className="font-bold">{child.name}</div>
                   <div className="text-sm font-medium text-[var(--primary)]">₼{child.balance}</div>
                 </button>
               ))}
               {children.length === 0 && (
                 <div className="text-[var(--muted)] p-4 text-center w-full">No children added yet.</div>
               )}
             </div>
          </section>

          {selectedChild && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Approval Queue */}
                <section className="bg-[var(--card)] border border-[var(--line)] rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex-1">
                  <h3 className="font-bold text-[18px] mb-6 flex justify-between items-center">
                    Needs Approval 
                    {needsApproval.length > 0 && (
                      <span className="bg-[var(--primary-light)] text-[var(--primary)] text-xs px-2 py-1 rounded-[10px]">{needsApproval.length} pending</span>
                    )}
                  </h3>
                  
                  {needsApproval.length === 0 ? (
                    <div className="border border-[var(--line)] rounded-[16px] p-6 text-center text-[var(--muted)] text-[14px]">
                      No tasks to approve right now.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {needsApproval.map(task => (
                        <div key={task.id} className="bg-[var(--card-alt)] border border-[var(--line)] p-4 rounded-[16px] flex items-center gap-4">
                          <div className="flex-1">
                            <div className="font-semibold text-[15px]">{task.title}</div>
                            <div className="text-[13px] text-[var(--muted)]">Reward: ₼{task.reward}</div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => updateTaskStatus(task.id, 'pending')} className="p-2 text-red-500 bg-red-50 rounded-[10px] transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
                             <button onClick={() => updateTaskStatus(task.id, 'approved')} className="p-2 text-[var(--primary)] bg-[var(--secondary)] rounded-[10px] transition-colors cursor-pointer"><Check className="w-5 h-5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Manage Tasks */}
                <section className="bg-[var(--card)] border border-[var(--line)] rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex-1">
                   <h3 className="font-bold text-[18px] mb-6">Active Tasks for {selectedChild.name}</h3>
                   <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
                      <input 
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        placeholder="New task..."
                        className="flex-1 bg-white border border-[var(--line)] px-4 py-3 rounded-[12px] outline-none min-w-0 placeholder-[var(--muted)]"
                      />
                      <input 
                        value={newTaskReward}
                        onChange={e => setNewTaskReward(e.target.value)}
                        type="number"
                        placeholder="₼ Reward"
                        className="w-20 bg-white border border-[var(--line)] px-1 py-3 rounded-[12px] outline-none text-center font-medium placeholder-[var(--muted)]"
                      />
                      <button type="submit" className="bg-[var(--secondary)] text-[var(--primary)] px-4 py-3 rounded-[12px] font-bold cursor-pointer">
                        <Plus className="w-5 h-5" />
                      </button>
                   </form>

                   <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto">
                      {activeTasks.map(task => (
                         <div key={task.id} className="bg-[var(--card-alt)] border border-[var(--line)] p-4 rounded-[16px] flex justify-between items-center text-[15px]">
                            <span className="font-medium">{task.title}</span>
                            <span className="text-[13px] text-[var(--muted)]">₼{task.reward}</span>
                         </div>
                      ))}
                   </div>
                </section>
              </div>

              {/* Spending Limit & Rewards Section */}
              <section className="bg-[var(--card)] border border-[var(--line)] rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] mt-8">
                 <h3 className="font-bold text-[18px] mb-6">Configuration for {selectedChild.name}</h3>
                 
                 <div className="mb-6">
                    <label className="block text-[14px] font-bold mb-2">Edit Child Name</label>
                    <div className="flex gap-2 mb-4">
                       <input 
                         value={selectedChild.name}
                         onChange={(e) => {
                             useAppStore.getState().updateChild(selectedChild.id, e.target.value);
                         }}
                         className="flex-1 bg-white border border-[var(--line)] px-4 py-3 rounded-[12px] outline-none placeholder-[var(--muted)]"
                         placeholder="Child's Name"
                       />
                    </div>
                 </div>

                 <div className="mb-6 border-t border-[var(--line)] pt-6">
                    <label className="block text-[14px] font-bold mb-2">Spending Limit</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                       <select
                         className="bg-white border border-[var(--line)] px-4 py-3 rounded-[12px] outline-none text-[var(--text)] w-full sm:w-auto"
                         value={selectedChild.spendingLimitPeriod || ''}
                         onChange={(e) => setSpendingLimit(selectedChild.id, { amount: selectedChild.spendingLimitAmount, period: (e.target.value as 'daily' | 'weekly') || null })}
                       >
                         <option value="">No Limit</option>
                         <option value="daily">Daily Limit</option>
                         <option value="weekly">Weekly Limit</option>
                       </select>

                       {selectedChild.spendingLimitPeriod && (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-[var(--text)] font-medium">₼</span>
                            <input 
                              type="number"
                              value={selectedChild.spendingLimitAmount || ''}
                              onChange={(e) => setSpendingLimit(selectedChild.id, { amount: Number(e.target.value), period: selectedChild.spendingLimitPeriod })}
                              className="w-24 bg-white border border-[var(--line)] px-4 py-3 rounded-[12px] outline-none placeholder-[var(--muted)]"
                              placeholder="Amount"
                            />
                          </div>
                       )}
                    </div>
                    {selectedChild.spendingLimitPeriod && selectedChild.spendingLimitAmount > 0 && (
                      <p className="text-[14px] text-[var(--muted)] mt-4 border-l-4 border-l-[var(--primary)] pl-4 py-1">
                        {selectedChild.name} can spend up to ₼{selectedChild.spendingLimitAmount} <b>{selectedChild.spendingLimitPeriod}</b> feeding goals. <br/>
                        Current progress: ₼{selectedChild.spentSoFar} spent this period.
                      </p>
                    )}
                 </div>

                 <div className="border-t border-[var(--line)] pt-6">
                    <label className="block text-[14px] font-bold mb-2">Quiz Reward Amount (Per Correct Answer)</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                       <div className="flex items-center gap-2 w-full sm:w-auto">
                         <span className="text-[var(--text)] font-medium">₼</span>
                         <input 
                           type="number"
                           value={selectedChild.quizRewardAmount ?? 2}
                           onChange={(e) => useAppStore.getState().setRewardAmount(selectedChild.id, Number(e.target.value))}
                           className="w-24 bg-white border border-[var(--line)] px-4 py-3 rounded-[12px] outline-none placeholder-[var(--muted)]"
                           placeholder="2"
                         />
                       </div>
                       <p className="text-[13px] text-[var(--muted)]">Adjust the manats given to the child for completing financial literacy quiz correctly.</p>
                    </div>
                 </div>
              </section>

              {/* Child Goals Insight */}
              <section className="bg-[var(--card)] border border-[var(--line)] rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] mt-8">
                 <h3 className="font-bold text-[18px] mb-6 flex justify-between items-center">
                    Savings Goals Insight
                    <button onClick={() => setIsAddingGoal(!isAddingGoal)} className="text-sm font-bold text-[var(--primary)] bg-[var(--primary-light)] px-3 py-1 rounded-full">+ New Goal</button>
                 </h3>
                 
                 <AnimatePresence>
                    {isAddingGoal && (
                       <motion.form 
                         initial={{ height: 0, opacity: 0 }} 
                         animate={{ height: 'auto', opacity: 1 }} 
                         exit={{ height: 0, opacity: 0 }} 
                         onSubmit={handleAddGoal} 
                         className="overflow-hidden flex gap-2 mb-6"
                       >
                         <input value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} placeholder="Goal Item (e.g. Lego Set)" className="flex-1 bg-white border border-[var(--line)] px-4 py-2 rounded-[12px] outline-none min-w-0" />
                         <input value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} type="number" placeholder="₼" className="w-20 bg-white border border-[var(--line)] px-2 py-2 rounded-[12px] outline-none text-center" />
                         <button type="submit" className="bg-[var(--secondary)] text-[var(--primary)] px-4 rounded-[12px] font-bold">Add</button>
                       </motion.form>
                    )}
                 </AnimatePresence>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {childGoals.map(goal => {
                      const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                      return (
                        <div key={goal.id} className="border border-[var(--line)] rounded-[16px] p-4 flex flex-col gap-4">
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-[16px]">{goal.emoji} {goal.title}</span>
                              <span className="text-[var(--text)] font-semibold">₼{goal.currentAmount} / ₼{goal.targetAmount}</span>
                           </div>
                           
                           <div className="relative w-full h-[24px] bg-[var(--progress-bg)] rounded-[12px] shadow-inner overflow-visible">
                              <div style={{ width: `${progress}%` }} className="absolute left-0 top-0 h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-[12px] flex items-center overflow-hidden transition-all duration-300">
                                <div className="absolute inset-0 flex justify-evenly items-center">
                                  {[...Array(10)].map((_, i) => {
                                     const nodeProgress = (i + 1) * (100 / 10);
                                     const isReached = progress >= nodeProgress;
                                     return (
                                       <div key={i} className="relative h-full flex items-center justify-center">
                                         <div className="w-[3px] bg-black/20 h-full skew-x-[-15deg]" />
                                         {isReached && <div className="absolute -top-1 -right-3 text-[14px] drop-shadow-sm z-20">🍃</div>}
                                       </div>
                                     );
                                  })}
                                </div>
                              </div>
                              <div style={{ left: progress > 0 ? `min(calc(${progress}% - 14px), calc(100% - 28px))` : '0px' }} className="absolute top-1/2 -translate-y-1/2 text-[28px] drop-shadow-md z-10 transition-all duration-300">
                                 🐼
                              </div>
                           </div>
                        </div>
                      )
                    })}
                 </div>
              </section>
            </motion.div>
          )}

        </main>
      </div>
    </div>
  );
}
