const { ChatServisClient } = require('./chat_grpc_web_pb.js');
const { MesajGonderIstek, SohbetiDinleIstek, Mesaj, Kullanici, MesajTipi } = require('./chat_pb.js');

const client = new ChatServisClient('http://localhost:8080');
const odaId = 'demo';

// Her sekme farklı bir kullanıcı — rastgele isim ata
const isimler = ['Ahmet', 'Ayşe', 'Mehmet', 'Fatma', 'Ali', 'Zeynep', 'Can', 'Elif'];
const benimAd = isimler[Math.floor(Math.random() * isimler.length)] + Math.floor(Math.random() * 90 + 10);
const benimId = 'kullanici_' + Date.now();

const kullanici = new Kullanici();
kullanici.setId(benimId);
kullanici.setAd(benimAd);
kullanici.setAvatarUrl('https://i.pravatar.cc/40');

document.getElementById('display-name').textContent = benimAd;

const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');

function simdiSaat() {
  const d = new Date();
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

function appendMessage(msg) {
  if (msg.getTip() === MesajTipi.SISTEM) {
    const el = document.createElement('div');
    el.className = 'system-msg';
    el.textContent = msg.getIcerik();
    messagesDiv.appendChild(el);
  } else {
    const benimMi = msg.getKullanici().getId() === benimId;
    const wrapper = document.createElement('div');
    wrapper.className = 'bubble-wrapper ' + (benimMi ? 'mine' : 'other');

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (!benimMi) {
      const senderEl = document.createElement('div');
      senderEl.className = 'sender-name';
      senderEl.textContent = msg.getKullanici().getAd();
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
  input.value = '';
}

sendBtn.onclick = mesajGonder;
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') mesajGonder();
});

startStream();
