import { create } from 'zustand';
import io from 'socket.io-client';
import { API_URL } from './config';

export type UserRole = 'parent' | 'child' | null;

export interface Task {
  id: string;
  childId: string;
  title: string;
  reward: number;
  status: 'pending' | 'completed' | 'approved';
}

export interface Goal {
  id: string;
  childId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  emoji: string;
}

export interface Child {
  id: string;
  name: string;
  balance: number;
  spendingLimitAmount: number;
  spendingLimitPeriod: 'daily' | 'weekly' | null;
  spentPeriodStart: number | null;
  spentSoFar: number;
  lastSavedDate: number | null;
  quizRewardAmount: number;
}

interface AppState {
  token: string | null;
  familyId: string | null;
  role: UserRole;
  selectedChildId: string | null;
  children: Child[];
  tasks: Task[];
  goals: Goal[];
  theme: 'light' | 'dark';
  socket: any;
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setAuth: (token: string, familyId: string, role: UserRole) => void;
  setSelectedChild: (id: string) => void;
  logout: () => void;
  
  // API Actions
  sync: () => Promise<void>;
  addChild: (name: string) => Promise<void>;
  updateChild: (id: string, name: string) => Promise<void>;
  setSpendingLimit: (childId: string, limit: { amount: number; period: 'daily' | 'weekly' | null }) => Promise<void>;
  setRewardAmount: (childId: string, amount: number) => Promise<void>;
  addGoal: (goal: Goal) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTaskStatus: (id: string, status: Task['status']) => Promise<void>;
  addFundsToGoal: (goalId: string, childId: string, amount: number) => Promise<void>;
  addBalance: (childId: string, amount: number) => Promise<void>;
}

const getStoredToken = () => {
  const token = localStorage.getItem('token');
  return token && token !== 'null' ? token : null;
};
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {})
});

export const useAppStore = create<AppState>()((set, get) => ({
  token: (localStorage.getItem('token') && localStorage.getItem('token') !== 'null' ? localStorage.getItem('token') : null),
  familyId: (localStorage.getItem('familyId') && localStorage.getItem('familyId') !== 'null' ? localStorage.getItem('familyId') : null),
  role: (localStorage.getItem('role') && localStorage.getItem('role') !== 'null' ? localStorage.getItem('role') as UserRole : null),
  selectedChildId: (localStorage.getItem('selectedChildId') && localStorage.getItem('selectedChildId') !== 'null' ? localStorage.getItem('selectedChildId') : null),
  children: [],
  tasks: [],
  goals: [],
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  socket: null,

  setTheme: (theme) => {
     localStorage.setItem('theme', theme);
     set({ theme });
  },

  setAuth: (token, familyId, role) => {
     localStorage.setItem('token', token);
     localStorage.setItem('familyId', familyId);
     if (role) {
        localStorage.setItem('role', role);
     } else {
        localStorage.removeItem('role');
     }
     set({ token, familyId, role });
     
     // Initialize socket
     const socket = io(API_URL || '/', { transports: ['websocket', 'polling'] });
     socket.on('connect', () => {
       socket.emit('join_family', token);
     });
     socket.on('sync_update', () => {
       get().sync();
     });
     set({ socket });
     get().sync();
  },

  setSelectedChild: (id) => {
    localStorage.setItem('selectedChildId', id);
    set({ selectedChildId: id });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('familyId');
    localStorage.removeItem('role');
    localStorage.removeItem('selectedChildId');
    const { socket } = get();
    if (socket) socket.disconnect();
    set({ token: null, familyId: null, role: null, selectedChildId: null, children: [], tasks: [], goals: [], socket: null });
  },

  sync: async () => {
    try {
      const { token } = get();
      if (!token) return;
      
      const res = await fetch(`${API_URL}/api/sync`, { headers: getAuthHeaders() });
      if (!res.ok) {
         if (res.status === 403 || res.status === 401) get().logout();
         return;
      }
      const data = await res.json();
      set({
        children: data.children || [],
        tasks: data.tasks || [],
        goals: data.goals || []
      });
    } catch (e) {
      console.error("Sync failed", e);
    }
  },

  addChild: async (name) => {
    try {
      const res = await fetch(`${API_URL}/api/children`, {
         method: 'POST',
         headers: getAuthHeaders(),
         body: JSON.stringify({ name })
      });
      if (res.ok) {
         get().sync();
      } else {
         const json = await res.json();
         alert(json.error || 'Failed to add child');
      }
    } catch (e) {
      console.error(e);
      alert('Network error adding child');
    }
  },

  updateChild: async (id, name) => {
    set(state => ({
      children: state.children.map(c => c.id === id ? { ...c, name } : c)
    }));

    // Debounce the network request
    if ((window as any)._updateChildTimeout) clearTimeout((window as any)._updateChildTimeout);
    (window as any)._updateChildTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/children/${id}`, {
           method: 'PUT',
           headers: getAuthHeaders(),
           body: JSON.stringify({ name })
        });
        if (!res.ok) {
           const json = await res.json();
           alert(json.error || 'Failed to update child');
           get().sync(); // Revert on failure
        }
      } catch (e) {
        console.error(e);
        get().sync(); // Revert on failure
      }
    }, 500);
  },

  setSpendingLimit: async (childId, limit) => {
    try {
      const res = await fetch(`${API_URL}/api/limits`, {
         method: 'POST',
         headers: getAuthHeaders(),
         body: JSON.stringify({ childId, ...limit })
      });
      if (res.ok) {
         get().sync();
      }
    } catch (e) {
      console.error(e);
    }
  },

  setRewardAmount: async (childId, amount) => {
    try {
      const res = await fetch(`${API_URL}/api/reward-amount`, {
         method: 'POST',
         headers: getAuthHeaders(),
         body: JSON.stringify({ childId, amount })
      });
      if (res.ok) {
         get().sync();
      }
    } catch (e) {
      console.error(e);
    }
  },

  addGoal: async (goal) => {
    try {
      const res = await fetch(`${API_URL}/api/goals`, {
         method: 'POST',
         headers: getAuthHeaders(),
         body: JSON.stringify(goal)
      });
      if (res.ok) {
         get().sync();
      }
    } catch (e) {
      console.error(e);
    }
  },

  addTask: async (task) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
         method: 'POST',
         headers: getAuthHeaders(),
         body: JSON.stringify(task)
      });
      if (res.ok) {
         get().sync();
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateTaskStatus: async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/${id}`, {
         method: 'PUT',
         headers: getAuthHeaders(),
         body: JSON.stringify({ status })
      });
      if (res.ok) {
         get().sync();
      }
    } catch (e) {
      console.error(e);
    }
  },

  addFundsToGoal: async (goalId, childId, amount) => {
    try {
      const res = await fetch(`${API_URL}/api/goals/${goalId}/feed`, {
         method: 'POST',
         headers: getAuthHeaders(),
         body: JSON.stringify({ childId, amount })
      });
      if (!res.ok) {
         const json = await res.json();
         alert(json.error || 'Failed to feed bamboo');
      } else {
         get().sync();
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  },

  addBalance: async (childId, amount) => {
    try {
      const res = await fetch(`${API_URL}/api/minigame`, {
         method: 'POST',
         headers: getAuthHeaders(),
         body: JSON.stringify({ childId, reward: amount })
      });
      if (!res.ok) {
         const json = await res.json();
         alert(json.error || 'Failed to add balance');
      } else {
         get().sync();
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  }
}));
