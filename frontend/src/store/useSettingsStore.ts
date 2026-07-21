import { create } from 'zustand';
import type { CustomInstruction } from '../types/chat';
import { authFetch } from '../utils/apiClient';

const API_BASE = 'http://localhost:8000/api/v1';

interface SettingsStore {
  customInstruction: CustomInstruction | null;
  isModalOpen: boolean;
  isLoading: boolean;

  fetchCustomInstructions: () => Promise<void>;
  updateCustomInstructions: (payload: {
    user_profile: string;
    response_style: string;
    is_enabled: boolean;
  }) => Promise<boolean>;
  openModal: () => void;
  closeModal: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  customInstruction: null,
  isModalOpen: false,
  isLoading: false,

  openModal: () => {
    set({ isModalOpen: true });
    get().fetchCustomInstructions();
  },
  closeModal: () => set({ isModalOpen: false }),

  fetchCustomInstructions: async () => {
    set({ isLoading: true });
    try {
      const res = await authFetch(`${API_BASE}/custom-instructions`);
      if (res.ok) {
        const data = await res.json();
        set({ customInstruction: data });
      }
    } catch (err) {
      console.error('Failed to fetch custom instructions:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateCustomInstructions: async (payload) => {
    set({ isLoading: true });
    try {
      const res = await authFetch(`${API_BASE}/custom-instructions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        set({ customInstruction: updated });
        return true;
      } else {
        console.error('Failed to update custom instructions:', await res.text());
        return false;
      }
    } catch (err) {
      console.error('Error updating custom instructions:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));
