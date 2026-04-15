/**
 * tetris/render.js — 인벤토리 패널 렌더링 (순수 Canvas 드로잉)
 *
 * P0-2 stage 3: 인벤토리 오버레이 전용 (`drawInventory` + 내부 `drawInvSection`).
 * 상태를 매 호출마다 파라미터로 받아 캔버스에 그린다 — 절대 쓰지 않음.
 *
 * 나머지 드로우 (drawShipModules · drawOnCanvas · drawInstalledPanel ·
 * drawModulePanel) 는 차후 stage 에서 동일 패턴으로 이전.
 *
 * 의존: window.TetrisDefs (MODULE_DEFS, TIER_COLORS, TIER_LABELS)
 *       window.TetrisIcons (roundRect, drawModuleIcon)
 * 노출: window.TetrisRender
 */
'use strict';

window.TetrisRender = (() => {
  const {
    CELL, HALF, MODULE_DEFS, TIER_COLORS, TIER_LABELS,
    HULL_SLOT_EXPAND_COST, HULL_SLOT_EXPAND_AMOUNT,
  } = window.TetrisDefs;
  const { roundRect, drawModuleIcon, drawCoreIcon } = window.TetrisIcons;

  /**
   * 게임플레이 중 함선 위에 모듈을 그린다 (함선 회전 적용)
   * state: { grid, placedModules, zoom, lastDestroyedCell, lastDestroyFlash }
   */
  function drawShipModules(ctx, cx, cy, angle, state) {
    const { grid, placedModules, zoom, lastDestroyedCell, lastDestroyFlash } = state;
    if (grid.size <= 1) return; // 코어만 있으면 스킵

    // 줌 역보정: 화면상 셀 크기를 CELL 픽셀로 고정
    const z  = Math.max(0.25, zoom);
    const EC = CELL / z;
    const EH = EC / 2;
    const BAR_H = 3 / z;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // 피격 플래시 셀 캐싱
    const flashCell = lastDestroyFlash > 0 && lastDestroyedCell
      ? `${lastDestroyedCell.gx},${lastDestroyedCell.gy}` : null;

    for (const [key, type] of grid) {
      if (type === 'CORE') continue;
      const [gx, gy] = key.split(',').map(Number);
      const def   = MODULE_DEFS[type];
      const color = def ? def.color : '#334455';

      const sx = gx * CELL - EH;
      const sy = gy * CELL - EH;

      // 피격 플래시
      const isFlash = flashCell && (key === flashCell || placedModules.some(m => m.cells.some(c=>`${c.gx},${c.gy}`===flashCell && m.cells.some(c2=>`${c2.gx},${c2.gy}`===key))));
      ctx.fillStyle = isFlash ? `rgba(255,80,80,${Math.min(1, lastDestroyFlash * 4)})` : color;
      ctx.fillRect(sx, sy, EC, EC);
      ctx.strokeStyle = 'rgba(150,200,255,0.35)';
      ctx.lineWidth   = 1 / z;
      ctx.strokeRect(sx, sy, EC, EC);

      // 장갑판 HP 바 (각 셀 하단)
      const mod = placedModules.find(m => m.cells.some(c => c.gx === gx && c.gy === gy));
      if (mod && mod.maxHp > 0) {
        const ratio = Math.max(0, mod.hp / mod.maxHp);
        const bx = sx + 1 / z, by = sy + EC - BAR_H - 1 / z;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx, by, EC - 2 / z, BAR_H);
        ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ef4444';
        ctx.fillRect(bx, by, (EC - 2 / z) * ratio, BAR_H);
      }
    }

    ctx.restore();
  }

  /**
   * 인벤토리 섹션 (대기 중 / 장착 완료) 드로우
   * state: { placedModules }
   */
  function drawInvSection(ctx, sx, sy, sw, sh, title, items, isPlaced, state) {
    const { placedModules } = state;
    const CARD_W = 78, CARD_H = 92, GAP = 5;
    const cols = Math.max(1, Math.floor((sw) / (CARD_W + GAP)));

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(`${title}  (${items.length}개)`, sx, sy + 8);

    const startY = sy + 22;
    const maxH = sh - 22;

    if (items.length === 0) {
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#334466';
      ctx.textAlign = 'center';
      ctx.fillText('없음', sx + sw / 2, startY + 36);
      return;
    }

    let rendered = 0;
    for (let i = 0; i < items.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cardX = sx + col * (CARD_W + GAP);
      const cardY = startY + row * (CARD_H + GAP);
      if (cardY + CARD_H > startY + maxH) break;

      const typeKey = items[i];
      const def = MODULE_DEFS[typeKey];
      if (!def) continue;
      const tier = def.tier ?? 'COMMON';
      const tc   = TIER_COLORS[tier];

      // 카드 배경
      ctx.fillStyle = 'rgba(8,18,50,0.88)';
      roundRect(ctx, cardX, cardY, CARD_W, CARD_H, 6); ctx.fill();
      ctx.strokeStyle = tc + '77'; ctx.lineWidth = 1;
      roundRect(ctx, cardX, cardY, CARD_W, CARD_H, 6); ctx.stroke();

      // 아이콘
      drawModuleIcon(ctx, typeKey, cardX + CARD_W / 2, cardY + 28, 44);

      // 티어 뱃지
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 8px "Segoe UI", sans-serif';
      ctx.fillStyle = tc;
      ctx.fillText(TIER_LABELS[tier], cardX + CARD_W / 2, cardY + CARD_H - 30);

      // 모듈 이름
      ctx.font = 'bold 9px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      const name = def.name;
      ctx.fillText(name.length > 6 ? name.slice(0,5)+'…' : name, cardX + CARD_W / 2, cardY + CARD_H - 19);

      // 장갑판 HP 바 (장착 완료 섹션의 hull 모듈에만)
      if (isPlaced) {
        const placedMod = placedModules.find(m => m.type === typeKey);
        if (placedMod && placedMod.maxHp > 0) {
          const ratio = Math.max(0, placedMod.hp / placedMod.maxHp);
          const bx = cardX + 6, by = cardY + CARD_H - 11;
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bx, by, CARD_W - 12, 4);
          ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ef4444';
          ctx.fillRect(bx, by, (CARD_W - 12) * ratio, 4);
          ctx.font = '7px "Segoe UI", sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`${Math.ceil(placedMod.hp)}/${placedMod.maxHp}`, cardX + CARD_W / 2, cardY + CARD_H - 4);
        } else if (placedMod && placedMod.maxHp === 0) {
          ctx.font = '7px "Segoe UI", sans-serif';
          ctx.fillStyle = '#f87171';
          ctx.fillText('노출됨', cardX + CARD_W / 2, cardY + CARD_H - 6);
        }
      } else {
        // 대기 중 모듈: 구조/무기 구분 표시
        ctx.font = '7px "Segoe UI", sans-serif';
        ctx.fillStyle = typeKey.startsWith('WPN_') ? '#f87171' : '#86efac';
        ctx.fillText(typeKey.startsWith('WPN_') ? '무기' : '구조', cardX + CARD_W / 2, cardY + CARD_H - 6);
      }
      rendered++;
    }

    const maxVisible = cols * Math.floor(maxH / (CARD_H + GAP));
    if (items.length > maxVisible) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`+${items.length - maxVisible}개 더`, sx + sw / 2, sy + sh - 8);
    }
  }

  /**
   * 전체 인벤토리 오버레이 드로우 (Game.js render() 에서 inventoryOpen 시 호출)
   * state: { pending, moduleQueue, placedModules }
   */
  function drawInventory(ctx, W, H, state) {
    const { pending, moduleQueue, placedModules } = state;
    const PW  = Math.min(W - 40, 800);
    const PH  = Math.min(H - 50, 540);
    const px  = (W - PW) / 2;
    const py  = (H - PH) / 2;
    const PAD = 14;
    const RAD = 14;

    // 패널 배경
    ctx.fillStyle = 'rgba(4,8,28,0.96)';
    roundRect(ctx, px, py, PW, PH, RAD); ctx.fill();
    ctx.strokeStyle = 'rgba(100,160,255,0.32)'; ctx.lineWidth = 1;
    roundRect(ctx, px, py, PW, PH, RAD); ctx.stroke();

    // 헤더
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('모듈 인벤토리', W / 2, py + PAD + 8);
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#334466';
    ctx.fillText('[I] 또는 [ESC] 닫기', W / 2, py + PAD + 24);

    const headerH = 50;
    ctx.strokeStyle = 'rgba(100,160,255,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + PAD, py + headerH); ctx.lineTo(px + PW - PAD, py + headerH); ctx.stroke();

    // 범례 (우상단)
    const legendX = px + PW - 160, legendY = py + 8;
    const tiers = ['COMMON','RARE','EPIC','LEGENDARY'];
    const labels = ['일반','희귀','에픽','전설'];
    ctx.font = '9px "Segoe UI", sans-serif';
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = TIER_COLORS[tiers[i]];
      ctx.textAlign = 'left';
      ctx.fillText(`★ ${labels[i]}`, legendX + (i < 2 ? 0 : 76), legendY + (i % 2) * 14 + 4);
    }

    // 두 섹션 분할
    const bodyY = py + headerH + PAD;
    const bodyH = PH - headerH - PAD * 2;
    const colW  = (PW - PAD * 3) / 2;

    // 대기 중: moduleQueue + pending
    const queueItems = [...(pending ? [pending.type] : []), ...moduleQueue];
    drawInvSection(ctx, px + PAD, bodyY, colW, bodyH, '대기 중', queueItems, false, { placedModules });

    // 중앙 구분선
    const divX = px + PAD * 2 + colW;
    ctx.strokeStyle = 'rgba(100,160,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(divX, bodyY); ctx.lineTo(divX, bodyY + bodyH); ctx.stroke();

    // 장착 완료
    const placedTypes = placedModules.map(m => m.type);
    drawInvSection(ctx, divX + PAD, bodyY, colW, bodyH, '장착 완료', placedTypes, true, { placedModules });
  }

  /**
   * 좌측 패널: 현재 장착된 모듈 목록 (빌딩 UI)
   * state: { grid, placedModules, maxHullSlots }
   */
  function drawInstalledPanel(ctx, W, H, player, state) {
    const { grid, placedModules, maxHullSlots } = state;
    const PAD  = 14;
    const PW   = 190;
    const PH   = Math.min(H - 120, 420);
    const px   = 16;
    const py   = (H - PH) / 2;
    const rad  = 10;
    const usedSlots = grid.size - 1;

    // 카드 배경
    ctx.fillStyle = 'rgba(8, 15, 40, 0.92)';
    roundRect(ctx, px, py, PW, PH, rad);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99,179,237,0.3)';
    ctx.lineWidth   = 1;
    roundRect(ctx, px, py, PW, PH, rad);
    ctx.stroke();

    // 헤더
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillStyle    = '#7dd3fc';
    ctx.fillText('장착 모듈', px + PAD, py + PAD + 4);

    // 슬롯 사용량
    const slotText = `${usedSlots} / ${maxHullSlots} 슬롯`;
    const slotColor = usedSlots >= maxHullSlots ? '#fbbf24' : '#86efac';
    ctx.font      = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = slotColor;
    ctx.textAlign = 'right';
    ctx.fillText(slotText, px + PW - PAD, py + PAD + 4);

    // 슬롯 바
    const barY  = py + PAD + 18;
    const barW  = PW - PAD * 2;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px + PAD, barY, barW, 6);
    ctx.fillStyle = slotColor;
    ctx.fillRect(px + PAD, barY, barW * Math.min(1, usedSlots / maxHullSlots), 6);

    // 구분선
    ctx.strokeStyle = 'rgba(100,140,200,0.2)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(px + PAD, barY + 12);
    ctx.lineTo(px + PW - PAD, barY + 12);
    ctx.stroke();

    // 모듈 목록
    const listStartY = barY + 24;
    const itemH      = 36;
    const maxItems   = Math.floor((PH - (listStartY - py) - PAD * 2) / itemH);

    if (placedModules.length === 0) {
      ctx.font      = '12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.fillText('장착된 모듈 없음', px + PW / 2, listStartY + 20);
    } else {
      const visModules = placedModules.slice(0, maxItems);
      for (let i = 0; i < visModules.length; i++) {
        const m   = visModules[i];
        const def = MODULE_DEFS[m.type];
        if (!def) continue;
        const iy  = listStartY + i * itemH;

        const tc = TIER_COLORS[def.tier] ?? '#94a3b8';
        ctx.fillStyle = def.color;
        ctx.fillRect(px + PAD, iy + 6, 12, 12);
        ctx.strokeStyle = tc;
        ctx.lineWidth   = 1;
        ctx.strokeRect(px + PAD, iy + 6, 12, 12);

        ctx.font      = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText(def.name, px + PAD + 18, iy + 10);

        if (m.maxHp > 0) {
          const ratio = Math.max(0, m.hp / m.maxHp);
          const hbx = px + PAD + 18, hby = iy + 18;
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(hbx, hby, PW - PAD * 2 - 18, 5);
          ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ef4444';
          ctx.fillRect(hbx, hby, (PW - PAD * 2 - 18) * ratio, 5);
          ctx.font = '9px "Segoe UI", sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'left';
          ctx.fillText(`내구도 ${Math.ceil(m.hp)}/${m.maxHp}`, hbx, iy + 32);
        } else {
          ctx.font      = '10px "Segoe UI", sans-serif';
          ctx.fillStyle = '#86efac';
          ctx.textAlign = 'left';
          ctx.fillText(def.desc, px + PAD + 18, iy + 24);
        }

        ctx.font      = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = tc;
        ctx.textAlign = 'right';
        ctx.fillText(TIER_LABELS[def.tier] ?? '일반', px + PW - PAD, iy + 10);
      }
      if (placedModules.length > maxItems) {
        ctx.font      = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(`+${placedModules.length - maxItems}개 더...`, px + PW / 2, listStartY + maxItems * itemH + 8);
      }
    }

    // 스크랩 & 증설 정보
    const scrap = player ? player.scrap : 0;
    const footY = py + PH - PAD - 4;
    ctx.strokeStyle = 'rgba(100,140,200,0.2)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(px + PAD, footY - 24);
    ctx.lineTo(px + PW - PAD, footY - 24);
    ctx.stroke();
    ctx.font      = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`🔩 Scrap: ${scrap}`, px + PAD, footY - 10);
    const canExpand = scrap >= HULL_SLOT_EXPAND_COST;
    ctx.fillStyle = canExpand ? '#86efac' : '#475569';
    ctx.fillText(`[E] +${HULL_SLOT_EXPAND_AMOUNT}슬롯 (${HULL_SLOT_EXPAND_COST} Scrap)`, px + PAD, footY + 4);
  }

  /**
   * 우측 패널: 현재 선택 모듈 프리뷰 카드(W/S 선택) + 대기/장착 목록
   * state: { pending, moduleQueue, pendingSelectIdx, placedModules, isDragging }
   */
  function drawModulePanel(ctx, W, H, state) {
    const { pending, moduleQueue, pendingSelectIdx, placedModules, isDragging } = state;
    const PAD = 12;
    const PW  = 190;
    const PH  = Math.min(H - 100, 540);
    const px  = W - PW - 16;
    const py  = (H - PH) / 2;
    const rad = 10;

    // ── 패널 배경
    ctx.fillStyle = 'rgba(8, 15, 40, 0.93)';
    roundRect(ctx, px, py, PW, PH, rad);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99,179,237,0.3)';
    ctx.lineWidth   = 1;
    roundRect(ctx, px, py, PW, PH, rad);
    ctx.stroke();

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';

    let curY = py + PAD;

    // ──────── 상단: 선택 모듈 프리뷰 카드 ────────
    if (pending && !isDragging) {
      const tier     = pending.tier ?? 'COMMON';
      const tc       = TIER_COLORS[tier] ?? '#94a3b8';
      const CARD_H   = 148;

      // 카드 배경 (티어 색상 테두리)
      ctx.fillStyle = 'rgba(14, 24, 60, 0.96)';
      roundRect(ctx, px + PAD - 2, curY, PW - PAD * 2 + 4, CARD_H, 6);
      ctx.fill();
      ctx.strokeStyle = tc + 'bb';
      ctx.lineWidth   = 1.5;
      roundRect(ctx, px + PAD - 2, curY, PW - PAD * 2 + 4, CARD_H, 6);
      ctx.stroke();

      // 티어 뱃지
      ctx.font      = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = tc;
      ctx.textAlign = 'left';
      ctx.fillText(`★ ${TIER_LABELS[tier] ?? '일반'}`, px + PAD + 4, curY + 12);

      // 선택 번호 (n/total)
      if (moduleQueue.length > 1) {
        ctx.font      = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.fillText(`${pendingSelectIdx + 1}/${moduleQueue.length}`, px + PW - PAD - 2, curY + 12);
      }

      // 모듈 이름
      ctx.font      = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e0f0ff';
      ctx.textAlign = 'left';
      ctx.fillText(pending.name, px + PAD + 4, curY + 28);

      // ── 5×5 미니 형태 프리뷰 (±2 범위)
      const mini  = 9;
      const gridW = 5 * mini;
      const offX  = px + PAD + 4;
      const offY  = curY + 38;
      ctx.strokeStyle = 'rgba(100,140,200,0.2)';
      ctx.lineWidth   = 0.5;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          ctx.strokeRect(offX + (c + 2) * mini, offY + (r + 2) * mini, mini, mini);
        }
      }
      // 모듈 셀 채우기
      for (const c of pending.cells) {
        if (c.gx >= -2 && c.gx <= 2 && c.gy >= -2 && c.gy <= 2) {
          ctx.fillStyle = pending.color;
          ctx.fillRect(offX + (c.gx + 2) * mini + 1, offY + (c.gy + 2) * mini + 1, mini - 2, mini - 2);
        }
      }
      // 코어 마커
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(offX + 2 * mini + 1, offY + 2 * mini + 1, mini - 2, mini - 2);

      // 설명 (오른쪽에 나머지 정보)
      const infoX = offX + gridW + 8;
      const infoW = px + PW - PAD - infoX - 2;
      ctx.font      = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#86efac';
      ctx.textAlign = 'left';
      const descWords = pending.desc.split(' ');
      let line = '', lineY = offY + 6;
      for (const word of descWords) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > infoW && line) {
          ctx.fillText(line, infoX, lineY);
          line = word; lineY += 14;
        } else { line = test; }
      }
      if (line) ctx.fillText(line, infoX, lineY);

      ctx.font      = '9px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`${pending.cells.length}셀`, infoX, offY + 52);

      // ── 속성 뱃지 (무기 모듈이면 표시)
      const _ATTR_COLORS = { FIRE:'#ef4444', ELECTRIC:'#fbbf24', LASER:'#a78bfa', KINETIC:'#94a3b8', WATER:'#38bdf8' };
      const _ATTR_ICONS  = { FIRE:'🔥', ELECTRIC:'⚡', LASER:'💜', KINETIC:'🔩', WATER:'💧' };
      const _pendingAttrs = pending.bonus?.weaponAttrs ?? (pending.bonus?.weaponAttr ? [pending.bonus.weaponAttr] : []);
      if (_pendingAttrs.length > 0) {
        const attrBaseY = curY + (moduleQueue.length > 1 ? CARD_H - 28 : CARD_H - 16);
        let attrDrawX = px + PAD + 4;
        ctx.textAlign = 'left';
        for (const attr of _pendingAttrs) {
          const label = `${_ATTR_ICONS[attr] ?? ''} ${attr}`;
          ctx.font      = 'bold 9px "Segoe UI", sans-serif';
          ctx.fillStyle = _ATTR_COLORS[attr] ?? '#e2e8f0';
          ctx.fillText(label, attrDrawX, attrBaseY);
          attrDrawX += ctx.measureText(label).width + 8;
        }
      }

      // W/S 내비게이션 힌트
      if (moduleQueue.length > 1) {
        const navY = curY + CARD_H - 14;
        ctx.font      = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText('[W] ◀ 이전   [S] 다음 ▶', px + PW / 2, navY);
      }

      curY += CARD_H + 8;
    } else if (moduleQueue.length === 0 && !isDragging) {
      // 대기 모듈 없음 표시
      ctx.font      = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'left';
      ctx.fillText('모듈 인벤토리', px + PAD, curY + 6);
      ctx.font      = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = '#334466';
      ctx.textAlign = 'center';
      ctx.fillText('대기 모듈 없음', px + PW / 2, curY + 28);
      curY += 44;
    } else {
      // 드래그 중: 헤더만
      ctx.font      = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'left';
      ctx.fillText('모듈 인벤토리', px + PAD, curY + 6);
      curY += 22;
    }

    // ── 구분선
    const maxY = py + PH - PAD;
    if (curY + 20 <= maxY) {
      ctx.strokeStyle = 'rgba(100,140,200,0.18)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(px + PAD, curY);
      ctx.lineTo(px + PW - PAD, curY);
      ctx.stroke();
      curY += 10;
    }

    const itemH = 36;

    // ──────── 대기 큐 목록 ────────
    if (moduleQueue.length > 0 && curY + 20 <= maxY) {
      ctx.font      = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText(`▶ 배치 대기  (${moduleQueue.length})`, px + PAD, curY + 4);
      curY += 16;

      for (let i = 0; i < moduleQueue.length && curY + itemH <= maxY; i++) {
        const key = moduleQueue[i];
        const def = MODULE_DEFS[key];
        if (!def) continue;
        const tier = def.tier ?? 'COMMON';
        const tc   = TIER_COLORS[tier] ?? '#94a3b8';
        const isSelected = (i === pendingSelectIdx);

        if (isSelected) {
          ctx.fillStyle = 'rgba(251,191,36,0.07)';
          ctx.fillRect(px + PAD - 2, curY, PW - PAD * 2 + 4, itemH - 2);
        }

        ctx.fillStyle = def.color;
        ctx.fillRect(px + PAD + 2, curY + 6, 11, 11);
        ctx.strokeStyle = tc;
        ctx.lineWidth   = isSelected ? 1.5 : 1;
        ctx.strokeRect(px + PAD + 2, curY + 6, 11, 11);

        ctx.font      = `${isSelected ? 'bold' : ''} 11px "Segoe UI", sans-serif`;
        ctx.fillStyle = isSelected ? '#fef08a' : '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText(def.name, px + PAD + 18, curY + 10);

        ctx.font      = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(def.desc, px + PAD + 18, curY + 23);

        ctx.font      = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = tc;
        ctx.textAlign = 'right';
        ctx.fillText(TIER_LABELS[tier] ?? '일반', px + PW - PAD, curY + 10);

        curY += itemH;
      }
    }

    // ──────── 장착 완료 목록 ────────
    if (curY + 20 <= maxY) {
      ctx.strokeStyle = 'rgba(100,140,200,0.15)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(px + PAD, curY + 4);
      ctx.lineTo(px + PW - PAD, curY + 4);
      ctx.stroke();
      curY += 14;

      ctx.font      = 'bold 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'left';
      ctx.fillText(`▶ 장착 완료  (${placedModules.length})`, px + PAD, curY + 4);
      curY += 16;

      if (placedModules.length === 0) {
        ctx.font      = '11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#334466';
        ctx.textAlign = 'center';
        ctx.fillText('장착된 모듈 없음', px + PW / 2, curY + 10);
      } else {
        for (let i = 0; i < placedModules.length && curY + itemH <= maxY; i++) {
          const m   = placedModules[i];
          const def = MODULE_DEFS[m.type];
          if (!def) continue;
          const tier = def.tier ?? 'COMMON';
          const tc   = TIER_COLORS[tier] ?? '#94a3b8';

          ctx.fillStyle = def.color;
          ctx.fillRect(px + PAD + 2, curY + 6, 11, 11);
          ctx.strokeStyle = tc;
          ctx.lineWidth   = 1;
          ctx.strokeRect(px + PAD + 2, curY + 6, 11, 11);

          ctx.font      = 'bold 11px "Segoe UI", sans-serif';
          ctx.fillStyle = '#e2e8f0';
          ctx.textAlign = 'left';
          ctx.fillText(def.name, px + PAD + 18, curY + 10);

          if (m.maxHp > 0) {
            const ratio = Math.max(0, m.hp / m.maxHp);
            const hbx = px + PAD + 18, hby = curY + 20;
            const hbw = PW - PAD * 2 - 20;
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(hbx, hby, hbw, 4);
            ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ef4444';
            ctx.fillRect(hbx, hby, hbw * ratio, 4);
            ctx.font = '9px "Segoe UI", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`${Math.ceil(m.hp)}/${m.maxHp}`, hbx, curY + 32);
          } else {
            ctx.font      = '10px "Segoe UI", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(def.desc, px + PAD + 18, curY + 23);
          }

          ctx.font      = '9px "Segoe UI", sans-serif';
          ctx.fillStyle = tc;
          ctx.textAlign = 'right';
          ctx.fillText(TIER_LABELS[tier] ?? '일반', px + PW - PAD, curY + 10);

          curY += itemH;
        }
        if (curY >= maxY && placedModules.length > 0) {
          const shown = Math.floor((maxY - py - PAD - 220) / itemH);
          const hidden = placedModules.length - Math.max(0, shown);
          if (hidden > 0) {
            ctx.font      = '10px "Segoe UI", sans-serif';
            ctx.fillStyle = '#475569';
            ctx.textAlign = 'center';
            ctx.fillText(`+${hidden}개 더...`, px + PW / 2, maxY - 4);
          }
        }
      }
    }
  }

  /**
   * 함체 조립(오버레이) 메인 드로우 — 배치 그리드, 유효 슬롯, 호버 프리뷰,
   * 좌/우 패널, 하단 힌트까지 모두 그린다.
   *
   * state: {
   *   grid, validSlots, pending, maxHullSlots, placedModules,
   *   moduleQueue, pendingSelectIdx,
   *   isDragging, dragOriginAnchorGx, dragOriginAnchorGy,
   *   canPlace,                       // (agx, agy) => boolean
   * }
   */
  function drawOnCanvas(ctx, cx, cy, mouseX, mouseY, player, state) {
    const {
      grid, validSlots, pending, maxHullSlots, placedModules,
      moduleQueue, pendingSelectIdx,
      isDragging, dragOriginAnchorGx, dragOriginAnchorGy,
      canPlace,
    } = state;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // ── 1. 어두운 반투명 오버레이
    ctx.fillStyle = 'rgba(0, 2, 18, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // ── 2. 헤더
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillStyle    = '#93c5fd';
    ctx.fillText('🔧 함선 모듈 조립', cx, 36);
    ctx.font      = '12px "Segoe UI", sans-serif';

    const usedSlots = grid.size - 1;
    const isFull    = usedSlots >= maxHullSlots;
    if (isFull) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`⚠ 함체 슬롯 포화 — 기존 모듈을 클릭하면 제거됩니다 (교체 후 재배치)`, cx, 62);
    } else {
      ctx.fillStyle = '#5577aa';
      ctx.fillText('유효한 슬롯(파란 테두리)을 클릭해 부착 · 기존 모듈을 클릭 드래그로 이동', cx, 62);
    }

    // ── 3. 마우스→그리드 좌표
    const hgx = Math.round((mouseX - cx) / CELL);
    const hgy = Math.round((mouseY - cy) / CELL);
    const isValidHover = pending && canPlace(hgx, hgy);

    // ── 4. 배치된 모듈 셀
    for (const [key, type] of grid) {
      const [gx, gy] = key.split(',').map(Number);
      const sx = cx + gx * CELL;
      const sy = cy + gy * CELL;

      if (type === 'CORE') {
        drawCoreIcon(ctx, sx, sy);
      } else {
        const def   = MODULE_DEFS[type];
        const color = def ? def.color : '#334455';
        // 드래그 중이 아닐 때 hover된 모듈 강조
        const isDragHover = !isDragging && (gx === hgx && gy === hgy);
        ctx.fillStyle = isDragHover ? (def ? def.color + 'cc' : '#334455cc') : (def ? def.color : '#334455');
        ctx.globalAlpha = isDragHover ? 1.0 : 0.9;
        ctx.fillRect(sx - HALF, sy - HALF, CELL, CELL);
        ctx.globalAlpha = 1.0;
        // 테두리: 드래그 가능 강조(hover) / 슬롯 포화 / 일반
        if (isDragHover) {
          ctx.strokeStyle = 'rgba(251,191,36,0.95)';
          ctx.lineWidth   = 2;
        } else if (isFull) {
          const pulse2 = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
          ctx.strokeStyle = `rgba(251,191,36,${0.5 + pulse2 * 0.5})`;
          ctx.lineWidth   = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(200,220,255,0.5)';
          ctx.lineWidth   = 1;
        }
        ctx.strokeRect(sx - HALF, sy - HALF, CELL, CELL);
      }
    }

    // ── 4b. 드래그 중: 원위치에 점선 테두리 표시
    if (isDragging && pending) {
      const pulse3 = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = `rgba(251,191,36,${0.45 + pulse3 * 0.45})`;
      ctx.lineWidth   = 1.5;
      for (const c of pending.cells) {
        const ox = cx + (dragOriginAnchorGx + c.gx) * CELL;
        const oy = cy + (dragOriginAnchorGy + c.gy) * CELL;
        ctx.strokeRect(ox - HALF + 1, oy - HALF + 1, CELL - 2, CELL - 2);
      }
      ctx.setLineDash([]);
    }

    // ── 5. 유효 슬롯 표시
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
    for (const s of validSlots) {
      const sx = cx + s.gx * CELL;
      const sy = cy + s.gy * CELL;
      const isHover = (s.gx === hgx && s.gy === hgy);
      ctx.strokeStyle = isHover
        ? `rgba(100,220,255,0.9)`
        : `rgba(56,189,248,${0.3 + pulse * 0.4})`;
      ctx.lineWidth = isHover ? 2 : 1.5;
      ctx.strokeRect(sx - HALF + 1, sy - HALF + 1, CELL - 2, CELL - 2);
    }

    // ── 6. 호버 프리뷰
    if (pending && isValidHover) {
      ctx.globalAlpha = 0.45;
      for (const c of pending.cells) {
        const psx = cx + (hgx + c.gx) * CELL;
        const psy = cy + (hgy + c.gy) * CELL;
        ctx.fillStyle = pending.color;
        ctx.fillRect(psx - HALF, psy - HALF, CELL, CELL);
      }
      ctx.globalAlpha = 1;
    }

    // ── 7. 좌측 패널: 현재 장착 모듈 목록
    drawInstalledPanel(ctx, W, H, player, { grid, placedModules, maxHullSlots });

    // ── 8. 우측 패널: 모듈 인벤토리 (항상 표시)
    drawModulePanel(ctx, W, H, {
      pending, moduleQueue, pendingSelectIdx, placedModules, isDragging,
    });

    // ── 9. 하단 힌트
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font      = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#334466';
    const scrap = player ? player.scrap : 0;
    ctx.fillText(
      `[W/S] 모듈 선택   [R] 회전   [Space] 닫기   [E] 슬롯 증설 (+${HULL_SLOT_EXPAND_AMOUNT}슬롯, ${HULL_SLOT_EXPAND_COST}Scrap)   [X] 그리드 위: 장착해제 / 대기모듈: 파괴+Scrap  ─  Scrap: ${scrap}`,
      cx, H - 28
    );
  }

  return {
    drawShipModules,
    drawOnCanvas,
    drawInstalledPanel,
    drawModulePanel,
    drawInventory,
  };
})();
