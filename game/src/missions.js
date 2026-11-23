// missions.js — Lena Marlowe's three jobs: steal, run, and lose the heat.

const Missions = {
  index: 0, stage: 0, collected: 0, money: 0,
  beacon: null, ring: null, crates: [],
  defs: [
    {
      title: 'JOB 1 — FIRST WHEELS',
      briefing: 'Lena: "First, get us a car. Any car. Then bring it to the marina drop-off."',
      stages: ['Steal a car — walk up to one and press E', 'Drive to the marina drop-off'],
    },
    {
      title: 'JOB 2 — BAYVIEW PICKUP',
      briefing: 'Lena: "Three packages stashed around the bay. Grab them all, then come home to the Pelican."',
      stages: ['Collect the packages (0/3)', 'Return to the Pelican Motel'],
    },
    {
      title: 'JOB 3 — LOSE THE HEAT',
      briefing: 'Lena: "The PD is onto us. Lose them — all of them — then get back to the motel."',
      stages: ['Lose the cops — get your wanted level to zero', 'Reach the Pelican Motel'],
    },
  ],

  init(scene) {
    const geo = new THREE.CylinderGeometry(2.6, 2.6, 70, 16, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
    this.beacon = new THREE.Mesh(geo, mat);
    scene.add(this.beacon);
    const ringGeo = new THREE.RingGeometry(3, 4.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.15;
    scene.add(this.ring);
    // Package crates (hidden until Job 2).
    const crateGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xffb020, emissive: 0x664400 });
    for (const spot of SB.city.packageSpots) {
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(spot.x, 0.9, spot.z);
      crate.visible = false;
      scene.add(crate);
      this.crates.push(crate);
    }
  },

  startMission(i) {
    this.index = i; this.stage = 0; this.collected = 0;
    const def = this.defs[i];
    SB.hud.setMission(def.title, def.stages[0], '');
    SB.hud.toast(def.briefing);
    if (i === 1) this.crates.forEach((c) => { c.visible = true; });
    if (i === 2) SB.police.setWanted(3);
    this.updateBeacon();
    SB.main.saveGame();
  },

  currentTarget() {
    if (this.index === 0) return this.stage === 0 ? null : SB.city.dropOffPos;
    if (this.index === 1) {
      if (this.stage === 0) {
        for (let i = 0; i < this.crates.length; i++) {
          if (this.crates[i].visible) return SB.city.packageSpots[i];
        }
        return null;
      }
      return SB.city.hideoutPos;
    }
    if (this.index === 2) return this.stage === 0 ? null : SB.city.hideoutPos;
    return null;
  },

  updateBeacon() {
    const t = this.currentTarget();
    const show = !!t;
    this.beacon.visible = show; this.ring.visible = show;
    if (show) {
      this.beacon.position.set(t.x, 35, t.z);
      this.ring.position.set(t.x, 0.15, t.z);
    }
  },

  completeMission() {
    const rewards = [250, 600, 1200];
    const reward = rewards[this.index];
    this.money += reward;
    SB.hud.setMoney(this.money);
    SB.audio.jingle();
    if (this.index >= 2) {
      SB.hud.toast('All three jobs done. Sunset Bay is yours, Danny.');
      SB.main.gameOver('complete');
      return;
    }
    SB.hud.toast(`Job complete! +$${reward}`);
    this.startMission(this.index + 1);
  },

  update(dt, time) {
    const p = SB.player;
    // Beacon pulse.
    if (this.beacon.visible) {
      this.beacon.material.opacity = 0.24 + Math.sin(time * 3) * 0.1;
      this.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.08);
    }
    const def = this.defs[this.index];
    if (!def) return;
    // Mission objective text + distance.
    const t = this.currentTarget();
    const dist = t ? Math.round(Math.hypot(t.x - p.pos.x, t.z - p.pos.z)) : 0;
    const stageText = this.index === 1 && this.stage === 0
      ? `Collect the packages (${this.collected}/3)` : def.stages[this.stage];
    SB.hud.setMission(def.title, stageText, t ? `${dist} m to target` : '');
    if (this.index === 0) {
      if (this.stage === 0 && !p.onFoot) { this.stage = 1; this.updateBeacon(); SB.hud.toast('Good. Now drive to the marina drop-off.'); }
      else if (this.stage === 1 && t && Math.hypot(t.x - p.pos.x, t.z - p.pos.z) < 9) this.completeMission();
    } else if (this.index === 1) {
      if (this.stage === 0) {
        for (let i = 0; i < this.crates.length; i++) {
          const crate = this.crates[i];
          if (!crate.visible) continue;
          if (Math.hypot(crate.position.x - p.pos.x, crate.position.z - p.pos.z) < 4) {
            crate.visible = false; this.collected++;
            SB.audio.pickup();
            SB.hud.toast(`Package ${this.collected}/3 collected.`);
            if (this.collected >= 3) { this.stage = 1; this.updateBeacon(); SB.hud.toast('All packages. Get back to the Pelican Motel.'); }
          }
        }
      } else if (t && Math.hypot(t.x - p.pos.x, t.z - p.pos.z) < 9) this.completeMission();
    } else if (this.index === 2) {
      if (this.stage === 0 && SB.police.wanted === 0) {
        this.stage = 1; this.updateBeacon();
        SB.hud.toast('Clean. Now get to the Pelican Motel.');
      } else if (this.stage === 1 && t && Math.hypot(t.x - p.pos.x, t.z - p.pos.z) < 9) this.completeMission();
    }
  },

  reset() {
    this.index = 0; this.stage = 0; this.collected = 0; this.money = 0;
    this.crates.forEach((c) => { c.visible = false; });
  },
};
SB.missions = Missions;
