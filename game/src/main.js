// main.js — Sunset Bay bootstrap: renderer, game loop, states, save, screenshot staging.

const Main = {
  state: 'menu', time: 0, saveKey: 'sunsetbay-save-v1', shotMode: null,

  init() {
    const params = new URLSearchParams(location.search);
    this.shotMode = params.get('shot');
    window.addEventListener('error', (e) => { try { SB.hud.showError(e.message || 'unknown error'); } catch (_) {} });
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('app').appendChild(renderer.domElement);
    SB.renderer = renderer;
    SB.attachMouse(renderer.domElement);
    const scene = new THREE.Scene();
    SB.scene = scene;
    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 700);
    camera.position.set(-120, 40, -120);
    SB.camera = camera;
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    SB.city.buildCity(scene);
    SB.player.makeModel();
    scene.add(SB.player.model);
    SB.player.reset(SB.city.hideoutPos.x + 4, SB.city.hideoutPos.z + 6);
    SB.traffic.init(scene);
    SB.pedestrians.init(scene);
    SB.combat.init(scene);
    SB.missions.init(scene);
    SB.hud.init();
    SB.minimap.init();
    this.refreshContinueButton();
    SB.hud.show('menu');
    // Menu orbit camera: slow cinematic sweep over the city.
    this.menuAngle = 0.6;
    if (this.shotMode === 'chase' || this.shotMode === 'foot' || this.shotMode === 'drive' || this.shotMode === 'package') {
      this.stageShot(this.shotMode);
    }
    const clock = new THREE.Clock();
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      this.time += dt;
      this.update(dt);
      renderer.render(scene, camera);
    };
    loop();
  },

  refreshContinueButton() {
    const save = this.loadSave();
    document.getElementById('btnContinue').classList.toggle('hidden', !save);
  },

  loadSave() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveGame() {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify({
        money: SB.missions.money, mission: SB.missions.index, stage: SB.missions.stage,
        collected: SB.missions.collected, health: SB.player.health,
        px: SB.player.pos.x, pz: SB.player.pos.z,
      }));
    } catch (e) {}
  },

  clearSave() { try { localStorage.removeItem(this.saveKey); } catch (e) {} },

  newGame() {
    SB.missions.reset();
    SB.police.setWanted(0);
    SB.player.reset(SB.city.hideoutPos.x + 4, SB.city.hideoutPos.z + 6);
    this.state = 'playing';
    SB.hud.showOnlyHud();
    SB.hud.setMoney(0); SB.hud.setHealth(100); SB.hud.setWanted(0);
    SB.missions.startMission(0);
    SB.audio.resume();
  },

  continueGame() {
    const save = this.loadSave();
    if (!save) { this.newGame(); return; }
    SB.missions.reset();
    SB.missions.money = save.money || 0;
    SB.police.setWanted(0);
    SB.player.reset(save.px || 0, save.pz || 0);
    SB.player.health = save.health || 100;
    this.state = 'playing';
    SB.hud.showOnlyHud();
    SB.hud.setMoney(SB.missions.money); SB.hud.setHealth(SB.player.health); SB.hud.setWanted(0);
    SB.missions.startMission(save.mission || 0);
    SB.missions.stage = save.stage || 0;
    SB.missions.collected = save.collected || 0;
    if (SB.missions.index === 1 && SB.missions.collected > 0) {
      SB.missions.crates.forEach((c, i) => { c.visible = i >= SB.missions.collected; });
    }
    SB.missions.updateBeacon();
    SB.audio.resume();
  },

  togglePause(pause) {
    if (this.state === 'playing' && pause) { this.state = 'paused'; SB.hud.show('pause'); this.saveGame(); }
    else if (this.state === 'paused' && !pause) { this.state = 'playing'; SB.hud.showOnlyHud(); }
  },

  restartMission() {
    SB.police.setWanted(0);
    SB.player.reset(SB.city.hideoutPos.x + 4, SB.city.hideoutPos.z + 6);
    SB.player.health = 100;
    this.state = 'playing';
    SB.hud.showOnlyHud();
    SB.hud.setHealth(100); SB.hud.setWanted(0);
    SB.missions.startMission(SB.missions.index);
  },

  retryAfterEnd() {
    SB.police.setWanted(0);
    SB.player.reset(SB.city.hideoutPos.x + 4, SB.city.hideoutPos.z + 6);
    SB.player.health = 100;
    this.state = 'playing';
    SB.hud.showOnlyHud();
    SB.hud.setHealth(100); SB.hud.setWanted(0);
    SB.missions.startMission(SB.missions.index);
  },

  quitToMenu() {
    this.saveGame();
    this.state = 'menu';
    this.refreshContinueButton();
    SB.hud.show('menu');
  },

  gameOver(kind) {
    if (this.state !== 'playing') return;
    this.state = 'ended';
    this.saveGame();
    const stats = `Money: $${SB.missions.money.toLocaleString('en-US')}<br>Jobs finished: ${kind === 'complete' ? 3 : SB.missions.index} of 3<br>Health: ${Math.round(SB.player.health)}%`;
    if (kind === 'busted') SB.audio.busted();
    if (kind === 'complete') { SB.audio.jingle(); this.clearSave(); }
    SB.hud.showEnd(kind, stats);
  },

  // Stage a frame for screenshots: ?shot=chase|foot|drive skips the menu.
  stageShot(mode) {
    this.state = 'playing';
    SB.hud.showOnlyHud();
    SB.audio.resume();
    if (mode === 'foot') {
      SB.player.reset(2, -60);
      SB.player.camYaw = Math.PI * 0.95;
      SB.missions.startMission(0);
      SB.hud.setMoney(0); SB.hud.setHealth(100); SB.hud.setWanted(0);
    } else if (mode === 'drive') {
      const car = SB.vehicles.makeCar(0xd83838, false);
      car.reset(0, -30, 0);
      SB.scene.add(car.model);
      SB.parkedCars.push(car);
      SB.player.reset(0, -33);
      SB.player.stealCar(car);
      SB.police.setWanted(0);
      SB.missions.startMission(0);
      SB.missions.stage = 1;
      SB.missions.updateBeacon();
      SB.hud.setMoney(250); SB.missions.money = 250;
      SB.hud.setHealth(100); SB.hud.setWanted(0);
      SB.player.camYaw = Math.PI;
    } else if (mode === 'chase') {
      const car = SB.vehicles.makeCar(0x2f6fd8, false);
      car.reset(0, 20, Math.PI);
      SB.scene.add(car.model);
      SB.parkedCars.push(car);
      SB.player.reset(0, 17);
      SB.player.stealCar(car);
      SB.player.car.speed = 18;
      SB.police.setWanted(3);
      SB.missions.startMission(1);
      SB.missions.money = 250;
      SB.hud.setMoney(250); SB.hud.setHealth(82); SB.player.health = 82;
      SB.hud.setWanted(3);
      // Police cruisers close behind and beside the player for the shot.
      const spots = [[-4, -14], [6, -26], [-8, 34]];
      for (const [dx, dz] of spots) {
        const pc = SB.police.spawnPoliceCar(SB.scene);
        pc.pos.set(SB.player.pos.x + dx, 0, SB.player.pos.z + dz);
        pc.heading = Math.PI;
        pc.speed = 16;
        pc.syncModel();
      }
      // Traffic ahead on the same street.
      const ahead = [[2, -20], [-2, -55]];
      ahead.forEach(([tx, tz], i) => {
        const tc = SB.traffic.cars[i];
        if (tc) { tc.pos.set(tx, 0, tz); tc.heading = Math.PI; tc.syncModel(); }
      });
      SB.player.camYaw = 0;
    } else if (mode === 'package') {
      SB.player.reset(5, -46);
      SB.player.camYaw = 0.7;
      SB.missions.startMission(1);
      SB.hud.setMoney(250); SB.missions.money = 250;
      SB.hud.setHealth(100); SB.hud.setWanted(0);
    }
    // Snap the camera behind the player at once (no slow lerp on the first frame).
    SB.player.updateCamera(1);
  },

  update(dt) {
    if (this.state === 'menu') {
      this.menuAngle += dt * 0.05;
      const cam = SB.camera;
      cam.position.set(Math.sin(this.menuAngle) * 130, 55, Math.cos(this.menuAngle) * 130);
      cam.lookAt(0, 0, 0);
      SB.minimap.draw();
      return;
    }
    if (this.state !== 'playing') {
      if (this.state === 'paused' || this.state === 'ended') SB.minimap.draw();
      return;
    }
    if (SB.wasPressed('KeyP', 'Escape')) { this.togglePause(true); return; }
    if (SB.wasPressed('KeyM')) { SB.audio.setMuted(!SB.audio.muted); SB.hud.toast(SB.audio.muted ? 'Sound off' : 'Sound on'); }
    SB.player.update(dt);
    SB.player.updateCamera(dt);
    SB.traffic.update(dt, SB.player.pos);
    SB.pedestrians.update(dt, SB.player.car);
    SB.police.update(dt, SB.scene);
    SB.missions.update(dt, this.time);
    SB.combat.update(dt);
    SB.hud.setHealth(SB.player.health);
    SB.hud.setSpeed(SB.player.speedKmh, !SB.player.onFoot);
    SB.audio.setEngine(SB.player.onFoot ? 0 : Math.abs(SB.player.car ? SB.player.car.speed : 0) / 28, !SB.player.onFoot);
    SB.minimap.draw();
    SB.endFrameInput();
  },
};
SB.main = Main;

window.addEventListener('DOMContentLoaded', () => { Main.init(); });
