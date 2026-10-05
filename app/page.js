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
  
  // Ana Menü (Navigasyon) State'leri
  const [currentView, setCurrentView] = useState('home'); // home, archive, shop, ai
  const [activeTab, setActiveTab] = useState('exclusive'); // exclusive, sub
  
  const [matches, setMatches] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  
  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: 'Merhaba! Ben Barafella AI. Hangi maçı, oyuncuyu veya çözünürlüğü arıyorsun?' }]);
  const chatEndRef = useRef(null);

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

  // Chat scroll oto kaydırma
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

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
        // POP-UP ENGELLEYİCİYİ AŞAN KESİN YÖNTEM
        window.location.assign(data.drive_link);
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
    
    // AI Sahte Cevap Simülasyonu
    setTimeout(() => {
      setChatHistory([...newChat, { role: 'ai', text: 'Barafella AI şu an entegrasyon aşamasında. Çok yakında istediğin oyuncunun görüntülerini yapay zeka ile arşivden saniyeler içinde bulabileceksin!' }]);
    }, 1000);
  };

  const filteredMatches = matches.filter(m => m.category === activeTab);

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans selection:bg-neutral-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
      
      {/* APPLE VISION PRO TARZI NAVBAR */}
      <header className="sticky top-4 z-50 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="backdrop-blur-3xl bg-neutral-900/40 border border-white/10 rounded-2xl px-6 py-4 flex flex-col sm:flex-row justify-between items-center shadow-2xl gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white to-neutral-400 flex items-center justify-center font-black text-black text-sm">B</div>
            <span className="font-semibold tracking-tight text-white text-lg">BARAFELLA</span>
          </div>
          
          {/* Menü Butonları */}
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/5">
            <button onClick={() => setCurrentView('home')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'home' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}>Keşfet</button>
            <button onClick={() => setCurrentView('archive')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'archive' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}>Tüm Arşiv</button>
            <button onClick={() => setCurrentView('shop')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'shop' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}>VIP Satın Al</button>
            <button onClick={() => setCurrentView('ai')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 ${currentView === 'ai' ? 'ring-2 ring-indigo-500' : ''}`}>AI Asistan</button>
          </div>

          {session ? (
            <div className="flex items-center gap-3">
              {isVip ? <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">VIP</span> : <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">ONAY BEKLİYOR</span>}
              <button onClick={() => supabase.auth.signOut()} className="text-xs text-neutral-400 hover:text-white">Çıkış</button>
            </div>
          ) : (
             <span className="text-xs font-medium text-neutral-500">Müşteri Portalı</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        
        {/* GİRİŞ EKRANI (Ortak) */}
        {!session && currentView !== 'shop' && (
          <div className="max-w-md mx-auto mb-16 p-8 rounded-3xl bg-neutral-900/40 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
            <h3 className="text-white font-semibold mb-6 text-center text-lg">Sisteme Giriş Yapın</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white focus:border-white/40 focus:bg-black transition-all outline-none" />
              <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white focus:border-white/40 focus:bg-black transition-all outline-none" />
              <button type="submit" className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]">Giriş Yap / Kaydol</button>
            </form>
          </div>
        )}

        {/* 1. KEŞFET (ANA SAYFA) */}
        {currentView === 'home' && (
          <div className="animate-fade-in">
            <div className="text-center space-y-6 mb-16">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">Sınırsız. Kayıpsız.</h1>
              <p className="text-neutral-400 text-base max-w-xl mx-auto">En özel oyuncu compları ve ham uydu (Satfeed) maç kayıtları. Yalnızca Barafella VIP üyelerine özel.</p>
            </div>

            <div className="flex justify-center mb-10">
              <div className="p-1.5 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-xl inline-flex gap-2 shadow-2xl">
                <button onClick={() => setActiveTab('exclusive')} className={`px-8 py-3 rounded-xl text-xs font-bold tracking-widest transition-all ${activeTab === 'exclusive' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>EXCLUSIVE</button>
                <button onClick={() => setActiveTab('sub')} className={`px-8 py-3 rounded-xl text-xs font-bold tracking-widest transition-all ${activeTab === 'sub' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>SATFEED</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMatches.slice(0, 6).map(item => (
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
            </div>
          </div>
        )}

        {/* 2. TÜM ARŞİV EKRANI */}
        {currentView === 'archive' && (
          <div className="animate-fade-in space-y-8">
            <h2 className="text-3xl font-bold text-white mb-8 border-b border-white/10 pb-4">Tüm İçerik Arşivi</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {matches.map(item => (
                <div key={item.id} className="rounded-2xl bg-neutral-900/30 border border-white/10 overflow-hidden flex flex-col">
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

        {/* 3. VIP SATIN AL (SHOPIER) */}
        {currentView === 'shop' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white">Premium Dünyasına Katıl</h2>
              <p className="text-neutral-400 mt-3">Satın alım sonrası hesabınız anında VIP statüsüne yükseltilir.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Paket 1 */}
              <div className="rounded-3xl p-8 bg-neutral-900/40 border border-white/10 backdrop-blur-xl relative overflow-hidden group">
                <h3 className="text-2xl font-bold text-white mb-2">Aylık VIP Pass</h3>
                <div className="text-4xl font-black text-white mb-6">₺250<span className="text-lg text-neutral-500 font-medium">/ay</span></div>
                <ul className="space-y-4 mb-8 text-neutral-300 text-sm">
                  <li className="flex gap-3 items-center">✓ Tüm Barafella Exclusive Comps</li>
                  <li className="flex gap-3 items-center">✓ Tüm 50fps Satfeed Kayıtları</li>
                  <li className="flex gap-3 items-center">✓ Tek tıkla Drive entegrasyonu</li>
                </ul>
                <button onClick={() => window.open('https://shopier.com/GECICI_LINK', '_blank')} className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:scale-105 transition-transform">Satın Al (Shopier)</button>
              </div>

              {/* Paket 2 - Yıllık */}
              <div className="rounded-3xl p-8 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 backdrop-blur-xl relative overflow-hidden group shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">EN POPÜLER</div>
                <h3 className="text-2xl font-bold text-white mb-2">Yıllık Elite Pass</h3>
                <div className="text-4xl font-black text-white mb-6">₺2000<span className="text-lg text-neutral-400 font-medium">/yıl</span></div>
                <ul className="space-y-4 mb-8 text-indigo-200 text-sm">
                  <li className="flex gap-3 items-center">✓ Tüm Aylık Özellikler</li>
                  <li className="flex gap-3 items-center">✓ Arşiv talebinde bulunma hakkı</li>
                  <li className="flex gap-3 items-center">✓ AI Asistan Öncelikli Erişim</li>
                </ul>
                <button onClick={() => window.open('https://shopier.com/GECICI_LINK_2', '_blank')} className="w-full py-4 rounded-xl bg-indigo-500 text-white font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(99,102,241,0.4)]">Satın Al (Shopier)</button>
              </div>
            </div>
          </div>
        )}

        {/* 4. YAPAY ZEKA ASİSTANI */}
        {currentView === 'ai' && (
          <div className="animate-fade-in max-w-3xl mx-auto h-[600px] flex flex-col rounded-3xl bg-neutral-900/40 border border-white/10 backdrop-blur-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 bg-black/40 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white">AI</div>
               <div>
                 <h3 className="font-bold text-white">Barafella AI Asistan</h3>
                 <span className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Çevrimiçi</span>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.role === 'user' ? 'bg-white text-black rounded-tr-sm' : 'bg-neutral-800 text-white rounded-tl-sm border border-white/10'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-4 bg-black/40 border-t border-white/10 flex gap-3">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Yapay zekaya sor (Örn: Galatasaray'ın 50fps son maçı var mı?)" className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
              <button type="submit" className="bg-indigo-500 text-white px-6 rounded-xl font-bold hover:bg-indigo-600 transition-colors">Gönder</button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
