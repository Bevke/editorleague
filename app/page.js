'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userToken, setUserToken] = useState(null);
  const [matchLink, setMatchLink] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Giriş Yapma Fonksiyonu
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg('Giriş başarısız: ' + error.message);
    } else {
      setUserToken(data.session.access_token);
    }
  };

  // Kayıt Olma Fonksiyonu
  const handleSignUp = async () => {
    setErrorMsg('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setErrorMsg('Kayıt hatası: ' + error.message);
    else alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
  };

  // Gizli Backend'den Maç Linkini İsteme
  const fetchMatchLink = async () => {
    setErrorMsg('');
    const res = await fetch('/api/get-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: 1, userToken }) // id: 1 olan Galatasaray - Fenerbahçe maçı
    });
    const data = await res.json();
    if (res.ok) {
      setMatchLink(data.drive_link);
    } else {
      setErrorMsg(data.error);
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <h1>⚽ Canlı Maç Yayın Paneli</h1>

      {!userToken ? (
        <form onSubmit={handleLogin} style={{ maxWidth: '300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3>Üye Girişi / Kayıt</h3>
          <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '10px' }} />
          <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '10px' }} />
          <button type="submit" style={{ padding: '10px', background: '#e50914', color: '#fff', border: 'none', cursor: 'pointer' }}>Giriş Yap</button>
          <button type="button" onClick={handleSignUp} style={{ padding: '8px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}>Kayıt Ol</button>
        </form>
      ) : (
        <div>
          <p style={{ color: '#4caf50' }}>Giriş Yapıldı!</p>
          <button onClick={fetchMatchLink} style={{ padding: '12px 24px', fontSize: '16px', background: '#2196f3', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
            Maç Linkini Getir
          </button>

          {matchLink && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#1e1e1e', borderRadius: '8px' }}>
              <p>Maç Erişim Linkiniz:</p>
              <a href={matchLink} target="_blank" rel="noreferrer" style={{ color: '#00bcd4', fontSize: '18px' }}>Maçı İzlemek İçin Tıklayın (Drive)</a>
            </div>
          )}
        </div>
      )}

      {errorMsg && <p style={{ color: 'red', marginTop: '20px' }}>{errorMsg}</p>}
    </div>
  );
}
