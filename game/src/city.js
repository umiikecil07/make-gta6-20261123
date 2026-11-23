// city.js — Sunset Bay itself: a sun-soaked coastal city grid with roads, buildings,
// sidewalks, streetlights, trees, a beach and a marina. One seeded layout, identical every load.

const City = {
  PITCH: 52, ROAD_HALF: 6, EXTENT: 162, SIZE: 420,
  streets: [-156, -104, -52, 0, 52, 104, 156],
  buildings: [], // {minX,maxX,minZ,maxZ}
  hideoutPos: null, dropOffPos: null, marinaPos: null, packageSpots: [],

  makeWindowTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#20242e'; g.fillRect(0, 0, 128, 256);
    for (let y = 8; y < 248; y += 22) {
      for (let x = 8; x < 120; x += 20) {
        const lit = SB.rng() < 0.35;
        g.fillStyle = lit ? '#ffd98a' : '#3d4a63';
        g.fillRect(x, y, 13, 14);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  },

  makeGroundTexture() {
    const S = 1024, W = this.SIZE, px = S / W; // pixels per metre
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    const toPx = (v) => (v + W / 2) * px;
    // Block concrete base.
    g.fillStyle = '#8f8a80'; g.fillRect(0, 0, S, S);
    // Subtle block noise.
    for (let i = 0; i < 900; i++) {
      g.fillStyle = SB.rng() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      g.fillRect(SB.rng() * S, SB.rng() * S, 6, 6);
    }
    // Roads: dark asphalt bands along every street.
    g.fillStyle = '#33333c';
    for (const s of this.streets) {
      g.fillRect(toPx(s - this.ROAD_HALF), 0, this.ROAD_HALF * 2 * px, S);
      g.fillRect(0, toPx(s - this.ROAD_HALF), S, this.ROAD_HALF * 2 * px);
    }
    // Sidewalks: pale strips just outside each road.
    g.fillStyle = '#b5ada0';
    for (const s of this.streets) {
      g.fillRect(toPx(s - this.ROAD_HALF - 3), 0, 3 * px, S);
      g.fillRect(toPx(s + this.ROAD_HALF), 0, 3 * px, S);
      g.fillRect(0, toPx(s - this.ROAD_HALF - 3), S, 3 * px);
      g.fillRect(0, toPx(s + this.ROAD_HALF), S, 3 * px);
    }
    // Lane dashes.
    g.fillStyle = '#e8c85a';
    for (const s of this.streets) {
      for (let v = -this.EXTENT; v < this.EXTENT; v += 10) {
        g.fillRect(toPx(s) - 1, toPx(v), 2, 5 * px);
        g.fillRect(toPx(v), toPx(s) - 1, 5 * px, 2);
      }
    }
    // Crosswalks at every intersection.
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (const sx of this.streets) for (const sz of this.streets) {
      for (let k = -2; k <= 2; k++) {
        g.fillRect(toPx(sx + k * 1.8) - 1.5, toPx(sz - this.ROAD_HALF), 3, this.ROAD_HALF * px);
        g.fillRect(toPx(sx + k * 1.8) - 1.5, toPx(sz), 3, this.ROAD_HALF * px);
      }
    }
    // Beach sand on the south edge.
    g.fillStyle = '#e6cf9e';
    g.fillRect(0, toPx(168), S, S - toPx(168));
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  },

  buildCity(scene) {
    // Sky, sun and fog: warm late-afternoon light.
    scene.background = new THREE.Color(0xffc98a);
    scene.fog = new THREE.Fog(0xffc98a, 170, 520);
    const hemi = new THREE.HemisphereLight(0xffe0b3, 0x4a3a5e, 0.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffb066, 1.3);
    sun.position.set(-120, 140, 60);
    scene.add(sun);
    // Sun disc low on the horizon.
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(26, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false })
    );
    sunDisc.position.set(-260, 55, -300); sunDisc.lookAt(0, 20, 0);
    scene.add(sunDisc);

    // Ground.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.SIZE, this.SIZE),
      new THREE.MeshLambertMaterial({ map: this.makeGroundTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    // Sea beyond the beach.
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 160),
      new THREE.MeshLambertMaterial({ color: 0x2f7fb8 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.4, 290);
    scene.add(sea);

    // Buildings: 1-4 per block, varied heights and warm colours.
    const winTex = this.makeWindowTexture();
    const palette = [0xd8a06a, 0xc98d7a, 0x9fb4c8, 0xd8c49a, 0xb08a9e, 0x8fb0a0, 0xe0b070, 0xa89ac0];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const roofGeo = new THREE.BoxGeometry(1, 0.5, 1);
    const mats = palette.map((col) => {
      const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(2, 3);
      return new THREE.MeshLambertMaterial({ color: col, map: t });
    });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a4a42 });
    const propMat = new THREE.MeshLambertMaterial({ color: 0x6a6a72 });
    for (let bx = 0; bx < 6; bx++) for (let bz = 0; bz < 6; bz++) {
      const x0 = -156 + bx * 52 + 9, z0 = -156 + bz * 52 + 9; // block inner corner
      const n = SB.randInt(1, 3);
      for (let i = 0; i < n; i++) {
        const w = SB.rand(10, 18), d = SB.rand(10, 18), h = SB.rand(8, 42);
        const x = x0 + SB.rand(2, 34 - w), z = z0 + SB.rand(2, 34 - d);
        const b = new THREE.Mesh(boxGeo, SB.pick(mats));
        b.scale.set(w, h, d);
        b.position.set(x + w / 2, h / 2, z + d / 2);
        scene.add(b);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.scale.set(w * 0.7, 1, d * 0.7);
        roof.position.set(x + w / 2, h + 0.25, z + d / 2);
        scene.add(roof);
        if (SB.rng() < 0.4) { // rooftop AC box
          const ac = new THREE.Mesh(boxGeo, propMat);
          ac.scale.set(2, 1.2, 2);
          ac.position.set(x + w / 2 + SB.rand(-3, 3), h + 1, z + d / 2 + SB.rand(-3, 3));
          scene.add(ac);
        }
        this.buildings.push({ minX: x, maxX: x + w, minZ: z, maxZ: z + d });
      }
    }

    // Streetlights at intersections, trees along sidewalks.
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
    const lampGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a44 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 2.4, 6);
    const leafGeo = new THREE.ConeGeometry(1.8, 4.5, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2e });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
    for (const sx of this.streets) for (const sz of this.streets) {
      if (SB.rng() < 0.55) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(sx + 8, 3.5, sz + 8); scene.add(pole);
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(sx + 8, 7.1, sz + 8); scene.add(lamp);
      }
    }
    for (let i = 0; i < 46; i++) {
      const s = SB.pick(this.streets), along = SB.rand(-150, 150);
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 1.2;
      const leaf = new THREE.Mesh(leafGeo, leafMat); leaf.position.y = 4.4;
      tree.add(trunk); tree.add(leaf);
      tree.position.set(SB.rng() < 0.5 ? s + 8.5 : along, 0, SB.rng() < 0.5 ? along : s + 8.5);
      scene.add(tree);
    }

    // Marina pier on the beach (south-east), Pelican Motel hideout (north-west).
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
    const pier = new THREE.Mesh(boxGeo, pierMat);
    pier.scale.set(8, 0.8, 46); pier.position.set(130, 0.4, 196); scene.add(pier);
    this.marinaPos = new THREE.Vector3(130, 0, 178);
    this.dropOffPos = new THREE.Vector3(130, 0, 172);
    this.hideoutPos = new THREE.Vector3(-148, 0, -148);
    // Hideout: a low motel block with a glowing sign.
    const motel = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x2e8f86 }));
    motel.scale.set(24, 7, 10); motel.position.set(-148, 3.5, -150); scene.add(motel);
    this.buildings.push({ minX: -160, maxX: -136, minZ: -155, maxZ: -145 });
    const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 96;
    const sg = signCanvas.getContext('2d');
    sg.fillStyle = '#123a3a'; sg.fillRect(0, 0, 512, 96);
    sg.fillStyle = '#ffd75e'; sg.font = 'bold 52px Arial'; sg.textAlign = 'center';
    sg.fillText('PELICAN MOTEL', 256, 66);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 3.8),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    sign.position.set(-148, 8.6, -144.8); scene.add(sign);

    // Package pickup spots (missions): plaza, park corner, marina.
    this.packageSpots = [
      new THREE.Vector3(0, 0, -52),
      new THREE.Vector3(104, 0, 52),
      new THREE.Vector3(-52, 0, 104),
    ];
    return this;
  },

  isOnRoad(x, z) {
    for (const s of this.streets) {
      if (Math.abs(x - s) < this.ROAD_HALF || Math.abs(z - s) < this.ROAD_HALF) return true;
    }
    return false;
  },

  collideCircle(p, r) {
    // Push a circle (x,z) out of every building AABB; clamp to the city edge.
    for (const b of this.buildings) {
      const cx = SB.clamp(p.x, b.minX, b.maxX), cz = SB.clamp(p.z, b.minZ, b.maxZ);
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r;
      } else if (d2 <= 0.0001) {
        p.x = b.maxX + r; // centre inside a building: shove out east
      }
    }
    p.x = SB.clamp(p.x, -this.EXTENT, this.EXTENT);
    p.z = SB.clamp(p.z, -this.EXTENT, 205);
  },

  randomRoadPoint() {
    const horizontal = SB.rng() < 0.5;
    const s = SB.pick(this.streets);
    const along = SB.rand(-150, 150);
    return horizontal ? new THREE.Vector3(along, 0, s) : new THREE.Vector3(s, 0, along);
  },

  randomSidewalkPoint() {
    const s = SB.pick(this.streets), along = SB.rand(-150, 150);
    return SB.rng() < 0.5
      ? new THREE.Vector3(along, 0, s + 8.2)
      : new THREE.Vector3(s + 8.2, 0, along);
  },
};
SB.city = City;
