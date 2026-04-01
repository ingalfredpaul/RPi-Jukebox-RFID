import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) {
      onClose();
    }
  };

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleClick} onCancel={onClose}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.body}>{children}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </dialog>
  );
}
