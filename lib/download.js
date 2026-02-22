function sanitizeAsciiFallback(name) {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/["\\]/g, '_')
      .replace(/[\r\n]/g, '')
      .trim() || 'download'
  );
}

export function safeDownloadName(name) {
  return (name || 'download').replace(/[\0/\\]/g, '_').replace(/[\r\n]/g, '').trim() || 'download';
}

function encodeRFC5987(value) {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function buildContentDisposition(filename) {
  const safe = safeDownloadName(filename);
  const ascii = sanitizeAsciiFallback(safe);
  const encoded = encodeRFC5987(safe);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
