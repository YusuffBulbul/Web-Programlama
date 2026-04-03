const { ChatServisClient } = require('./chat_grpc_web_pb.js');
const { MesajGonderIstek, SohbetiDinleIstek, Mesaj, Kullanici, MesajTipi, YaziyorDurumuIstek } = require('./chat_pb.js');

const AVATARLAR = ['🦓', '🦒', '🦁', '🐘', '🐯'];
let seciliAvatar = AVATARLAR[0];

const avatarRow = document.getElementById('avatar-row');
AVATARLAR.forEach((emoji, i) => {
  const btn = document.createElement('div');
  btn.className = 'avatar-option' + (i === 0 ? ' selected' : '');
  btn.textContent = emoji;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    seciliAvatar = emoji;
  });
  avatarRow.appendChild(btn);
});

const RENKLER = [
  '#e74c3c', '#8e44ad', '#2980b9',
  '#16a085', '#d35400', '#f0a500', '#27ae60',
];

let seciliRenk = RENKLER[0];

const colorRow = document.getElementById('color-row');
RENKLER.forEach((renk, i) => {
  const btn = document.createElement('div');
  btn.className = 'color-option' + (i === 0 ? ' selected' : '');
  btn.style.background = renk;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    seciliRenk = renk;
  });
  colorRow.appendChild(btn);
});

document.getElementById('login-btn').addEventListener('click', () => {
  const ad = document.getElementById('ln-name').value.trim();
  if (!ad) { alert('Lütfen bir kullanıcı adı gir.'); return; }

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('display-name').textContent = ad;
  document.getElementById('header-user-avatar').textContent = seciliAvatar;

  baslatChat(ad, seciliAvatar, seciliRenk);
});


function baslatChat(ad, avatarUrl, renk) {
  const client = new ChatServisClient('http://localhost:8080');
  const odaId = 'demo';
  const benimId = 'kullanici_' + Date.now();

  const kullanici = new Kullanici();
  kullanici.setId(benimId);
  kullanici.setAd(ad);
  kullanici.setAvatarUrl(avatarUrl);

  kullanici.setId(benimId + '|' + renk);

  const messagesDiv = document.getElementById('messages');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send');
  const typingDiv = document.getElementById('typing-indicator');

  const yaziyorlar = {};

  function yaziyorGuncelle() {
    const isimler = Object.values(yaziyorlar);
    if (isimler.length === 0) {
      typingDiv.textContent = '';
    } else {
      typingDiv.textContent = isimler.join(', ') + ' yazıyor...';
    }
  }

  let yaziyorTimeout = null;

  function simdiSaat() {
    const d = new Date();
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

  function appendMessage(msg) {
    if (msg.getTip() === MesajTipi.YAZIYOR) {
      const gonderen = msg.getKullanici();
      if (gonderen.getId() === kullanici.getId()) return;
      if (msg.getIcerik() === '1') {
        yaziyorlar[gonderen.getId()] = gonderen.getAd();
      } else {
        delete yaziyorlar[gonderen.getId()];
      }
      yaziyorGuncelle();
      return;
    }

    if (msg.getTip() === MesajTipi.SISTEM) {
      const el = document.createElement('div');
      el.className = 'system-msg';
      el.textContent = msg.getIcerik();
      messagesDiv.appendChild(el);
    } else {
      const gonderen = msg.getKullanici();
      const gonderenIdFull = gonderen.getId();
      const benimMi = gonderenIdFull === kullanici.getId();

      // id'den rengi çıkar
      const parcalar = gonderenIdFull.split('|');
      const gonderenRenk = parcalar[1] || '#cccccc';

      const wrapper = document.createElement('div');
      wrapper.className = 'bubble-wrapper ' + (benimMi ? 'mine' : 'other');

      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      if (!benimMi) {
        // Karşı tarafın seçtiği renk arka plan olur
        bubble.style.background = gonderenRenk;
        bubble.style.color = renkMetniRengi(gonderenRenk);

        const senderEl = document.createElement('div');
        senderEl.className = 'sender-name';

        const avatarEl = document.createElement('span');
        avatarEl.className = 'sender-avatar-emoji';
        avatarEl.textContent = gonderen.getAvatarUrl();

        const nameText = document.createTextNode(gonderen.getAd());
        senderEl.appendChild(avatarEl);
        senderEl.appendChild(nameText);
        bubble.appendChild(senderEl);
      }

      const textEl = document.createElement('div');
      textEl.textContent = msg.getIcerik();
      bubble.appendChild(textEl);

      const timeEl = document.createElement('div');
      timeEl.className = 'time';
      timeEl.textContent = simdiSaat();
      bubble.appendChild(timeEl);

      wrapper.appendChild(bubble);
      messagesDiv.appendChild(wrapper);
    }

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Koyu renkte beyaz, açık renkte siyah metin
  function renkMetniRengi(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const parlaklik = (r * 299 + g * 587 + b * 114) / 1000;
    return parlaklik > 128 ? '#000' : '#fff';
  }

  function startStream() {
    const req = new SohbetiDinleIstek();
    req.setOdaId(odaId);
    const stream = client.sohbetiDinle(req, {});
    stream.on('data', appendMessage);
    stream.on('error', (err) => console.error('Stream error:', err));
  }

  function mesajGonder() {
    const text = input.value.trim();
    if (!text) return;
    const msg = new Mesaj();
    msg.setId('msg_' + Date.now());
    msg.setKullanici(kullanici);
    msg.setIcerik(text);
    msg.setTip(MesajTipi.METIN);
    const req = new MesajGonderIstek();
    req.setMesaj(msg);
    client.mesajGonder(req, {}, (err) => {
      if (err) console.error('Send error:', err);
    });
    if (yaziyorTimeout) clearTimeout(yaziyorTimeout);
    yaziyorGonder(false);
    input.value = '';
  }

  sendBtn.onclick = mesajGonder;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') mesajGonder();
  });

  function yaziyorGonder(durum) {
    const req = new YaziyorDurumuIstek();
    req.setOdaId(odaId);
    req.setKullanici(kullanici);
    req.setYaziyor(durum);
    client.yaziyorDurumuGuncelle(req, {}, () => {});
  }

  input.addEventListener('input', () => {
    if (yaziyorTimeout) clearTimeout(yaziyorTimeout);
    yaziyorGonder(true);
    yaziyorTimeout = setTimeout(() => yaziyorGonder(false), 2000);
  });

  startStream();
}
