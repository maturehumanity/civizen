#!/usr/bin/env python3
"""Generate versioned Program plan summary from canonical funding-and-budget metas/CSVs."""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs" / "04-operations" / "funding-and-budget"


def read_json(name: str) -> dict:
    return json.loads((DOCS / name).read_text(encoding="utf-8"))


def read_csv(name: str) -> list[dict]:
    with (DOCS / name).open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def main() -> None:
    meta14 = read_json("14-validation-workstreams-and-budget-v0.1.meta.json")
    meta11 = read_json("11-program-financial-model-v0.1.meta.json")
    meta13 = read_json("13-ten-and-twenty-year-program-cost-v0.1.meta.json")
    rows14 = read_csv("14-validation-workstreams-and-budget-v0.1.csv")

    csv_low = round(sum(float(r["low_usd_m"]) for r in rows14))
    csv_base = round(sum(float(r["base_usd_m"]) for r in rows14))
    csv_high = round(sum(float(r["high_usd_m"]) for r in rows14))
    if (
        csv_low != meta14["totals_usd_m"]["low"]
        or csv_base != meta14["totals_usd_m"]["base"]
        or csv_high != meta14["totals_usd_m"]["high"]
    ):
        raise SystemExit(
            f"Validation CSV/meta mismatch: csv={csv_low}/{csv_base}/{csv_high} "
            f"meta={meta14['totals_usd_m']['low']}/{meta14['totals_usd_m']['base']}/{meta14['totals_usd_m']['high']}"
        )

    years = list(meta11["years_base_usd_b"])
    year_sum = sum(years)
    if abs(year_sum - 37.5) > 0.01:
        raise SystemExit(f"Five-year cashflow does not sum to 37.5B (got {year_sum})")

    base13 = next(s for s in meta13["scenarios"] if s["scenario"] == "base")

    summary = {
        "modelVersion": "0.1",
        "generatedAt": "2026-08-10",
        "currency": "USD",
        "status": "non_approved_planning_estimates",
        "disclaimer": (
            "Read-only strategic estimates and scenarios. Not approved budgets, commitments, "
            "receipts, or actual spending. Not worldwide completion or one organization’s budget."
        ),
        "hierarchy": {
            "detailedOperatingPlan": "validation_18_24_months",
            "primaryProgramPlan": "five_year_first_wave",
            "years6to10": "strategic_outlook_only",
            "years11to20": "directional_lifecycle_scenario",
        },
        "validation": {
            "status": "working_estimate",
            "durationMonths": meta14["horizon_months"],
            "sourceDoc": "14-pre-major-build-validation-program-v0.1.md",
            "sourceMeta": "14-validation-workstreams-and-budget-v0.1.meta.json",
            "modelVersion": meta14["version"],
            "updatedAt": meta14["date"],
            "totalsUsdM": {
                "low": meta14["totals_usd_m"]["low"],
                "base": meta14["totals_usd_m"]["base"],
                "high": meta14["totals_usd_m"]["high"],
            },
            "fundingControlBaseUsdM": meta14["by_funding_control_base_usd_m"],
            "scenarioDiffNote": (
                "Low: leaner staffing, fewer consultations, thinner contingency. "
                "Base: full planned workstream intensity. "
                "High: expanded consultations, demonstrators, contingency, and assurance depth."
            ),
            "baseTranchePacing": [
                {"id": "T1", "label": "Validation launch", "shareOfBase": 0.25},
                {"id": "T2", "label": "Validation execute", "shareOfBase": 0.45},
                {"id": "T3", "label": "Validation close", "shareOfBase": 0.2},
                {"id": "reserve", "label": "Safe-pause reserve", "shareOfBase": 0.1},
            ],
            "workstreamCount": len(rows14),
            "workstreamsDoc": "14-pre-major-build-validation-program-v0.1.md",
        },
        "fiveYearFirstWave": {
            "status": "preliminary_ecosystem_hypothesis",
            "sourceDoc": "11-program-financial-model-and-funding-responsibility-v0.1.md",
            "sourceMeta": "11-program-financial-model-v0.1.meta.json",
            "modelVersion": meta11["version"],
            "updatedAt": meta11["date"],
            "rangeUsdB": {"lowRounded": 30, "highRounded": 50},
            "modeledBaseUsdB": 37.5,
            "modeledBaseExactUsdB": meta11["five_year_base_usd_b"],
            "annualBaseCashflowUsdB": [
                {"year": i + 1, "amountUsdB": amount} for i, amount in enumerate(years)
            ],
            "corePrimaryResponsibleUsdB": meta11["core_primary_responsible_usd_b"],
            "coreMustRaiseUsdB": meta11["core_must_raise_usd_b"],
            "notWorldwideCompletion": True,
            "notSingleOrganizationBudget": True,
        },
        "longRangeOutlook": {
            "status": "internal_lifecycle_scenarios",
            "confidence": "low",
            "defaultStatement": (
                "Years 6–20 are maintained as internal lifecycle scenarios and will be "
                "replaced by rolling evidence-based plans."
            ),
            "sourceDoc": "13-ten-and-twenty-year-program-cost-framework-v0.1.md",
            "advancedDisclosureOnly": True,
            "sensitivityNote": (
                "Highly sensitive to adoption, scope, technology, jurisdiction participation, "
                "inflation, and institutional design. Not accepted by governments, funders, or "
                "institutions. Not a budget, forecast, promise, or current funding request."
            ),
            "scenariosUsdB": {
                "baseYears1to10": base13["years_1_10_usd_b"],
                "baseYears1to20": base13["years_1_20_usd_b"],
            },
        },
        "reconciliation": {
            "validationCsvMatchesMeta": True,
            "fiveYearCashflowSumsToBase": True,
        },
    }

    json_path = DOCS / "program-plan-summary-v0.1.json"
    json_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    ts_path = ROOT / "src" / "lib" / "funding" / "program-plan-summary.generated.ts"
    ts_body = (
        "/* eslint-disable */\n"
        "/** AUTO-GENERATED by scripts/generate-program-plan-summary.py — do not edit by hand. */\n"
        f"export const PROGRAM_PLAN_SUMMARY = {json.dumps(summary, indent=2)} as const;\n\n"
        "export type ProgramPlanSummary = typeof PROGRAM_PLAN_SUMMARY;\n"
    )
    ts_path.write_text(ts_body, encoding="utf-8")
    print(f"Wrote {json_path}")
    print(f"Wrote {ts_path}")


if __name__ == "__main__":
    main()
