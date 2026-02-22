function countJapaneseChars(text) {
  let count = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x4e00 && code <= 0x9fff)
    ) {
      count += 1;
    }
  }
  return count;
}

function looksLikeLatin1Mojibake(text) {
  return /[ÃÂãâÅåÆæÐðØøÞþ]/.test(text);
}

export function normalizeFilename(name) {
  const original = (name || 'download').replace(/[\0/\\]/g, '_').replace(/[\r\n]/g, '').trim() || 'download';
  const originalNfc = original.normalize('NFC');

  let decoded;
  try {
    decoded = Buffer.from(originalNfc, 'latin1').toString('utf8').normalize('NFC');
  } catch {
    return originalNfc;
  }

  if (!decoded || decoded.includes('\uFFFD')) {
    return originalNfc;
  }

  const originalJp = countJapaneseChars(originalNfc);
  const decodedJp = countJapaneseChars(decoded);

  if (decodedJp > originalJp) {
    return decoded;
  }

  if (looksLikeLatin1Mojibake(originalNfc) && decodedJp > 0) {
    return decoded;
  }

  return originalNfc;
}
