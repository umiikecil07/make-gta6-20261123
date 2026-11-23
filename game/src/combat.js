// combat.js — Danny's pistol: click to shoot, with muzzle flash and a tracer.

const Combat = {
  cooldown: 0, flash: null, tracer: null, tracerTimer: 0,

  init(scene) {
    this.flash = new THREE.PointLight(0xffe9a8, 0, 18);
    scene.add(this.flash);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    this.tracer.visible = false;
    scene.add(this.tracer);
  },

  shoot() {
    if (this.cooldown > 0 || !SB.player.onFoot) return;
    this.cooldown = 0.28;
    SB.audio.gunshot();
    const cam = SB.camera;
    const origin = new THREE.Vector3().copy(SB.player.pos).add(new THREE.Vector3(0, 1.5, 0));
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    // Muzzle flash at the player's hand.
    this.flash.position.copy(origin).addScaledVector(dir, 1.2);
    this.flash.intensity = 3;
    setTimeout(() => { this.flash.intensity = 0; }, 60);
    // Tracer line.
    const end = origin.clone().addScaledVector(dir, 60);
    const posAttr = this.tracer.geometry.getAttribute('position');
    posAttr.setXYZ(0, origin.x, origin.y, origin.z);
    posAttr.setXYZ(1, end.x, end.y, end.z);
    posAttr.needsUpdate = true;
    this.tracer.visible = true;
    this.tracerTimer = 0.07;
    // Hit test: pedestrians first, then police cars, then traffic.
    let hitSomething = false;
    for (const ped of SB.pedestrians.list) {
      if (ped.down) continue;
      const d = Math.hypot(ped.pos.x - origin.x, ped.pos.z - origin.z);
      if (d > 60) continue;
      const toPed = new THREE.Vector3(ped.pos.x - origin.x, 1.1 - origin.y, ped.pos.z - origin.z).normalize();
      if (toPed.angleTo(dir) < 0.045) {
        SB.pedestrians.knockDown(ped, origin);
        SB.police.addWanted(1, 'shot a pedestrian');
        SB.hud.toast('You shot a pedestrian! Wanted level up.');
        hitSomething = true;
        break;
      }
    }
    if (!hitSomething) {
      const targets = [...SB.police.cars, ...SB.traffic.cars];
      for (const car of targets) {
        if (car.disabled) continue;
        const d = Math.hypot(car.pos.x - origin.x, car.pos.z - origin.z);
        if (d > 60) continue;
        const toCar = new THREE.Vector3(car.pos.x - origin.x, 0.8 - origin.y, car.pos.z - origin.z).normalize();
        if (toCar.angleTo(dir) < 0.06) {
          car.damage(34);
          if (car.isPolice) {
            SB.police.addWanted(1, 'shot a police car');
            SB.hud.toast('You shot a police cruiser!');
            if (car.disabled) SB.hud.toast('Police cruiser disabled!');
          }
          hitSomething = true;
          break;
        }
      }
    }
    if (!hitSomething) SB.pedestrians.scareNear(end, 12);
  },

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.tracerTimer > 0) {
      this.tracerTimer -= dt;
      if (this.tracerTimer <= 0) this.tracer.visible = false;
    }
    if (SB.clicked && SB.main.state === 'playing') this.shoot();
  },
};
SB.combat = Combat;
