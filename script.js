/*************************************************************************
 * 0. HÀM LƯU TRỮ AN TOÀN & TIỆN ÍCH GẮN SỰ KIỆN CLICK TỨC THÌ (ZERO-DELAY CLICK)
 *************************************************************************/
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
    const raw = window.localStorage.getItem('vr_tinhoc_badges_v7');
    return raw ? Object.assign(defaultBadges, JSON.parse(raw)) : defaultBadges;
  } catch (e) {
    return defaultBadges;
  }
}

function safeSaveBadges(badgesObj) {
  try {
    window.localStorage.setItem('vr_tinhoc_badges_v7', JSON.stringify(badgesObj));
  } catch (e) {}
}

function spawnClickBurst(clientX, clientY, symbol) {
  if (clientX === undefined || clientY === undefined) return;
  const el = document.createElement('div');
  el.className = 'click-burst';
  el.style.left = clientX + 'px';
  el.style.top = clientY + 'px';
  el.innerText = symbol || '✨';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

/**
 * Hàm gắn sự kiện chống trượt Click 100%:
 * Phản hồi ngay trên cả chuột máy tính, màn hình cảm ứng và bảng tương tác thông minh
 */
function bindInstantAction(element, callback) {
  if (!element) return;
  let lastTriggerTime = 0;

  const execute = (ev) => {
    const now = performance.now();
    if (now - lastTriggerTime < 220) return; // Chống lặp đúp giữa pointerdown và click
    lastTriggerTime = now;
    if (ev) {
      ev.stopPropagation();
    }
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
            // Ưu tiên giọng Nam tiếng Việt tự nhiên (NamMinh, Male, Nam, An)
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
          // Tinh chỉnh âm vực trầm ấm (0.83 - 0.94) và tốc độ khoan thai nhẹ nhàng (0.92) của thầy giáo Đà Nẵng
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
    root, bodyGroup, spinePivot, headPivot,
    leftLeg: leftLegRig.kneeJoint, rightLeg: rightLegRig.kneeJoint,
    leftArm, rightArm, torso, eyeGroup, redScarfGroup
  };
}

const mainStudent = createOptimizedStudentAndRedScarf();
mainStudent.root.position.set(0, 0, -0.23);
scene.add(mainStudent.root);

const rulerGroup = new THREE.Group();
const rulerMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });
const rulerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.65, 12), rulerMat);
rulerBeam.rotation.x = Math.PI / 2;
rulerGroup.add(rulerBeam);
const rulerLabel = createTextSprite('65 cm (An toàn)', '#16a34a', '#ffffff', 260, 68, 25);
rulerLabel.position.set(0, 0.16, 0);
rulerGroup.add(rulerLabel);
rulerGroup.position.set(0, 1.15, -0.55);
scene.add(rulerGroup);

/*************************************************************************
 * 6. MÔ HÌNH CHUỘT 3D LỚN & HỆ THỐNG 6 BIỂU TƯỢNG KHÁM PHÁ PHÒNG MÁY
 *************************************************************************/
const giantMouseGroup = new THREE.Group();
giantMouseGroup.position.set(2.4, 0.78, -0.7);
scene.add(giantMouseGroup);

const mouseDesk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 1.0), new THREE.MeshLambertMaterial({ color: 0x0288d1 }));
mouseDesk.position.y = -0.03;
giantMouseGroup.add(mouseDesk);

const mouseBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.82), new THREE.MeshLambertMaterial({ color: 0x475569 }));
mouseBody.position.y = 0.09;
giantMouseGroup.add(mouseBody);

const mouseLeftBtn = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.36), new THREE.MeshLambertMaterial({ color: 0x38bdf8 }));
mouseLeftBtn.position.set(-0.14, 0.20, -0.20);
mouseLeftBtn.userData = { type: 'mousePart', part: 'left' };
giantMouseGroup.add(mouseLeftBtn);
interactables.push(mouseLeftBtn);

const mouseRightBtn = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.36), new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
mouseRightBtn.position.set(0.14, 0.20, -0.20);
mouseRightBtn.userData = { type: 'mousePart', part: 'right' };
giantMouseGroup.add(mouseRightBtn);
interactables.push(mouseRightBtn);

const mouseScrollBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 16), new THREE.MeshLambertMaterial({ color: 0xf43f5e }));
mouseScrollBtn.rotation.z = Math.PI / 2;
mouseScrollBtn.position.set(0, 0.23, -0.20);
mouseScrollBtn.userData = { type: 'mousePart', part: 'scroll' };
giantMouseGroup.add(mouseScrollBtn);
interactables.push(mouseScrollBtn);

const mouseTitleSprite = createTextSprite('🖱 MÔ HÌNH CHUỘT 3D', '#0f172a', '#38bdf8', 340, 70, 24);
mouseTitleSprite.position.set(0, 0.65, 0);
giantMouseGroup.add(mouseTitleSprite);

// 6 Biểu tượng Khám phá Phòng máy
const hotspotData = [
  {
    id: 'eyes', icon: '👀', label: '👀 ĐÔI MẮT (50-80cm)', targetMode: 'eyes',
    pos: new THREE.Vector3(0, 1.56, -0.85), lookLon: -90, lookLat: -4,
    title: 'BẢO VỆ ĐÔI MẮT SÁNG KHỎE',
    msg: 'Thầy nhắc các con nghe: Khi ngồi máy tính, mình giữ khoảng cách từ mắt đến màn hình từ 50 đến 80 xăng-ti-mét và nhìn ngang tầm màn hình nhé!'
  },
  {
    id: 'posture', icon: '🪑', label: '🪑 TƯ THẾ NGỒI', targetMode: 'posture',
    pos: new THREE.Vector3(-0.72, 1.18, -0.2), lookLon: -105, lookLat: -10,
    title: 'TƯ THẾ NGỒI ĐÚNG KHI DÙNG MÁY TÍNH',
    msg: 'Con nhìn bạn nhỏ kìa! Mình ngồi thẳng lưng, vai thả lỏng tự nhiên, tay đặt ngang bàn phím và hai bàn chân đặt bằng phẳng trên sàn nhà nghe!'
  },
  {
    id: 'light', icon: '💡', label: '💡 ĐÈN & ÁNH SÁNG', targetMode: 'light',
    pos: new THREE.Vector3(0, 3.25, -0.5), lookLon: -90, lookLat: 26,
    title: 'KHUYẾN CÁO ÁNH SÁNG PHÒNG MÁY',
    msg: 'Khuyến cáo: Con cần ngồi với máy tính trong môi trường đủ ánh sáng, hạn chế ánh sáng chiếu trực tiếp vào màn hình hoặc chiếu vào mắt gây chói lóa nghe!'
  },
  {
    id: 'rest', icon: '⏰', label: '⏰ NGHỈ NGƠI 30P', targetMode: 'eyegame',
    pos: new THREE.Vector3(3.1, 2.45, -3.8), lookLon: -62, lookLat: 8,
    title: 'NGHỈ NGƠI SAU 30 PHÚT LÀM VIỆC',
    msg: 'Sau khoảng 30 phút sử dụng máy tính, các con nhớ đứng dậy vươn vai, uống nước và chơi trò chơi Điểm tròn nhỏ để thư giãn mắt nghe!'
  },
  {
    id: 'window', icon: '🌿', label: '🌿 CỬA SỔ NHÌN XA', targetMode: 'window',
    pos: new THREE.Vector3(-4.6, 2.05, -0.5), lookLon: -162, lookLat: 4,
    title: 'NHÌN RA XA THƯ GIÃN ĐÔI MẮT',
    msg: 'Khi mỏi mắt, các con hãy hướng mắt nhìn qua cửa sổ ngắm hàng cây xanh, bầu trời và đàn chim bay ngoài sân trường nhé!'
  },
  {
    id: 'mouse', icon: '🖱', label: '🖱 CHUỘT MÁY TÍNH', targetMode: 'mouse',
    pos: new THREE.Vector3(2.4, 1.52, -0.7), lookLon: -48, lookLat: -6,
    title: 'LÀM QUEN VỚI CHUỘT MÁY TÍNH',
    msg: 'Con chuột máy tính có Nút trái, Nút phải và Nút cuộn ở giữa giúp các con chọn biểu tượng, mở bảng lệnh và cuộn trang thật dễ dàng!'
  }
];

const hotspotOverlay = document.getElementById('hotspot-overlay-layer');
const hotspotDomPins = [];

hotspotData.forEach((h, index) => {
  const pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = 'hotspot-pin-3d';
  pinBtn.innerHTML = '<span>' + h.label + '</span>';

  // Sử dụng bindInstantAction đảm bảo chạm/nhấp chuột ăn ngay 100% ở khung hình đầu tiên
  bindInstantAction(pinBtn, (ev) => {
    const cx = ev && ev.clientX ? ev.clientX : window.innerWidth / 2;
    const cy = ev && ev.clientY ? ev.clientY : window.innerHeight / 2;
    spawnClickBurst(cx, cy, h.icon);
    window.activateHotspotByIndex(index);
  });

  hotspotOverlay.appendChild(pinBtn);
  hotspotDomPins.push({ el: pinBtn, worldPos: h.pos.clone(), lastX: -999, lastY: -999 });

  const colliderMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.38, 0.32),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
  );
  colliderMesh.position.copy(h.pos);
  colliderMesh.userData = { type: 'hotspot', hotspotIndex: index };
  scene.add(colliderMesh);
  interactables.push(colliderMesh);
});

// Bảng Menu VR nổi trong không gian 3D
const vrSpatialMenu = new THREE.Group();
vrSpatialMenu.position.set(-1.65, 1.65, -1.25);
vrSpatialMenu.rotation.y = 0.45;
scene.add(vrSpatialMenu);

[
  { mode: 'explore', title: '🏠 Khám phá Phòng máy' },
  { mode: 'posture', title: '🪑 Tư thế ngồi' },
  { mode: 'light', title: '💡 Ánh sáng' },
  { mode: 'eyegame', title: '🟢 Điểm tròn Luyện mắt' },
  { mode: 'window', title: '🌿 Nhìn ra xa' },
  { mode: 'mouse', title: '🖱 Chuột máy tính' },
  { mode: 'challenge', title: '🏆 Thử thách' }
].forEach((item, idx) => {
  const btnSp = createTextSprite(item.title, '#1e293b', '#ffca28', 320, 64, 22);
  btnSp.position.set(0, 0.75 - idx * 0.25, 0);
  btnSp.userData = { type: 'vrNav', targetMode: item.mode };
  vrSpatialMenu.add(btnSp);

  const navCollider = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.22, 0.18),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
  );
  navCollider.position.set(0, 0.75 - idx * 0.25, 0);
  navCollider.userData = { type: 'vrNav', targetMode: item.mode };
  vrSpatialMenu.add(navCollider);
  interactables.push(btnSp, navCollider);
});

/*************************************************************************
 * 7. XỬ LÝ TƯ THẾ NGỒI ĐÚNG / SAI & KHOẢNG CÁCH 50-80CM
 *************************************************************************/
window.applyStudentPosture = function(type) {
  state.postureType = type;
  const s = mainStudent;
  s.bodyGroup.position.set(0, 0, 0);
  state.targetSpineRotX = 0;
  state.targetSpineRotZ = 0;
  state.targetHeadRotX = 0;
  state.targetHeadRotZ = 0;
  state.targetLeftLegRotX = 0;
  state.targetRightLegRotX = 0;
  s.torso.material.color.setHex(0xffffff);

  if (type === 'good') {
    window.setDistanceCm(65, false);
    s.torso.material.color.setHex(0xffffff);
    sfx.correct();
    state.badges.posture = true;
    saveBadges();
    setFeedback('✓ TƯ THẾ ĐÚNG: Ngồi thẳng lưng, khăn quàng ngay ngắn, mắt ngang màn hình (65 cm), chân đặt ổn định.', '#4ade80');
    sayAssistant('Giỏi quá chừng luôn con ơi! Con nhìn bạn nhỏ đeo khăn quàng đỏ ngồi thẳng lưng, mắt cách màn hình 65 xăng-ti-mét chuẩn chưa nè! Rứa mới đúng chớ!');
  } else if (type === 'A') {
    window.setDistanceCm(30, false);
    state.targetSpineRotX = 0.46;
    s.torso.material.color.setHex(0xfee2e2);
    sfx.wrong();
    setFeedback('✗ Sai (Tình huống A): Cúi sát mặt, ngồi quá gần màn hình (30 cm).', '#f87171');
    sayAssistant('Ồ, chưa đúng rồi nghe! Cúi sát mặt vô màn hình rứa là mắt mau mỏi và dễ bị cận thị lắm đó con!');
  } else if (type === 'B') {
    state.targetSpineRotX = 0.66;
    state.targetHeadRotX = -0.36;
    s.torso.material.color.setHex(0xfee2e2);
    sfx.wrong();
    setFeedback('✗ Sai (Tình huống B): Ngồi cong lưng. Cần giữ lưng thẳng và vai thả lỏng.', '#f87171');
    sayAssistant('Ngồi cong lưng tôm như rứa là đau lưng và hại cột sống lắm nghe. Các con nhớ ngồi thẳng lưng lên nào!');
  } else if (type === 'C') {
    state.targetSpineRotZ = 0.42;
    state.targetHeadRotZ = -0.22;
    s.torso.material.color.setHex(0xfee2e2);
    sfx.wrong();
    setFeedback('✗ Sai (Tình huống C): Ngồi lệch vẹo người. Cần ngồi ngay ngắn trước máy tính.', '#f87171');
    sayAssistant('Bạn nhỏ đang ngồi nghiêng vẹo người kìa! Các con nhớ ngồi ngay ngắn chính diện với màn hình nghe chưa.');
  } else if (type === 'D') {
    state.targetLeftLegRotX = 1.15;
    state.targetRightLegRotX = -0.65;
    s.torso.material.color.setHex(0xfee2e2);
    sfx.wrong();
    setFeedback('✗ Sai (Tình huống D): Chân co quắp không ổn định. Cần đặt hai chân thoải mái trên mặt sàn.', '#f87171');
    sayAssistant('Hai bàn chân phải đặt bằng phẳng, ổn định dưới sàn nhà mới giúp cơ thể ngồi vững vàng được các con nhé!');
  }
};

window.setDistanceCm = function(cm, speakFeedback) {
  state.distanceCm = Number(cm);
  state.targetStudentZ = -0.88 + (state.distanceCm / 100);

  const len = state.distanceCm / 100;
  rulerBeam.scale.set(1, len / 0.65, 1);
  rulerGroup.position.z = -0.88 + len / 2;

  let badgeColor = '#16a34a';
  let labelText = state.distanceCm + ' cm (An toàn)';

  if (state.distanceCm >= 50 && state.distanceCm <= 80) {
    rulerMat.color.setHex(0x00e676);
    badgeColor = '#16a34a';
    labelText = state.distanceCm + ' cm (An toàn)';
    state.badges.distance = true;
    saveBadges();
    setFeedback('Khoảng cách: ' + state.distanceCm + ' cm — ✓ Rất tốt! (An toàn 50–80 cm)', '#4ade80');
    if (speakFeedback) sayAssistant('Tuyệt vời luôn! Khoảng cách ' + state.distanceCm + ' xăng-ti-mét nằm trong vùng an toàn từ 50 đến 80 xăng-ti-mét rồi đó con!');
  } else if (state.distanceCm < 50) {
    rulerMat.color.setHex(0xef4444);
    badgeColor = '#dc2626';
    labelText = state.distanceCm + ' cm (Quá gần)';
    setFeedback('Khoảng cách: ' + state.distanceCm + ' cm — ⚠ Em đang ngồi quá gần màn hình (Dưới 50 cm).', '#f87171');
    if (speakFeedback) sayAssistant('Gần quá rồi con ơi! Cách có ' + state.distanceCm + ' xăng-ti-mét thôi, con kéo lùi ghế ra từ 50 đến 80 xăng-ti-mét nghe!');
  } else {
    rulerMat.color.setHex(0xf59e0b);
    badgeColor = '#d97706';
    labelText = state.distanceCm + ' cm (Quá xa)';
    setFeedback('Khoảng cách: ' + state.distanceCm + ' cm — ⚠ Em đang ngồi quá xa màn hình (Trên 80 cm).', '#fbbf24');
    if (speakFeedback) sayAssistant('Xa quá rồi nè! Ngồi xa trên 80 xăng-ti-mét sẽ khó nhìn rõ chữ trên màn hình đó con.');
  }

  updateTextSprite(rulerLabel, labelText, badgeColor, '#ffffff', 25);

  const sliderEl = document.getElementById('dist-slider');
  if (sliderEl) sliderEl.value = state.distanceCm;
};

/*************************************************************************
 * 8. TRÒ CHƠI THƯ GIÃN MẮT VỚI ĐIỂM TRÒN NHỎ
 *************************************************************************/
window.setEyeBallPattern = function(pat) {
  sfx.click();
  state.eyeGamePattern = pat;
  const names = {
    infinity: 'Quỹ đạo Vô cực (∞) giúp cơ mắt đảo mềm mại hai bên',
    circle: 'Quỹ đạo Xoay tròn 360° giúp mắt điều tiết linh hoạt',
    cross: 'Quỹ đạo 4 hướng (Trái - Phải - Lên - Xuống)'
  };
  setFeedback('🟢 Đang chạy: ' + names[pat] + '. Con giữ đầu thẳng và nhìn nhẹ nhàng theo Điểm tròn nhỏ màu xanh nghe!', '#4ade80');
  sayAssistant('Con hãy giữ đầu thẳng, chỉ đưa con ngươi mắt nhìn nhẹ nhàng theo điểm tròn nhỏ màu xanh đang chuyển động để thư giãn mắt nghe!');
};

window.toggleEyeDotSize = function() {
  sfx.click();
  if (state.eyeDotSizeMode === 'small') {
    state.eyeDotSizeMode = 'tiny';
    eyeBallMesh.scale.set(0.65, 0.65, 0.65);
    eyeBallHalo.scale.set(0.65, 0.65, 0.65);
    setFeedback('🟢 Đã chuyển sang Điểm tròn SIÊU NHỎ giúp mắt hội tụ tinh anh hơn!', '#fef08a');
  } else {
    state.eyeDotSizeMode = 'small';
    eyeBallMesh.scale.set(1, 1, 1);
    eyeBallHalo.scale.set(1, 1, 1);
    setFeedback('🟢 Đã chuyển về Điểm tròn NHỎ tiêu chuẩn.', '#4ade80');
  }
  renderEyeGameControls();
};

window.hitEyeBallTarget = function() {
  state.eyeGameScore++;
  state.badges.eyeRelaxGame = true;
  saveBadges();
  sfx.correct();
  eyeBallMesh.material.color.setHex(0xfef08a);
  setTimeout(() => eyeBallMesh.material.color.setHex(0x00e676), 280);

  document.getElementById('panel-title').innerText = '🟢 TRÒ CHƠI THƯ GIÃN MẮT VỚI ĐIỂM TRÒN NHỎ (Điểm tinh anh: ' + state.eyeGameScore + ')';
  if (state.eyeGameScore === 3) {
    sayAssistant('Giỏi quá chừng luôn! Đôi mắt của con đã được tập thể dục với điểm tròn nhỏ thật sáng khỏe rồi đó!');
  }
};

function renderEyeGameControls() {
  const sizeLabel = state.eyeDotSizeMode === 'small' ? 'Nhỏ chuẩn' : 'Siêu nhỏ';
  document.getElementById('panel-title').innerText = '🟢 TRÒ CHƠI THƯ GIÃN MẮT VỚI ĐIỂM TRÒN NHỎ (Điểm tinh anh: ' + state.eyeGameScore + ')';
  setFeedback('👀 Giữ đầu thẳng, đưa mắt nhìn theo Điểm tròn nhỏ màu xanh trên màn hình và nhấp vào Điểm tròn 3 lần để nhận huy hiệu!', '#4ade80');
  document.getElementById('interactive-controls').innerHTML =
    '<button type="button" class="ctrl-btn good" onclick="window.setEyeBallPattern(\'infinity\')">♾️ Quỹ đạo Vô cực (∞)</button>' +
    '<button type="button" class="ctrl-btn" onclick="window.setEyeBallPattern(\'circle\')">🔄 Quỹ đạo Tròn</button>' +
    '<button type="button" class="ctrl-btn purple" onclick="window.setEyeBallPattern(\'cross\')">➕ Quỹ đạo 4 hướng</button>' +
    '<button type="button" class="ctrl-btn" onclick="window.toggleEyeDotSize()">🔎 Cỡ điểm tròn: ' + sizeLabel + '</button>' +
    '<button type="button" class="ctrl-btn warn" onclick="window.hitEyeBallTarget()">🎯 Bắt điểm tròn (+1 điểm)</button>';
}

/*************************************************************************
 * 9. NÚT BẬT/TẮT ĐÈN KÈM KHUYẾN CÁO ÁNH SÁNG
 *************************************************************************/
let advisoryTimeout = null;
function showLightAdvisoryBanner() {
  const banner = document.getElementById('light-advisory-banner');
  banner.style.display = 'block';
  clearTimeout(advisoryTimeout);
  advisoryTimeout = setTimeout(() => { banner.style.display = 'none'; }, 9500);
}

window.quickToggleLightWithAdvisory = function() {
  state.ceilingLightOn = !state.ceilingLightOn;
  state.directGlare = false;
  sfx.lightSwitch();
  showLightAdvisoryBanner();
  updateRoomLighting(true);
};

function updateRoomLighting(fromQuickBtn) {
  ceilingPointLight.intensity = state.ceilingLightOn ? 0.88 : 0.05;
  lampBulbMat.color.setHex(state.ceilingLightOn ? 0xfffbeb : 0x475569);
  windowBlind.visible = !state.windowBlindsOpen;
  sunDirLight.intensity = state.windowBlindsOpen ? 0.65 : 0.08;
  ambientLight.intensity = (state.ceilingLightOn || state.windowBlindsOpen) ? 0.64 : 0.16;
  glareMat.opacity = state.directGlare ? 0.8 : 0.0;

  const quickBtn = document.getElementById('btn-quick-light');
  if (quickBtn) {
    quickBtn.innerText = state.ceilingLightOn ? '💡 Đèn: ĐANG BẬT' : '🌑 Đèn: ĐANG TẮT';
  }

  if (!state.ceilingLightOn && !state.windowBlindsOpen) {
    setFeedback('⚠ Phòng quá tối! Khuyến cáo: Cần ngồi với máy tính trong môi trường đủ ánh sáng để bảo vệ mắt.', '#f87171');
    sayAssistant('Tối quá các con ơi! Khuyến cáo khi ngồi máy tính là phòng học phải đủ ánh sáng, các con bật đèn lên lại nghe!');
  } else if (state.directGlare) {
    setFeedback('⚠ Chói màn hình! Khuyến cáo: Hạn chế ánh sáng chiếu trực tiếp vào màn hình hoặc chiếu thẳng vào mắt.', '#fbbf24');
    sayAssistant('Ánh sáng chiếu thẳng vô màn hình gây lóa mắt rồi! Mình cần hạn chế ánh sáng chiếu trực tiếp vào màn hình nghe các con.');
  } else {
    state.badges.lighting = true;
    saveBadges();
    const msg = '✓ Ánh sáng đạt chuẩn! Khuyến cáo: Ngồi với máy tính trong môi trường đủ ánh sáng và hạn chế ánh sáng chiếu trực tiếp.';
    setFeedback(msg, '#4ade80');
    if (fromQuickBtn) {
      sayAssistant('Đèn đã điều chỉnh! Các con nhớ khuyến cáo của thầy nghe: Khi ngồi với máy tính phải đủ ánh sáng và hạn chế ánh sáng chiếu trực tiếp vào màn hình nhé!');
    }
  }
}

window.setLightScenario = function(scen) {
  sfx.lightSwitch();
  showLightAdvisoryBanner();
  if (scen === 'toggleCeiling') {
    state.ceilingLightOn = !state.ceilingLightOn;
    state.directGlare = false;
  } else if (scen === 'toggleBlinds') {
    state.windowBlindsOpen = !state.windowBlindsOpen;
    state.directGlare = false;
  } else if (scen === 'dark') {
    state.ceilingLightOn = false;
    state.windowBlindsOpen = false;
    state.directGlare = false;
  } else if (scen === 'glare') {
    state.ceilingLightOn = true;
    state.windowBlindsOpen = true;
    state.directGlare = true;
  } else if (scen === 'good') {
    state.ceilingLightOn = true;
    state.windowBlindsOpen = true;
    state.directGlare = false;
    sfx.correct();
    sayAssistant('Tuyệt vời! Phòng học đã đủ ánh sáng và không bị ánh sáng chiếu trực tiếp vào màn hình rồi đó các con!');
  }
  updateRoomLighting(false);
  if (state.mode === 'light') renderLightControls();
};

function renderLightControls() {
  document.getElementById('interactive-controls').innerHTML =
    '<button type="button" class="ctrl-btn" onclick="window.setLightScenario(\'toggleCeiling\')">💡 Công tắc Đèn trần: ' + (state.ceilingLightOn ? 'BẬT' : 'TẮT') + '</button>' +
    '<button type="button" class="ctrl-btn" onclick="window.setLightScenario(\'toggleBlinds\')">☀️ Rèm cửa sổ: ' + (state.windowBlindsOpen ? 'MỞ' : 'ĐÓNG') + '</button>' +
    '<button type="button" class="ctrl-btn bad" onclick="window.setLightScenario(\'dark\')">🌙 Thử nghiệm: Phòng thiếu sáng</button>' +
    '<button type="button" class="ctrl-btn warn" onclick="window.setLightScenario(\'glare\')">⚡ Thử nghiệm: Ánh sáng chiếu trực tiếp</button>' +
    '<button type="button" class="ctrl-btn good" onclick="window.setLightScenario(\'good\')">✓ Đặt Ánh sáng Chuẩn khuyến cáo</button>';
}

/*************************************************************************
 * 10. TRÒ CHƠI ĐỐ VUI “TƯ THẾ NÀO ĐÚNG?”
 *************************************************************************/
const quizQuestions = [
  { q: 'Câu 1/5: Theo con, bạn nhỏ ở tư thế nào đang ngồi ĐÚNG?', options: ['A: Cúi sát mặt 30cm', 'B: Lưng thẳng, mắt cách 65cm', 'C: Ngồi cong lưng tôm', 'D: Co chân lên ghế'], ans: 1, poses: ['A', 'good', 'B', 'D'] },
  { q: 'Câu 2/5: Khoảng cách từ mắt đến màn hình bao nhiêu là đúng chuẩn?', options: ['A: Ngồi thẳng, cách 50–80 cm', 'B: Ngồi sát 25 cm', 'C: Ngồi lệch vẹo người', 'D: Ngồi quá xa 115 cm'], ans: 0, poses: ['good', 'A', 'C', 'D'] },
  { q: 'Câu 3/5: Tư thế lưng và vai như thế nào giúp con không bị đau lưng?', options: ['A: Cúi gù lưng', 'B: Nghiêng vẹo vai', 'C: Lưng thẳng, vai thả lỏng tự nhiên', 'D: Cúi sát màn hình'], ans: 2, poses: ['B', 'C', 'good', 'A'] },
  { q: 'Câu 4/5: Khi ngồi học với máy tính, hai chân con đặt thế nào?', options: ['A: Co quắp trên ghế', 'B: Đặt ổn định, thoải mái trên mặt sàn', 'C: Gác chân lên bàn', 'D: Đu đưa chân liên tục'], ans: 1, poses: ['D', 'good', 'D', 'C'] },
  { q: 'Câu 5/5: Ánh sáng phòng máy tính như thế nào là tốt cho đôi mắt?', options: ['A: Đủ ánh sáng, hạn chế chiếu trực tiếp vào màn hình', 'B: Tắt hết đèn tối om', 'C: Để nắng chiếu chói thẳng vào màn hình', 'D: Cúi sát mắt trong bóng tối'], ans: 0, poses: ['good', 'B', 'A', 'D'] }
];

function renderQuizUI() {
  const qData = quizQuestions[state.quizIndex];
  document.getElementById('panel-title').innerText = '🎯 ĐỐ VUI: TƯ THẾ NÀO ĐÚNG? (Điểm: ' + state.quizScore + '/5)';
  setFeedback(qData.q, '#fef08a');
  sayAssistant(qData.q);
  document.getElementById('interactive-controls').innerHTML = qData.options.map((opt, idx) =>
    '<button type="button" class="ctrl-btn" onclick="window.answerQuiz(' + idx + ')">' + opt + '</button>'
  ).join('');
}

window.answerQuiz = function(choiceIdx) {
  const qData = quizQuestions[state.quizIndex];
  window.applyStudentPosture(qData.poses[choiceIdx]);

  if (choiceIdx === qData.ans) {
    state.quizScore++;
    sfx.correct();
    setFeedback('🎉 Chính xác! Giỏi quá chừng luôn con ơi! (Điểm: ' + state.quizScore + '/5)', '#4ade80');
    sayAssistant('Chính xác! Con trả lời giỏi quá chừng luôn!');
  } else {
    sfx.wrong();
    setFeedback('✗ Chưa đúng rồi! Con quan sát lại lưng, mắt và khoảng cách với màn hình nghe!', '#f87171');
    sayAssistant('Chưa đúng rồi con ơi! Con nhìn kỹ lại lưng và khoảng cách mắt của bạn nhỏ nghe.');
  }

  setTimeout(() => {
    state.quizIndex++;
    if (state.quizIndex < quizQuestions.length) {
      renderQuizUI();
    } else {
      sfx.fanfare();
      document.getElementById('panel-title').innerText = '🏆 KẾT QUẢ ĐỐ VUI: ' + state.quizScore + '/5 ĐIỂM';
      setFeedback('Chúc mừng con đã hoàn thành trò chơi với ' + state.quizScore + '/5 điểm!', '#4ade80');
      sayAssistant('Chúc mừng con nghe! Con đã đạt được ' + state.quizScore + ' trên 5 điểm rồi đó!');
      document.getElementById('interactive-controls').innerHTML =
        '<button type="button" class="ctrl-btn good" onclick="window.restartQuiz()">🔄 Chơi lại lần nữa</button>';
    }
  }, 2100);
};

window.restartQuiz = function() {
  state.quizScore = 0;
  state.quizIndex = 0;
  window.applyStudentPosture('good');
  renderQuizUI();
};

/*************************************************************************
 * 11. ĐỒNG HỒ 30 PHÚT, NGHỈ NGƠI & CHUỘT MÁY TÍNH 3D
 *************************************************************************/
let usageInterval = null;
let restInterval = null;

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return m + ':' + s;
}

window.toggleUsageTimer = function() {
  sfx.click();
  state.timerRunning = !state.timerRunning;
  document.getElementById('btn-timer-start').innerText = state.timerRunning ? '⏸ TẠM DỪNG' : '▶ BẮT ĐẦU';
  if (state.timerRunning && !usageInterval) {
    usageInterval = setInterval(() => {
      if (!state.timerRunning) return;
      state.timerSeconds += 10;
      document.getElementById('timer-display').innerText = formatTime(state.timerSeconds);
      if (state.timerSeconds >= 1800) trigger30MinRestAlert();
    }, 1000);
  }
};

window.fastForward30Min = function() {
  state.timerSeconds = 1800;
  document.getElementById('timer-display').innerText = '30:00';
  trigger30MinRestAlert();
};

function trigger30MinRestAlert() {
  state.timerRunning = false;
  document.getElementById('btn-timer-start').innerText = '▶ BẮT ĐẦU';
  sfx.fanfare();
  state.badges.rest = true;
  saveBadges();

  mainStudent.bodyGroup.position.set(0.55, 0.12, 0.2);
  document.getElementById('rest-modal').style.display = 'flex';
  sayAssistant('Đã hết 30 phút ngồi máy tính rồi các con ơi! Mình đứng dậy vươn vai, uống nước và nhìn ra xa thư giãn mắt nghe!');
  state.restCountdown = 20;
  document.getElementById('rest-countdown').innerText = 'Thời gian thư giãn: ' + state.restCountdown + ' giây';

  clearInterval(restInterval);
  restInterval = setInterval(() => {
    if (state.restCountdown > 0) {
      state.restCountdown--;
      document.getElementById('rest-countdown').innerText = 'Thời gian thư giãn: ' + state.restCountdown + ' giây';
    }
  }, 1000);
}

window.doRelaxAction = function(act) {
  sfx.correct();
  const st = document.getElementById('relax-status');
  if (act === 'window') {
    st.innerText = '👀 Con đang nhìn ra xa ngắm cây xanh và bầu trời ngoài sân trường...';
    sayAssistant('Nhìn ra cây xanh ngoài sân trường giúp đôi mắt con dịu lại liền đó!');
  } else if (act === 'stretch') {
    st.innerText = '🙆 Hai tay vươn cao, hít thở thật sâu, cơ thể khỏe khoắn!';
    sayAssistant('Vươn vai cao lên nào, khỏe quá chừng luôn!');
  } else if (act === 'walk') {
    st.innerText = '🚶 Đứng lên đi lại nhẹ nhàng giúp cơ xương dẻo dai!';
    sayAssistant('Đi lại nhẹ nhàng quanh phòng giúp chân tay đỡ mỏi nghe các con.');
  } else if (act === 'water') {
    st.innerText = '💧 Uống một ngụm nước mát giúp cơ thể tươi tỉnh!';
    sayAssistant('Uống một ngụm nước mát cho tỉnh táo rồi thầy trò mình học tiếp nghe!');
  }
};

window.finishRest = function() {
  sfx.click();
  clearInterval(restInterval);
  document.getElementById('rest-modal').style.display = 'none';
  state.timerSeconds = 0;
  document.getElementById('timer-display').innerText = '00:00';
  window.applyStudentPosture('good');
};

const mousePartQuestions = [
  { part: 'left', ask: 'Hãy nhấn vào NÚT TRÁI chuột!' },
  { part: 'right', ask: 'Hãy nhấn vào NÚT PHẢI chuột!' },
  { part: 'scroll', ask: 'Hãy nhấn vào NÚT CUỘN ở giữa chuột!' }
];

window.inspectMousePart = function(partKey) {
  mouseLeftBtn.material.color.setHex(0x38bdf8);
  mouseRightBtn.material.color.setHex(0xfbbf24);
  mouseScrollBtn.material.color.setHex(0xf43f5e);

  if (partKey === 'left') {
    mouseLeftBtn.material.color.setHex(0x00e676);
    setFeedback('🖱 Nút trái chuột: Dùng để chọn biểu tượng, nháy chuột và mở chương trình.', '#4ade80');
    sayAssistant('Đây là Nút trái chuột, dùng để chọn đối tượng và nháy chuột đó các con!');
  } else if (partKey === 'right') {
    mouseRightBtn.material.color.setHex(0x00e676);
    setFeedback('🖱 Nút phải chuột: Dùng để mở bảng thực đơn lệnh.', '#4ade80');
    sayAssistant('Đây là Nút phải chuột, giúp con mở bảng chọn lệnh nhanh nghe!');
  } else if (partKey === 'scroll') {
    mouseScrollBtn.material.color.setHex(0x00e676);
    setFeedback('🔄 Nút cuộn: Dùng để lăn cuộn trang lên hoặc xuống.', '#4ade80');
    sayAssistant('Còn đây là Nút cuộn ở giữa, dùng để cuộn trang lên xuống thật tiện lợi!');
  }

  if (state.mode === 'mouse' && state.mouseTargetPart) {
    if (partKey === state.mouseTargetPart) {
      state.mouseGameScore++;
      state.badges.mouse = true;
      saveBadges();
      sfx.correct();
      const nextQ = mousePartQuestions[state.mouseGameScore % mousePartQuestions.length];
      state.mouseTargetPart = nextQ.part;
      document.getElementById('panel-title').innerText = '🖱 LÀM QUEN VỚI CHUỘT MÁY TÍNH (Điểm: ' + state.mouseGameScore + ')';
      setTimeout(() => {
        setFeedback('🎉 Đúng rồi (+1 điểm)! Tiếp theo: ' + nextQ.ask, '#fef08a');
      }, 1300);
    }
  }
};

/*************************************************************************
 * 12. THỬ THÁCH TỔNG HỢP 6 HUY HIỆU
 *************************************************************************/
function renderChallengeMode() {
  const b = state.badges;
  const completedCount = Object.values(b).filter(Boolean).length;
  document.getElementById('panel-title').innerText = '🏆 EM LÀ CHUYÊN GIA MÁY TÍNH NHÍ (' + completedCount + '/6 HUY HIỆU)';

  if (completedCount === 6) {
    sfx.fanfare();
    setFeedback('🏆 CHÚC MỪNG! Con đã hoàn thành xuất sắc cả 6/6 nhiệm vụ sử dụng máy tính an toàn!', '#4ade80');
    sayAssistant('Chúc mừng con nghe! Con đã lấy đủ 6 huy hiệu và trở thành Chuyên gia máy tính nhí xuất sắc rồi đó!');
  } else {
    setFeedback('Hãy bấm vào từng nhiệm vụ bên dưới để thực hành và sưu tập đủ 6 huy hiệu nghe!', '#fef08a');
  }

  document.getElementById('interactive-controls').innerHTML =
    '<div style="width:100%">' +
      '<div class="badge-bar">' +
        '<span class="badge-item ' + (b.posture ? 'done' : '') + '">1. Tư thế đúng ' + (b.posture ? '✓' : '') + '</span>' +
        '<span class="badge-item ' + (b.distance ? 'done' : '') + '">2. Cự ly 50-80cm ' + (b.distance ? '✓' : '') + '</span>' +
        '<span class="badge-item ' + (b.lighting ? 'done' : '') + '">3. Đủ ánh sáng ' + (b.lighting ? '✓' : '') + '</span>' +
        '<span class="badge-item ' + (b.eyeRelaxGame ? 'done' : '') + '">4. Điểm tròn Luyện mắt ' + (b.eyeRelaxGame ? '✓' : '') + '</span>' +
        '<span class="badge-item ' + (b.rest ? 'done' : '') + '">5. Nghỉ sau 30p ' + (b.rest ? '✓' : '') + '</span>' +
        '<span class="badge-item ' + (b.mouse ? 'done' : '') + '">6. Nút chuột 3D ' + (b.mouse ? '✓' : '') + '</span>' +
      '</div>' +
      '<div style="margin-top:8px;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">' +
        '<button type="button" class="ctrl-btn good" onclick="window.switchMode(\'posture\')">Làm NV 1 & 2 (Tư thế & Cự ly)</button>' +
        '<button type="button" class="ctrl-btn warn" onclick="window.switchMode(\'light\')">Làm NV 3 (Ánh sáng)</button>' +
        '<button type="button" class="ctrl-btn purple" onclick="window.switchMode(\'eyegame\')">Làm NV 4 (Điểm tròn nhỏ)</button>' +
        '<button type="button" class="ctrl-btn" onclick="window.fastForward30Min()">Làm NV 5 (Nghỉ ngơi 30p)</button>' +
        '<button type="button" class="ctrl-btn" onclick="window.switchMode(\'mouse\')">Làm NV 6 (Chuột 3D)</button>' +
        '<button type="button" class="ctrl-btn bad" onclick="window.resetAllProgress()">🔄 Làm lại từ đầu</button>' +
      '</div>' +
    '</div>';
}

window.resetAllProgress = function() {
  sfx.click();
  Object.keys(state.badges).forEach(k => state.badges[k] = false);
  saveBadges();
  renderChallengeMode();
};

/*************************************************************************
 * 13. CHUYỂN ĐỔI CÁC CHẾ ĐỘ HỌC TẬP & HỘP THOẠI KHI BẤM BIỂU TƯỢNG
 *************************************************************************/
window.activateHotspotByIndex = function(idx) {
  const h = hotspotData[idx];
  if (!h) return;
  state.autoRotateExplore = false;
  sfx.correct();

  if (state.mode === 'explore' && h.lookLon !== undefined) {
    targetLon = h.lookLon;
    targetLat = h.lookLat;
  }

  setFeedback(h.icon + ' ' + h.msg, '#4ade80');
  sayAssistant(h.msg);

  state.popupTargetMode = h.targetMode;
  document.getElementById('popup-icon').innerText = h.icon;
  document.getElementById('popup-title').innerText = h.title;
  document.getElementById('popup-desc').innerText = h.msg;
  document.getElementById('hotspot-popup-card').classList.add('show');
};

window.closeHotspotPopup = function() {
  sfx.click();
  document.getElementById('hotspot-popup-card').classList.remove('show');
};

window.goPopupTargetMode = function() {
  document.getElementById('hotspot-popup-card').classList.remove('show');
  if (state.popupTargetMode) {
    window.switchMode(state.popupTargetMode);
  }
};

window.toggleAutoRotateExplore = function() {
  sfx.click();
  state.autoRotateExplore = !state.autoRotateExplore;
  const btn = document.getElementById('btn-auto-tour');
  if (btn) {
    btn.innerText = state.autoRotateExplore ? '⏸ Dừng xoay 360°' : '🔄 Tự động xoay 360° quanh phòng';
  }
  if (state.autoRotateExplore) {
    sayAssistant('Thầy đang đưa các con xoay một vòng 360 độ ngắm toàn bộ phòng Tin học. Con thích biểu tượng nào thì nhấp chuột vào biểu tượng đó nghe!');
  }
};

window.switchMode = function(mode) {
  sfx.click();
  const wasExplore = (state.mode === 'explore');
  state.mode = mode;
  state.autoRotateExplore = false;

  document.getElementById('hotspot-popup-card').classList.remove('show');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const activeTab = document.getElementById('tab-' + mode);
  if (activeTab) activeTab.classList.add('active');

  hotspotOverlay.style.display = (mode === 'explore') ? 'block' : 'none';
  eyeBallGroup.visible = (mode === 'eyegame');
  rulerGroup.visible = (mode !== 'eyegame');
  mainStudent.root.visible = (mode !== 'eyegame');
  cameraTargetPos.set(0, 1.62, 2.25);
  cameraLookOverride = null;
  const ctrl = document.getElementById('interactive-controls');

  if (mode === 'explore') {
    targetLon = -90;
    targetLat = -7;
    hotspotDomPins.forEach(p => {
      p.el.classList.add('highlight-pulse');
      setTimeout(() => p.el.classList.remove('highlight-pulse'), 1400);
    });

    document.getElementById('panel-title').innerText = '🏠 KHÁM PHÁ PHÒNG TIN HỌC 360° (NHẤP VÀO CÁC BIỂU TƯỢNG ĐỂ XEM)';
    setFeedback('✨ Đã vào Phòng máy 360°! Con hãy nhấp chuột vào 6 biểu tượng màu xanh trong phòng hoặc các nút bên dưới nghe!', '#4ade80');
    sayAssistant(wasExplore
      ? 'Thầy đã đưa góc nhìn về giữa phòng học rồi nè! Con hãy nhấp chuột vào một trong 6 biểu tượng màu xanh trước mặt để khám phá nghe!'
      : 'Thầy chào các con đến với Phòng Tin học 360 độ! Các con hãy nhấp chuột vào các biểu tượng màu xanh trong phòng học để khám phá kiến thức nhé!'
    );

    ctrl.innerHTML =
      '<button type="button" class="ctrl-btn good" id="btn-auto-tour" onclick="window.toggleAutoRotateExplore()">🔄 Tự động xoay 360° quanh phòng</button>' +
      hotspotData.map((h, i) =>
        '<button type="button" class="ctrl-btn" onclick="window.activateHotspotByIndex(' + i + ')">' + h.label + '</button>'
      ).join('');
  }
  else if (mode === 'posture') {
    cameraTargetPos.set(1.18, 1.30, -0.32);
    cameraLookOverride = new THREE.Vector3(0, 0.94, -0.45);
    document.getElementById('panel-title').innerText = '🪑 THỰC HÀNH TƯ THẾ NGỒI ĐÚNG & CÁC TƯ THẾ SAI';
    window.applyStudentPosture('good');
    ctrl.innerHTML =
      '<button type="button" class="ctrl-btn good" onclick="window.applyStudentPosture(\'good\')">✓ Tư thế ĐÚNG</button>' +
      '<button type="button" class="ctrl-btn bad" onclick="window.applyStudentPosture(\'A\')">✗ Sai A: Cúi quá gần</button>' +
      '<button type="button" class="ctrl-btn bad" onclick="window.applyStudentPosture(\'B\')">✗ Sai B: Cong lưng</button>' +
      '<button type="button" class="ctrl-btn bad" onclick="window.applyStudentPosture(\'C\')">✗ Sai C: Ngồi lệch</button>' +
      '<button type="button" class="ctrl-btn bad" onclick="window.applyStudentPosture(\'D\')">✗ Sai D: Co chân</button>' +
      '<div class="slider-wrap">' +
        '<span>📏 Khoảng cách mắt:</span>' +
        '<input type="range" id="dist-slider" min="20" max="120" value="' + state.distanceCm + '" onchange="window.setDistanceCm(this.value, true)" oninput="window.setDistanceCm(this.value, false)">' +
      '</div>';
  }
  else if (mode === 'quiz') {
    cameraTargetPos.set(1.15, 1.30, -0.32);
    cameraLookOverride = new THREE.Vector3(0, 0.94, -0.45);
    state.quizIndex = 0;
    state.quizScore = 0;
    renderQuizUI();
  }
  else if (mode === 'light') {
    cameraTargetPos.set(0, 1.62, 1.75);
    cameraLookOverride = new THREE.Vector3(0, 1.15, -0.88);
    document.getElementById('panel-title').innerText = '💡 BẬT/TẮT ĐÈN & KHUYẾN CÁO ÁNH SÁNG PHÒNG MÁY';
    showLightAdvisoryBanner();
    sayAssistant('Khi ngồi học với máy tính, các con nhớ phải đủ ánh sáng và hạn chế ánh sáng chiếu trực tiếp vào màn hình để không bị mỏi mắt nghe!');
    updateRoomLighting(false);
    renderLightControls();
  }
  else if (mode === 'eyes') {
    cameraTargetPos.set(1.12, 1.25, -0.42);
    cameraLookOverride = new THREE.Vector3(0, 1.05, -0.60);
    document.getElementById('panel-title').innerText = '📏 ĐO KHOẢNG CÁCH AN TOÀN CHO ĐÔI MẮT (50 – 80 CM)';
    window.setDistanceCm(65, true);
    ctrl.innerHTML =
      '<div class="slider-wrap">' +
        '<span>👀 Kéo điều chỉnh khoảng cách mắt – màn hình (20cm – 120cm):</span>' +
        '<input type="range" id="dist-slider" min="20" max="120" value="' + state.distanceCm + '" onchange="window.setDistanceCm(this.value, true)" oninput="window.setDistanceCm(this.value, false)">' +
      '</div>' +
      '<button type="button" class="ctrl-btn good" onclick="window.setDistanceCm(65, true)">Đặt chuẩn 65 cm</button>';
  }
  else if (mode === 'eyegame') {
    cameraTargetPos.set(0, 1.12, -0.22);
    cameraLookOverride = new THREE.Vector3(0, 1.12, -0.88);
    sayAssistant('Chào mừng các con đến với Trò chơi Thư giãn mắt! Con hãy giữ đầu thẳng và chỉ đưa đôi mắt nhìn nhẹ nhàng theo Điểm tròn nhỏ màu xanh trên màn hình nghe!');
    renderEyeGameControls();
  }
  else if (mode === 'window') {
    cameraTargetPos.set(-2.5, 1.75, 0);
    cameraLookOverride = new THREE.Vector3(-12, 2.4, -1);
    document.getElementById('panel-title').innerText = '🌿 NHÌN RA XA NGOÀI CỬA SỔ THƯ GIÃN ĐÔI MẮT';
    setFeedback('👀 Hãy phóng tầm mắt nhìn hàng cây xanh, bầu trời và đàn chim bay ngoài sân trường để mắt được nghỉ ngơi.', '#4ade80');
    sayAssistant('Các con nhìn ra ngoài cửa sổ kìa, cây cối xanh mát và mây trời giúp đôi mắt mình thư giãn khỏe khoắn lắm đó!');
    ctrl.innerHTML =
      '<button type="button" class="ctrl-btn purple" onclick="window.switchMode(\'eyegame\')">🟢 Chơi Điểm tròn nhỏ Luyện mắt</button>' +
      '<button type="button" class="ctrl-btn good" onclick="window.fastForward30Min()">⏰ Mở bài tập vận động 30 phút</button>';
  }
  else if (mode === 'mouse') {
    cameraTargetPos.set(2.4, 1.55, 0.25);
    cameraLookOverride = new THREE.Vector3(2.4, 0.88, -0.7);
    state.mouseTargetPart = 'left';
    document.getElementById('panel-title').innerText = '🖱 LÀM QUEN VỚI CHUỘT MÁY TÍNH 3D (Điểm: ' + state.mouseGameScore + ')';
    setFeedback('🎯 Hãy nhấp vào NÚT TRÁI chuột trên mô hình 3D hoặc bấm nút bên dưới!', '#fef08a');
    sayAssistant('Trên bàn là con chuột máy tính 3D thật to. Các con hãy bấm vào Nút trái, Nút phải và Nút cuộn để khám phá nghe!');
    ctrl.innerHTML =
      '<button type="button" class="ctrl-btn" onclick="window.inspectMousePart(\'left\')">🖱 Nút trái chuột</button>' +
      '<button type="button" class="ctrl-btn warn" onclick="window.inspectMousePart(\'right\')">🖱 Nút phải chuột</button>' +
      '<button type="button" class="ctrl-btn purple" onclick="window.inspectMousePart(\'scroll\')">🔄 Nút cuộn</button>';
  }
  else if (mode === 'challenge') {
    renderChallengeMode();
  }
};

/*************************************************************************
 * 14. KẾT NỐI TẤT CẢ SỰ KIỆN NÚT BẤM TRONG DOM & RAYCASTER 3D
 *************************************************************************/
const ray
