#!/usr/bin/env python3
"""
run.py - 시장조사 통합 실행기 (간단한 인터페이스)

사용법:
    # 분석 + 보고서 생성 (샘플 데이터 사용)
    python3 run.py

    # 수집 지시 목록 확인 (MCP 수집 전 준비)
    python3 run.py --plan

    # 분석만 실행
    python3 run.py --analyze

    # 보고서만 생성 (csv / markdown / excel / all)
    python3 run.py --report --format excel

    # 전체 파이프라인 (분석 → 보고서)
    python3 run.py --all --format all
"""

import argparse
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).parent
DATA_DIR = BASE.parent / "data"
EXAMPLES_DIR = BASE.parent / "examples"

PRODUCTS_JSONL  = DATA_DIR / "products.jsonl"
ANALYZED_JSONL  = DATA_DIR / "analyzed.jsonl"
REPORTS_DIR     = DATA_DIR / "reports"


def _run(cmd: list, label: str) -> bool:
    """서브프로세스를 실행하고 성공 여부를 반환한다."""
    print(f"\n{'─'*50}")
    print(f"[{label}] 실행 중...")
    result = subprocess.run(cmd, text=True)
    if result.returncode != 0:
        print(f"[오류] {label} 실패 (종료코드 {result.returncode})", file=sys.stderr)
        return False
    return True


def cmd_plan() -> int:
    """수집 지시 목록 출력 (MCP 수집 전 확인용)."""
    print("=" * 60)
    print("  시장조사 수집 계획")
    print("=" * 60)
    print()
    print("아래 지시 목록을 Claude Code에서 MCP 도구로 실행하세요:")
    print()
    ok = _run(
        [sys.executable, str(BASE / "scraper.py"), "--dry-run"],
        "수집 계획 출력"
    )
    return 0 if ok else 1


def cmd_analyze(input_path: Path, output_path: Path) -> int:
    """수집 데이터 분석·정규화."""
    if not input_path.exists():
        # 샘플 데이터로 폴백
        sample = EXAMPLES_DIR / "sample_products.jsonl"
        if sample.exists():
            print(f"[안내] {input_path} 없음 → 샘플 데이터 사용: {sample}")
            input_path = sample
        else:
            print(f"[오류] 입력 파일 없음: {input_path}", file=sys.stderr)
            return 1

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ok = _run(
        [sys.executable, str(BASE / "analyzer.py"),
         "--input", str(input_path),
         "--output", str(output_path)],
        "데이터 분석"
    )
    return 0 if ok else 1


def cmd_report(input_path: Path, output_dir: Path, fmt: str = "all") -> int:
    """보고서 생성 (csv / markdown / excel / all)."""
    if not input_path.exists():
        print(f"[오류] 분석 파일 없음: {input_path}", file=sys.stderr)
        print("  먼저 --analyze 를 실행하세요.", file=sys.stderr)
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)
    ok = _run(
        [sys.executable, str(BASE / "report_gen.py"),
         "--input", str(input_path),
         "--output", str(output_dir),
         "--format", fmt],
        f"보고서 생성 ({fmt})"
    )
    return 0 if ok else 1


def cmd_all(fmt: str = "all") -> int:
    """분석 → 보고서 전체 파이프라인."""
    print("=" * 60)
    print("  시장조사 전체 파이프라인 시작")
    print("=" * 60)

    input_path = PRODUCTS_JSONL
    if not input_path.exists():
        sample = EXAMPLES_DIR / "sample_products.jsonl"
        if sample.exists():
            print(f"\n[안내] 수집 데이터 없음 → 샘플 데이터로 시연합니다.")
            input_path = sample
        else:
            print(f"[오류] 수집 데이터 없음. 먼저 MCP로 상품을 수집하세요.", file=sys.stderr)
            return 1

    # Step 1: 분석
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ok1 = _run(
        [sys.executable, str(BASE / "analyzer.py"),
         "--input", str(input_path),
         "--output", str(ANALYZED_JSONL)],
        "Step 1: 데이터 분석"
    )
    if not ok1:
        return 1

    # Step 2: 보고서
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    ok2 = _run(
        [sys.executable, str(BASE / "report_gen.py"),
         "--input", str(ANALYZED_JSONL),
         "--output", str(REPORTS_DIR),
         "--format", fmt],
        f"Step 2: 보고서 생성 ({fmt})"
    )

    print()
    print("=" * 60)
    print("  완료! 보고서 위치:", REPORTS_DIR)
    print("=" * 60)
    return 0 if ok2 else 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description="시장조사 통합 실행기",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python3 run.py                     # 전체 파이프라인 (샘플 → 분석 → 보고서)
  python3 run.py --plan              # 수집 지시 목록 확인
  python3 run.py --analyze           # 분석만 실행
  python3 run.py --report            # 보고서만 생성 (기본: all 포맷)
  python3 run.py --report --format excel   # Excel만 생성
  python3 run.py --all --format all  # 전체 파이프라인
        """,
    )

    parser.add_argument("--plan",    action="store_true", help="수집 지시 목록 출력")
    parser.add_argument("--analyze", action="store_true", help="분석만 실행")
    parser.add_argument("--report",  action="store_true", help="보고서만 생성")
    parser.add_argument("--all",     action="store_true", help="전체 파이프라인 (분석→보고서)")
    parser.add_argument("--format",
                        choices=["csv", "markdown", "excel", "all"],
                        default="all",
                        help="보고서 포맷 (기본: all)")
    parser.add_argument("--input",   default=str(PRODUCTS_JSONL), help="입력 JSONL 경로")
    parser.add_argument("--output",  default=str(REPORTS_DIR),    help="보고서 출력 디렉터리")

    args = parser.parse_args()

    if args.plan:
        return cmd_plan()

    if args.analyze:
        return cmd_analyze(Path(args.input), ANALYZED_JSONL)

    if args.report:
        return cmd_report(ANALYZED_JSONL, Path(args.output), args.format)

    # 기본 동작: --all (아무 플래그도 없으면 전체 파이프라인)
    return cmd_all(args.format)


if __name__ == "__main__":
    sys.exit(main())
