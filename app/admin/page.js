'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches'); // matches, users, logs
  
  // Veriler
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  // Yeni Maç Formu
  const [newMatch, setNewMatch] = useState({
    title: '', drive_link: '', category: 'exclusive', 
    thumbnail_url: '', file_size: '', resolution: '1080p', fps: '50fps'
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/';
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (profile?.is_admin) {
      setIsAdmin(true);
      fetchData();
    } else {
      window.location.href = '/';
    }
    setLoading(false);
  };

  const fetchData = async () => {
    // Maçları Çek
    const { data: mData } = await supabase.from('mac').select('*').order('created_at', { ascending: false });
    if (mData) setMatches(mData);

    // Üyeleri Çek
    const { data: uData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (uData) setUsers(uData);

    // Logları Çek
    const { data: lData } = await supabase.from('access_logs').select('*').order('created_at', { ascending: false });
    if (lData) setLogs(lData);
  };

  const handleAddMatch = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('mac').insert([newMatch]);
    if (!error) {
      alert('İçerik başarıyla eklendi!');
      setNewMatch({ title: '', drive_link: '', category: 'exclusive', thumbnail_url: '', file_size: '', resolution: '1080p', fps: '50fps' });
      fetchData();
    } else {
      alert('Hata: ' + error.message);
    }
  };

  const toggleVipStatus = async (userId, currentStatus) => {
    await supabase.from('profiles').update({ is_vip: !currentStatus }).eq('id', userId);
    fetchData();
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Doğrulanıyor...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f7] font-sans selection:bg-neutral-800">
      
      {/* Üst Navigasyon - Cam Efektli */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-neutral-900 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center font-bold text-black">B</div>
          <span className="font-semibold tracking-tight">Barafella Admin Portal</span>
        </div>
        <div className="flex gap-2 bg-neutral-900/50 p-1 rounded-lg border border-neutral-800">
          {['matches', 'users', 'logs'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}
            >
              {tab === 'matches' ? 'İçerikler' : tab === 'users' ? 'Üyeler' : 'Sistem Logları'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* İÇERİK YÖNETİMİ SEKMESİ */}
        {activeTab === 'matches' && (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900">
              <h2 className="text-xl font-semibold mb-6">Yeni İçerik Ekle</h2>
              <form onSubmit={handleAddMatch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Başlık (Örn: Osimhen vs Tunisia...)" value={newMatch.title} onChange={e => setNewMatch({...newMatch, title: e.target.value})} className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-neutral-500 outline-none" />
                <input required placeholder="Google Drive Linki" value={newMatch.drive_link} onChange={e => setNewMatch({...newMatch, drive_link: e.target.value})} className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-neutral-500 outline-none" />
                <input placeholder="Fotoğraf URL (Imgur vb.)" value={newMatch.thumbnail_url} onChange={e => setNewMatch({...newMatch, thumbnail_url: e.target.value})} className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-neutral-500 outline-none" />
                <select value={newMatch.category} onChange={e => setNewMatch({...newMatch, category: e.target.value})} className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-neutral-500 outline-none appearance-none">
                  <option value="exclusive">Barafella Exclusive (Comps)</option>
                  <option value="sub">Barafella Sub (Full Feed)</option>
                </select>
                <div className="flex gap-4">
                  <input placeholder="Boyut (Örn: 2.4 GB)" value={newMatch.file_size} onChange={e => setNewMatch({...newMatch, file_size: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none" />
                  <input placeholder="Çözünürlük (1080p)" value={newMatch.resolution} onChange={e => setNewMatch({...newMatch, resolution: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none" />
                  <input placeholder="FPS (50fps)" value={newMatch.fps} onChange={e => setNewMatch({...newMatch, fps: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none" />
                </div>
                <button type="submit" className="bg-white text-black font-semibold rounded-xl px-4 py-3 hover:bg-neutral-200 transition-all">İçeriği Yayına Al</button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-900 flex gap-4 items-center">
                  <img src={m.thumbnail_url || 'https://via.placeholder.com/150'} className="w-24 h-16 object-cover rounded-lg" />
                  <div>
                    <h3 className="text-sm font-semibold">{m.title}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{m.category.toUpperCase()} • {m.file_size}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÜYE YÖNETİMİ SEKMESİ */}
        {activeTab === 'users' && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900/50 border-b border-neutral-900 text-neutral-400">
                <tr><th className="p-4">E-Posta</th><th className="p-4">Kayıt Tarihi</th><th className="p-4">Durum</th><th className="p-4 text-right">VIP Yetkisi</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-neutral-900/20">
                    <td className="p-4 text-white">{u.email}</td>
                    <td className="p-4 text-neutral-500">{new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-medium tracking-wide ${u.is_vip ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>
                        {u.is_vip ? 'VIP AKTİF' : 'BEKLİYOR'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => toggleVipStatus(u.id, u.is_vip)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${u.is_vip ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-white text-black hover:bg-neutral-200'}`}>
                        {u.is_vip ? 'Yetkiyi Al' : 'VIP Yap'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LOG SEKMESİ */}
        {activeTab === 'logs' && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900/50 border-b border-neutral-900 text-neutral-400">
                <tr><th className="p-4">Zaman</th><th className="p-4">E-Posta</th><th className="p-4">İşlem</th><th className="p-4">İçerik</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-neutral-900/20 text-neutral-300">
                    <td className="p-4 whitespace-nowrap text-xs text-neutral-500">{new Date(l.created_at).toLocaleString('tr-TR')}</td>
                    <td className="p-4 font-medium text-white">{l.user_email}</td>
                    <td className="p-4 text-emerald-400 text-xs">{l.action_detail}</td>
                    <td className="p-4">{l.match_title}</td>
                  </tr>
                ))}
                {logs.length === 0 && (<tr><td colSpan="4" className="p-8 text-center text-neutral-500">Henüz kayıt bulunmuyor.</td></tr>)}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}
