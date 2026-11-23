// minimap.js — the 2D top-down map in the HUD: roads, player, cars, police, mission marker.

const Minimap = {
  canvas: null, ctx: null, RANGE: 130,

  init() {
    this.canvas = document.getElementById('minimap');
    this.ctx = this.canvas.getContext('2d');
  },

  worldToMap(x, z, px, pz, scale) {
    return [100 + (x - px) * scale, 100 + (z - pz) * scale];
  },

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const p = SB.player.pos;
    const scale = 200 / (this.RANGE * 2);
    ctx.clearRect(0, 0, 200, 200);
    // Map background.
    ctx.fillStyle = '#141828';
    ctx.fillRect(0, 0, 200, 200);
    // Roads.
    ctx.strokeStyle = '#4a4a58';
    ctx.lineWidth = 5;
    for (const s of SB.city.streets) {
      const [x1, y1] = this.worldToMap(s, -this.RANGE + p.z, p.x, p.z, scale);
      const [x2, y2] = this.worldToMap(s, this.RANGE + p.z, p.x, p.z, scale);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const [x3, y3] = this.worldToMap(-this.RANGE + p.x, s, p.x, p.z, scale);
      const [x4, y4] = this.worldToMap(this.RANGE + p.x, s, p.x, p.z, scale);
      ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
    }
    // Beach and sea at the south edge.
    ctx.fillStyle = '#e6cf9e';
    const [bx, by] = this.worldToMap(p.x, 168, p.x, p.z, scale);
    if (by < 200) ctx.fillRect(0, by, 200, 200 - by);
    // Mission marker: yellow diamond.
    const target = SB.missions.currentTarget();
    if (target) {
      const [mx, my] = this.worldToMap(target.x, target.z, p.x, p.z, scale);
      if (mx >= 0 && mx <= 200 && my >= 0 && my <= 200) {
        ctx.fillStyle = '#ffd75e';
        ctx.beginPath();
        ctx.moveTo(mx, my - 8); ctx.lineTo(mx + 7, my); ctx.lineTo(mx, my + 8); ctx.lineTo(mx - 7, my);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        // Off-map: an arrow on the edge pointing at it.
        const ang = Math.atan2(target.x - p.x, target.z - p.z);
        const ex = 100 + Math.sin(ang) * 92, ey = 100 + Math.cos(ang) * 92;
        ctx.fillStyle = '#ffd75e';
        ctx.beginPath(); ctx.arc(ex, ey, 6, 0, SB.TAU); ctx.fill();
      }
    }
    // Hideout: green house square.
    const [hx, hy] = this.worldToMap(SB.city.hideoutPos.x, SB.city.hideoutPos.z, p.x, p.z, scale);
    ctx.fillStyle = '#7dff9e';
    ctx.fillRect(hx - 4, hy - 4, 8, 8);
    // Traffic cars: white dots. Police: flashing blue/red dots.
    ctx.fillStyle = '#ffffff';
    for (const car of SB.traffic.cars) {
      const [cx, cy] = this.worldToMap(car.pos.x, car.pos.z, p.x, p.z, scale);
      if (cx >= 0 && cx <= 200 && cy >= 0 && cy <= 200) { ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, SB.TAU); ctx.fill(); }
    }
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    ctx.fillStyle = flash ? '#3a6fff' : '#ff3b30';
    for (const car of SB.police.cars) {
      const [cx, cy] = this.worldToMap(car.pos.x, car.pos.z, p.x, p.z, scale);
      if (cx >= 0 && cx <= 200 && cy >= 0 && cy <= 200) { ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, SB.TAU); ctx.fill(); }
    }
    // Pedestrians: faint grey dots.
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    for (const ped of SB.pedestrians.list) {
      if (ped.down) continue;
      const [cx, cy] = this.worldToMap(ped.pos.x, ped.pos.z, p.x, p.z, scale);
      if (cx >= 0 && cx <= 200 && cy >= 0 && cy <= 200) { ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, SB.TAU); ctx.fill(); }
    }
    // Player arrow (rotates with heading), ringed.
    ctx.save();
    ctx.translate(100, 100);
    ctx.rotate(Math.PI - SB.player.heading);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1a0f2e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // Border ring.
    ctx.strokeStyle = 'rgba(255,207,125,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(100, 100, 98, 0, SB.TAU); ctx.stroke();
  },
};
SB.minimap = Minimap;
