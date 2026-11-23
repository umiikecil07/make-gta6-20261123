// player.js — Danny Vega on foot and behind the wheel: movement, camera, car theft.

const Player = {
  pos: new THREE.Vector3(), heading: 0, vy: 0, onGround: true,
  onFoot: true, car: null, health: 100, busted: 0, walkPhase: 0,
  camYaw: 0, camPitch: 0.32, camDist: 8, speedKmh: 0,
  model: null, legL: null, legR: null, armL: null, armR: null,

  makeModel() {
    const g = new THREE.Group();
    const jacket = new THREE.MeshLambertMaterial({ color: 0x2e6f8e });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd8a06a });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2a2a33 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), jacket);
    body.position.y = 1.18; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
    head.position.y = 1.78; g.add(head);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), new THREE.MeshLambertMaterial({ color: 0xd83838 }));
    cap.position.y = 1.96; g.add(cap);
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), pants);
    this.legL.position.set(-0.16, 0.55, 0); g.add(this.legL);
    this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), pants);
    this.legR.position.set(0.16, 0.55, 0); g.add(this.legR);
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), jacket);
    this.armL.position.set(-0.42, 1.2, 0); g.add(this.armL);
    this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), jacket);
    this.armR.position.set(0.42, 1.2, 0); g.add(this.armR);
    this.model = g;
    return g;
  },

  reset(x, z) {
    this.pos.set(x, 0, z); this.heading = 0; this.vy = 0;
    this.onFoot = true; this.car = null; this.health = 100; this.busted = 0;
    this.camYaw = Math.PI; this.camPitch = 0.32;
    if (this.model) this.model.visible = true;
  },

  nearestCar(maxDist) {
    let best = null, bestD = maxDist;
    for (const c of SB.parkedCars) {
      const d = Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (d < bestD) { best = c; bestD = d; }
    }
    for (const c of SB.traffic.cars) {
      if (c.disabled) continue;
      const d = Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  },

  stealCar(car) {
    SB.traffic.removeCar(car);
    const i = SB.parkedCars.indexOf(car);
    if (i >= 0) SB.parkedCars.splice(i, 1);
    this.car = car; this.onFoot = false;
    this.model.visible = false;
    this.pos.copy(car.pos);
    SB.police.addWanted(1, 'car stolen');
    SB.hud.toast('You stole the car! The cops are coming.');
    SB.audio.blip(440, 0.15, 'square', 0.15);
  },

  exitCar() {
    if (!this.car) return;
    const c = this.car;
    this.pos.copy(c.pos).add(new THREE.Vector3(Math.cos(c.heading + 1.2), 0, -Math.sin(c.heading + 1.2)).multiplyScalar(2.4));
    SB.city.collideCircle(this.pos, 0.5);
    SB.parkedCars.push(c);
    this.car = null; this.onFoot = true;
    this.model.visible = true;
    this.camYaw = c.heading + Math.PI;
  },

  takeDamage(n) {
    this.health = Math.max(0, this.health - n);
    SB.hud.flashVignette();
    SB.audio.crash();
    if (this.health <= 0) SB.main.gameOver('wasted');
  },

  update(dt) {
    // Camera orbit from mouse drag.
    this.camYaw -= SB.mouseDX * 0.004;
    this.camPitch = SB.clamp(this.camPitch + SB.mouseDY * 0.003, 0.05, 0.9);
    if (this.onFoot) {
      const fwd = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      let mx = 0, mz = 0;
      if (SB.key('KeyW', 'ArrowUp')) { mx += fwd.x; mz += fwd.z; }
      if (SB.key('KeyS', 'ArrowDown')) { mx -= fwd.x; mz -= fwd.z; }
      if (SB.key('KeyA', 'ArrowLeft')) { mx -= right.x; mz -= right.z; }
      if (SB.key('KeyD', 'ArrowRight')) { mx += right.x; mz += right.z; }
      const len = Math.hypot(mx, mz);
      const run = SB.key('ShiftLeft', 'ShiftRight');
      const speed = run ? 8 : 4.2;
      if (len > 0.01) {
        mx /= len; mz /= len;
        this.pos.x += mx * speed * dt; this.pos.z += mz * speed * dt;
        const targetHeading = Math.atan2(mx, mz);
        let dh = targetHeading - this.heading;
        while (dh > Math.PI) dh -= SB.TAU; while (dh < -Math.PI) dh += SB.TAU;
        this.heading += SB.clamp(dh, -dt * 10, dt * 10);
        this.walkPhase += dt * speed * 1.6;
      }
      // Jump.
      if (SB.wasPressed('Space') && this.onGround) { this.vy = 5.2; this.onGround = false; }
      if (!this.onGround) {
        this.vy -= 14 * dt; this.pos.y += this.vy * dt;
        if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.onGround = true; }
      }
      SB.city.collideCircle(this.pos, 0.5);
      // Walk animation.
      const swing = len > 0.01 ? Math.sin(this.walkPhase) * 0.5 : 0;
      this.legL.rotation.x = swing; this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.7; this.armR.rotation.x = swing * 0.7;
      this.model.position.copy(this.pos);
      this.model.rotation.y = this.heading;
      this.speedKmh = len > 0.01 ? Math.round(speed * 3.6) : 0;
      // Steal a car.
      if (SB.wasPressed('KeyE')) {
        const car = this.nearestCar(3.6);
        if (car) this.stealCar(car);
        else SB.hud.toast('No car nearby — walk up to one and press E.');
      }
    } else if (this.car) {
      const throttle = (SB.key('KeyW', 'ArrowUp') ? 1 : 0) + (SB.key('KeyS', 'ArrowDown') ? -0.6 : 0);
      const steer = (SB.key('KeyA', 'ArrowLeft') ? 1 : 0) + (SB.key('KeyD', 'ArrowRight') ? -1 : 0);
      const braking = SB.key('Space');
      this.car.drive(dt, throttle, steer, braking);
      this.pos.copy(this.car.pos);
      this.heading = this.car.heading;
      this.speedKmh = Math.round(Math.abs(this.car.speed) * 3.6);
      // Camera follows the car's heading unless the player drags it.
      const targetYaw = this.car.heading + Math.PI;
      let dy = targetYaw - this.camYaw;
      while (dy > Math.PI) dy -= SB.TAU; while (dy < -Math.PI) dy += SB.TAU;
      this.camYaw += dy * SB.clamp(dt * 1.6, 0, 1);
      if (SB.wasPressed('KeyE')) this.exitCar();
    }
    // Busted meter decays when no police is close (police sets it while grabbing).
    if (this.busted > 0 && !SB.police.anyClose(6)) this.busted = Math.max(0, this.busted - dt * 0.25);
    SB.hud.setBusted(this.busted);
  },

  updateCamera(dt) {
    const target = new THREE.Vector3(this.pos.x, this.pos.y + 1.7, this.pos.z);
    const dist = this.onFoot ? 7.5 : 11;
    const height = this.onFoot ? 2.6 : 3.6;
    const cx = target.x + Math.sin(this.camYaw) * dist * Math.cos(this.camPitch);
    const cz = target.z + Math.cos(this.camYaw) * dist * Math.cos(this.camPitch);
    const cy = target.y + height * Math.sin(this.camPitch) + 1.2;
    const cam = SB.camera;
    cam.position.x = SB.lerp(cam.position.x, cx, SB.clamp(dt * 6, 0, 1));
    cam.position.y = SB.lerp(cam.position.y, cy, SB.clamp(dt * 6, 0, 1));
    cam.position.z = SB.lerp(cam.position.z, cz, SB.clamp(dt * 6, 0, 1));
    cam.lookAt(target.x - Math.sin(this.camYaw) * 2, target.y + 0.4, target.z - Math.cos(this.camYaw) * 2);
  },
};
SB.player = Player;
SB.parkedCars = [];
