import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../../../services/request';
import { showToast } from '../../../components/Toast';
import { ActionSelector } from './ActionSelector';
import styles from '../cards.module.css';

interface CardFormProps {
  cardId: string;
  onSave: () => void;
}

export function CardForm({ cardId, onSave }: CardFormProps) {
  const { t } = useTranslation();
  const [actionAlias, setActionAlias] = useState('');
  const [command, setCommand] = useState('');
  const [commandValue, setCommandValue] = useState<Record<string, unknown>>({});

  const handleSave = async () => {
    if (!actionAlias || !command) return;

    await request('registerCard', {
      card_id: cardId,
      cmd_alias: command,
      cmd_value: commandValue,
    });

    showToast('success', t('toast.card-registered'));
    onSave();
  };

  return (
    <div className={styles.form}>
      <div className={styles.formField}>
        <label className={styles.label}>{t('cards.register.card-id')}</label>
        <div className={styles.cardIdDisplay}>{cardId}</div>
      </div>

      <ActionSelector
        actionAlias={actionAlias}
        onActionChange={setActionAlias}
        command={command}
        onCommandChange={setCommand}
        commandValue={commandValue}
        onValueChange={setCommandValue}
      />

      <button
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={!actionAlias || !command}
      >
        {t('general.buttons.save')}
      </button>
    </div>
  );
}
