'use strict';

// ================================================================
//  COLONY MANAGER
//  Central economy: food storage, egg production, nursery hatching,
//  upgrades, and Phase 4 corpse room + disease mechanic.
// ================================================================
class ColonyManager {
  constructor(game) {
    this._game = game;          // back-reference for upgrade side-effects

    // ── Economy ──────────────────────────────────────────────────
    this.foodStored = 25;
    this.maxFoodCap = 100;
    this.totalFood = 0;     // all-time food delivered

    // ── Life cycle ───────────────────────────────────────────────
    this.eggs = 0;
    this.totalDeaths = 0;

    // ── Population cap ───────────────────────────────────────────
    this.maxPopulation = 180;

    // ── Upgrade levels ───────────────────────────────────────────
    this.pheromoneLevel = 0;
    this.storageLevel = 0;
    this.nurseryLevel = 0;
    this.recycleLevel = 0;    // Phase 4: corpse recycling
    this.acidFacilityLevel = 0; // Phase 8: acid lab
    this.commanderLevel = 0;  // Commander HQ (unlock commander summon)

    // ── Timers ───────────────────────────────────────────────────
    this._eggTimer = 0;
    this._hatchTimer = 0;
    this.eggRate = 5;    // seconds per egg (queen production)
    this.hatchRate = 4;    // seconds per hatch (nursery)

    // ── Phase 5: Queen's Energy ───────────────────────────────────
    this.queenEnergy = 100;  // current energy level
    this.maxQueenEnergy = 100;
    this._energyTimer = 0;    // timer for food→energy conversion

    // ── Phase 5: Colony Tuning (driven by UI sliders) ─────────────
    this.tuning = { forageWeight: 1.0, sanitWeight: 1.0, defenseWeight: 1.0 };

    // ── Phase 7: Caste Spawn Ratio ─────────────────────────────────
    this.casteRatio = { scout: 10, worker: 70, soldier: 10, acid: 10 };

    // ── Phase 4: Corpse Room ──────────────────────────────────────
    this.corpses = 0;  // corpse units stored in nest
    this.corpseThreshold = 40; // above this → disease penalty
    this._corpseDecayTimer = 0; // natural slow decay
    this._recycleTimer = 0;  // passive recycle interval
    this._recycleFood = 0;  // fractional food accumulator

    // ── DOM cache ────────────────────────────────────────────────
    this._d = {};
    this._bindDOM();
    this._bindButtons();
  }

  // ── Public API ────────────────────────────────────────────────
  get isStarving() { return this.foodStored <= 0; }
  get isDisease() { return this.corpses > this.corpseThreshold; }
  get diseaseMult() { return this.isDisease ? 1.15 : 1.0; }  // 1.5→1.15: 전투 환경에서 덜 가혹하게

  addFood(n = 1) {
    this.foodStored = Math.min(this.maxFoodCap, this.foodStored + n);
    this.totalFood += n;
  }

  // Phase 4: called when ant delivers a carcass pellet to the nest
  addCorpse(n = 1) { this.corpses += n; }

  // Called every frame by Game._update().
  // Returns { count, role } — Phase 7: caste-aware spawn info.
  tick(dt, antCount, liveCarcasses) {
    // ── Queen: lay eggs when not starving (no food cost at lay time) ─
    if (!this.isStarving) {
      this._eggTimer += dt;
      if (this._eggTimer >= this.eggRate) {
        this._eggTimer = 0;
        this.eggs++;
        // Phase 7: egg food cost is paid at hatch (role-based); no cost here
      }
    } else {
      this._eggTimer = 0;
    }

    // ── Nursery: hatch one egg → ant (Phase 7: role-based cost) ───
    let toSpawn = 0, toSpawnRole = 'worker';
    if (this.eggs > 0 && antCount < this.maxPopulation) {
      this._hatchTimer += dt;
      if (this._hatchTimer >= this.hatchRate) {
        this._hatchTimer = 0;
        // Pick role from probability weights; fall back if food insufficient
        let role = this._pickRole();
        const costs = { worker: CFG.COST_WORKER, soldier: CFG.COST_SOLDIER, acid: CFG.COST_ACID };
        // Graceful downgrade: acid→soldier→worker
        while (role !== 'worker' && this.foodStored < costs[role]) {
          role = role === 'acid' ? 'soldier' : 'worker';
        }
        if (this.foodStored >= costs[role]) {
          this.foodStored = Math.max(0, this.foodStored - costs[role]);
          this.eggs--;
          toSpawn = 1;
          toSpawnRole = role;
        } else {
          // Can't even afford a worker — keep egg, try again soon
          this._hatchTimer = this.hatchRate * 0.75;
        }
      }
    }

    // ── Queen Energy: regenerate from food (1 food → 20 energy / 5 s) ──
    if (this.queenEnergy < this.maxQueenEnergy && this.foodStored > 0) {
      this._energyTimer += dt;
      if (this._energyTimer >= 5) {
        this._energyTimer = 0;
        this.foodStored = Math.max(0, this.foodStored - 1);
        this.queenEnergy = Math.min(this.maxQueenEnergy, this.queenEnergy + 20);
      }
    }

    // ── Corpse Room: natural decay (1 corpse per 60 s) ───────
    if (this.corpses > 0) {
      this._corpseDecayTimer += dt;
      if (this._corpseDecayTimer >= 60) {
        this._corpseDecayTimer = 0;
        this.corpses = Math.max(0, this.corpses - 1);
      }
    }

    // ── Corpse Room: batch recycling — always active, upgrades add speed & batch size ──
    // Lv.0: 3개 묶음 / 4 s → 0.5 food/개  (업그레이드 없이도 동작)
    // Lv.1: 4개 묶음 / 3 s → 0.5 food/개
    // Lv.2: 5개 묶음 / 2 s → 0.75 food/개
    // Lv.3: 7개 묶음 / 1.5 s → 1.0 food/개
    if (this.corpses > 0) {
      const intervals = [4, 3, 2, 1.5];
      const batches = [3, 4, 5, 7];
      const yields = [0.5, 0.5, 0.75, 1.0];
      const lvl = Math.min(this.recycleLevel, 3);
      this._recycleTimer += dt;
      if (this._recycleTimer >= intervals[lvl]) {
        this._recycleTimer = 0;
        const n = Math.min(batches[lvl], this.corpses);
        this.corpses -= n;
        this._recycleFood += yields[lvl] * n;
        if (this._recycleFood >= 1) {
          const gained = Math.floor(this._recycleFood);
          this.addFood(gained);
          this._recycleFood -= gained;
        }
      }
    }

    this._refreshUI(antCount, liveCarcasses);
    return { count: toSpawn, role: toSpawnRole };
  }

  // ── Phase 7: Role picker based on casteRatio ──────────────────
  _pickRole() {
    const r = Math.random() * 100;
    const { scout, worker, soldier } = this.casteRatio;
    if (r < scout) return 'scout';
    if (r < scout + worker) return 'worker';
    if (r < scout + worker + soldier) return 'soldier';
    // Fallback if acid facility is not built: spawn soldier or worker
    if (this.acidFacilityLevel === 0) {
      return Math.random() < 0.5 ? 'soldier' : 'worker';
    }
    return 'acid';
  }

  // ── Upgrades ──────────────────────────────────────────────────
  // 식량 부족 시 버튼을 잠깐 흔들어 피드백 표시
  _flashInsufficient(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.style.transition = 'transform 0.07s';
    let n = 0;
    const shake = () => {
      btn.style.transform = n % 2 === 0 ? 'translateX(4px)' : 'translateX(-4px)';
      if (++n < 6) setTimeout(shake, 70); else btn.style.transform = '';
    };
    shake();
  }

  upgradePheromone() {
    const cost = this._pCost();
    if (this.foodStored < cost) { this._flashInsufficient('btn-pheromone'); return; }
    this.foodStored -= cost;
    this.pheromoneLevel++;
    this._game.grid.decayRate =
      Math.min(0.9985, 0.9942 + this.pheromoneLevel * 0.0014);
    this._refreshBadge('badge-pheromone', this.pheromoneLevel);
    this._refreshCost('cost-pheromone', this._pCost());
  }

  upgradeStorage() {
    const cost = this._sCost();
    if (this.foodStored < cost) { this._flashInsufficient('btn-storage'); return; }
    this.foodStored -= cost;
    this.storageLevel++;
    this.maxFoodCap += 50;
    this._refreshBadge('badge-storage', this.storageLevel);
    this._refreshCost('cost-storage', this._sCost());
  }

  upgradeNursery() {
    const cost = this._nCost();
    if (this.foodStored < cost) { this._flashInsufficient('btn-nursery'); return; }
    this.foodStored -= cost;
    this.nurseryLevel++;
    this.maxPopulation += 10;
    this.hatchRate = Math.max(1.0, this.hatchRate - 0.8);
    this._refreshBadge('badge-nursery', this.nurseryLevel);
    this._refreshCost('cost-nursery', this._nCost());
  }

  upgradeAcidFacility() {
    if (this.acidFacilityLevel >= 1) return;
    const cost = this._aCost();
    if (this.foodStored < cost) { this._flashInsufficient('btn-acid-facility'); return; }
    this.foodStored -= cost;
    this.acidFacilityLevel++;
    this._refreshBadge('badge-acid-facility', this.acidFacilityLevel);
    this._refreshCost('cost-acid-facility', Infinity);
    // Gray out button
    document.getElementById('btn-acid-facility').style.opacity = '0.4';
  }

  upgradeRecycle() {
    if (this.recycleLevel >= 3) return;
    const cost = this._rCost();
    if (this.foodStored < cost) { this._flashInsufficient('btn-corpse'); return; }
    this.foodStored -= cost;
    this.recycleLevel++;
    this._recycleTimer = 0;
    this._refreshBadge('badge-corpse', this.recycleLevel);
    this._refreshCost('cost-corpse', this._rCost());
  }

  upgradeCommanderHQ() {
    if (this.commanderLevel >= 1) return;
    const cost = this._cmdHQCost();
    if (this.foodStored < cost) { this._flashInsufficient('btn-commander-hq'); return; }
    this.foodStored -= cost;
    this.commanderLevel++;
    this._refreshBadge('badge-commander-hq', this.commanderLevel);
    this._refreshCost('cost-commander-hq', Infinity);
    document.getElementById('btn-commander-hq').style.opacity = '0.4';
    // Reveal summon button
    const summonRow = document.getElementById('ctrl-commander-summon');
    if (summonRow) summonRow.hidden = false;
    this._refreshCost('cost-commander-summon', CFG.COST_COMMANDER);
  }

  spawnCommander() {
    if (this.commanderLevel < 1) return;
    const game = this._game;
    const cmdCount = game.ants.filter(a => a.role === 'commander').length;
    if (cmdCount >= (CFG.COMMANDER_MAX ?? 3)) { this._flashInsufficient('btn-commander-summon'); return; }
    const cost = CFG.COST_COMMANDER ?? 25;
    if (this.foodStored < cost) { this._flashInsufficient('btn-commander-summon'); return; }
    this.foodStored -= cost;
    // Ant is defined globally in main.js (loaded after colony.js), safe to reference at call time
    // eslint-disable-next-line no-undef
    const commander = new Ant(game.queen.x, game.queen.y, 'commander');
    game.ants.push(commander);
  }

  _pCost() { return 50 + this.pheromoneLevel * 30; }
  _sCost() { return 30 + this.storageLevel * 20; }
  _nCost() { return 40 + this.nurseryLevel * 25; }
  _aCost() { return this.acidFacilityLevel >= 1 ? Infinity : 100; }
  _rCost() { return this.recycleLevel >= 3 ? Infinity : 60 + this.recycleLevel * 30; }
  _cmdHQCost() { return this.commanderLevel >= 1 ? Infinity : CFG.COMMANDER_HQ_COST ?? 80; }

  // ── DOM update ────────────────────────────────────────────────
  _refreshUI(pop, liveCarcasses) {
    const d = this._d;
    const starving = this.isStarving;
    const diseased = this.isDisease;
    const remaining = Math.max(0, this.eggRate - this._eggTimer).toFixed(1);

    // ── Banners ──────────────────────────────────────────────
    if (d.warn) d.warn.hidden = !starving;
    if (d.diseaseWarn) d.diseaseWarn.hidden = !diseased;

    // ── Queen SVG node ────────────────────────────────────────
    if (d.nodeEggs) d.nodeEggs.textContent = `🥚 ${this.eggs}`;
    if (d.nodeEggTimer) d.nodeEggTimer.textContent =
      starving ? '⚠ 굶주림' : `다음: ${remaining}s`;
    if (d.nodePhLevel) d.nodePhLevel.textContent = `페로몬 Lv.${this.pheromoneLevel}`;

    // ── Food SVG node ─────────────────────────────────────────
    if (d.nodeFood) d.nodeFood.textContent = `${this.foodStored}/${this.maxFoodCap}`;
    if (d.nodeStoreLv) d.nodeStoreLv.textContent = `용량 Lv.${this.storageLevel}`;

    // ── Nursery SVG node ──────────────────────────────────────
    if (d.nodePop) d.nodePop.textContent = `${pop}/${this.maxPopulation}`;
    if (d.nodeNursLv) d.nodeNursLv.textContent = `부화 Lv.${this.nurseryLevel}`;

    // ── Queen Energy bar ──────────────────────────────────────
    const ePct = this.queenEnergy / this.maxQueenEnergy * 100;
    if (d.energyBar) {
      d.energyBar.style.width = `${ePct}%`;
      d.energyBar.classList.toggle('low-energy', ePct < 25);
    }
    if (d.energyVal) d.energyVal.textContent = Math.round(this.queenEnergy);

    // ── Corpse SVG node ───────────────────────────────────────
    if (d.nodeCorpse) d.nodeCorpse.textContent = this.corpses;
    if (d.nodeCorpseStatus) {
      d.nodeCorpseStatus.textContent = diseased ? '⚠ 질병!' : '안전';
      // SVG attribute change for live color feedback
      d.nodeCorpseStatus.setAttribute('fill', diseased ? '#ff5050' : '#888');
    }

    // ── Stats footer ──────────────────────────────────────────
    if (d.deaths) d.deaths.textContent = this.totalDeaths;
    if (d.totalFood) d.totalFood.textContent = this.totalFood;
    if (d.status) {
      d.status.textContent =
        starving ? '🔴 굶주림'
          : diseased ? '🟡 질병'
            : pop < 10 ? '🟡 위태로움'
              : '🟢 건강';
    }

    // ── Button affordability shading ──────────────────────────
    this._shadeBtn('btn-pheromone', this._pCost());
    this._shadeBtn('btn-storage', this._sCost());
    this._shadeBtn('btn-nursery', this._nCost());
    this._shadeBtn('btn-acid-facility', this._aCost());
    this._shadeBtn('btn-corpse', this._rCost());
    this._shadeBtn('btn-commander-hq', this._cmdHQCost());
    this._shadeBtn('btn-commander-summon', CFG.COST_COMMANDER ?? 25);
  }

  _shadeBtn(id, cost) {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('cant-afford', this.foodStored < cost);
  }

  _refreshBadge(id, level) {
    const el = document.getElementById(id);
    if (el) el.textContent = `Lv.${level}`;
  }

  _refreshCost(id, cost) {
    const el = document.getElementById(id);
    if (el) el.textContent = cost === Infinity ? 'MAX' : `${cost}🌿`;
  }

  // ── DOM binding ───────────────────────────────────────────────
  _bindDOM() {
    const q = id => document.getElementById(id);
    this._d = {
      // Banners
      warn: q('starvation-warning'),
      diseaseWarn: q('disease-warning'),
      // Queen SVG node
      nodeEggs: q('node-eggs'),
      nodeEggTimer: q('node-egg-timer'),
      nodePhLevel: q('node-ph-level'),
      // Food SVG node
      nodeFood: q('node-food'),
      nodeStoreLv: q('node-storage-level'),
      // Nursery SVG node
      nodePop: q('node-pop'),
      nodeNursLv: q('node-nursery-level'),
      // Corpse SVG node
      nodeCorpse: q('node-corpse'),
      nodeCorpseStatus: q('node-corpse-status'),
      // Phase 5: energy bar
      energyBar: q('energy-bar'),
      energyVal: q('energy-val'),
      // Stats footer
      deaths: q('stat-deaths'),
      totalFood: q('stat-total-food'),
      status: q('stat-status'),
    };
  }

  _bindButtons() {
    const q = id => document.getElementById(id);
    q('btn-pheromone')?.addEventListener('click', () => this.upgradePheromone());
    q('btn-storage')?.addEventListener('click', () => this.upgradeStorage());
    q('btn-nursery')?.addEventListener('click', () => this.upgradeNursery());
    q('btn-acid-facility')?.addEventListener('click', () => this.upgradeAcidFacility());
    q('btn-corpse')?.addEventListener('click', () => this.upgradeRecycle());
    q('btn-commander-hq')?.addEventListener('click', () => this.upgradeCommanderHQ());
    q('btn-commander-summon')?.addEventListener('click', () => this.spawnCommander());

    // Phase 5: Colony Tuning sliders
    [
      ['tune-forage', 'val-forage', 'forageWeight'],
      ['tune-sanit', 'val-sanit', 'sanitWeight'],
      ['tune-defense', 'val-defense', 'defenseWeight'],
    ].forEach(([sid, vid, key]) => {
      const sl = q(sid), vl = q(vid);
      if (sl && vl) sl.addEventListener('input', () => {
        this.tuning[key] = parseFloat(sl.value);
        vl.textContent = parseFloat(sl.value).toFixed(1);
      });
    });

    // Phase 7: Caste ratio sliders — always sum to 100%
    const slSc = q('caste-scout'), slW = q('caste-worker'), slS = q('caste-soldier'), slA = q('caste-acid');
    const vlSc = q('cval-scout'), vlW = q('cval-worker'), vlS = q('cval-soldier'), vlA = q('cval-acid');
    const syncCaste = (changed) => {
      let remaining = 100 - parseInt(changed.value);
      remaining = Math.max(0, Math.min(100, remaining));
      // Redistribute other three proportionally
      const all = [[slSc, vlSc, 'scout'], [slW, vlW, 'worker'], [slS, vlS, 'soldier'], [slA, vlA, 'acid']];
      const others = all.filter(([sl]) => sl !== changed);

      const sumOthers = parseInt(others[0][0].value) + parseInt(others[1][0].value) + parseInt(others[2][0].value) || 1;
      let val1 = Math.round(remaining * parseInt(others[0][0].value) / sumOthers);
      let val2 = Math.round(remaining * parseInt(others[1][0].value) / sumOthers);
      let val3 = remaining - val1 - val2;

      val1 = Math.max(0, val1); val2 = Math.max(0, val2); val3 = Math.max(0, val3);

      others[0][0].value = val1; others[0][1].textContent = `${val1}%`; this.casteRatio[others[0][2]] = val1;
      others[1][0].value = val2; others[1][1].textContent = `${val2}%`; this.casteRatio[others[1][2]] = val2;
      others[2][0].value = val3; others[2][1].textContent = `${val3}%`; this.casteRatio[others[2][2]] = val3;

      // Update changed slider label
      const changedKey = all.find(([sl]) => sl === changed)[2];
      const changedLabel = all.find(([sl]) => sl === changed)[1];
      this.casteRatio[changedKey] = parseInt(changed.value);
      changedLabel.textContent = `${changed.value}%`;
    };
    if (slSc && slW && slS && slA) {
      slSc.addEventListener('input', () => syncCaste(slSc));
      slW.addEventListener('input', () => syncCaste(slW));
      slS.addEventListener('input', () => syncCaste(slS));
      slA.addEventListener('input', () => syncCaste(slA));
    }
  }
}
