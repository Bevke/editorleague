import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

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

    // 2. Maç verisini veritabanından çek
    const { data: match, error: matchError } = await supabase
      .from('mac')
      .select('drive_link, is_active')
      .eq('id', matchId)
      .single();

    if (matchError || !match || !match.is_active) {
      return Response.json({ error: "Maç bulunamadı veya pasif." }, { status: 404 });
    }

    // 3. Drive Linkinden File ID çıkarma
    const fileIdMatch = match.drive_link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;

    if (fileId && user.email) {
      // 4. Service Account ile Google Drive Auth Kurulumu
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          // Vercel'deki ters eğik çizgileri gerçek alt satıra dönüştürür
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });

      // 5. Kullanıcının e-postasına VIEWER (reader) izni ekle
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader', // 'reader' = Google Drive'da Viewer (Görüntüleyen)
          type: 'user',
          emailAddress: user.email,
        },
        sendNotificationEmail: false, // Kullanıcıya e-posta spam'i atmasın
      });
    }

    return Response.json({ drive_link: match.drive_link });
  } catch (err) {
    console.error("Google Drive API Hatası:", err);
    return Response.json({ error: "Erişim izni verilirken bir hata oluştu." }, { status: 500 });
  }
}
