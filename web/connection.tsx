import { useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import type { ApiError } from './api';

export function ConnectionScreen({ zh, error, busy, connect }: { zh: boolean; error: ApiError | null; busy: boolean; connect: (link?: string) => Promise<void> }) {
  const [link, setLink] = useState('');
  const t = (en: string, cn: string) => zh ? cn : en;
  const messages = {
    offline: t('The local service is unavailable. Start it with npm start, then reconnect.', '本地服务不可达。请运行 npm start，再重新连接。'),
    unauthenticated: t('Connect this browser using the full launch link printed by npm start.', '请粘贴 npm start 输出的完整启动链接，连接当前浏览器。'),
    expired: t('The launch credential has expired. Use the link from the current service launch.', '启动凭证已失效，请使用本次启动服务时输出的新链接。'),
    'invalid-link': t('Use the complete launch link for this address, including its #token fragment.', '请使用当前地址对应的完整启动链接，包含 #token 部分。'),
    request: t('Could not connect. Check the local service and retry.', '连接失败，请检查本地服务后重试。'),
  };
  return <main className="launch"><div className="connection-form"><h1>OpenLab</h1>
    <h2>{busy ? t('Connecting…', '正在连接…') : t('Connect your workspace', '连接你的工作区')}</h2>
    <p role="status">{error ? messages[error.kind] : t('Connecting to the local service.', '正在连接本地服务。')}</p>
    <form onSubmit={event => { event.preventDefault(); void connect(link).then(() => setLink('')); }}>
      <label className="field">{t('Launch link', '启动链接')}<input name="launchLink" type="url" value={link} onChange={event => setLink(event.target.value)} required autoComplete="off" spellCheck={false} placeholder={`${location.origin}/#token=…`} /></label>
      <div className="row"><button className="primary" disabled={busy || !link.trim()}>{busy ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}{t('Connect browser', '连接浏览器')}</button><button type="button" disabled={busy} onClick={() => void connect()}>{t('Reconnect', '重新连接')}</button></div>
    </form>
  </div></main>;
}
