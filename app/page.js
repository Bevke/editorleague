'use client';
import { useState, useEffect, useRef } from 'react';
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
  
  // Navigasyon
  const [currentView, setCurrentView] = useState('home'); // home, archive, profile, calendar
  const [activeTab, setActiveTab] = useState('exclusive'); // exclusive, sub
  
  // Veriler
  const [matches, setMatches] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: 'Merhaba! Ben Barafella AI. Arşivde ne bulmamı istersin?' }]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { checkVipStatus(session.user.id); fetchUserLogs(session.user.email); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { checkVipStatus(session.user.id); fetchUserLogs(session.user.email); }
    });

    fetchMatches();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if(isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isChatOpen]);

  const checkVipStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('is_vip').eq('id', userId).single();
    if (data) setIsVip(data.is_vip);
  };

  const fetchMatches = async () => {
    const { data } = await supabase.from('mac').select('*').order('created_at', { ascending: false });
    if (data) setMatches(data);
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
        alert('Erişim başarıyla tanımlandı! Drive sayfasına yönlendiriliyorsunuz...');
        window.location.assign(data.drive_link);
        fetchUserLogs(session.user.email); // Logları güncelle
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (err) {
      alert('Sunucu hatası.');
    } finally {
      setLoadingId(null);
    }
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

  // Arama ve Kategori Filtreleme (Gelişmiş Sistem)
  const filteredMatches = matches.filter(m => 
    m.category === activeTab && 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const archiveMatches = matches.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Örnek Takvim Verisi
  const upcomingEvents = [
    { id: 1, title: 'Galatasaray vs Fenerbahçe', date: 'Bu Akşam 19:00', desc: 'Ham Yayın & Satfeed Kaydı (4K)' },
    { id: 2, title: 'Real Madrid vs Man City (UCL)', date: 'Yarın 22:00', desc: '50fps Kesintisiz Yayın Kaydı' }
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans selection:bg-neutral-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
      
      {/* CAM EFEKTLİ NAVBAR (Apple Vision Pro Style) */}
      <header className="sticky top-4 z-40 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="backdrop-blur-3xl bg-neutral-900/50 border border-white/10 rounded-2xl px-6 py-4 flex flex-col sm:flex-row justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] gap-4 transition-all">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-black text-sm">B</div>
            <span className="font-semibold tracking-tight text-white text-lg">BARAFELLA</span>
          </div>
          
          <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5">
            <button onClick={() => setCurrentView('home')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'home' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Keşfet</button>
            <button onClick={() => setCurrentView('archive')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'archive' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Arşiv</button>
            <button onClick={() => setCurrentView('calendar')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'calendar' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Takvim</button>
            {session && <button onClick={() => setCurrentView('profile')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'profile' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>Profilim</button>}
          </div>

          {session ? (
            <div className="flex items-center gap-4">
              {isVip ? <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">VIP</span> : <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">ONAY BEKLİYOR</span>}
              <button onClick={() => supabase.auth.signOut()} className="text-xs text-neutral-400 hover:text-white">Çıkış</button>
            </div>
          ) : (
             <span className="text-xs font-medium text-neutral-500">Müşteri Portalı</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-32">
        
        {/* GİRİŞ EKRANI */}
        {!session && (
          <div className="max-w-md mx-auto mb-16 p-8 rounded-3xl bg-neutral-900/40 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            <h3 className="text-white font-semibold mb-6 text-center text-lg">Platforma Giriş Yapın</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white focus:border-white/40 focus:bg-black transition-all outline-none" />
              <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white focus:border-white/40 focus:bg-black transition-all outline-none" />
              <button type="submit" className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-[1.02] transition-transform">Giriş Yap / Kaydol</button>
            </form>
          </div>
        )}

        {/* 1. KEŞFET (ANA SAYFA + ARAMA) */}
        {currentView === 'home' && (
          <div className="animate-fade-in">
            <div className="text-center space-y-6 mb-12">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">Sınırsız. Kayıpsız.</h1>
              <p className="text-neutral-400 text-base max-w-xl mx-auto">En özel oyuncu compları ve ham uydu (Satfeed) maç kayıtları.</p>
            </div>

            {/* Gelişmiş Arama Çubuğu */}
            <div className="max-w-xl mx-auto mb-12 relative">
              <input 
                type="text" 
                placeholder="Maç, oyuncu veya turnuva ara..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-white/30 transition-all shadow-xl"
              />
              <svg className="absolute right-5 top-4 w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>

            <div className="flex justify-center mb-10">
              <div className="p-1.5 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl inline-flex gap-2 shadow-2xl">
                <button onClick={() => setActiveTab('exclusive')} className={`px-8 py-3 rounded-xl text-xs font-bold tracking-widest transition-all ${activeTab === 'exclusive' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>EXCLUSIVE</button>
                <button onClick={() => setActiveTab('sub')} className={`px-8 py-3 rounded-xl text-xs font-bold tracking-widest transition-all ${activeTab === 'sub' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>SATFEED</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMatches.map(item => (
                <div key={item.id} className="group relative flex flex-col justify-between rounded-3xl bg-neutral-900/30 border border-white/10 backdrop-blur-md overflow-hidden hover:border-white/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                  <div>
                    <div className="relative aspect-[4/3] bg-black overflow-hidden">
                      <img src={item.thumbnail_url || 'https://via.placeholder.com/600x400'} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                      <div className="absolute top-4 left-4 flex gap-2">
                        {item.resolution && <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white font-mono">{item.resolution}</span>}
                        {item.fps && <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white font-mono">{item.fps}</span>}
                      </div>
                      {item.file_size && <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white font-mono">{item.file_size}</div>}
                    </div>
                    <div className="p-6">
                      <h4 className="text-white font-semibold text-lg leading-snug">{item.title}</h4>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <button onClick={() => handleGetAccess(item.id)} disabled={loadingId === item.id} className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 ${isVip ? 'bg-white text-black hover:bg-neutral-200 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-neutral-900/50 text-neutral-500 border border-white/5 cursor-not-allowed'}`}>
                      {loadingId === item.id ? 'İzin Tanımlanıyor...' : (isVip ? 'Drive Bağlantısını Aç' : 'VIP Onayı Gerekiyor')}
                    </button>
                  </div>
                </div>
              ))}
              {filteredMatches.length === 0 && <div className="col-span-full text-center text-neutral-500 py-10">İçerik bulunamadı.</div>}
            </div>
          </div>
        )}

        {/* 2. TÜM ARŞİV */}
        {currentView === 'archive' && (
          <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
              <h2 className="text-3xl font-bold text-white">Tüm İçerik Arşivi</h2>
              <input type="text" placeholder="Arşivde ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-neutral-900/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {archiveMatches.map(item => (
                <div key={item.id} className="rounded-2xl bg-neutral-900/30 border border-white/10 overflow-hidden flex flex-col hover:border-white/30 transition-all">
                  <img src={item.thumbnail_url} className="w-full h-32 object-cover opacity-80" />
                  <div className="p-4 flex-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest">{item.category}</span>
                    <h4 className="text-white font-medium text-sm mt-1 line-clamp-2">{item.title}</h4>
                  </div>
                  <div className="p-4 pt-0">
                    <button onClick={() => handleGetAccess(item.id)} className={`w-full py-2 rounded-lg text-xs font-bold ${isVip ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500'}`}>
                       {isVip ? 'Eriş' : 'Kilitli'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. KULLANICI PROFİLİ (Loglar ve İstatistikler) */}
        {currentView === 'profile' && session && (
          <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold text-white mb-6">Profilim</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-3xl p-8 bg-neutral-900/40 border border-white/10 backdrop-blur-xl flex flex-col justify-center">
                <div className="text-sm text-neutral-400 mb-1">Hesap Bilgisi</div>
                <div className="text-xl font-bold text-white mb-4">{session.user.email}</div>
                <div>
                  {isVip ? <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">VIP ÜYE</span> 
                         : <span className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-bold">VIP ONAYI BEKLENİYOR</span>}
                </div>
              </div>
              <div className="rounded-3xl p-8 bg-neutral-900/40 border border-white/10 backdrop-blur-xl flex flex-col justify-center items-center text-center">
                <div className="text-5xl font-black text-white mb-2">{userLogs.length}</div>
                <div className="text-sm text-neutral-400">Toplam Erişim Sağlanan İçerik</div>
              </div>
            </div>

            <div className="rounded-3xl p-6 bg-neutral-900/40 border border-white/10 backdrop-blur-xl mt-8">
              <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-4">Son İndirmelerim (Geçmiş)</h3>
              <div className="space-y-3">
                {userLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                    <div>
                      <div className="text-sm font-medium text-white">{log.match_title}</div>
                      <div className="text-[10px] text-emerald-400">{log.action_detail}</div>
                    </div>
                    <div className="text-xs text-neutral-500">{new Date(log.created_at).toLocaleDateString('tr-TR')}</div>
                  </div>
                ))}
                {userLogs.length === 0 && <div className="text-sm text-neutral-500 py-4 text-center">Henüz hiçbir içeriğe erişmediniz.</div>}
              </div>
            </div>
          </div>
        )}

        {/* 4. TAKVİM (Yaklaşan İçerikler) */}
        {currentView === 'calendar' && (
          <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-white">Yayın Takvimi</h2>
              <p className="text-neutral-400 mt-2">Yaklaşan ham maç kayıtları ve satfeed yayınları.</p>
            </div>
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex flex-col sm:flex-row justify-between items-center p-6 rounded-3xl bg-neutral-900/40 border border-white/10 backdrop-blur-xl hover:bg-neutral-900/60 transition-all">
                  <div className="mb-4 sm:mb-0 text-center sm:text-left">
                    <div className="text-sm text-indigo-400 font-bold mb-1">{event.date}</div>
                    <h3 className="text-xl font-bold text-white">{event.title}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{event.desc}</p>
                  </div>
                  <button onClick={() => alert(`${event.title} için hatırlatıcı kuruldu!`)} className="px-6 py-2.5 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white hover:text-black transition-all text-sm font-bold">
                    Hatırlat
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* YÜZEN AI CHAT BUTONU VE PENCERESİ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 w-80 sm:w-96 h-[450px] bg-neutral-900/80 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs">AI</div>
                <div>
                  <h3 className="font-bold text-white text-sm">Barafella AI</h3>
                  <div className="text-[9px] text-emerald-400">Çevrimiçi</div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-md ${msg.role === 'user' ? 'bg-white text-black rounded-br-sm' : 'bg-neutral-800 text-white rounded-bl-sm border border-white/10'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Bir şeyler sor..." className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              <button type="submit" className="bg-indigo-500 text-white px-4 rounded-xl font-bold hover:bg-indigo-600 transition-colors">→</button>
            </form>
          </div>
        )}
        
        {/* Yuvarlak AI Butonu */}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center hover:scale-110 transition-transform border border-white/20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        </button>
      </div>

    </div>
  );
}
