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
  const { MODULE_DEFS, TIER_COLORS, TIER_LABELS } = window.TetrisDefs;
  const { roundRect, drawModuleIcon } = window.TetrisIcons;

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

  return { drawInventory };
})();
