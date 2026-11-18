import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePubSubStore } from '../../../stores/pubSubStore';
import { request } from '../../../services/request';

interface DiskUsage {
  total: number;
  used: number;
  free: number;
}

export function SystemStatus() {
  const { t } = useTranslation();
  const cpuTemp = usePubSubStore((s) => s.cpuTemp);
  const coreVersion = usePubSubStore((s) => s.coreVersion);
  const batteryStatus = usePubSubStore((s) => s.batteryStatus);

  const [ipAddress, setIpAddress] = useState('–');
  const [disk, setDisk] = useState<DiskUsage | null>(null);

  useEffect(() => {
    void request<string>('getIpAddress').then(({ result }) => result && setIpAddress(result));
    // Backend returns megabytes: { total, used, free }
    void request<DiskUsage>('getDiskUsage').then(({ result }) => result && setDisk(result));
  }, []);

  const gb = (mb: number) => `${(mb / 1024).toFixed(1)} GB`;

  const rows: [string, string][] = [
    [t('settings.status.version'), coreVersion || '–'],
    [t('settings.status.cpu-temp'), cpuTemp !== null ? `${cpuTemp.toFixed(1)} °C` : '–'],
    [t('settings.status.ip-address'), ipAddress],
    [t('settings.status.disk-usage'), disk ? t('settings.status.disk-free', { free: gb(disk.free), total: gb(disk.total) }) : '–'],
  ];
  if (batteryStatus) rows.push([t('settings.status.battery'), `${batteryStatus.level}%${batteryStatus.charging ? ' ⚡' : ''}`]);

  return (
    <section className="ui-card">
      <div className="ui-card-title">{t('settings.status.title')}</div>
      <div className="ui-card-body">
        {rows.map(([label, value]) => (
          <div key={label} className="ui-row">
            <span className="ui-muted ui-grow">{label}</span>
            <strong className="ui-wrap-anywhere" style={{ textAlign: 'right' }}>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
