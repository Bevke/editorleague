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
  const [activeTab, setActiveTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newMatch, setNewMatch] = useState({ title: '', drive_link: '', category: 'exclusive', thumbnail_url: '', file_size: '', resolution: '1080p', fps: '50fps' });

  useEffect(() => { checkAdminAccess(); }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.href = '/';
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (profile?.is_admin) { setIsAdmin(true); fetchData(); } 
    else { window.location.href = '/'; }
    setLoading(false);
  };

  const fetchData = async () => {
    const { data: mData } = await supabase.from('mac').select('*').order('created_at', { ascending: false });
    if (mData) setMatches(mData);
    const { data: uData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (uData) setUsers(uData);
    const { data: lData } = await supabase.from('access_logs').select('*').order('created_at', { ascending: false });
    if (lData) setLogs(lData);
  };

  const handleAddMatch = async (e) => {
    e.preventDefault();
    await supabase.from('mac').insert([newMatch]);
    setNewMatch({ title: '', drive_link: '', category: 'exclusive', thumbnail_url: '', file_size: '', resolution: '1080p', fps: '50fps' });
    fetchData();
  };

  // YENİ EKLENEN SİLME FONKSİYONU
  const handleDeleteMatch = async (id) => {
    if (window.confirm('Bu içeriği silmek istediğinize emin misiniz?')) {
      await supabase.from('mac').delete().eq('id', id);
      fetchData();
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
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-neutral-900 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center font-bold text-black">B</div>
          <span className="font-semibold tracking-tight">Admin Portal</span>
        </div>
        <div className="flex gap-2 bg-neutral-900/50 p-1 rounded-lg border border-neutral-800">
          {['matches', 'users', 'logs'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>
              {tab === 'matches' ? 'İçerikler' : tab === 'users' ? 'Üyeler' : 'Loglar'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {activeTab === 'matches' && (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900">
              <h2 className="text-xl font-semibold mb-6">Yeni İçerik Ekle</h2>
              <form onSubmit={handleAddMatch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Başlık" value={newMatch.title} onChange={e => setNewMatch({...newMatch, title: e.target.value})} className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-neutral-500 outline-none text-white" />
                <input required placeholder="Google Drive Linki" value={newMatch.drive_link} onChange={e => setNewMatch({...newMatch, drive_link: e.target.value})} className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-neutral-500 outline-none text-white" />
                <input placeholder="Fotoğraf URL (Imgur vb.)" value={newMatch.thumbnail_url} onChange={e => setNewMatch({...newMatch, thumbnail_url: e.target.value})} className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-neutral-500 outline-none text-white" />
                <select value={newMatch.category} onChange={e => setNewMatch({...newMatch, category: e.target.value})} className="bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-neutral-500 outline-none text-white">
                  <option value="exclusive">Barafella Exclusive (Comps)</option>
                  <option value="sub">Barafella Sub (Full Feed)</option>
                </select>
                <div className="flex gap-4">
                  <input placeholder="Boyut (Örn: 2.4 GB)" value={newMatch.file_size} onChange={e => setNewMatch({...newMatch, file_size: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none text-white" />
                  <input placeholder="Çözünürlük (1080p)" value={newMatch.resolution} onChange={e => setNewMatch({...newMatch, resolution: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none text-white" />
                  <input placeholder="FPS (50fps)" value={newMatch.fps} onChange={e => setNewMatch({...newMatch, fps: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none text-white" />
                </div>
                <button type="submit" className="bg-white text-black font-semibold rounded-xl px-4 py-3 hover:bg-neutral-200 transition-all">İçeriği Yayına Al</button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-900 flex justify-between items-center group">
                  <div className="flex gap-4 items-center">
                    <img src={m.thumbnail_url || 'https://via.placeholder.com/150'} className="w-20 h-14 object-cover rounded-lg border border-neutral-800" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                      <p className="text-xs text-neutral-500 mt-1">{m.category.toUpperCase()} • {m.file_size}</p>
                    </div>
                  </div>
                  {/* SİL BUTONU */}
                  <button onClick={() => handleDeleteMatch(m.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-semibold opacity-0 group-hover:opacity-100">
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Üyeler ve Loglar aynı */}
        {activeTab === 'users' && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4">
             {users.map(u => (
                <div key={u.id} className="flex justify-between items-center p-3 border-b border-neutral-900">
                  <span className="text-sm text-white">{u.email}</span>
                  <button onClick={() => toggleVipStatus(u.id, u.is_vip)} className={`px-4 py-1.5 rounded-lg text-xs font-medium ${u.is_vip ? 'bg-red-500/10 text-red-500' : 'bg-white text-black'}`}>
                    {u.is_vip ? 'Yetkiyi Al' : 'VIP Yap'}
                  </button>
                </div>
             ))}
          </div>
        )}
        {activeTab === 'logs' && (
           <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 space-y-2">
             {logs.map(l => (
               <div key={l.id} className="text-xs text-neutral-400 p-2 border-b border-neutral-900">
                 <span className="text-emerald-400">[{new Date(l.created_at).toLocaleString('tr-TR')}]</span> {l.user_email} yetki aldı: <span className="text-white">{l.match_title}</span>
               </div>
             ))}
           </div>
        )}
      </main>
    </div>
  );
}
