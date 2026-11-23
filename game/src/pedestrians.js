// pedestrians.js — the people of Sunset Bay: walking NPCs on the sidewalks.

const Pedestrians = {
  list: [], COUNT: 18,
  SHIRTS: [0xe8e8e8, 0x3a6fd8, 0xd83838, 0x38b06a, 0xe8c832, 0xd88a2e, 0x8a5fd0, 0x38c8d8],

  makePed() {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: SB.pick(this.SHIRTS) });
    const skin = new THREE.MeshLambertMaterial({ color: SB.pick([0xd8a06a, 0x8a5a3a, 0xe8b88a, 0x5a3a28]) });
    const pants = new THREE.MeshLambertMaterial({ color: SB.pick([0x2a2a33, 0x4a4a55, 0x6a5a4a]) });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.3), shirt);
    body.position.y = 1.1; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
    head.position.y = 1.66; g.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.66, 0.2), pants);
    legL.position.set(-0.14, 0.5, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.14; g.add(legR);
    return { group: g, legL, legR };
  },

  init(scene) {
    for (let i = 0; i < this.COUNT; i++) {
      const p = this.makePed();
      const spot = SB.city.randomSidewalkPoint();
      p.group.position.copy(spot);
      scene.add(p.group);
      this.list.push({
        ...p, pos: spot, heading: SB.rand(0, SB.TAU), speed: SB.rand(1.1, 1.9),
        target: SB.city.randomSidewalkPoint(), phase: SB.rand(0, 6),
        down: false, downTimer: 0, fleeing: false,
      });
    }
  },

  knockDown(ped, fromPos) {
    if (ped.down) return;
    ped.down = true; ped.downTimer = 3;
    ped.group.rotation.x = -Math.PI / 2;
    ped.group.position.y = 0.3;
    SB.audio.crash();
  },

  scareNear(pos, radius) {
    for (const ped of this.list) {
      if (ped.down) continue;
      const d = Math.hypot(ped.pos.x - pos.x, ped.pos.z - pos.z);
      if (d < radius) {
        ped.fleeing = true;
        ped.target = new THREE.Vector3(ped.pos.x + (ped.pos.x - pos.x), 0, ped.pos.z + (ped.pos.z - pos.z));
      }
    }
  },

  update(dt, playerCar) {
    for (const ped of this.list) {
      if (ped.down) {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) {
          ped.down = false; ped.fleeing = false;
          ped.group.rotation.x = 0; ped.group.position.y = 0;
          const spot = SB.city.randomSidewalkPoint();
          ped.pos.copy(spot); ped.group.position.copy(spot);
          ped.target = SB.city.randomSidewalkPoint();
        }
        continue;
      }
      const dx = ped.target.x - ped.pos.x, dz = ped.target.z - ped.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) { ped.target = SB.city.randomSidewalkPoint(); ped.fleeing = false; continue; }
      const speed = ped.fleeing ? 3.4 : ped.speed;
      ped.heading = Math.atan2(dx, dz);
      ped.pos.x += Math.sin(ped.heading) * speed * dt;
      ped.pos.z += Math.cos(ped.heading) * speed * dt;
      ped.phase += dt * speed * 2.4;
      const swing = Math.sin(ped.phase) * 0.45;
      ped.legL.rotation.x = swing; ped.legR.rotation.x = -swing;
      ped.group.position.copy(ped.pos);
      ped.group.rotation.y = ped.heading;
      // Hit by the player's car: wanted up, ped goes down.
      if (playerCar && Math.abs(playerCar.speed) > 3) {
        const d = Math.hypot(ped.pos.x - playerCar.pos.x, ped.pos.z - playerCar.pos.z);
        if (d < 2.2) {
          this.knockDown(ped, playerCar.pos);
          SB.police.addWanted(1, 'pedestrian hit');
          SB.hud.toast('You hit a pedestrian! Wanted level up.');
        }
      }
    }
  },
};
SB.pedestrians = Pedestrians;
