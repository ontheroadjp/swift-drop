import { useMemo, useState } from 'react';
import Head from 'next/head';
import AppIcon from '../../components/AppIcon';

// MD3 color tokens
const c = {
  primary: '#1565C0',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D3E4FF',
  onPrimaryContainer: '#001C38',
  secondaryContainer: '#E2E2EC',
  onSecondaryContainer: '#1A1A2C',
  surface: '#FDFCFF',
  surfaceVariant: '#E1E2EC',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#44464F',
  outline: '#74777F',
  outlineVariant: '#C4C6D0',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
};

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function parseFilename(contentDisposition, fallback) {
  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition || '');
  if (encodedMatch) {
    try { return decodeURIComponent(encodedMatch[1]); } catch { /* ignore */ }
  }
  const match = /filename="?([^\";]+)"?/.exec(contentDisposition || '');
  return match ? match[1] : fallback;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function getServerSideProps({ params }) {
  return { props: { token: params.token } };
}

export default function DownloadPage({ token }) {
  const [code, setCode] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [busyKey, setBusyKey] = useState('');

  const allSelected = useMemo(
    () => files.length > 0 && selectedIds.length === files.length,
    [files, selectedIds]
  );

  async function authorize(event) {
    event.preventDefault();
    setAuthError('');
    setIsAuthorizing(true);
    try {
      const res = await fetch(`/api/download/${token}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || '認証に失敗しました。');
        return;
      }
      setFiles(data.files || []);
      setSelectedIds((data.files || []).map((f) => f.id));
    } catch {
      setAuthError('通信エラーが発生しました。');
    } finally {
      setIsAuthorizing(false);
    }
  }

  function toggleSelect(fileId) {
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : files.map((f) => f.id));
  }

  async function downloadSingle(file) {
    setBusyKey(`single:${file.id}`);
    try {
      const res = await fetch(`/api/download/${token}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, fileId: file.id }),
      });
      if (!res.ok) {
        setAuthError((await res.text()) || 'ダウンロードに失敗しました。');
        return;
      }
      triggerDownload(await res.blob(), file.original_name);
    } catch {
      setAuthError('ダウンロード中に通信エラーが発生しました。');
    } finally {
      setBusyKey('');
    }
  }

  async function downloadBundle(mode) {
    const ids = mode === 'all' ? files.map((f) => f.id) : selectedIds;
    if (ids.length === 0) {
      setAuthError('まとめてダウンロードするファイルを選択してください。');
      return;
    }
    setBusyKey(`bundle:${mode}`);
    setAuthError('');
    try {
      const res = await fetch(`/api/download/${token}/bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, fileIds: ids }),
      });
      if (!res.ok) {
        setAuthError((await res.text()) || 'まとめてダウンロードに失敗しました。');
        return;
      }
      const blob = await res.blob();
      const filename = parseFilename(res.headers.get('content-disposition'), `swift-drop-${token}.zip`);
      triggerDownload(blob, filename);
    } catch {
      setAuthError('まとめてダウンロード中に通信エラーが発生しました。');
    } finally {
      setBusyKey('');
    }
  }

  const isBusy = busyKey !== '';

  return (
    <>
      <Head><title>Swift Drop — ファイルダウンロード</title></Head>

      <main style={s.main}>
        <div style={s.topBar}>
          <AppIcon size={32} />
          <span style={s.topBarTitle}>Swift Drop</span>
        </div>

        <section style={s.card}>
          {files.length === 0 ? (
            // ── Auth screen ──────────────────────────────────────
            <>
              <h1 style={s.headline}>ファイルダウンロード</h1>
              <p style={s.bodyText}>認証コードを入力して、ダウンロード一覧を表示します。</p>

              <form onSubmit={authorize} style={s.form}>
                <div style={s.fieldGroup}>
                  <label htmlFor="code" style={s.fieldLabel}>認証コード</label>
                  <input
                    id="code"
                    name="code"
                    required
                    autoComplete="off"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="md3-text-input"
                    style={s.textInput}
                    placeholder="コードを入力"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAuthorizing}
                  className="md3-btn-filled"
                  style={s.btnFilled}
                >
                  {isAuthorizing ? '認証中...' : '一覧を表示'}
                </button>
              </form>

              {authError && (
                <div style={s.errorBanner} role="alert">
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} fill={c.error}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <span style={s.errorText}>{authError}</span>
                </div>
              )}
            </>
          ) : (
            // ── File list screen ─────────────────────────────────
            <>
              <div style={s.listHeader}>
                <div>
                  <h1 style={s.headline}>ファイル一覧</h1>
                  <p style={s.bodyText}>{files.length} 件のファイルが見つかりました</p>
                </div>
              </div>

              {/* Action bar */}
              <div style={s.actionBar}>
                <button
                  type="button"
                  className="md3-btn-outlined"
                  style={s.btnOutlined}
                  onClick={toggleAll}
                >
                  {allSelected ? '全選択解除' : '全選択'}
                </button>
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="md3-btn-tonal"
                    style={s.btnTonal}
                    disabled={isBusy || selectedIds.length === 0}
                    onClick={() => downloadBundle('selected')}
                  >
                    {busyKey === 'bundle:selected' ? '準備中...' : `選択 (${selectedIds.length}) をDL`}
                  </button>
                  <button
                    type="button"
                    className="md3-btn-filled"
                    style={s.btnFilled}
                    disabled={isBusy}
                    onClick={() => downloadBundle('all')}
                  >
                    {busyKey === 'bundle:all' ? '準備中...' : '全件まとめてDL'}
                  </button>
                </div>
              </div>

              {authError && (
                <div style={{ ...s.errorBanner, marginBottom: 12 }} role="alert">
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }} fill={c.error}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <span style={s.errorText}>{authError}</span>
                </div>
              )}

              {/* File list */}
              <ul style={s.fileList}>
                {files.map((file) => {
                  const isSelected = selectedIds.includes(file.id);
                  const busy = busyKey === `single:${file.id}`;
                  return (
                    <li key={file.id} className="md3-file-item" style={isSelected ? { background: '#EEF3FA' } : {}}>
                      <label style={s.fileCheckLabel}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(file.id)}
                          className="md3-checkbox"
                        />
                        <div style={s.fileInfo}>
                          <span style={s.fileName}>{file.original_name}</span>
                          <span style={s.fileMeta}>{formatSize(file.file_size)}</span>
                        </div>
                      </label>
                      <button
                        type="button"
                        className="md3-btn-icon"
                        style={s.btnIcon}
                        disabled={isBusy}
                        onClick={() => downloadSingle(file)}
                        title="個別ダウンロード"
                      >
                        {busy ? (
                          <span style={{ fontSize: 11 }}>...</span>
                        ) : (
                          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill={c.primary}>
                            <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v6h5.66V9h3.84L12 2z" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </main>
    </>
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
    maxWidth: '640px',
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
    maxWidth: '640px',
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
  btnFilled: {
    border: 0,
    borderRadius: '100px',
    padding: '10px 24px',
    background: c.primary,
    color: c.onPrimary,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.1px',
    transition: 'box-shadow 0.15s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  btnTonal: {
    border: 0,
    borderRadius: '100px',
    padding: '10px 20px',
    background: c.primaryContainer,
    color: c.onPrimaryContainer,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.1px',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  btnOutlined: {
    border: `1px solid ${c.outline}`,
    borderRadius: '100px',
    padding: '9px 20px',
    background: 'transparent',
    color: c.primary,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.1px',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  btnIcon: {
    border: 0,
    borderRadius: '100px',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
    flexShrink: 0,
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
  listHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: `1px solid ${c.outlineVariant}`,
  },
  fileList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fileCheckLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
  },
  fileInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  fileName: {
    fontSize: '14px',
    color: c.onSurface,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    fontSize: '12px',
    color: c.onSurfaceVariant,
    marginTop: 2,
  },
};
