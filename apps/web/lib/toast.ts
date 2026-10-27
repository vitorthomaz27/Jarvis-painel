import { create } from 'zustand';

interface ToastState {
  message: string | null;
  tone: 'ok' | 'erro';
  show: (message: string, tone?: 'ok' | 'erro') => void;
  clear: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: null,
  tone: 'ok',
  show: (message, tone = 'ok') => {
    clearTimeout(timer);
    set({ message, tone });
    timer = setTimeout(() => set({ message: null }), 3200);
  },
  clear: () => set({ message: null }),
}));
