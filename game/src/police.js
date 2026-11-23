// police.js — the Sunset Bay PD: wanted level, pursuit, ramming and busts.

const Police = {
  wanted: 0, cars: [], decayTimer: 0, hitCooldown: 0, flashTimer: 0,

  addWanted(n, reason) {
    const before = this.wanted;
    this.wanted = SB.clamp(this.wanted + n, 0, 5);
    this.decayTimer = 0;
    if (this.wanted > before) SB.hud.setWanted(this.wanted);
  },

  setWanted(n) {
    this.wanted = SB.clamp(n, 0, 5);
    this.decayTimer = 0;
    SB.hud.setWanted(this.wanted);
  },

  anyClose(dist) {
    for (const c of this.cars) {
      if (Math.hypot(c.pos.x - SB.player.pos.x, c.pos.z - SB.player.pos.z) < dist) return true;
    }
    return false;
  },

  spawnPoliceCar(scene) {
    const car = SB.vehicles.makeCar(0xe8e8e8, true);
    // Spawn on a road 55-95 m from the player.
    let spot = SB.city.randomRoadPoint(), tries = 0;
    while (Math.hypot(spot.x - SB.player.pos.x, spot.z - SB.player.pos.z) < 55 && tries++ < 12) {
      spot = SB.city.randomRoadPoint();
    }
    car.reset(spot.x, spot.z, SB.rand(0, SB.TAU));
    scene.add(car.model);
    this.cars.push(car);
    return car;
  },

  removePoliceCar(car) {
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
    SB.scene.remove(car.model);
  },

  update(dt, scene) {
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    // Keep one cruiser per wanted star (max 5).
    while (this.cars.length < this.wanted && this.cars.length < 5) this.spawnPoliceCar(scene);
    // Wanted decays when every cruiser is far away for a while.
    if (this.wanted > 0) {
      if (this.anyClose(45)) this.decayTimer = 0;
      else {
        this.decayTimer += dt;
        if (this.decayTimer > 10) { this.setWanted(this.wanted - 1); this.decayTimer = 0; }
      }
    }
    // No wanted: cruisers leave.
    if (this.wanted === 0 && this.cars.length > 0) {
      const c = this.cars[0];
      this.removePoliceCar(c);
    }
    // Flash the light bars.
    this.flashTimer += dt;
    const on = Math.floor(this.flashTimer * 4) % 2 === 0;
    for (const car of this.cars) {
      const u = car.model.userData;
      if (u.lightRed) u.lightRed.material.color.setHex(on ? 0xff2020 : 0x551010);
      if (u.lightBlue) u.lightBlue.material.color.setHex(on ? 0x2040ff : 0x101040);
    }
    SB.audio.setSiren(this.wanted > 0, dt);
    // Chase the player.
    const p = SB.player;
    for (const car of this.cars) {
      if (car.disabled) continue;
      const dx = p.pos.x - car.pos.x, dz = p.pos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= SB.TAU; while (dh < -Math.PI) dh += SB.TAU;
      car.heading += SB.clamp(dh, -dt * 2.4, dt * 2.4);
      const speed = dist > 25 ? car.maxSpeed : car.maxSpeed * 0.75;
      car.speed = SB.lerp(car.speed, speed, SB.clamp(dt * 1.5, 0, 1));
      const f = car.forward();
      car.pos.addScaledVector(f, car.speed * dt);
      SB.city.collideCircle(car.pos, 1.6);
      car.syncModel();
      // Ram the player's car.
      if (p.car && dist < 3.4) {
        SB.vehicles.shoveCars(car, p.car, 2.2);
        if (Math.abs(car.speed) > 6 && this.hitCooldown <= 0) {
          this.hitCooldown = 0.9;
          p.takeDamage(6);
          p.car.damage(8);
          SB.hud.toast('Police rammed you!');
        }
      }
      // Grab the player on foot: busted meter fills up close.
      if (p.onFoot && dist < 4 && Math.abs(car.speed) < 4) {
        p.busted = Math.min(1, p.busted + dt * 0.45);
        if (p.busted >= 1) SB.main.gameOver('busted');
      }
    }
  },
};
SB.police = Police;
