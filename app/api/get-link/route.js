import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

export async function POST(request) {
  try {
    const { matchId, userToken } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Oturum Kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) {
      return Response.json({ error: "Lütfen önce giriş yapın." }, { status: 401 });
    }

    // 2. VIP (Premium) Kontrolü
    const { data: profile } = await supabase.from('profiles').select('is_vip').eq('id', user.id).single();
    if (!profile || !profile.is_vip) {
      return Response.json({ error: "Drive erişimi için VIP yetkiniz bulunmuyor. Lütfen Barafella Admin ile iletişime geçin." }, { status: 403 });
    }

    // 3. İçerik Verisini Çek
    const { data: match, error: matchError } = await supabase.from('mac').select('*').eq('id', matchId).single();
    if (matchError || !match) {
      return Response.json({ error: "İçerik bulunamadı." }, { status: 404 });
    }

    // 4. Google Drive İzni Verme
    const fileIdMatch = match.drive_link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;

    if (fileId && user.email) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });
      await drive.permissions.create({
        fileId: fileId,
        requestBody: { role: 'reader', type: 'user', emailAddress: user.email },
        sendNotificationEmail: false,
      });

      // 5. Sisteme LOG Kaydı Atma (Admin paneline düşer)
      await supabase.from('access_logs').insert([{
        user_email: user.email,
        match_title: match.title || 'Bilinmeyen İçerik',
        action_detail: 'Drive İzleme Yetkisi Verildi (VIP)'
      }]);
    }

    return Response.json({ drive_link: match.drive_link });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Sunucu tarafında bir hata oluştu." }, { status: 500 });
  }
}
