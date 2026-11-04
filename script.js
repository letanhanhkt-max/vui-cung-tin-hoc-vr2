/*************************************************************************
 * 0. KHỞI TẠO HÀM MỞ MÀN HÌNH TỨC THÌ & LƯU TRỮ AN TOÀN
 *************************************************************************/
window.startApp = function(initialMode) {
  var mode = initialMode || 'explore';
  var modal = document.getElementById('start-modal');
  if (modal) {
    modal.classList.add('closed');
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.pointerEvents = 'none';
  }
  if (typeof window.switchMode === 'function') {
    window.switchMode(mode);
  } else {
    window.__pendingStartMode = mode;
  }
};

window.goHomeModal = function() {
  if (typeof sfx !== 'undefined' && sfx) sfx.click();
  var modal = document.getElementById('start-modal');
  if (modal) {
    modal.classList.remove('closed');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
  }
};

function safeLoadBadges() {
  const defaultBadges = {
    posture: false,
    distance: false,
    lighting: false,
    eyeRelaxGame: false,
    rest: false,
    mouse: false
  };
  try {
    const raw = window.localStorage.getItem('vr_tinhoc_badges_v8');
    return raw ? Object.assign(defaultBadges, JSON.parse(raw)) : defaultBadges;
  } catch (e) {
    return defaultBadges;
  }
}

function safeSaveBadges(badgesObj) {
  try {
    window.localStorage.setItem('vr_tinhoc_badges_v8', JSON.stringify(badgesObj));
  } catch (e) {}
}

function spawnClickBurst(clientX, clientY, symbol) {
  const x = (clientX !== undefined && clientX > 0) ? clientX : window.innerWidth / 2;
  const y = (clientY !== undefined && clientY > 0) ? clientY : window.innerHeight / 2;
  const el = document.createElement('div');
  el.className = 'click-burst';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.innerText = symbol || '✨';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

function bindInstantAction(element, callback) {
  if (!element) return;
  let lastTriggerTime = 0;
  const execute = (ev) => {
    const now = performance.now();
    if (now - lastTriggerTime < 220) return;
    lastTriggerTime = now;
    if (ev) ev.stopPropagation();
    callback(ev);
  };
  element.addEventListener('pointerdown', execute);
  element.addEventListener('click', execute);
}

/*************************************************************************
 * 1. BỘ GIỌNG NÓI THẦY GIÁO NGƯỜI ĐÀ NẴNG ẤM ÁP, NHẸ NHÀNG
 *************************************************************************/
class DaNangTeacherVoiceEngine {
  constructor() {
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.ctx = null;
    this.selectedVoice = null;
    this.viVoices = [];
    this.speakTimer = null;
    this.lastText = "Thầy chào các con nghe! Hôm ni thầy trò mình cùng khám phá phòng máy tính, rèn tư thế ngồi thẳng lưng, đủ ánh sáng và giữ đôi mắt sáng khỏe nhé!";
    this.initVoiceList();
  }

  initVoiceList() {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      try {
        const allVoices = window.speechSynthesis.getVoices() || [];
        this.viVoices = allVoices.filter(v =>
          (v.lang && v.lang.toLowerCase().indexOf('vi') !== -1) ||
          /viet|namminh|hoaimy|linh|an/i.test(v.name || '')
        );

        const selectEl = document.getElementById('voice-selector');
        if (selectEl) {
          selectEl.innerHTML = '';
          if (this.viVoices.length === 0) {
            const opt = document.createElement('option');
            opt.value = '-1';
            opt.textContent = 'Giọng Thầy Đà Nẵng (Trầm ấm mặc định)';
            selectEl.appendChild(opt);
          } else {
            let bestIdx = this.viVoices.findIndex(v => /namminh|male|nam|minh|an/i.test(v.name));
            if (bestIdx === -1) {
              bestIdx = this.viVoices.findIndex(v => /natural|online|google/i.test(v.name));
            }
            if (bestIdx === -1) bestIdx = 0;

            this.selectedVoice = this.viVoices[bestIdx];
            this.viVoices.forEach((v, idx) => {
              const opt = document.createElement('option');
              opt.value = String(idx);
              opt.textContent = v.name.replace(/Microsoft |Online \(Natural\) - /g, '');
              if (idx === bestIdx) opt.selected = true;
              selectEl.appendChild(opt);
            });
          }
        }
      } catch (e) {}
    };
    loadVoices();
    try {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } catch (e) {}
  }

  initAudio() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
  }

  playTone(freq, duration, type, delay, vol) {
    if (!this.soundEnabled) return;
    this.initAudio();
    if (!this.ctx) return;
    const d = duration || 0.12;
    const t = type || 'sine';
    const dl = delay || 0;
    const v = vol || 0.14;
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = t;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(v, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.003, this.ctx.currentTime + d);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + d);
      } catch (e) {}
    }, dl);
  }

  click() { this.playTone(640, 0.055, 'sine', 0, 0.14); }
  lightSwitch() { this.playTone(440, 0.07, 'triangle', 0, 0.15); }
  correct() {
    this.playTone(523.25, 0.12, 'sine', 0, 0.16);
    this.playTone(659.25, 0.12, 'sine', 105, 0.16);
    this.playTone(783.99, 0.24, 'sine', 210, 0.16);
  }
  wrong() {
    this.playTone(310, 0.15, 'triangle', 0, 0.15);
    this.playTone(250, 0.22, 'triangle', 140, 0.15);
  }
  fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.playTone(f, 0.22, 'sine', i * 125, 0.16));
  }

  speak(text) {
    this.lastText = text;
    const avatarEl = document.getElementById('teacher-avatar');
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;

    clearTimeout(this.speakTimer);
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    this.speakTimer = setTimeout(() => {
      try {
        const cleanText = text
          .replace(/[✓✗⚠🎉🏆💡🪑👀⏰🖱🟢🔵🟠🟣🌿🙆🚶💧📏🎯🏠🔎♾️➕🔄👉✨]/g, '')
          .replace(/\bcm\b/g, 'xăng ti mét')
          .replace(/\b30p\b/gi, 'ba mươi phút')
          .replace(/\b3D\b/gi, 'ba đê')
          .replace(/\bVR\b/gi, 'thực tế ảo');

        const matched = cleanText.match(/[^.!?]+[.!?]*/g);
        const sentences = matched ? matched.map(s => s.trim()).filter(s => s.length > 0) : [cleanText];
        const isNaturalMale = this.selectedVoice && /namminh|male|nam|minh/i.test(this.selectedVoice.name);

        sentences.forEach((sentence, idx) => {
          const utter = new SpeechSynthesisUtterance(sentence);
          utter.lang = 'vi-VN';
          if (this.selectedVoice) utter.voice = this.selectedVoice;
          utter.pitch = isNaturalMale ? 0.94 : 0.83;
          utter.rate = 0.92;
          utter.volume = 1.0;

          if (idx === 0 && avatarEl) {
            utter.onstart = () => avatarEl.classList.add('speaking');
          }
          if (idx === sentences.length - 1 && avatarEl) {
            utter.onend = () => avatarEl.classList.remove('speaking');
            utter.onerror = () => avatarEl.classList.remove('speaking');
          }
          window.speechSynthesis.speak(utter);
        });
      } catch (err) {
        if (avatarEl) avatarEl.classList.remove('speaking');
      }
    }, 65);
  }
}

const sfx = new DaNangTeacherVoiceEngine();

/*************************************************************************
 * 2. TRẠNG THÁI CHƯƠNG TRÌNH TOÀN CỤC
 *************************************************************************/
const state = {
  mode: 'explore',
  autoRotateExplore: false,
  assistantVisible: true,
  vrActive: false,
  distanceCm: 65,
  postureType: 'good',
  ceilingLightOn: true,
  windowBlindsOpen: true,
  directGlare: false,
  timerSeconds: 0,
  timerRunning: false,
  restCountdown: 20,
  quizScore: 0,
  quizIndex: 0,
  mouseGameScore: 0,
  mouseTargetPart: 'left',
  eyeGamePattern: 'infinity',
  eyeDotSizeMode: 'small',
  eyeBallSpeed: 1.05,
  eyeGameScore: 0,
  popupTargetMode: 'posture',
  targetStudentZ: -0.23,
  targetSpineRotX: 0,
  targetSpineRotZ: 0,
  targetHeadRotX: 0,
  targetHeadRotZ: 0,
  targetLeftLegRotX: 0,
  targetRightLegRotX: 0,
  badges: safeLoadBadges()
};

function saveBadges() {
  safeSaveBadges(state.badges);
}

/*************************************************************************
 * 3. KHỞI TẠO KHÔNG GIAN 3D THREE.JS
 *************************************************************************/
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.62, 2.25);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

let lon = -90, lat = -7;
let targetLon = -90, targetLat = -7;
let isPointerDown = false, startX = 0, startY = 0, startLon = 0, startLat = 0;
let pointerDownTime = 0;
let cameraTargetPos = new THREE.Vector3(0, 1.62, 2.25);
let cameraLookOverride = null;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.66);
scene.add(ambientLight);

const ceilingPointLight = new THREE.PointLight(0xfffbeb, 0.88, 18);
ceilingPointLight.position.set(0, 3.6, 0);
scene.add(ceilingPointLight);

const sunDirLight = new THREE.DirectionalLight(0xffffff, 0.62);
sunDirLight.position.set(-6, 4.2, -2);
scene.add(sunDirLight);

const interactables = [];

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function createTextSprite(text, bgColor, textColor, width, height, fontSize) {
  const w = width || 340;
  const h = height || 80;
  const fs = fontSize || 26;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor || '#0288d1';
  drawRoundedRect(ctx, 4, 4, w - 8, h - 8, 18);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = textColor || '#ffffff';
  ctx.font = 'bold ' + fs + 'px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(w / 260, h / 260, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  sprite.userData.texture = texture;
  return sprite;
}

function updateTextSprite(sprite, text, bgColor, textColor, fontSize) {
  const canvas = sprite.userData.canvas;
  const ctx = sprite.userData.ctx;
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = bgColor || '#16a34a';
  drawRoundedRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 18);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = textColor || '#ffffff';
  ctx.font = 'bold ' + (fontSize || 25) + 'px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  sprite.userData.texture.needsUpdate = true;
}

/*************************************************************************
 * 4. DỰNG PHÒNG HỌC TIN HỌC TIỂU HỌC VIỆT NAM
 *************************************************************************/
const roomGroup = new THREE.Group();
scene.add(roomGroup);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }));
floor.rotation.x = -Math.PI / 2;
roomGroup.add(floor);

const wallMat = new THREE.MeshLambertMaterial({ color: 0xfef9c3 });
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.2), wallMat);
backWall.position.set(0, 2.1, -4.5);
roomGroup.add(backWall);

const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.2), wallMat);
frontWall.position.set(0, 2.1, 4.5);
frontWall.rotation.y = Math.PI;
roomGroup.add(frontWall);

const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.2), wallMat);
rightWall.position.set(6, 2.1, 0);
rightWall.rotation.y = -Math.PI / 2;
roomGroup.add(rightWall);

const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 9), wallMat);
leftWallTop.position.set(-6, 3.7, 0);
roomGroup.add(leftWallTop);
const leftWallBot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 9), wallMat);
leftWallBot.position.set(-6, 0.55, 0);
roomGroup.add(leftWallBot);

const windowBlind = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 2.1, 4.2),
  new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
);
windowBlind.position.set(-5.9, 2.15, -0.5);
windowBlind.visible = false;
roomGroup.add(windowBlind);

const windowClickZone = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 2.2, 4.2),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
);
windowClickZone.position.set(-5.8, 2.15, -0.5);
windowClickZone.userData = { type: 'hotspot', hotspotIndex: 4 };
roomGroup.add(windowClickZone);
interactables.push(windowClickZone);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
ceiling.position.set(0, 4.2, 0);
ceiling.rotation.x = Math.PI / 2;
roomGroup.add(ceiling);

const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
const ceilingLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 24), lampBulbMat);
ceilingLamp.position.set(0, 4.12, 0);
ceilingLamp.userData = { type: 'hotspot', hotspotIndex: 2 };
roomGroup.add(ceilingLamp);
interactables.push(ceilingLamp);

const boardGroup = new THREE.Group();
const greenBoard = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.5, 0.08), new THREE.MeshLambertMaterial({ color: 0x14532d }));
boardGroup.add(greenBoard);
const boardTitle = createTextSprite('VUI HỌC TIN HỌC – SỬ DỤNG MÁY TÍNH AN TOÀN', '#14532d', '#fef08a', 680, 90, 27);
boardTitle.position.set(0, 0.25, 0.08);
boardGroup.add(boardTitle);
const boardSub = createTextSprite('Ngồi thẳng lưng • Mắt cách 50-80 cm • Đủ ánh sáng • Nghỉ ngơi hợp lý', '#14532d', '#ffffff', 680, 75, 21);
boardSub.position.set(0, -0.25, 0.08);
boardGroup.add(boardSub);
boardGroup.position.set(0, 2.4, -4.42);
roomGroup.add(boardGroup);

const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24), new THREE.MeshLambertMaterial({ color: 0xffffff }));
clockFace.rotation.x = Math.PI / 2;
clockFace.position.set(3.3, 3.1, -4.40);
clockFace.userData = { type: 'hotspot', hotspotIndex: 3 };
roomGroup.add(clockFace);
interactables.push(clockFace);

const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.45), new THREE.MeshLambertMaterial({ color: 0x8d6e63 }));
shelf.position.set(4.8, 1.1, -3.9);
roomGroup.add(shelf);

function createPlant(x, z) {
  const pGroup = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.4, 14), new THREE.MeshLambertMaterial({ color: 0xd97706 }));
  pot.position.y = 0.2;
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 14), new THREE.MeshLambertMaterial({ color: 0x22c55e }));
  leaves.position.y = 0.65;
  pGroup.add(pot, leaves);
  pGroup.position.set(x, 0, z);
  roomGroup.add(pGroup);
}
createPlant(-4.8, -3.8);
createPlant(4.8, 2.8);

const outdoorGroup = new THREE.Group();
scene.add(outdoorGroup);
const schoolYard = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshLambertMaterial({ color: 0x86efac }));
schoolYard.rotation.x = -Math.PI / 2;
schoolYard.position.set(-18, -0.1, 0);
outdoorGroup.add(schoolYard);

for (let i = 0; i < 4; i++) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 10), new THREE.MeshLambertMaterial({ color: 0x78350f }));
  trunk.position.y = 1.1;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 14), new THREE.MeshLambertMaterial({ color: 0x16a34a }));
  crown.position.y = 2.8;
  tree.add(trunk, crown);
  tree.position.set(-11 - (i % 2) * 3, 0, -4 + i * 2.8);
  outdoorGroup.add(tree);
}

const clouds = [];
for (let i = 0; i < 3; i++) {
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  cloud.scale.set(2.2, 0.8, 1.2);
  cloud.position.set(-14, 4.5 + (i % 2) * 0.6, -5 + i * 4);
  outdoorGroup.add(cloud);
  clouds.push(cloud);
}

const birds = [];
for (let i = 0; i < 3; i++) {
  const bird = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
  bird.rotation.z = Math.PI / 2;
  bird.position.set(-10, 3.2 + i * 0.4, -3 + i * 2);
  outdoorGroup.add(bird);
  birds.push(bird);
}

/*************************************************************************
 * 5. BÀN MÁY TÍNH, ĐIỂM TRÒN NHỎ LUYỆN MẮT & MÔ HÌNH HỌC SINH + KHĂN QUÀNG ĐỎ
 *************************************************************************/
const mainDeskGroup = new THREE.Group();
scene.add(mainDeskGroup);

const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.85), new THREE.MeshLambertMaterial({ color: 0xd97706 }));
deskTop.position.set(0, 0.75, -0.7);
mainDeskGroup.add(deskTop);

[[-0.75, -1.0], [0.75, -1.0], [-0.75, -0.4], [0.75, -0.4]].forEach(([x, z]) => {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 12), new THREE.MeshLambertMaterial({ color: 0x475569 }));
  leg.position.set(x, 0.375, z);
  mainDeskGroup.add(leg);
});

const pcCase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.45), new THREE.MeshLambertMaterial({ color: 0x334155 }));
pcCase.position.set(-0.58, 1.02, -0.72);
pcCase.userData = { type: 'hotspot', hotspotIndex: 0 };
mainDeskGroup.add(pcCase);
interactables.push(pcCase);

const monitorGroup = new THREE.Group();
const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.54, 0.04), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
monitorFrame.userData = { type: 'hotspot', hotspotIndex: 0 };
interactables.push(monitorFrame);

const monitorScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.48), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
monitorScreen.position.z = 0.022;

const wallpaperPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.45), new THREE.MeshBasicMaterial({ color: 0x0288d1 }));
wallpaperPlane.position.z = 0.023;
wallpaperPlane.userData = { type: 'hotspot', hotspotIndex: 0 };
interactables.push(wallpaperPlane);

const glareMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
const screenGlare = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), glareMat);
screenGlare.position.set(-0.1, 0.05, 0.027);

const monitorStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 12), new THREE.MeshLambertMaterial({ color: 0x475569 }));
monitorStand.position.y = -0.31;
monitorGroup.add(monitorFrame, monitorScreen, wallpaperPlane, screenGlare, monitorStand);
monitorGroup.position.set(0, 1.12, -0.88);
mainDeskGroup.add(monitorGroup);

const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.16), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
keyboard.position.set(0, 0.79, -0.52);
mainDeskGroup.add(keyboard);

const smallMouse = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.12), new THREE.MeshLambertMaterial({ color: 0x0288d1 }));
smallMouse.position.set(0.35, 0.79, -0.52);
smallMouse.userData = { type: 'hotspot', hotspotIndex: 5 };
mainDeskGroup.add(smallMouse);
interactables.push(smallMouse);

// ĐIỂM TRÒN NHỎ THƯ GIÃN MẮT
const eyeBallGroup = new THREE.Group();
const eyeBallMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.018, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0x00e676 })
);
const eyeBallCenterDot = new THREE.Mesh(
  new THREE.SphereGeometry(0.006, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
eyeBallCenterDot.position.z = 0.014;
const eyeBallHalo = new THREE.Mesh(
  new THREE.RingGeometry(0.022, 0.028, 24),
  new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
);
const eyeBallHitbox = new THREE.Mesh(
  new THREE.SphereGeometry(0.065, 12, 12),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
);
eyeBallHitbox.userData = { type: 'eyeBallTarget' };
eyeBallMesh.userData = { type: 'eyeBallTarget' };
interactables.push(eyeBallHitbox, eyeBallMesh);

eyeBallGroup.add(eyeBallMesh, eyeBallCenterDot, eyeBallHalo, eyeBallHitbox);
eyeBallGroup.position.set(0, 1.12, -0.845);
eyeBallGroup.visible = false;
scene.add(eyeBallGroup);

// MÔ HÌNH HỌC SINH TIỂU HỌC & KHĂN QUÀNG ĐỎ ĐỘI VIÊN 3D
function createOptimizedStudentAndRedScarf() {
  const root = new THREE.Group();

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.44), new THREE.MeshLambertMaterial({ color: 0x0288d1 }));
  seat.position.set(0, 0.44, 0);
  const backRest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.05), new THREE.MeshLambertMaterial({ color: 0x0288d1 }));
  backRest.position.set(0, 0.71, 0.2);
  const chairPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 14), new THREE.MeshLambertMaterial({ color: 0x475569 }));
  chairPillar.position.set(0, 0.22, 0);
  const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 16), new THREE.MeshLambertMaterial({ color: 0x334155 }));
  chairBase.position.set(0, 0.015, 0);
  root.add(seat, backRest, chairPillar, chairBase);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const studentHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.25, 0.55),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
  );
  studentHitbox.position.set(0, 0.65, 0);
  studentHitbox.userData = { type: 'hotspot', hotspotIndex: 1 };
  root.add(studentHitbox);
  interactables.push(studentHitbox);

  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd4b8 });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const collarMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
  const scarfRedMat = new THREE.MeshLambertMaterial({ color: 0xe11d48 });
  const scarfKnotMat = new THREE.MeshLambertMaterial({ color: 0xbe123c });
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.135, 0.13, 16), pantsMat);
  pelvis.scale.set(1.1, 1, 0.85);
  pelvis.position.set(0, 0.49, 0.02);
  bodyGroup.add(pelvis);

  function createLeg(isLeft) {
    const xDir = isLeft ? -0.095 : 0.095;
    const hipJoint = new THREE.Group();
    hipJoint.position.set(xDir, 0.48, 0.02);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.27, 14), pantsMat);
    thigh.rotation.x = Math.PI / 2;
    thigh.position.set(0, 0, -0.125);
    hipJoint.add(thigh);

    const kneeJoint = new THREE.Group();
    kneeJoint.position.set(0, 0, -0.245);
    hipJoint.add(kneeJoint);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), skinMat);
    kneeJoint.add(kneeCap);

    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.036, 0.38, 14), skinMat);
    calf.position.set(0, -0.20, 0);
    kneeJoint.add(calf);

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.10, 12), shirtMat);
    sock.position.set(0, -0.37, 0);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.06, 0.19), shoeMat);
    shoe.position.set(0, -0.43, -0.035);
    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.018, 0.195), shirtMat);
    shoeSole.position.set(0, -0.455, -0.035);
    kneeJoint.add(sock, shoe, shoeSole);

    return { hipJoint, kneeJoint };
  }

  const leftLegRig = createLeg(true);
  const rightLegRig = createLeg(false);
  bodyGroup.add(leftLegRig.hipJoint, rightLegRig.hipJoint);

  const spinePivot = new THREE.Group();
  spinePivot.position.set(0, 0.52, 0.02);
  bodyGroup.add(spinePivot);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.138, 0.44, 18), shirtMat);
  torso.scale.set(1.16, 1, 0.78);
  torso.position.set(0, 0.22, 0);
  spinePivot.add(torso);

  const shoulderBar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.38, 14), shirtMat);
  shoulderBar.rotation.z = Math.PI / 2;
  shoulderBar.position.set(0, 0.40, 0);
  spinePivot.add(shoulderBar);

  const shirtCollar = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.018, 10, 20), collarMat);
  shirtCollar.rotation.x = Math.PI / 2 + 0.08;
  shirtCollar.position.set(0, 0.435, -0.005);
  spinePivot.add(shirtCollar);

  const redScarfGroup = new THREE.Group();
  const scarfNeckRing = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.019, 12, 24), scarfRedMat);
  scarfNeckRing.rotation.x = Math.PI / 2 + 0.15;
  scarfNeckRing.scale.set(1.08, 1.15, 1);
  scarfNeckRing.position.set(0, 0.415, -0.01);
  redScarfGroup.add(scarfNeckRing);

  const scarfBackTriangle = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 3), scarfRedMat);
  scarfBackTriangle.rotation.x = Math.PI;
  scarfBackTriangle.rotation.y = Math.PI;
  scarfBackTriangle.scale.set(1.2, 1, 0.15);
  scarfBackTriangle.position.set(0, 0.31, 0.115);
  redScarfGroup.add(scarfBackTriangle);

  const scarfKnot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 14), scarfKnotMat);
  scarfKnot.scale.set(1.1, 1.15, 0.85);
  scarfKnot.position.set(0, 0.365, -0.118);
  redScarfGroup.add(scarfKnot);

  const tailGeo = new THREE.ConeGeometry(0.042, 0.22, 4);
  const leftTail = new THREE.Mesh(tailGeo, scarfRedMat);
  leftTail.rotation.x = Math.PI - 0.08;
  leftTail.rotation.z = -0.14;
  leftTail.scale.set(1.1, 1, 0.22);
  leftTail.position.set(-0.026, 0.255, -0.126);

  const rightTail = new THREE.Mesh(tailGeo, scarfRedMat);
  rightTail.rotation.x = Math.PI - 0.06;
  rightTail.rotation.z = 0.14;
  rightTail.scale.set(1.1, 0.95, 0.22);
  rightTail.position.set(0.026, 0.26, -0.123);

  redScarfGroup.add(leftTail, rightTail);
  spinePivot.add(redScarfGroup);

  function createArm(isLeft) {
    const xSide = isLeft ? -0.195 : 0.195;
    const shoulderJoint = new THREE.Group();
    shoulderJoint.position.set(xSide, 0.39, 0);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.13, 12), shirtMat);
    sleeve.position.set(0, -0.05, 0);
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.22, 12), skinMat);
    upperArm.position.set(0, -0.11, 0);
    shoulderJoint.add(sleeve, upperArm);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.24, 12), skinMat);
    forearm.rotation.x = Math.PI / 2.2;
    forearm.position.set(0, -0.21, -0.11);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), skinMat);
    hand.scale.set(1, 0.6, 1.3);
    hand.position.set(0, -0.22, -0.23);
    shoulderJoint.add(forearm, hand);

    return shoulderJoint;
  }

  const leftArm = createArm(true);
  const rightArm = createArm(false);
  spinePivot.add(leftArm, rightArm);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.49, 0);
  spinePivot.add(headPivot);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.09, 14), skinMat);
  neck.position.set(0, 0.02, 0);
  headPivot.add(neck);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 24, 24), skinMat);
  headMesh.scale.set(0.96, 1.04, 0.98);
  headMesh.position.set(0, 0.13, 0);
  headPivot.add(headMesh);

  const earGeo = new THREE.SphereGeometry(0.032, 12, 12);
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.scale.set(0.5, 1, 0.8);
  earL.position.set(-0.14, 0.13, 0);
  const earR = earL.clone();
  earR.position.x = 0.14;
  headPivot.add(earL, earR);

  const hairMat = new THREE.MeshLambertMaterial({ color: 0x171717 });
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.72),
    hairMat
  );
  hairCap.position.set(0, 0.142, 0.008);
  hairCap.rotation.x = -0.14;
  headPivot.add(hairCap);

  const eyeGroup = new THREE.Group();
  const scleraGeo = new THREE.SphereGeometry(0.024, 12, 12);
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilGeo = new THREE.SphereGeometry(0.013, 10, 10);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const catchGeo = new THREE.SphereGeometry(0.0045, 8, 8);

  const eyeWhiteL = new THREE.Mesh(scleraGeo, scleraMat);
  eyeWhiteL.position.set(-0.048, 0.14, -0.128);
  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(-0.048, 0.14, -0.142);
  const catchL = new THREE.Mesh(catchGeo, scleraMat);
  catchL.position.set(-0.043, 0.146, -0.152);

  const eyeWhiteR = eyeWhiteL.clone();
  eyeWhiteR.position.x = 0.048;
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.048;
  const catchR = catchL.clone();
  catchR.position.x = 0.053;

  eyeGroup.add(eyeWhiteL, pupilL, catchL, eyeWhiteR, pupilR, catchR);
  headPivot.add(eyeGroup);

  const browGeo = new THREE.BoxGeometry(0.036, 0.007, 0.008);
  const browL = new THREE.Mesh(browGeo, hairMat);
  browL.position.set(-0.048, 0.175, -0.135);
  browL.rotation.z = 0.08;
  const browR = browL.clone();
  browR.position.x = 0.048;
  browR.rotation.z = -0.08;
  headPivot.add(browL, browR);

  const blushMat = new THREE.MeshBasicMaterial({ color: 0xfda4af, transparent: true, opacity: 0.55 });
  const blushL = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), blushMat);
  blushL.position.set(-0.075, 0.11, -0.132);
  blushL.rotation.y = -0.35;
  const blushR = blushL.clone();
  blushR.position.x = 0.075;
  blushR.rotation.y = 0.35;
  headPivot.add(blushL, blushR);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), skinMat);
  nose.position.set(0, 0.118, -0.145);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.026, 0.0055, 8, 16, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xe11d48 })
  );
  smile.rotation.x = Math.PI;
  smile.position.set(0, 0.088, -0.136);
  headPivot.add(nose, smile);

  return {
