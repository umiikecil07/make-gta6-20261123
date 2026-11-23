// traffic.js — AI cars driving the street grid of Sunset Bay.

const Traffic = {
  cars: [], COUNT: 12,

  makeLoop() {
    // A rectangular loop around one block: four corner waypoints on street centrelines.
    const streets = SB.city.streets;
    const i = SB.randInt(0, streets.length - 2), j = SB.randInt(0, streets.length - 2);
    const x1 = streets[i], x2 = streets[i + 1], z1 = streets[j], z2 = streets[j + 1];
    return [
      new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, 0, z1),
      new THREE.Vector3(x2, 0, z2), new THREE.Vector3(x1, 0, z2),
    ];
  },

  spawnCar(scene) {
    const car = SB.vehicles.makeCar(SB.pick(SB.vehicles.PALETTE), false);
    const loop = this.makeLoop();
    const start = loop[SB.randInt(0, 3)];
    car.reset(start.x, start.z, SB.rand(0, SB.TAU));
    car.loop = loop; car.wp = SB.randInt(0, 3);
    car.cruise = SB.rand(7, 11);
    scene.add(car.model);
    this.cars.push(car);
    return car;
  },

  init(scene) {
    for (let i = 0; i < this.COUNT; i++) this.spawnCar(scene);
  },

  removeCar(car) {
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
  },

  update(dt, playerPos) {
    for (const car of this.cars) {
      if (car.disabled) continue;
      const target = car.loop[car.wp];
      const dx = target.x - car.pos.x, dz = target.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4) { car.wp = (car.wp + 1) % car.loop.length; continue; }
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= SB.TAU; while (dh < -Math.PI) dh += SB.TAU;
      car.heading += SB.clamp(dh, -dt * 1.8, dt * 1.8);
      // Slow for corners and for the car ahead.
      let speed = car.cruise * SB.clamp(1 - Math.abs(dh) * 0.5, 0.35, 1);
      car.speed = SB.lerp(car.speed, speed, SB.clamp(dt * 2, 0, 1));
      const f = car.forward();
      car.pos.addScaledVector(f, car.speed * dt);
      car.syncModel();
      // Bump away from other traffic and the player's car.
      for (const other of this.cars) {
        if (other !== car && !other.disabled) SB.vehicles.shoveCars(car, other, 2.2);
      }
      if (SB.player.car && SB.player.car !== car) SB.vehicles.shoveCars(car, SB.player.car, 2.2);
      // Too far from the player: respawn on a fresh loop nearby.
      if (Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z) > 260) {
        car.loop = this.makeLoop();
        const s = car.loop[0];
        car.reset(s.x, s.z, 0);
        car.wp = 1;
      }
    }
  },

  // A traffic car the player's car just rammed: it swerves and the driver bails (car stops).
  hitByPlayer(car) {
    car.speed = 0;
    car.disabled = true;
    setTimeout(() => { car.disabled = false; }, 4000);
  },
};
SB.traffic = Traffic;
