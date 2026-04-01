import { useEffect, useState, useCallback } from 'react';
import { generateId } from '../utils/uuid';
import styles from './Toast.module.css';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const listeners = new Set<(toast: ToastMessage) => void>();

export function showToast(type: ToastMessage['type'], message: string) {
  const toast: ToastMessage = { id: generateId(), type, message };
  listeners.forEach((fn) => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3000);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => {
      listeners.delete(addToast);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
