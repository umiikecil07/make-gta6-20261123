// vehicles.js — car models and arcade driving physics for Sunset Bay.

const Vehicles = {
  PALETTE: [0xd83838, 0x2f6fd8, 0xe8c832, 0x38b06a, 0x8a5fd0, 0xe08a2e, 0xcccccc, 0x222226, 0x38c8d8],

  makeCarModel(color, isPolice) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
    body.position.y = 0.62; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), darkMat);
    cabin.position.set(0, 1.18, -0.25); g.add(cabin);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.28, 0.5), chromeMat);
    nose.position.set(0, 0.5, 2.2); g.add(nose);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
    const wheels = [];
    for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z);
      g.add(w); wheels.push(w);
    }
    // Headlights and taillights.
    const lightGeo = new THREE.BoxGeometry(0.34, 0.14, 0.08);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    for (const x of [-0.62, 0.62]) {
      const h = new THREE.Mesh(lightGeo, headMat); h.position.set(x, 0.66, 2.46); g.add(h);
      const t = new THREE.Mesh(lightGeo, tailMat); t.position.set(x, 0.66, -2.24); g.add(t);
    }
    let lightBar = null;
    if (isPolice) {
      lightBar = new THREE.Group();
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
      red.position.x = -0.32;
      const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.4), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
      blue.position.x = 0.32;
      lightBar.add(red); lightBar.add(blue);
      lightBar.position.set(0, 1.56, -0.25);
      g.add(lightBar);
      g.userData.lightRed = red; g.userData.lightBlue = blue;
    }
    g.userData.wheels = wheels;
    g.userData.lightBar = lightBar;
    return g;
  },

  // One drivable car: arcade physics, building collision, car-car shove.
  makeCar(color, isPolice) {
    const model = this.makeCarModel(color, isPolice);
    const car = {
      model, isPolice: !!isPolice,
      pos: new THREE.Vector3(), heading: 0, speed: 0,
      maxSpeed: isPolice ? 31 : 28, accel: 13, brake: 30, drag: 0.6,
      steerAngle: 0, health: 100, disabled: false, flash: 0,
      reset(x, z, heading) {
        this.pos.set(x, 0, z); this.heading = heading; this.speed = 0; this.health = 100; this.disabled = false;
        this.syncModel();
      },
      forward() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); },
      syncModel() {
        this.model.position.copy(this.pos);
        this.model.rotation.y = this.heading;
        this.model.userData.wheels.forEach((w, i) => {
          w.rotation.x += this.speed * 0.016 / 0.36 * (i < 2 ? 1 : 1);
          if (i < 2) w.rotation.y = this.steerAngle * 0.4;
        });
      },
      drive(dt, throttle, steer, braking) {
        if (this.disabled) throttle = 0;
        const target = throttle * this.maxSpeed;
        const rate = throttle !== 0 ? this.accel : this.drag * 4;
        if (braking) this.speed = SB.lerp(this.speed, 0, SB.clamp(this.brake * dt / Math.max(1, Math.abs(this.speed)), 0, 1));
        else this.speed += SB.clamp(target - this.speed, -rate * dt, rate * dt);
        this.steerAngle = SB.lerp(this.steerAngle, steer, SB.clamp(dt * 8, 0, 1));
        const spd = this.speed;
        if (Math.abs(spd) > 0.05) {
          this.heading += this.steerAngle * 0.55 * dt * Math.sign(spd) * SB.clamp(Math.abs(spd) / 8, 0, 1);
          const f = this.forward();
          this.pos.addScaledVector(f, spd * dt);
          SB.city.collideCircle(this.pos, 1.6);
        }
        this.syncModel();
      },
      damage(n) {
        this.health -= n;
        if (this.health <= 0) { this.disabled = true; this.speed = 0; }
      },
    };
    return car;
  },

  // Circle push between two cars (or a car and the player on foot).
  shoveCars(a, b, radius) {
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
    const d = Math.hypot(dx, dz), min = radius * 2;
    if (d < min && d > 0.001) {
      const push = (min - d) / 2, nx = dx / d, nz = dz / d;
      a.pos.x -= nx * push; a.pos.z -= nz * push;
      b.pos.x += nx * push; b.pos.z += nz * push;
    }
  },
};
SB.vehicles = Vehicles;
