import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth store
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Settings store
export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      unitsTemperature: 'celsius',
      unitsVolume: 'liters',
      graphTimeRange: 'auto',
      livePlotting: true,
      showTooltips: true,
      
      updateSettings: (settings) => set(settings),
      
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }),
    {
      name: 'settings-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on load
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);

// Dashboard store (for real-time updates)
export const useDashboardStore = create((set) => ({
  batches: [],
  loading: false,
  error: null,
  
  setBatches: (batches) => set({ batches }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  updateBatch: (batchId, data) => set((state) => ({
    batches: state.batches.map((batch) =>
      batch.batch.id === batchId ? { ...batch, ...data } : batch
    ),
  })),
}));

// Fermenters store
export const useFermenterStore = create((set) => ({
  fermenters: [],
  loading: false,
  
  setFermenters: (fermenters) => set({ fermenters }),
  setLoading: (loading) => set({ loading }),
  
  addFermenter: (fermenter) => set((state) => ({
    fermenters: [...state.fermenters, fermenter],
  })),
  
  updateFermenter: (id, data) => set((state) => ({
    fermenters: state.fermenters.map((f) =>
      f.id === id ? { ...f, ...data } : f
    ),
  })),
  
  removeFermenter: (id) => set((state) => ({
    fermenters: state.fermenters.filter((f) => f.id !== id),
  })),
}));

// Profiles store
export const useProfileStore = create((set) => ({
  profiles: [],
  loading: false,
  
  setProfiles: (profiles) => set({ profiles }),
  setLoading: (loading) => set({ loading }),
  
  addProfile: (profile) => set((state) => ({
    profiles: [...state.profiles, profile],
  })),
  
  updateProfile: (id, data) => set((state) => ({
    profiles: state.profiles.map((p) =>
      p.id === id ? { ...p, ...data } : p
    ),
  })),
  
  removeProfile: (id) => set((state) => ({
    profiles: state.profiles.filter((p) => p.id !== id),
  })),
}));

// Batches store
export const useBatchStore = create((set) => ({
  batches: [],
  loading: false,
  
  setBatches: (batches) => set({ batches }),
  setLoading: (loading) => set({ loading }),
  
  addBatch: (batch) => set((state) => ({
    batches: [...state.batches, batch],
  })),
  
  updateBatch: (id, data) => set((state) => ({
    batches: state.batches.map((b) =>
      b.id === id ? { ...b, ...data } : b
    ),
  })),
  
  removeBatch: (id) => set((state) => ({
    batches: state.batches.filter((b) => b.id !== id),
  })),
}));


