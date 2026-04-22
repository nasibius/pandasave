import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store";
import { ArrowLeft, BrainCircuit, CheckCircle2, XCircle } from "lucide-react";
import confetti from "canvas-confetti";

const QUESTIONS = [
  {
    id: 1,
    text: "You see a shiny new video game skin. It looks cool, but you already have 3 skins. What should you do?",
    type: "Needs vs Wants",
    options: ["Buy it immediately, it's a Need!", "Save my money, it's just a Want."],
    correct: 1,
    explanation: "A 'Want' is something nice to have, but you can live without it! Savings grow faster when you skip small wants."
  },
  {
    id: 2,
    text: "Your lunchbox broke and you need a new one for school tomorrow. Which of these is the smartest choice?",
    type: "Smart Spending",
    options: ["Buy a completely unique $50 golden lunchbox.", "Buy a sturdy, normal $15 lunchbox.", "Skip lunch forever!"],
    correct: 1,
    explanation: "A 'Need' is something you must have, but you can still be smart about how much you spend on it!"
  },
  {
    id: 3,
    text: "If you save $5 a week for a $20 toy, how many weeks will it take you?",
    type: "Math Challenge",
    options: ["2 weeks", "3 weeks", "4 weeks", "5 weeks"],
    correct: 2,
    explanation: "4 weeks times $5 equals $20! Consistency is the key to growing your bamboo."
  },
  {
    id: 4,
    text: "Your goal is to save $50. You currently have $35. How much more do you need?",
    type: "Math Challenge",
    options: ["$10", "$15", "$20", "$25"],
    correct: 1,
    explanation: "50 minus 35 is 15! You are so close to your goal!"
  },
  {
    id: 5,
    text: "What is interest?",
    type: "Financial Terms",
    options: ["A hobby you like to do.", "Extra money a bank pays you for keeping your money with them.", "Money you pay just to enter a bank.", "A type of tax on toys."],
    correct: 1,
    explanation: "Interest is like a reward the bank gives you just for leaving your savings in your account! Your money makes more money!"
  },
  {
    id: 6,
    text: "If you want to buy a $100 bicycle but you only get $10 for your allowance each week, what is the BEST strategy?",
    type: "Smart Spending",
    options: ["Wait until someone buys it for you.", "Spend the $10 immediately on candy each week.", "Save the $10 for 10 weeks.", "Borrow $100 from a friend and worry about it later."],
    correct: 2,
    explanation: "Patience pays off! Saving your allowance for 10 straight weeks means you don't owe anyone money and you reach your goal responsibly."
  }
];

export function MicroGame() {
  const { children, selectedChildId, addBalance } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  if (!selectedChildId) {
    return <Navigate to="/child" />;
  }

  const selectedChild = children.find(c => c.id === selectedChildId);
  const quizRewardAmount = selectedChild?.quizRewardAmount ?? 2;

  const question = QUESTIONS[currentIndex];

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    setShowResult(true);
    
    if (index === question.correct) {
      setScore(s => s + 1);
      confetti({
        particleCount: 40,
        spread: 40,
        origin: { y: 0.4 },
        colors: ['#5fc574', '#ffd700']
      });
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    
    if (currentIndex === QUESTIONS.length - 1) {
      // Reward is given
      const finalScore = score + (selectedAnswer === question.correct && !showResult ? 1 : 0); // Handle if state wasn't updated yet, wait, score is correct already.
      const reward = score * quizRewardAmount;
      if (!rewardClaimed && reward > 0) {
        addBalance(selectedChildId, reward);
        setRewardClaimed(true);
      }
    }
    setCurrentIndex(i => i + 1);
  };

    if (currentIndex >= QUESTIONS.length) {
      const reward = score * quizRewardAmount; // $2 per correct answer

      return (
        <div className="min-h-screen bg-[var(--bg)] p-6 flex flex-col items-center justify-center text-center text-[var(--text)]">
          <h1 className="text-[32px] font-bold mb-4">Quiz Complete! 🌟</h1>
          <p className="text-[18px] mb-2 font-medium text-[var(--muted)]">You scored {score} out of {QUESTIONS.length}</p>
          <div className="bg-[var(--primary-light)] border border-[var(--primary)] px-6 py-3 rounded-[16px] inline-block mb-10 shadow-sm">
             <span className="font-bold text-[var(--primary)] text-[20px]">+₼ {reward} earned!</span>
          </div>
          <Link to="/child" className="bg-[var(--secondary)] text-[var(--primary)] px-8 py-4 rounded-[12px] font-bold text-[16px] transition-transform active:scale-95">
             Back to Dashboard
          </Link>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[var(--bg)] p-6 flex flex-col text-[var(--text)]">
        <header className="flex items-center gap-4 mb-8">
          <Link to="/child" className="p-2 bg-[var(--card)] rounded-full border border-[var(--line)] shadow-sm hover:bg-black/5 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1 bg-[var(--line)] h-[8px] rounded-full overflow-hidden">
            <div 
               className="h-full bg-[var(--primary)] transition-all duration-500 rounded-full"
               style={{ width: `${(currentIndex / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <span className="font-bold text-[var(--muted)]">{currentIndex + 1}/{QUESTIONS.length}</span>
        </header>

        <main className="flex-1 flex flex-col items-center max-w-lg mx-auto w-full pt-4">
           <div className="bg-[var(--card)] px-4 py-2 rounded-[20px] text-[13px] font-bold text-[var(--primary)] mb-8 shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-[var(--line)] flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" />
              {question.type}
           </div>

           <h2 className="text-[22px] md:text-[26px] font-bold text-center mb-10 leading-snug">
             {question.text}
           </h2>

           <div className="w-full space-y-4">
             {question.options.map((opt, i) => {
               let btnClass = "bg-[var(--card)] border border-[var(--line)] text-[var(--text)]";
               if (showResult) {
                 if (i === question.correct) btnClass = "bg-[var(--primary-light)] border border-[var(--primary)] text-[var(--primary)]";
                 else if (i === selectedAnswer) btnClass = "bg-[var(--danger-light)] border border-red-400 text-red-600 dark:text-red-400";
               } else if (selectedAnswer === i) {
                 btnClass = "border border-[var(--primary)]";
               }

               return (
                 <button
                   key={i}
                   onClick={() => handleAnswer(i)}
                   disabled={showResult}
                   className={`w-full p-5 rounded-[16px] text-[16px] font-semibold transition-all text-left flex justify-between items-center ${btnClass} ${!showResult && 'hover:bg-black/5 active:scale-95'}`}
                 >
                   {opt}
                   {showResult && i === question.correct && <CheckCircle2 className="w-6 h-6 text-[var(--primary)]" />}
                   {showResult && i === selectedAnswer && i !== question.correct && <XCircle className="w-6 h-6 text-red-500" />}
                 </button>
               )
             })}
           </div>

           <AnimatePresence>
              {showResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-10 p-6 bg-[var(--card)] rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[var(--line)] w-full text-center"
                >
                  <p className="text-[var(--text)] mb-6 font-medium leading-relaxed">{question.explanation}</p>
                  <button 
                    onClick={handleNext}
                    className="w-full bg-[var(--secondary)] text-[var(--primary)] py-4 rounded-[12px] font-bold text-[16px] transition-transform active:scale-95"
                  >
                    Continue
                  </button>
                </motion.div>
              )}
           </AnimatePresence>
        </main>
      </div>
    )
}
