'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Home() {
  const [session, setSession] = useState(null);
  const [isVip, setIsVip] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [currentView, setCurrentView] = useState('home'); // home, exclusive, sub, shop
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // SKELETON İÇİN
  const [selectedMatch, setSelectedMatch] = useState(null); // MODAL İÇİN
  const [gettingLink, setGettingLink] = useState(false);
  const [searchTag, setSearchTag] = useState(''); // Kategori Filtresi

  const TAG_OPTIONS = ['Hepsi', 'Satfeed', '4K&1080P HDTV', 'Web-Dl', 'Upscaled', 'Champions League & Other League', 'Turkey Super League', 'Premier League', 'Serie A', 'La Liga'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkVipStatus(session.user.id);
    });
    fetchMatches();
  }, []);

  const checkVipStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('is_vip').eq('id', userId).single();
    if (data) setIsVip(data.is_vip);
  };

  const fetchMatches = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('mac').select('*').order('created_at', { ascending: false });
    if (data) setMatches(data);
    setIsLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) alert('Giriş başarısız: ' + signUpError.message);
      else alert('Kayııt başarılı! VIP onayı bekleniyor.');
    }
  };

  // KARTA TIKLAYINCA MODAL AÇILIR VE İZLENME ARTAR
  const handleOpenModal = async (match) => {
    setSelectedMatch(match);
    const newViews = (match.views || 0) + 1;
    // Anlık olarak arayüzü güncelle
    setMatches(matches.map(m => m.id === match.id ? { ...m, views: newViews } : m));
    setSelectedMatch({ ...match, views: newViews });
    // Veritabanını güncelle
    await supabase.from('mac').update({ views: newViews }).eq('id', match.id);
  };

  const handleGetDriveLink = async (matchId) => {
    if (!session) return alert('Lütfen giriş yapın.');
    if (!isVip) return alert('Drive erişimi için VIP olmalısınız.');

    setGettingLink(true);
    try {
      const res = await fetch('/api/get-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, userToken: session.access_token }),
      });
      const data = await res.json();
      if (res.ok) window.location.assign(data.drive_link);
      else alert('Hata: ' + data.error);
    } catch (err) { alert('Hata oluştu.'); }
    finally { setGettingLink(false); }
  };

  // FİLTRELEME MANTIĞI
  const getFilteredMatches = (categoryFilter) => {
    let filtered = categoryFilter ? matches.filter(m => m.category === categoryFilter) : matches;
    if (searchTag && searchTag !== 'Hepsi') {
      filtered = filtered.filter(m => {
        try {
          const tagsArray = JSON.parse(m.tags || '[]');
          return tagsArray.includes(searchTag);
        } catch(e) { return false; }
      });
    }
    return filtered;
  };

  // Son Eklenen 4 İçerik
  const latestMatches = matches.slice(0, 4);

  // KART BİLEŞENİ (Netflix/DAZN Style - Kasmayan Animasyon)
  const MatchCard = ({ item }) => (
    <div onClick={() => handleOpenModal(item)} className="group cursor-pointer rounded-xl overflow-hidden bg-[#111] relative transform-gpu transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(124,58,237,0.15)]">
      
      {/* BADGE (ROZET) */}
      {item.badge && (
        <div className="absolute top-3 left-3 z-20 px-2 py-1 bg-purple-600 text-white text-[10px] font-black tracking-wider rounded-md shadow-lg">
          {item.badge}
        </div>
      )}

      {/* GÖRÜNTÜLENME SAYISI */}
      <div className="absolute top-3 right-3 z-20 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium rounded-md flex items-center gap-1">
        👁 {item.views || 0}
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900">
        <img src={item.thumbnail_url} className="w-full h-full object-cover transform-gpu transition-transform duration-500 group-hover:scale-105" />
        {/* Siyah Karartma Efekti */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>
        
        {/* İçerik Bilgileri */}
        <div className="absolute bottom-0 left-0 w-full p-4 transform-gpu transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
          <div className="flex gap-2 mb-2">
             {item.resolution && <span className="text-[9px] font-mono border border-white/20 px-1.5 py-0.5 rounded text-neutral-300">{item.resolution}</span>}
             {item.fps && <span className="text-[9px] font-mono border border-white/20 px-1.5 py-0.5 rounded text-neutral-300">{item.fps}</span>}
          </div>
          <h3 className="text-white font-bold text-sm sm:text-base line-clamp-2 leading-tight">{item.title}</h3>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f7] font-sans selection:bg-purple-500/30">
      
      {/* NAVBAR (Sadece burada Glassmorphism var) */}
      <header className="fixed top-0 w-full z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
              <div className="w-7 h-7 rounded bg-purple-600 flex items-center justify-center font-black text-white text-xs">B</div>
              <span className="font-bold tracking-tight text-white hidden sm:block">BARAFELLA</span>
            </div>
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <button onClick={() => setCurrentView('home')} className={`transition-colors ${currentView === 'home' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Ana Sayfa</button>
              <button onClick={() => setCurrentView('exclusive')} className={`transition-colors ${currentView === 'exclusive' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Exclusive</button>
              <button onClick={() => setCurrentView('sub')} className={`transition-colors ${currentView === 'sub' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Subscription (Sub)</button>
              <button onClick={() => setCurrentView('shop')} className={`transition-colors ${currentView === 'shop' ? 'text-purple-400' : 'text-neutral-500 hover:text-purple-400'}`}>VIP Satın Al</button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                {isVip ? <span className="px-2 py-1 rounded bg-purple-600/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">VIP AKTİF</span> 
                       : <span className="px-2 py-1 rounded bg-neutral-800 text-neutral-400 text-[10px] font-bold">BEKLİYOR</span>}
                <button onClick={() => supabase.auth.signOut()} className="text-xs text-neutral-500 hover:text-white">Çıkış</button>
              </div>
            ) : (
              <span className="text-xs text-neutral-500">Giriş Yapılmadı</span>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 max-w-7xl mx-auto px-6">

        {/* GİRİŞ EKRANI */}
        {!session && currentView !== 'shop' && (
          <div className="max-w-sm mx-auto mb-20 p-8 rounded-2xl bg-[#0a0a0a] border border-white/5 shadow-2xl">
            <h3 className="text-white font-bold mb-6 text-center text-xl">Sisteme Giriş Yapın</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors" />
              <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors" />
              <button type="submit" className="w-full py-3 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 transition-colors">Giriş Yap / Kaydol</button>
            </form>
          </div>
        )}

        {/* ANA SAYFA & SON EKLENENLER */}
        {currentView === 'home' && (
          <div className="animate-fade-in space-y-12">
            
            {/* SKELETON LOADING (Veri Yüklenirken) */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="aspect-[16/9] bg-neutral-900 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-5 bg-purple-600 rounded"></span> Son Eklenenler
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {latestMatches.map(item => <MatchCard key={item.id} item={item} />)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* EXCLUSIVE VEYA SUBSCRIPTION EKRANI */}
        {(currentView === 'exclusive' || currentView === 'sub') && (
          <div className="animate-fade-in space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-3xl font-bold text-white">
                {currentView === 'exclusive' ? 'Barafella Exclusive' : 'Subscription Arşivi'}
              </h2>
              
              {/* ETİKET FİLTRESİ */}
              <select 
                value={searchTag} 
                onChange={e => setSearchTag(e.target.value)}
                className="bg-[#111] border border-white/10 text-sm text-neutral-300 rounded-lg px-4 py-2 outline-none focus:border-purple-500"
              >
                {TAG_OPTIONS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 {Array(8).fill(0).map((_, i) => <div key={i} className="aspect-[16/9] bg-neutral-900 animate-pulse rounded-xl"></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {getFilteredMatches(currentView).map(item => <MatchCard key={item.id} item={item} />)}
                {getFilteredMatches(currentView).length === 0 && <div className="col-span-full py-10 text-neutral-500">İçerik bulunamadı.</div>}
              </div>
            )}
          </div>
        )}

        {/* SHOPIER SATIN ALMA EKRANI */}
        {currentView === 'shop' && (
          <div className="animate-fade-in max-w-4xl mx-auto py-10">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Premium Dünyasına Katıl</h2>
              <p className="text-neutral-400">Satın alım sonrası hesabınız anında VIP statüsüne yükseltilir.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="rounded-2xl p-8 bg-[#0a0a0a] border border-white/5 hover:border-purple-500/30 transition-colors">
                <h3 className="text-xl font-bold text-white mb-2">Aylık VIP Pass</h3>
                <div className="text-4xl font-black text-white mb-6">₺250<span className="text-base text-neutral-500 font-medium">/ay</span></div>
                <ul className="space-y-3 mb-8 text-neutral-400 text-sm">
                  <li>✓ Barafella Exclusive Comps</li>
                  <li>✓ 50fps Satfeed Kayıtları</li>
                  <li>✓ Sınırsız İndirme</li>
                </ul>
                <button onClick={() => window.open('https://shopier.com/GECICI_LINK', '_blank')} className="w-full py-3 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 transition-colors">Satın Al</button>
              </div>
              <div className="rounded-2xl p-8 bg-gradient-to-br from-[#1a0b2e] to-[#0a0a0a] border border-purple-500/50 relative shadow-[0_0_30px_rgba(124,58,237,0.15)]">
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">EN İYİ FİYAT</div>
                <h3 className="text-xl font-bold text-white mb-2">Yıllık Elite Pass</h3>
                <div className="text-4xl font-black text-white mb-6">₺2000<span className="text-base text-purple-300 font-medium">/yıl</span></div>
                <ul className="space-y-3 mb-8 text-purple-200 text-sm">
                  <li>✓ Tüm Aylık Özellikler</li>
                  <li>✓ İçerik Talebi Hakkı</li>
                  <li>✓ Öncelikli Destek</li>
                </ul>
                <button onClick={() => window.open('https://shopier.com/GECICI_LINK_2', '_blank')} className="w-full py-3 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 transition-colors">Yıllık Planı Seç</button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MAÇ DETAY MODALI (SofaScore / DAZN Tarzı) */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 animate-fade-in">
          {/* Arka Plan Karartması */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedMatch(null)}></div>
          
          <div className="relative w-full max-w-3xl bg-[#111] rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-10 animate-scale-up">
            <button onClick={() => setSelectedMatch(null)} className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors">✕</button>
            
            <div className="relative aspect-video w-full bg-black">
              <img src={selectedMatch.thumbnail_url} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {(() => {
                    try {
                      const tags = JSON.parse(selectedMatch.tags || '[]');
                      return tags.map(t => <span key={t} className="px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] font-medium text-neutral-200">{t}</span>);
                    } catch(e) { return null; }
                  })()}
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight mb-2">{selectedMatch.title}</h2>
                <div className="flex items-center gap-4 text-xs font-mono text-purple-400">
                  <span>👁 {selectedMatch.views} Görüntülenme</span>
                  <span>💾 {selectedMatch.file_size}</span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-[#111]">
              <div className="mb-8">
                <h4 className="text-sm text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Maç İçi Bilgiler</h4>
                <p className="text-neutral-300 text-sm bg-[#1a1a1a] p-4 rounded-lg border border-white/5">
                  {selectedMatch.match_info || 'Bu içerik için detaylı maç bilgisi girilmemiştir.'}
                </p>
              </div>

              <button 
                onClick={() => handleGetDriveLink(selectedMatch.id)} 
                disabled={gettingLink}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 ${
                  isVip ? 'bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                        : 'bg-neutral-900 text-neutral-500 border border-white/10 cursor-not-allowed'
                }`}
              >
                {gettingLink ? 'İzin Alınıyor...' : (isVip ? 'Drive Üzerinden İzle & İndir' : 'VIP Üyelik Gereklidir')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SADECE MODAL İÇİN ANİMASYON KEYFRAME'LERİ (Dahili CSS) */}
      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
