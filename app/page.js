'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [session, setSession] = useState(null);
  const [isVip, setIsVip] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('exclusive'); // 'exclusive' veya 'sub'
  const [matches, setMatches] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkVipStatus(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkVipStatus(session.user.id);
    });

    fetchMatches();
    return () => subscription.unsubscribe();
  }, []);

  const checkVipStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('is_vip').eq('id', userId).single();
    if (data) setIsVip(data.is_vip);
  };

  const fetchMatches = async () => {
    const { data } = await supabase.from('mac').select('*').order('created_at', { ascending: false });
    if (data) setMatches(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Hesabı yoksa otomatik kayıt yapmayı dener
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) alert('Giriş başarısız: ' + signUpError.message);
      else alert('Kayıt başarılı! VIP onayı için bekleyin.');
    }
  };

  const handleGetAccess = async (matchId) => {
    if (!session) return alert('Lütfen önce giriş yapın.');
    if (!isVip) return alert('Drive erişimi için hesabınızın VIP olarak onaylanması gerekmektedir.');

    setLoadingId(matchId);
    try {
      const res = await fetch('/api/get-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, userToken: session.access_token }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Erişim başarıyla tanımlandı! Drive açılıyor...');
        window.open(data.drive_link, '_blank');
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (err) {
      alert('Sunucu hatası.');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredMatches = matches.filter(m => m.category === activeTab);

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans selection:bg-neutral-800">
      
      {/* Cam Efektli Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/60 border-b border-neutral-900/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-black text-sm">B</div>
            <span className="font-semibold tracking-tight text-white">BARAFELLA</span>
          </div>
          
          {session ? (
            <div className="flex items-center gap-4 text-xs font-medium">
              {isVip ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">VIP AKTİF</span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">VIP ONAYI BEKLENİYOR</span>
              )}
              <span className="text-neutral-400 hidden sm:inline">{session.user.email}</span>
              <button onClick={() => supabase.auth.signOut()} className="text-neutral-500 hover:text-white transition-colors">Çıkış</button>
            </div>
          ) : (
            <span className="text-xs text-neutral-500">Müşteri Portalı</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        
        {/* Kahraman (Hero) Alanı */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">Sınırsız. Kayıpsız. Premium.</h1>
          <p className="text-neutral-400 text-sm sm:text-base max-w-xl mx-auto">
            Özel oyuncu compları, yüksek FPS uydu yayınları ve ham maç kayıtlarına sadece VIP üyeler erişebilir.
          </p>
        </div>

        {/* Giriş Formu (Oturum Açılmamışsa) */}
        {!session && (
          <div className="max-w-sm mx-auto mb-16 p-6 rounded-2xl bg-neutral-900/30 border border-neutral-800 backdrop-blur-lg">
            <h3 className="text-white font-medium mb-4 text-center">Platforma Giriş Yap</h3>
            <form onSubmit={handleLogin} className="space-y-3">
              <input type="email" placeholder="E-posta adresi" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-500 outline-none" />
              <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-500 outline-none" />
              <button type="submit" className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-all">Giriş Yap / Kayıt Ol</button>
            </form>
          </div>
        )}

        {/* Sekmeler */}
        <div className="flex justify-center mb-10">
          <div className="p-1 rounded-xl bg-neutral-900/50 border border-neutral-800 inline-flex">
            <button onClick={() => setActiveTab('exclusive')} className={`px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === 'exclusive' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>EXCLUSIVE COMPS</button>
            <button onClick={() => setActiveTab('sub')} className={`px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === 'sub' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>SATFEED (FULL)</button>
          </div>
        </div>

        {/* İçerik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map(item => (
            <div key={item.id} className="group flex flex-col justify-between rounded-2xl bg-neutral-900/20 border border-neutral-800 overflow-hidden hover:border-neutral-600 transition-all">
              <div>
                <div className="relative aspect-video bg-black overflow-hidden">
                  <img src={item.thumbnail_url || 'https://via.placeholder.com/600x400'} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {item.resolution && <span className="px-2 py-1 rounded bg-black/80 backdrop-blur text-[10px] text-white font-mono">{item.resolution}</span>}
                    {item.fps && <span className="px-2 py-1 rounded bg-black/80 backdrop-blur text-[10px] text-white font-mono">{item.fps}</span>}
                  </div>
                  {item.file_size && <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 backdrop-blur text-[10px] text-white font-mono">{item.file_size}</div>}
                </div>
                <div className="p-5">
                  <h4 className="text-white font-medium text-sm leading-relaxed">{item.title}</h4>
                </div>
              </div>
              
              <div className="p-5 pt-0">
                <button 
                  onClick={() => handleGetAccess(item.id)}
                  disabled={loadingId === item.id}
                  className={`w-full py-3 rounded-xl text-xs font-semibold transition-all flex justify-center items-center gap-2 
                    ${isVip ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-neutral-500 cursor-not-allowed border border-neutral-800'}`}
                >
                  {loadingId === item.id ? 'Yetki Tanımlanıyor...' : (isVip ? 'Drive Erişimini Etkinleştir' : 'VIP Onayı Gerekiyor')}
                </button>
              </div>
            </div>
          ))}
          {filteredMatches.length === 0 && (
            <div className="col-span-full py-12 text-center text-neutral-500 text-sm">Bu kategoride henüz içerik bulunmuyor.</div>
          )}
        </div>
        
      </main>
    </div>
  );
}
