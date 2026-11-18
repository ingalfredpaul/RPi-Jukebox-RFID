import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../../../components/Header';
import { Dialog } from '../../../components/Dialog';
import { showToast } from '../../../components/Toast';
import { request } from '../../../services/request';
import { usePubSubStore } from '../../../stores/pubSubStore';
import { SPECIAL_ACTIONS, describeCard, folderOfCard, matchSpecial } from '../cardUtils';
import { useCards } from '../useCards';
import { FolderPicker } from './FolderPicker';
import styles from '../cards.module.css';

interface KidsConfig {
  resume_default: boolean;
  resume_folders: Record<string, boolean>;
}

/**
 * Create or edit a card assignment.
 * Flow: hold a card on the reader -> its ID shows up -> pick folder or special action -> save.
 */
export function CardWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cardId: editId } = useParams();
  const [params] = useSearchParams();
  const { cards, reload } = useCards();
  const kidsbox = usePubSubStore((s) => Boolean(s.pluginsLoaded['kidsbox']));
  const lastScan = usePubSubStore((s) => s.lastScan);
  const mountedAt = useRef(Date.now());

  const editing = editId !== undefined;
  const [cardId, setCardId] = useState(editing ? decodeURIComponent(editId) : (params.get('card') ?? ''));
  const [manual, setManual] = useState(false);
  const [kind, setKind] = useState<'folder' | 'special'>('folder');
  const [folder, setFolder] = useState(params.get('folder') ?? '');
  const [special, setSpecial] = useState(SPECIAL_ACTIONS[0]!.key);
  const [resume, setResume] = useState(false);
  const [kids, setKids] = useState<KidsConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const prefilled = useRef(false);

  // New card: take the next scanned ID.
  useEffect(() => {
    if (!editing && lastScan && lastScan.at >= mountedAt.current) setCardId(lastScan.id);
  }, [editing, lastScan]);

  useEffect(() => {
    if (!kidsbox) return;
    void request<KidsConfig>('kidsbox_get_config').then(({ result }) => result && setKids(result));
  }, [kidsbox]);

  const existing = cardId && cards ? cards[cardId] : undefined;

  // Prefill when editing (or when a scanned card is already known).
  useEffect(() => {
    if (!existing || prefilled.current) return;
    prefilled.current = true;
    const f = folderOfCard(existing);
    if (f !== null) {
      setKind('folder');
      setFolder(f);
    } else {
      const s = matchSpecial(existing);
      if (s) {
        setKind('special');
        setSpecial(s.key);
      }
    }
  }, [existing]);

  // Resume checkbox follows the selected folder.
  useEffect(() => {
    if (kids && folder) setResume(kids.resume_folders[folder] ?? kids.resume_default);
  }, [kids, folder]);

  const specialDef = useMemo(() => SPECIAL_ACTIONS.find((s) => s.key === special)!, [special]);
  const canSave = cardId.trim() !== '' && (kind === 'special' || folder !== '');

  const save = async () => {
    setBusy(true);
    const id = cardId.trim();
    const alias =
      kind === 'folder' ? (kidsbox ? 'play_card_kids' : 'play_card') : specialDef.alias;
    const args = kind === 'folder' ? [folder, true] : specialDef.args;
    // Note: do not pass `kwargs` - register_card() has a bug that stores `args` there.
    const { error } = await request('registerCard', {
      card_id: id,
      cmd_alias: alias,
      overwrite: true,
      ...(args ? { args } : {}),
    });
    if (!error && kind === 'folder' && kidsbox) {
      await request('kidsbox_set_folder_resume', { folder, enabled: resume });
    }
    setBusy(false);
    if (error) {
      showToast('error', t('cards.form.savefailed'));
      return;
    }
    showToast('success', t('toast.cardregistered'));
    await reload();
    navigate('/cards');
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await request('deleteCard', { card_id: cardId });
    setBusy(false);
    setConfirmDelete(false);
    if (error) {
      showToast('error', t('cards.form.deletefailed'));
      return;
    }
    showToast('success', t('toast.carddeleted'));
    navigate('/cards');
  };

  return (
    <div>
      <Header title={editing ? t('cards.edit.title') : t('cards.register.title')} showBack backTo="/cards" />
      <div className="ui-page">
        {/* Step 1: card */}
        <div className="ui-card">
          <div className="ui-card-title">1. {t('cards.register.card')}</div>
          <div className="ui-card-body">
            {cardId ? (
              <div className={`${styles.scanBox} ${styles.scanBoxOk}`}>
                <span aria-hidden="true">✓</span>
                <span className={styles.scanId}>{cardId}</span>
                {existing && !editing && (
                  <span className="ui-muted">
                    {t('cards.register.already', { what: describeCard(existing, t).text })}
                  </span>
                )}
                {!editing && <span className="ui-muted">{t('cards.register.othercard')}</span>}
              </div>
            ) : (
              <div className={styles.scanBox}>
                <span className={styles.pulse} aria-hidden="true">💳</span>
                <strong>{t('cards.register.waiting')}</strong>
                <span className="ui-muted">{t('cards.register.waitinghint')}</span>
              </div>
            )}
            {!editing && (
              <>
                {!manual ? (
                  <button className="ui-btn" onClick={() => setManual(true)}>{t('cards.register.typeid')}</button>
                ) : (
                  <div className="ui-field">
                    <label className="ui-label" htmlFor="cardid">{t('cards.register.cardid')}</label>
                    <input id="cardid" className="ui-input" value={cardId} onChange={(e) => setCardId(e.target.value)} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Step 2: action */}
        <div className="ui-card">
          <div className="ui-card-title">2. {t('cards.form.what')}</div>
          <div className="ui-card-body">
            <div className={styles.choiceGrid} role="radiogroup">
              <button
                role="radio"
                aria-checked={kind === 'folder'}
                className={`${styles.choice} ${kind === 'folder' ? styles.choiceActive : ''}`}
                onClick={() => setKind('folder')}
              >
                <span style={{ fontSize: '1.6rem' }}>📁</span>{t('cards.form.kindfolder')}
              </button>
              <button
                role="radio"
                aria-checked={kind === 'special'}
                className={`${styles.choice} ${kind === 'special' ? styles.choiceActive : ''}`}
                onClick={() => setKind('special')}
              >
                <span style={{ fontSize: '1.6rem' }}>🎛</span>{t('cards.form.kindspecial')}
              </button>
            </div>

            {kind === 'folder' ? (
              <>
                <FolderPicker value={folder} onChange={setFolder} />
                {kidsbox ? (
                  <label className="ui-switch">
                    <input type="checkbox" checked={resume} onChange={(e) => setResume(e.target.checked)} />
                    <span>
                      {t('cards.form.resume')}
                      <span className="ui-hint" style={{ display: 'block' }}>{t('cards.form.resumehint')}</span>
                    </span>
                  </label>
                ) : (
                  <div className="ui-banner ui-banner-warn">{t('cards.form.nokidsbox')}</div>
                )}
              </>
            ) : (
              <div className={styles.choiceGrid} role="radiogroup">
                {SPECIAL_ACTIONS.map((s) => (
                  <button
                    key={s.key}
                    role="radio"
                    aria-checked={special === s.key}
                    className={`${styles.choice} ${special === s.key ? styles.choiceActive : ''}`}
                    onClick={() => setSpecial(s.key)}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                    {t(`cards.special.${s.key.replace(/-/g, "")}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="ui-btn ui-btn-primary ui-btn-block" disabled={!canSave || busy} onClick={() => void save()}>
          {t('general.buttons.save')}
        </button>
        {editing && (
          <button className="ui-btn ui-btn-danger ui-btn-block" disabled={busy} onClick={() => setConfirmDelete(true)}>
            {t('cards.edit.delete')}
          </button>
        )}
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('cards.edit.delete')}
        actions={
          <>
            <button className="ui-btn" onClick={() => setConfirmDelete(false)}>{t('general.buttons.cancel')}</button>
            <button className="ui-btn ui-btn-danger" onClick={() => void remove()}>{t('general.buttons.delete')}</button>
          </>
        }
      >
        <p>{t('cards.edit.deleteconfirm')}</p>
      </Dialog>
    </div>
  );
}
