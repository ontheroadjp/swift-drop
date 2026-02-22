export default async function handler(req, res) {
  res.status(410).json({
    error: 'このエンドポイントは廃止されました。/api/download/:token/files を利用してください。',
  });
}
