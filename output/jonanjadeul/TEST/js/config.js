/**
 * config.js — 게임 밸런스 수치 설정
 *
 * 이 파일의 값은 Game.js의 CFG 기본값을 덮어쓴다.
 * 게임 밸런스 수치 변경 시 main.js(Game.js)가 아닌 이 파일을 수정한다.
 *
 * v1.2.0: 스테이지 시스템 + 환경 위험 수치 추가
 */

'use strict';

window.GameConfig = {
  // ── 환경 위험 (Stage Hazard)
  METEOR_DAMAGE:          5,      // 유성 접촉 데미지
  HEAT_DPS:               0.5,    // HEAT 환경 초당 데미지 (HP/s)
  CRYO_CD_MULT:           1.3,    // CRYO 환경 쿨다운 배율
  RADIATION_ARMOR_MULT:   0.7,    // RADIATION 환경 장갑 효율 배율

  // ── 스테이지 클리어 보상
  STAGE_CLEAR_SCRAP:      80,     // 스테이지 클리어 시 스크랩 지급
  STAGE_CLEAR_MODULES:    2,      // 스테이지 클리어 시 모듈 드랍 수

  // ── 유성 스폰 간격
  METEOR_SPAWN_MIN:       0.40,   // 최소 스폰 간격 (s) — v1.2.3: 밀도 10배 증가
  METEOR_SPAWN_MAX:       0.65,   // 최대 스폰 간격 (s)
};
