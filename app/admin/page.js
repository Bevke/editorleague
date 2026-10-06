'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const TAG_OPTIONS = ['Satfeed', '4K&1080P HDTV', 'Web-Dl', 'Upscaled', 'Champions League & Other League', 'Turkey Super League', 'Premier League', 'Serie A', 'La Liga'];

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  
  const [newMatch, setNewMatch] = useState({ 
    title: '', drive_link: '', category: 'exclusive', thumbnail_url: '', 
    file_size: '', resolution: '1080p', fps: '50fps', badge: '', tags: [], match_info: '' 
  });

  useEffect(() => { checkAdminAccess(); }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.href = '/';
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (profile?.is_admin) { setIsAdmin(true); fetchData(); } 
  };

  const fetchData = async () => {
    const { data } = await supabase.from('mac').select('*').order('created_at', { ascending: false });
    if (data) setMatches(data);
  };

  const toggleTag = (tag) => {
    setNewMatch(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const handleAddMatch = async (e) => {
    e.preventDefault();
    const matchData = { ...newMatch, tags: JSON.stringify(newMatch.tags) };
    await supabase.from('mac').insert([matchData]);
    setNewMatch({ title: '', drive_link: '', category: 'exclusive', thumbnail_url: '', file_size: '', resolution: '1080p', fps: '50fps', badge: '', tags: [], match_info: '' });
    fetchData();
  };

  const handleDeleteMatch = async (id) => {
    if (window.confirm('Emin misiniz?')) { await supabase.from('mac').delete().eq('id', id); fetchData(); }
  };

  if (!isAdmin) return <div className="min-h-screen bg-black text-white p-10">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f7] font-sans">
      <header className="p-6 border-b border-white/10 flex justify-between bg-black/50 backdrop-blur-md">
        <h1 className="font-bold text-xl text-purple-400">Barafella Admin</h1>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-neutral-900/50 p-6 rounded-2xl border border-white/5 mb-8">
          <h2 className="text-xl font-bold mb-4">Yeni İçerik</h2>
          <form onSubmit={handleAddMatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="Başlık" value={newMatch.title} onChange={e => setNewMatch({...newMatch, title: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white" />
              <input required placeholder="Drive Linki" value={newMatch.drive_link} onChange={e => setNewMatch({...newMatch, drive_link: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white" />
              <input placeholder="Fotoğraf URL" value={newMatch.thumbnail_url} onChange={e => setNewMatch({...newMatch, thumbnail_url: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white" />
              <input placeholder="Maç Bilgisi (Örn: Rams Park, 2-1)" value={newMatch.match_info} onChange={e => setNewMatch({...newMatch, match_info: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white" />
              
              <select value={newMatch.category} onChange={e => setNewMatch({...newMatch, category: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white">
                <option value="exclusive">Barafella Exclusive</option>
                <option value="sub">Barafella Subscription (Sub)</option>
              </select>
              
              <select value={newMatch.badge} onChange={e => setNewMatch({...newMatch, badge: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white">
                <option value="">-- Rozet Yok --</option>
                <option value="YENİ">YENİ</option>
                <option value="🔥 POPÜLER">🔥 POPÜLER</option>
                <option value="ÇOK İZLENDİ">ÇOK İZLENDİ</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <input placeholder="Boyut (2.4 GB)" value={newMatch.file_size} onChange={e => setNewMatch({...newMatch, file_size: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white" />
              <input placeholder="Çözünürlük (1080p)" value={newMatch.resolution} onChange={e => setNewMatch({...newMatch, resolution: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white" />
              <input placeholder="FPS (50fps)" value={newMatch.fps} onChange={e => setNewMatch({...newMatch, fps: e.target.value})} className="bg-black border border-white/10 p-3 rounded-lg text-white" />
            </div>

            <div className="p-4 bg-black/40 rounded-lg border border-white/5">
              <label className="block text-sm text-neutral-400 mb-2">Kategoriler (Çoklu Seçim)</label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map(tag => (
                  <button type="button" key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${newMatch.tags.includes(tag) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-transparent border-white/20 text-neutral-400'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold p-3 rounded-lg transition-colors">Yükle</button>
          </form>
        </div>

        <div className="space-y-2">
          {matches.map(m => (
            <div key={m.id} className="flex justify-between items-center p-4 bg-neutral-900/40 border border-white/5 rounded-lg">
              <div><span className="text-white font-bold">{m.title}</span> <span className="text-xs text-purple-400 ml-2">👁 {m.views || 0}</span></div>
              <button onClick={() => handleDeleteMatch(m.id)} className="text-red-500 text-sm hover:underline">Sil</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
