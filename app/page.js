'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Home() {
  const [session, setSession] = useState(null);
  const [isVip, setIsVip] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // NAVİGASYON
  const [currentView, setCurrentView] = useState('home'); // home, exclusive, sub, calendar, profile, shop
  
  // VERİLER
  const [matches, setMatches] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTag, setSearchTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // MODAL VE İZLENME (SADECE 1 KERE ARTMASI İÇİN)
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [gettingLink, setGettingLink] = useState(false);
  const [viewedMatches, setViewedMatches] = useState([]); // F5 atana kadar izlenenleri tutar

  // AI CHAT
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: 'Merhaba! Ben Barafella AI. Arşivde ne bulmamı istersin?' }]);
  const chatEndRef = useRef(null);

  const TAG_OPTIONS = ['Hepsi', 'Satfeed', '4K&1080P HDTV', 'Web-Dl', 'Upscaled', 'Champions League & Other League', 'Turkey Super League', 'Premier League', 'Serie A', 'La Liga'];

  // Örnek Takvim Verisi
  const upcomingEvents = [
    { id: 1, title: 'Galatasaray vs Fenerbahçe', date: 'Bu Akşam 19:00', desc: 'Ham Yayın & Satfeed Kaydı (4K)' },
    { id: 2, title: 'Real Madrid vs Man City (UCL)', date: 'Yarın 22:00', desc: '50fps Kesintisiz Yayın Kaydı' }
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { checkVipStatus(session.user.id); fetchUserLogs(session.user.email); }
    });
    fetchMatches();
  }, []);

  useEffect(() => { if(isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isChatOpen]);

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

  const fetchUserLogs = async (userEmail) => {
    const { data } = await supabase.from('access_logs').select('*').eq('user_email', userEmail).order('created_at', { ascending: false });
    if (data) setUserLogs(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) alert('Giriş başarısız: ' + signUpError.message);
      else alert('Kayıt başarılı! VIP onayı bekleniyor.');
    }
  };

  // MODAL AÇILDIĞINDA İZLENMEYİ SADECE 1 KERE ARTIRAN FONKSİYON
  const handleOpenModal = async (match) => {
    setSelectedMatch(match);
    
    // Eğer bu maç daha önce bu oturumda (F5 atılmadan) açılmadıysa izlenmeyi artır
    if (!viewedMatches.includes(match.id)) {
      const newViews = (match.views || 0) + 1;
      
      // Ekranda anında güncelle
      setMatches(matches.map(m => m.id === match.id ? { ...m, views: newViews } : m));
      setSelectedMatch({ ...match, views: newViews });
      
      // Hafızaya (State) kaydet ki bir daha artmasın
      setViewedMatches([...viewedMatches, match.id]);
      
      // Veritabanını güncelle
      await supabase.from('mac').update({ views: newViews }).eq('id', match.id);
    }
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
      if (res.ok) {
        window.location.assign(data.drive_link);
        fetchUserLogs(session.user.email);
      } else alert('Hata: ' + data.error);
    } catch (err) { alert('Hata oluştu.'); }
    finally { setGettingLink(false); }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if(!chatInput.trim()) return;
    const newChat = [...chatHistory, { role: 'user', text: chatInput }];
    setChatHistory(newChat);
    setChatInput('');
    setTimeout(() => {
      setChatHistory([...newChat, { role: 'ai', text: 'Tüm arşivi tarıyorum... Çok yakında anlık içerik getirme özelliğim aktif olacak!' }]);
    }, 1000);
  };

  // FİLTRELEME
  const getFilteredMatches = (categoryFilter) => {
    let filtered = categoryFilter ? matches.filter(m => m.category === categoryFilter) : matches;
    if (searchQuery) filtered = filtered.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (searchTag && searchTag !== 'Hepsi') {
      filtered = filtered.filter(m => {
        try { return JSON.parse(m.tags || '[]').includes(searchTag); } catch(e) { return false; }
      });
    }
    return filtered;
  };

  const latestMatches = matches.slice(0, 4);

  // KART BİLEŞENİ (Netflix/DAZN Kalitesinde Animasyonlu)
  const MatchCard = ({ item }) => (
    <div onClick={() => handleOpenModal(item)} className="group cursor-pointer rounded-2xl overflow-hidden bg-[#111] relative transform-gpu transition-all duration-500 hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(124,58,237,0.2)] hover:border-purple-500/30 border border-white/5">
      {item.badge && <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black tracking-wider rounded-md shadow-lg">{item.badge}</div>}
      <div className="absolute top-3 right-3 z-20 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium rounded-md flex items-center gap-1 border border-white/10">👁 {item.views || 0}</div>

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-900">
        <img src={item.thumbnail_url} className="w-full h-full object-cover transform-gpu transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent opacity-90 transition-opacity duration-300"></div>
        
        <div className="absolute bottom-0 left-0 w-full p-5 transform-gpu transition-all duration-500 translate-y-2 group-hover:translate-y-0">
          <div className="flex gap-2 mb-2">
             {item.resolution && <span className="text-[9px] font-mono border border-white/20 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-neutral-300">{item.resolution}</span>}
             {item.fps && <span className="text-[9px] font-mono border border-white/20 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-neutral-300">{item.fps}</span>}
          </div>
          <h3 className="text-white font-bold text-base line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">{item.title}</h3>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans selection:bg-purple-500/30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#11081f] via-black to-black">
      
      {/* APPLE VISION PRO TARZI YÜZEN CAM NAVBAR */}
      <header className="sticky top-4 z-40 mx-auto max-w-6xl px-4 sm:px-6 animate-slide-down">
        <div className="backdrop-blur-3xl bg-[#0a0a0a]/60 border border-white/10 rounded-2xl px-6 py-4 flex flex-col sm:flex-row justify-between items-center shadow-[0_10px_40px_rgba(0,0,0,0.8)] gap-4 transition-all">
          <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform" onClick={() => setCurrentView('home')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-purple-500/30">B</div>
            <span className="font-bold tracking-tight text-white text-lg">BARAFELLA</span>
          </div>
          
          <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5">
            <button onClick={() => setCurrentView('home')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'home' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Ana Sayfa</button>
            <button onClick={() => setCurrentView('exclusive')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'exclusive' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Exclusive</button>
            <button onClick={() => setCurrentView('sub')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'sub' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Subscription</button>
            <button onClick={() => setCurrentView('calendar')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all hidden md:block ${currentView === 'calendar' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Takvim</button>
            <button onClick={() => setCurrentView('shop')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 ${currentView === 'shop' ? 'ring-2 ring-purple-500' : ''}`}>VIP Al</button>
            {session && <button onClick={() => setCurrentView('profile')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all hidden sm:block ${currentView === 'profile' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Profilim</button>}
          </div>

          {session ? (
            <div className="flex items-center gap-4">
              {isVip ? <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]">VIP AKTİF</span> 
                     : <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">ONAY BEKLİYOR</span>}
              <button onClick={() => supabase.auth.signOut()} className="text-xs text-neutral-400 hover:text-white transition-colors">Çıkış</button>
            </div>
          ) : (
             <span className="text-xs font-medium text-neutral-500">Müşteri Portalı</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-32">
        
        {/* GİRİŞ EKRANI */}
        {!session && currentView !== 'shop' && (
          <div className="max-w-sm mx-auto mb-16 p-8 rounded-3xl bg-[#0a0a0a]/80 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden animate-slide-up">
            <h3 className="text-white font-bold mb-6 text-center text-lg">Sisteme Giriş Yapın</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white focus:border-purple-500 transition-all outline-none" />
              <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white focus:border-purple-500 transition-all outline-none" />
              <button type="submit" className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]">Giriş Yap / Kaydol</button>
            </form>
          </div>
        )}

        {/* ANA SAYFA (KEŞFET) */}
        {currentView === 'home' && (
          <div className="animate-fade-in">
            {/* O SEVDİĞİN DEVASA HERO YAZISI */}
            <div className="text-center space-y-6 mb-16 animate-slide-up">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tighter bg-gradient-to-b from-white via-neutral-200 to-neutral-600 bg-clip-text text-transparent">
                Sınırsız. Kayıpsız. <span className="bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">Premium.</span>
              </h1>
              <p className="text-neutral-400 text-base max-w-xl mx-auto font-medium">
                En özel oyuncu compları ve ham uydu (Satfeed) maç kayıtları. Yalnızca Barafella VIP üyelerine özel.
              </p>
            </div>

            {/* ARAMA VE FİLTRE */}
            <div className="max-w-2xl mx-auto mb-16 relative group animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <input 
                type="text" 
                placeholder="Maç, oyuncu veya comp ara..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all shadow-xl group-hover:border-white/20"
              />
              <svg className="absolute right-5 top-4 w-5 h-5 text-neutral-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array(4).fill(0).map((_, i) => <div key={i} className="aspect-[4/3] bg-[#111] animate-pulse rounded-2xl border border-white/5"></div>)}
              </div>
            ) : (
              <>
                {searchQuery ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {getFilteredMatches('').map(item => <MatchCard key={item.id} item={item} />)}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                      <span className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></span> 
                      Son Eklenenler
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {latestMatches.map(item => <MatchCard key={item.id} item={item} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* EXCLUSIVE / SUBSCRIPTION EKRANLARI */}
        {(currentView === 'exclusive' || currentView === 'sub') && (
          <div className="animate-fade-in space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
              <h2 className="text-3xl font-bold text-white">
                {currentView === 'exclusive' ? 'Barafella Exclusive Arşivi' : 'Subscription Arşivi'}
              </h2>
              <select value={searchTag} onChange={e => setSearchTag(e.target.value)} className="bg-[#111] border border-white/10 text-sm text-neutral-300 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors shadow-lg">
                {TAG_OPTIONS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {getFilteredMatches(currentView).map(item => <MatchCard key={item.id} item={item} />)}
              {getFilteredMatches(currentView).length === 0 && <div className="col-span-full py-16 text-center text-neutral-500 font-medium">Bu kategoride içerik bulunamadı.</div>}
            </div>
          </div>
        )}

        {/* PROFİL VE LOGLAR */}
        {currentView === 'profile' && session && (
          <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold text-white mb-6">Profilim</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-3xl p-8 bg-[#111]/80 border border-white/5 backdrop-blur-xl flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 blur-3xl rounded-full"></div>
                <div className="text-sm text-neutral-400 mb-1">Hesap Bilgisi</div>
                <div className="text-xl font-bold text-white mb-4 z-10">{session.user.email}</div>
                <div className="z-10">
                  {isVip ? <span className="px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm font-bold">VIP ÜYE</span> 
                         : <span className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-bold">VIP ONAYI BEKLENİYOR</span>}
                </div>
              </div>
              <div className="rounded-3xl p-8 bg-[#111]/80 border border-white/5 backdrop-blur-xl flex flex-col justify-center items-center text-center">
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-2">{userLogs.length}</div>
                <div className="text-sm text-neutral-400 font-medium">İndirilen Toplam İçerik</div>
              </div>
            </div>

            <div className="rounded-3xl p-6 bg-[#111]/80 border border-white/5 mt-8">
              <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-4">Geçmiş İndirmelerim</h3>
              <div className="space-y-3">
                {userLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex justify-between items-center p-4 rounded-xl bg-black border border-white/5 hover:border-white/10 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-white mb-1">{log.match_title}</div>
                      <div className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">{log.action_detail}</div>
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">{new Date(log.created_at).toLocaleDateString('tr-TR')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAKVİM */}
        {currentView === 'calendar' && (
          <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-white">Yayın Takvimi</h2>
              <p className="text-neutral-400 mt-2">Yaklaşan ham maç kayıtları ve satfeed yayınları.</p>
            </div>
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex flex-col sm:flex-row justify-between items-center p-6 rounded-3xl bg-[#111] border border-white/5 hover:border-purple-500/30 transition-all group">
                  <div className="mb-4 sm:mb-0 text-center sm:text-left">
                    <div className="text-sm text-purple-400 font-bold mb-1 tracking-wider">{event.date}</div>
                    <h3 className="text-xl font-bold text-white group-hover:text-purple-200 transition-colors">{event.title}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{event.desc}</p>
                  </div>
                  <button onClick={() => alert('Hatırlatıcı kuruldu!')} className="px-6 py-2.5 rounded-xl bg-white/5 text-white border border-white/10 hover:bg-purple-600 hover:border-purple-500 transition-all text-sm font-bold">
                    Hatırlat
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHOPIER SATIN ALMA */}
        {currentView === 'shop' && (
          <div className="animate-fade-in max-w-4xl mx-auto py-10">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Premium Dünyasına Katıl</h2>
              <p className="text-neutral-400">Satın alım sonrası hesabınız anında VIP statüsüne yükseltilir.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="rounded-3xl p-8 bg-[#0a0a0a] border border-white/5 hover:border-purple-500/30 transition-colors">
                <h3 className="text-xl font-bold text-white mb-2">Aylık VIP Pass</h3>
                <div className="text-4xl font-black text-white mb-6">₺250<span className="text-base text-neutral-500 font-medium">/ay</span></div>
                <ul className="space-y-4 mb-8 text-neutral-400 text-sm">
                  <li className="flex items-center gap-2">✓ Barafella Exclusive Comps</li>
                  <li className="flex items-center gap-2">✓ 50fps Satfeed Kayıtları</li>
                  <li className="flex items-center gap-2">✓ Sınırsız İndirme</li>
                </ul>
                <button onClick={() => window.open('https://shopier.com/GECICI_LINK', '_blank')} className="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-colors shadow-lg">Aylık Satın Al</button>
              </div>
              <div className="rounded-3xl p-8 bg-gradient-to-br from-[#1a0b2e] to-[#0a0a0a] border border-purple-500/50 relative shadow-[0_0_40px_rgba(124,58,237,0.15)] transform hover:scale-105 transition-transform duration-300">
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-xl shadow-lg">EN İYİ FİYAT</div>
                <h3 className="text-xl font-bold text-white mb-2">Yıllık Elite Pass</h3>
                <div className="text-4xl font-black text-white mb-6">₺2000<span className="text-base text-purple-300 font-medium">/yıl</span></div>
                <ul className="space-y-4 mb-8 text-purple-200 text-sm">
                  <li className="flex items-center gap-2">✓ Tüm Aylık Özellikler</li>
                  <li className="flex items-center gap-2">✓ İçerik Talebi Hakkı</li>
                  <li className="flex items-center gap-2">✓ AI Asistan Tam Erişim</li>
                </ul>
                <button onClick={() => window.open('https://shopier.com/GECICI_LINK_2', '_blank')} className="w-full py-4 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.4)]">Yıllık Planı Seç</button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* DAZN STİLİ MAÇ DETAY MODALI */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedMatch(null)}></div>
          
          <div className="relative w-full max-w-3xl bg-[#0a0a0a] rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 z-10 animate-scale-up flex flex-col max-h-[90vh]">
            <button onClick={() => setSelectedMatch(null)} className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-black transition-all border border-white/20">✕</button>
            
            <div className="relative aspect-video w-full bg-black shrink-0">
              <img src={selectedMatch.thumbnail_url} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {(() => {
                    try { return JSON.parse(selectedMatch.tags || '[]').map(t => <span key={t} className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-md text-[10px] font-bold text-white border border-white/10">{t}</span>); } 
                    catch(e) { return null; }
                  })()}
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">{selectedMatch.title}</h2>
                <div className="flex items-center gap-4 text-xs font-mono text-purple-400 bg-black/50 w-fit px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
                  <span>👁 {selectedMatch.views} İZLENME</span>
                  <span className="w-1 h-1 bg-purple-500 rounded-full"></span>
                  <span>💾 {selectedMatch.file_size || 'Boyut Bilinmiyor'}</span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto">
              <div className="mb-8">
                <h4 className="text-xs text-neutral-500 mb-3 uppercase tracking-widest font-bold">Maç Bilgileri / Künye</h4>
                <p className="text-neutral-300 text-sm bg-[#111] p-5 rounded-2xl border border-white/5 leading-relaxed">
                  {selectedMatch.match_info || 'Bu içerik için detaylı maç bilgisi girilmemiştir. Sınırsız hızda indirmek için aşağıdaki butonu kullanın.'}
                </p>
              </div>

              <button 
                onClick={() => handleGetDriveLink(selectedMatch.id)} 
                disabled={gettingLink}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all flex justify-center items-center gap-2 ${
                  isVip ? 'bg-white text-black hover:bg-neutral-200 hover:scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
                        : 'bg-[#111] text-neutral-500 border border-white/10 cursor-not-allowed'
                }`}
              >
                {gettingLink ? 'Google Drive İzni Tanımlanıyor...' : (isVip ? 'İndirme Bağlantısını Aç (Drive)' : 'Erişim İçin VIP Onayı Gereklidir')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YÜZEN AI CHAT BUTONU VE PENCERESİ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 w-80 sm:w-96 h-[450px] bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">AI</div>
                <div>
                  <h3 className="font-bold text-white text-sm">Barafella AI</h3>
                  <div className="text-[9px] text-emerald-400 font-medium">● Çevrimiçi</div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-neutral-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-md leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-[#111] text-white rounded-bl-sm border border-white/5'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-3 bg-black/40 border-t border-white/5 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Arşivde ne arıyorsun?" className="flex-1 bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors" />
              <button type="submit" className="bg-white text-black px-4 rounded-xl font-bold hover:bg-neutral-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">→</button>
            </form>
          </div>
        )}
        
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center hover:scale-110 transition-transform border border-white/20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        </button>
      </div>

      {/* SADECE MODAL VE GİRİŞ İÇİN KEYFRAME'LER */}
      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
