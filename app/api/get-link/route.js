import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { matchId, userToken } = await request.json();

    // Supabase bağlantısını gizli Service Role Key ile kuruyoruz
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Oturumu doğrula
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
      return Response.json({ error: "Maç bulunamadı veya yayında değil." }, { status: 404 });
    }

    // Sadece yetkili kullanıcıya Drive linkini dön
    return Response.json({ drive_link: match.drive_link });
  } catch (err) {
    return Response.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
