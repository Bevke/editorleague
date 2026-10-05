import { createClient } from '@supabase/supabase-js';

// JWT Token oluşturma yardımcı fonksiyonu
async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Google Service Account bilgileri Vercel ortam değişkenlerinde bulunamadı.');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (str) =>
    Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const crypto = await import('crypto');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

export async function POST(request) {
  try {
    const { matchId, userToken } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Kullanıcının Supabase oturumunu doğrula
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) {
      return Response.json({ error: "Erişim yetkiniz yok! Lütfen giriş yapın." }, { status: 401 });
    }

    // 2. Maç verisini çek
    const { data: match, error: matchError } = await supabase
      .from('mac')
      .select('drive_link, is_active')
      .eq('id', matchId)
      .single();

    if (matchError || !match || !match.is_active) {
      return Response.json({ error: "Maç bulunamadı veya pasif durumda." }, { status: 404 });
    }

    // 3. Drive Linkinden File ID çıkarma
    const fileIdMatch = match.drive_link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;

    if (fileId && user.email) {
      // 4. Google Drive Access Token al
      const accessToken = await getGoogleAccessToken();

      // 5. Kullanıcının e-postasına Google Drive izni ekle
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'user',
          emailAddress: user.email,
        }),
      });
    }

    return Response.json({ drive_link: match.drive_link });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}
