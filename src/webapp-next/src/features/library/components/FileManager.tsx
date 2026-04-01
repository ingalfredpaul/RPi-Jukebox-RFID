import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUpload } from '../../../components/FileUpload';
import { showToast } from '../../../components/Toast';
import { Header } from '../../../components/Header';
import styles from '../library.module.css';

export function FileManager() {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    setProgress({ current: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const formData = new FormData();
      formData.append('file', file);

      // Preserve relative path for folder uploads
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      formData.append('path', relativePath);

      try {
        await fetch(`http://${window.location.hostname}/upload`, {
          method: 'POST',
          body: formData,
        });
        setProgress({ current: i + 1, total: files.length });
      } catch {
        showToast('error', t('upload.error', { file: file.name }));
      }
    }

    setUploading(false);
    showToast('success', t('upload.complete'));
  };

  return (
    <div>
      <Header title={t('library.file-manager.title')} showBack backTo="/library" />

      <div className={styles.uploadSection}>
        <div>
          <h3 className={styles.uploadTitle}>{t('library.file-manager.upload')}</h3>
          <FileUpload onUpload={handleUpload} accept="audio/*" multiple />
        </div>

        <div>
          <h3 className={styles.uploadTitle}>{t('library.file-manager.upload-folder')}</h3>
          <FileUpload onUpload={handleUpload} accept="audio/*" directory />
        </div>

        {uploading && (
          <p>
            {t('upload.progress', { current: progress.current, total: progress.total })}
          </p>
        )}
      </div>
    </div>
  );
}
