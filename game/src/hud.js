// hud.js — the Sunset Bay HUD and menus (DOM overlay over the 3D view).

const HUD = {
  els: {}, toastTimer: null,

  init() {
    const ids = ['hud', 'menu', 'howto', 'pause', 'end', 'stars', 'missionTitle', 'missionText', 'missionDist',
      'money', 'healthFill', 'speedo', 'speedVal', 'crosshair', 'toast', 'vignette', 'bustedBar', 'bustedFill',
      'endTitle', 'endStats', 'btnNew', 'btnContinue', 'btnHow', 'btnHowBack', 'btnResume', 'btnRestart',
      'btnQuit', 'btnEndRetry', 'btnEndMenu', 'err'];
    for (const id of ids) this.els[id] = document.getElementById(id);
    this.els.btnNew.addEventListener('click', () => { SB.audio.resume(); SB.audio.click(); SB.main.newGame(); });
    this.els.btnContinue.addEventListener('click', () => { SB.audio.resume(); SB.audio.click(); SB.main.continueGame(); });
    this.els.btnHow.addEventListener('click', () => { SB.audio.click(); this.show('howto'); });
    this.els.btnHowBack.addEventListener('click', () => { SB.audio.click(); this.show('menu'); });
    this.els.btnResume.addEventListener('click', () => { SB.audio.click(); SB.main.togglePause(false); });
    this.els.btnRestart.addEventListener('click', () => { SB.audio.click(); SB.main.restartMission(); });
    this.els.btnQuit.addEventListener('click', () => { SB.audio.click(); SB.main.quitToMenu(); });
    this.els.btnEndRetry.addEventListener('click', () => { SB.audio.click(); SB.main.retryAfterEnd(); });
    this.els.btnEndMenu.addEventListener('click', () => { SB.audio.click(); SB.main.quitToMenu(); });
    this.setWanted(0);
    this.setMoney(0);
    this.setHealth(100);
  },

  show(name) {
    for (const s of ['menu', 'howto', 'pause', 'end']) this.els[s].classList.add('hidden');
    if (name) this.els[name].classList.remove('hidden');
    this.els.hud.classList.toggle('hidden', name !== null && name !== undefined && name !== '');
    if (name === null || name === undefined || name === '') this.els.hud.classList.remove('hidden');
  },

  showOnlyHud() { this.show(null); },

  setWanted(n) {
    let html = '';
    for (let i = 0; i < 5; i++) html += i < n ? '★' : '<span class="off">★</span>';
    this.els.stars.innerHTML = html;
  },

  setMoney(n) { this.els.money.textContent = '$' + n.toLocaleString('en-US'); },

  setHealth(n) { this.els.healthFill.style.width = SB.clamp(n, 0, 100) + '%'; },

  setSpeed(kmh, driving) {
    this.els.speedo.classList.toggle('hidden', !driving);
    if (driving) this.els.speedVal.textContent = kmh;
    this.els.crosshair.classList.toggle('hidden', !SB.player.onFoot || SB.main.state !== 'playing');
  },

  setMission(title, text, dist) {
    this.els.missionTitle.textContent = title;
    this.els.missionText.textContent = text;
    this.els.missionDist.textContent = dist;
  },

  setBusted(f) {
    this.els.bustedBar.classList.toggle('hidden', f <= 0.01);
    this.els.bustedFill.style.width = Math.round(f * 100) + '%';
  },

  toast(msg, ms) {
    this.els.toast.textContent = msg;
    this.els.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.els.toast.classList.add('hidden'), ms || 3600);
  },

  flashVignette() {
    this.els.vignette.style.opacity = '1';
    setTimeout(() => { this.els.vignette.style.opacity = '0'; }, 220);
  },

  showEnd(kind, statsHtml) {
    const titles = { busted: 'BUSTED', wasted: 'WASTED', complete: 'STORY COMPLETE' };
    this.els.endTitle.textContent = titles[kind] || 'GAME OVER';
    this.els.endStats.innerHTML = statsHtml;
    this.show('end');
  },

  showError(msg) {
    this.els.err.textContent = 'Error: ' + msg;
    this.els.err.classList.remove('hidden');
  },
};
SB.hud = HUD;
