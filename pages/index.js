import { useRef, useState } from 'react';
import Head from 'next/head';
import AppIcon from '../components/AppIcon';

// MD3 color tokens
const c = {
  primary: '#1565C0',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D3E4FF',
  onPrimaryContainer: '#001C38',
  surface: '#FDFCFF',
  surfaceVariant: '#E1E2EC',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#44464F',
  outline: '#74777F',
  outlineVariant: '#C4C6D0',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  successContainer: '#D3E4FF',
  onSuccessContainer: '#001C38',
};

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [copied, setCopied] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  function appendSelectedFiles(fileList) {
    const incomingFiles = Array.from(fileList || []);
    if (!incomingFiles.length) {
      return;
    }

    setSelectedFiles((prevFiles) => {
      const nextFiles = [...prevFiles, ...incomingFiles];
      if (nextFiles.length > 20) {
        setError('1回のアップロードは20ファイルまでです。');
        return nextFiles.slice(0, 20);
      }
      return nextFiles;
    });
  }

  function onDragOver(event) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function onDragLeave(event) {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    if (!droppedFiles.length) {
      return;
    }
    appendSelectedFiles(droppedFiles);
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setResult(null);

    if (selectedFiles.length === 0) {
      setError('アップロードするファイルを選択してください。');
      return;
    }

    const formData = new FormData();
    formData.append('expiresInDays', expiresInDays);
    selectedFiles.forEach((file) => formData.append('files', file));
    setIsUploading(true);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const raw = await res.text();
      let data = {};
      if (raw) {
        try { data = JSON.parse(raw); } catch { data = {}; }
      }

      if (!res.ok) {
        setError(data.error || raw || 'アップロードに失敗しました。');
        return;
      }
      if (!data.downloadUrl || !data.authCode) {
        setError('アップロードは完了しましたが、応答の解析に失敗しました。再読み込みして確認してください。');
        return;
      }

      setResult(data);
      setExpiresInDays('7');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      setError('通信エラーが発生しました。');
    } finally {
      setIsUploading(false);
    }
  }

  async function copyToClipboard(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Head><title>Swift Drop — ファイル共有</title></Head>

      <main style={s.main}>
        <div style={s.topBar}>
          <AppIcon size={32} />
          <span style={s.topBarTitle}>Swift Drop</span>
        </div>

        <section style={s.card}>
          <h1 style={s.headline}>ファイルをアップロード</h1>
          <p style={s.bodyText}>
            100MB までのファイルを複数選択し、DL URL と認証コードを受け取り側に共有します。
          </p>

          <form onSubmit={onSubmit} style={s.form}>
            {/* File picker */}
            <div
              style={s.fileZone}
              className={`md3-file-zone${isDragOver ? ' is-dragover' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <svg style={s.fileZoneIcon} viewBox="0 0 24 24" fill="none" stroke={c.primary} strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12L8 8m4-4l4 4" />
              </svg>
              <p style={s.fileZoneHint}>ファイルを選択またはドラッグ&ドロップしてください</p>
              {selectedFiles.length > 0 && (
                <p style={s.fileZoneHint}>{selectedFiles.length} ファイルを選択中</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="md3-file-input"
                style={s.fileInput}
                onChange={(event) => {
                  appendSelectedFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  className="md3-btn-outlined"
                  style={s.fileClearBtn}
                  onClick={() => setSelectedFiles([])}
                >
                  選択をクリア
                </button>
              )}
            </div>
            {selectedFiles.length > 0 && (
              <div style={s.fileList} aria-live="polite">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="md3-file-item"
                    style={s.fileListItem}
                  >
                    <span style={s.fileName}>{file.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expires field */}
            <div style={s.fieldGroup}>
              <label htmlFor="expiresInDays" style={s.fieldLabel}>有効期限（日）</label>
              <input
                id="expiresInDays"
                name="expiresInDays"
                type="number"
                min="1"
                max="30"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                required
                className="md3-text-input"
                style={s.textInput}
              />
              <span style={s.fieldHelperText}>1〜30日の範囲で設定できます</span>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="md3-btn-filled"
              style={s.btnFilled}
            >
              {isUploading ? (
                <span style={{ opacity: 0.7 }}>アップロード中...</span>
              ) : (
                'アップロード'
              )}
            </button>
          </form>

          {error && (
            <div style={s.errorBanner} role="alert">
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} fill={c.error}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span style={s.errorText}>{error}</span>
            </div>
          )}

          {result && (
            <div style={s.resultCard}>
              <div style={s.resultHeader}>
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill={c.primary}>
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span style={s.resultTitle}>アップロード完了</span>
              </div>

              <div style={s.resultDivider} />

              <ResultItem
                label="ダウンロードURL"
                value={result.downloadUrl}
                isLink
                copyKey="url"
                copied={copied}
                onCopy={() => copyToClipboard(result.downloadUrl, 'url')}
              />
              <ResultItem
                label="認証コード"
                value={result.authCode}
                mono
                copyKey="code"
                copied={copied}
                onCopy={() => copyToClipboard(result.authCode, 'code')}
              />
              <div style={s.resultRow}>
                <span style={s.resultLabel}>有効期限</span>
                <span style={s.resultValue}>{new Date(result.expiresAt).toLocaleString('ja-JP')}</span>
              </div>
              <div style={s.resultRow}>
                <span style={s.resultLabel}>ファイル数</span>
                <span style={s.resultValue}>{result.fileCount} 件</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function ResultItem({ label, value, isLink, mono, copyKey, copied, onCopy }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ ...s.resultLabel, display: 'block', marginBottom: 4 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="md3-result-link"
            style={{ ...s.resultValue, color: c.primary, textDecoration: 'none', wordBreak: 'break-all', flex: 1 }}
          >
            {value}
          </a>
        ) : (
          <span style={{
            ...s.resultValue,
            flex: 1,
            wordBreak: 'break-all',
            fontFamily: mono ? "'Roboto Mono', monospace" : undefined,
            fontSize: mono ? '15px' : undefined,
            letterSpacing: mono ? '0.05em' : undefined,
          }}>
            {value}
          </span>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="md3-copy-btn"
          style={s.copyBtn}
          title="コピー"
        >
          {copied === copyKey ? '✓ コピー済' : 'コピー'}
        </button>
      </div>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div style={s.resultRow}>
      <span style={s.resultLabel}>{label}</span>
      <span style={s.resultValue}>{value}</span>
    </div>
  );
}

const s = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 16px 48px',
  },
  topBar: {
    width: '100%',
    maxWidth: '560px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 0 12px',
  },
  topBarTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: c.primary,
    letterSpacing: '-0.5px',
  },
  card: {
    width: '100%',
    maxWidth: '560px',
    background: c.surface,
    borderRadius: '16px',
    padding: '28px 24px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)',
  },
  headline: {
    margin: '0 0 6px',
    fontSize: '22px',
    fontWeight: 400,
    lineHeight: 1.4,
    color: c.onSurface,
    letterSpacing: 0,
  },
  bodyText: {
    margin: '0 0 24px',
    fontSize: '14px',
    lineHeight: 1.6,
    color: c.onSurfaceVariant,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  fileZone: {
    border: `1.5px dashed ${c.outlineVariant}`,
    borderRadius: '12px',
    padding: '20px 16px',
    background: '#F8FAFD',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  fileZoneIcon: {
    width: 32,
    height: 32,
  },
  fileZoneHint: {
    margin: 0,
    fontSize: '13px',
    color: c.onSurfaceVariant,
  },
  fileInput: {
    width: '100%',
    fontSize: '13px',
    color: c.onSurface,
    cursor: 'pointer',
  },
  fileClearBtn: {
    border: `1px solid ${c.outline}`,
    borderRadius: '100px',
    background: 'transparent',
    color: c.primary,
    padding: '6px 14px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fileListItem: {
    width: '100%',
  },
  fileName: {
    fontSize: '13px',
    color: c.onSurface,
    wordBreak: 'break-all',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: c.onSurfaceVariant,
    letterSpacing: '0.4px',
  },
  textInput: {
    border: `1.5px solid ${c.outline}`,
    borderRadius: '4px',
    padding: '11px 14px',
    fontSize: '14px',
    color: c.onSurface,
    background: 'transparent',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
  },
  fieldHelperText: {
    fontSize: '11px',
    color: c.onSurfaceVariant,
    letterSpacing: '0.4px',
  },
  btnFilled: {
    border: 0,
    borderRadius: '100px',
    padding: '12px 24px',
    background: c.primary,
    color: c.onPrimary,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.1px',
    transition: 'box-shadow 0.15s',
    alignSelf: 'flex-end',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    padding: '12px 16px',
    borderRadius: '8px',
    background: c.errorContainer,
  },
  errorText: {
    fontSize: '13px',
    color: c.onErrorContainer,
    lineHeight: 1.5,
  },
  resultCard: {
    marginTop: 24,
    padding: '16px 20px',
    borderRadius: '12px',
    background: c.primaryContainer,
    border: `1px solid ${c.outlineVariant}`,
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: c.onPrimaryContainer,
  },
  resultDivider: {
    height: 1,
    background: `rgba(0,0,0,0.08)`,
    marginBottom: 14,
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: c.onSurfaceVariant,
    flexShrink: 0,
  },
  resultValue: {
    fontSize: '14px',
    color: c.onSurface,
  },
  copyBtn: {
    border: `1px solid ${c.outlineVariant}`,
    borderRadius: '100px',
    padding: '4px 12px',
    background: 'transparent',
    color: c.primary,
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s',
    flexShrink: 0,
  },
};
