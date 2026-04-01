import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  onUpload: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  directory?: boolean;
}

export function FileUpload({
  onUpload,
  accept = 'audio/*',
  multiple = true,
  directory = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.active : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className={styles.input}
        {...(directory ? { webkitdirectory: '', directory: '' } as Record<string, string> : {})}
      />
      <span className={styles.icon}>↑</span>
      <p className={styles.text}>
        {isDragging ? t('general.drag-drop-active') : t('general.drag-drop')}
      </p>
    </div>
  );
}
