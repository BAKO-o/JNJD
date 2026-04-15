/**
 * tetris/icons.js — 모듈·코어 아이콘 드로잉 헬퍼 (순수 Canvas 드로잉)
 *
 * P0-2 stage 2: TetrisGrid.js 에서 아이콘 5개 분리.
 * 공유 상태 의존 0 — ctx + 좌표 + 색만 받아 그린다.
 *
 * 의존: window.TetrisDefs (HALF, MODULE_DEFS)
 * 노출: window.TetrisIcons
 */
'use strict';

window.TetrisIcons = (() => {
  const { HALF, MODULE_DEFS } = window.TetrisDefs;

  /** 둥근 사각형 헬퍼 (path 만 생성; 호출자가 fill/stroke) */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** 코어 아이콘 (작은 파란 삼각형) */
  function drawCoreIcon(ctx, sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    const r = HALF * 0.75;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.6, -r * 0.75);
    ctx.lineTo(-r * 0.6,  r * 0.75);
    ctx.closePath();
    ctx.fillStyle   = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.restore();
  }

  /** 구조 모듈 아이콘 드로우 (translate(cx,cy) 상태에서 호출) */
  function structureIcon(ctx, key, r, col) {
    ctx.fillStyle = col;
    ctx.strokeStyle = 'rgba(200,220,255,0.65)';
    ctx.lineWidth = 1;

    const drawPlates = (n) => {
      const h = r * 0.36, gap = r * 0.10;
      const total = n * h + (n - 1) * gap;
      for (let i = 0; i < n; i++) {
        const y = -total / 2 + i * (h + gap);
        ctx.fillRect(-r * 0.72, y, r * 1.44, h);
        ctx.strokeRect(-r * 0.72, y, r * 1.44, h);
      }
    };

    switch (key) {
      case 'HULL_1': drawPlates(1); break;
      case 'HULL_2': drawPlates(2); break;
      case 'HULL_3': drawPlates(3); break;

      case 'THRUSTER': {
        ctx.beginPath(); ctx.moveTo(0,-r*.75); ctx.lineTo(-r*.45,r*.3); ctx.lineTo(r*.45,r*.3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#fb923c'; ctx.beginPath(); ctx.moveTo(-r*.22,r*.3); ctx.lineTo(r*.22,r*.3); ctx.lineTo(0,r*.78); ctx.closePath(); ctx.fill();
        break;
      }
      case 'THRUSTER_2': {
        for (const dx of [-r*.38, r*.38]) {
          ctx.beginPath(); ctx.moveTo(dx,-r*.68); ctx.lineTo(dx-r*.27,r*.25); ctx.lineTo(dx+r*.27,r*.25); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle='#fb923c'; ctx.beginPath(); ctx.moveTo(dx-r*.15,r*.25); ctx.lineTo(dx+r*.15,r*.25); ctx.lineTo(dx,r*.6); ctx.closePath(); ctx.fill();
          ctx.fillStyle = col;
        }
        break;
      }
      case 'WING_L': {
        ctx.beginPath(); ctx.moveTo(r*.3,-r*.72); ctx.lineTo(-r*.72,r*.28); ctx.lineTo(-r*.1,r*.72); ctx.lineTo(r*.72,r*.1); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'WING_R': {
        ctx.beginPath(); ctx.moveTo(-r*.3,-r*.72); ctx.lineTo(r*.72,r*.28); ctx.lineTo(r*.1,r*.72); ctx.lineTo(-r*.72,r*.1); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'WING_HEAVY': {
        ctx.beginPath(); ctx.moveTo(0,-r*.82); ctx.lineTo(-r*.82,r*.42); ctx.lineTo(-r*.48,r*.72); ctx.lineTo(r*.5,-r*.12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle='rgba(200,220,255,0.9)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(-r*.32,r*.52); ctx.lineTo(r*.32,-r*.52); ctx.stroke();
        break;
      }
      case 'GUN_1': {
        ctx.beginPath(); ctx.arc(-r*.1,r*.15,r*.34,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillRect(-r*.12,-r*.78,r*.24,r*.9); ctx.strokeRect(-r*.12,-r*.78,r*.24,r*.9);
        break;
      }
      case 'GUN_2': {
        for (const dx of [-r*.22,r*.22]) {
          ctx.beginPath(); ctx.arc(dx,r*.15,r*.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
          ctx.fillRect(dx-r*.12,-r*.78,r*.22,r*.9); ctx.strokeRect(dx-r*.12,-r*.78,r*.22,r*.9);
        }
        break;
      }
      case 'REACTOR': {
        ctx.beginPath();
        for (let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;i?ctx.lineTo(Math.cos(a)*r*.72,Math.sin(a)*r*.72):ctx.moveTo(Math.cos(a)*r*.72,Math.sin(a)*r*.72);}
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#a78bfa'; ctx.beginPath(); ctx.arc(0,0,r*.3,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#c4b5fd'; ctx.lineWidth=.7; ctx.beginPath(); ctx.arc(0,0,r*.52,0,Math.PI*2); ctx.stroke();
        break;
      }
      case 'SHIELD_CELL': {
        ctx.beginPath();
        for (let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;i?ctx.lineTo(Math.cos(a)*r*.8,Math.sin(a)*r*.8):ctx.moveTo(Math.cos(a)*r*.8,Math.sin(a)*r*.8);}
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle='#a78bfa'; ctx.lineWidth=1.5;
        ctx.beginPath();
        for (let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;i?ctx.lineTo(Math.cos(a)*r*.46,Math.sin(a)*r*.46):ctx.moveTo(Math.cos(a)*r*.46,Math.sin(a)*r*.46);}
        ctx.closePath(); ctx.stroke();
        break;
      }
      case 'REINFORCED_HULL': {
        ctx.fillRect(-r*.72,-r*.72,r*1.44,r*1.44); ctx.strokeRect(-r*.72,-r*.72,r*1.44,r*1.44);
        ctx.strokeStyle='rgba(200,220,255,0.55)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(-r*.6,-r*.6); ctx.lineTo(r*.6,r*.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r*.6,-r*.6); ctx.lineTo(-r*.6,r*.6); ctx.stroke();
        break;
      }
      case 'TWIN_GUN': {
        for (const dx of [-r*.35,0,r*.35]) {
          ctx.beginPath(); ctx.arc(dx,r*.2,r*.17,0,Math.PI*2); ctx.fill(); ctx.stroke();
          ctx.fillRect(dx-r*.1,-r*.72,r*.2,r*.9); ctx.strokeRect(dx-r*.1,-r*.72,r*.2,r*.9);
        }
        break;
      }
      case 'OVERCLOCK': {
        const teeth=8,ro=r*.78,ri=r*.54,ir=r*.27;
        ctx.beginPath();
        for(let i=0;i<teeth*2;i++){const a=i*Math.PI/teeth;const rad=i%2===0?ro:ri;i?ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);}
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#0f172a'; ctx.beginPath(); ctx.arc(0,0,ir,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,0,ir,0,Math.PI*2); ctx.stroke();
        break;
      }
      case 'FURY_CORE': {
        ctx.beginPath(); ctx.moveTo(0,-r*.82); ctx.lineTo(r*.55,0); ctx.lineTo(0,r*.82); ctx.lineTo(-r*.55,0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle='#ef4444'; ctx.lineWidth=1;
        for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.55,Math.sin(a)*r*.55);ctx.lineTo(Math.cos(a)*r*.88,Math.sin(a)*r*.88);ctx.stroke();}
        break;
      }
      case 'TITAN_HULL': {
        drawPlates(3);
        ctx.fillStyle='rgba(200,220,255,0.3)';
        for(const p of[[-r*.5,-r*.52],[r*.5,-r*.52],[-r*.5,0],[r*.5,0],[-r*.5,r*.52],[r*.5,r*.52]]){
          ctx.beginPath(); ctx.arc(p[0],p[1],r*.07,0,Math.PI*2); ctx.fill();
        }
        break;
      }
      default: drawPlates(1); break;
    }
  }

  /** 무기 모듈 아이콘 드로우 (translate(cx,cy) 상태에서 호출) */
  function weaponIcon(ctx, key, r, col) {
    ctx.fillStyle = col;
    ctx.strokeStyle = 'rgba(200,220,255,0.65)';
    ctx.lineWidth = 1;

    switch (key) {
      case 'WPN_GATLING': {
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.arc(Math.cos(a)*r*.38,Math.sin(a)*r*.38,r*.28,0,Math.PI*2);ctx.fill();ctx.stroke();}
        ctx.fillStyle='#0f172a'; ctx.beginPath(); ctx.arc(0,0,r*.22,0,Math.PI*2); ctx.fill();
        break;
      }
      case 'WPN_FLAK': {
        ctx.beginPath();
        for(let i=0;i<8;i++){const a=i*Math.PI/4;const rad=i%2===0?r*.8:r*.36;i?ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);}
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'WPN_LASER': {
        ctx.shadowColor=col; ctx.shadowBlur=8;
        ctx.strokeStyle=col; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(-r*.86,0); ctx.lineTo(r*.86,0); ctx.stroke();
        ctx.strokeStyle='#fff'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(-r*.86,0); ctx.lineTo(r*.86,0); ctx.stroke();
        ctx.shadowBlur=0;
        break;
      }
      case 'WPN_SPREAD': {
        ctx.strokeStyle=col; ctx.lineWidth=1.5;
        for(let i=-2;i<=2;i++){const a=(i/2.5)*(Math.PI/4);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*.88,Math.sin(a)*r*.88);ctx.stroke();}
        break;
      }
      case 'WPN_MISSILE': {
        ctx.beginPath(); ctx.moveTo(0,-r*.82); ctx.quadraticCurveTo(r*.3,-r*.38,r*.22,r*.5); ctx.lineTo(-r*.22,r*.5); ctx.quadraticCurveTo(-r*.3,-r*.38,0,-r*.82); ctx.closePath(); ctx.fill(); ctx.stroke();
        for(const s of[1,-1]){ctx.beginPath();ctx.moveTo(s*r*.22,r*.28);ctx.lineTo(s*r*.6,r*.65);ctx.lineTo(s*r*.22,r*.65);ctx.closePath();ctx.fill();}
        break;
      }
      case 'WPN_ORBIT': {
        ctx.strokeStyle=col; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(0,0,r*.65,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle=col;
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.arc(Math.cos(a)*r*.65,Math.sin(a)*r*.65,r*.16,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='rgba(200,220,255,0.55)'; ctx.beginPath(); ctx.arc(0,0,r*.12,0,Math.PI*2); ctx.fill();
        break;
      }
      case 'WPN_MINE': {
        ctx.beginPath(); ctx.arc(0,0,r*.44,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle=col; ctx.lineWidth=1.5;
        for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.44,Math.sin(a)*r*.44);ctx.lineTo(Math.cos(a)*r*.82,Math.sin(a)*r*.82);ctx.stroke();}
        break;
      }
      case 'WPN_SNIPER': {
        ctx.fillRect(-r*.1,-r*.9,r*.2,r*1.62); ctx.strokeRect(-r*.1,-r*.9,r*.2,r*1.62);
        ctx.fillStyle='rgba(200,220,255,0.45)'; ctx.fillRect(-r*.24,r*.18,r*.48,r*.22);
        break;
      }
      case 'WPN_CHAIN': {
        ctx.lineWidth=2.5; ctx.strokeStyle=col;
        for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*r*.5,i*r*.06,r*.27,0,Math.PI*2);ctx.stroke();}
        break;
      }
      case 'WPN_NOVA': {
        ctx.beginPath();
        for(let i=0;i<12;i++){const a=i*Math.PI/6;const rad=i%2===0?r*.8:r*.38;i?ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);}
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'WPN_PLASMA': {
        ctx.shadowColor=col; ctx.shadowBlur=10;
        ctx.beginPath(); ctx.arc(0,0,r*.56,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
        ctx.strokeStyle='rgba(255,255,255,0.72)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(0,0,r*.36,Math.PI*.2,Math.PI*1.18); ctx.stroke();
        ctx.beginPath(); ctx.arc(r*.08,r*.08,r*.22,Math.PI*1.18,Math.PI*2.1); ctx.stroke();
        break;
      }
      case 'WPN_RAILGUN': {
        ctx.fillRect(-r*.86,-r*.12,r*1.72,r*.24); ctx.strokeRect(-r*.86,-r*.12,r*1.72,r*.24);
        ctx.strokeStyle='#7dd3fc'; ctx.lineWidth=1;
        for(const x of[-r*.52,0,r*.52]){ctx.beginPath();ctx.arc(x,0,r*.22,-Math.PI*.62,Math.PI*.62);ctx.stroke();ctx.beginPath();ctx.arc(x,0,r*.22,Math.PI*.38,Math.PI*1.62);ctx.stroke();}
        break;
      }
      case 'WPN_TYPHOON': {
        ctx.strokeStyle=col; ctx.lineWidth=2.2;
        ctx.beginPath();
        for(let i=0;i<=70;i++){const a=i*Math.PI/13;const rad=r*.09*(i/9);if(rad>r*.86)break;i?ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);}
        ctx.stroke();
        break;
      }
      case 'WPN_ANNIHILATOR': {
        ctx.strokeStyle=col; ctx.lineWidth=r*.3; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-r*.65,-r*.65); ctx.lineTo(r*.65,r*.65); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r*.65,-r*.65); ctx.lineTo(-r*.65,r*.65); ctx.stroke();
        ctx.lineCap='butt';
        break;
      }
      case 'WPN_OMEGA': {
        ctx.font=`bold ${Math.round(r*1.55)}px serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle=col; ctx.fillText('Ω',0,r*.1);
        break;
      }
      default: {
        // 기본: 총구 원
        ctx.beginPath(); ctx.arc(0,0,r*.55,0,Math.PI*2); ctx.fill(); ctx.stroke();
        break;
      }
    }
  }

  /** 모듈 아이콘 드로우 (공개용 — 인벤토리 카드에서 호출) */
  function drawModuleIcon(ctx, typeKey, cx, cy, sz) {
    const def = MODULE_DEFS[typeKey];
    if (!def) return;
    const r = sz * 0.44;
    ctx.save();
    ctx.translate(cx, cy);
    // 원형 배경
    ctx.beginPath(); ctx.arc(0,0,r*1.1,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.fill();
    if (typeKey.startsWith('WPN_')) weaponIcon(ctx, typeKey, r, def.color);
    else structureIcon(ctx, typeKey, r, def.color);
    ctx.restore();
  }

  return { roundRect, drawCoreIcon, structureIcon, weaponIcon, drawModuleIcon };
})();
