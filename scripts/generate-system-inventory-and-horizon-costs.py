#!/usr/bin/env python3
"""Generate Civizen comprehensive system inventory and long-horizon cost companions."""
from __future__ import annotations

import csv
import importlib.util
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/04-operations/funding-and-budget"
DATA = Path(__file__).resolve().parent / "data"
HORIZ = Path("/tmp/civizen_systems_horizontal.json")

systems: list[dict] = []


def S(sid, name, purpose, parent, scope, clas, decision, m5, m10, m20, fw, **ex):
    systems.append(
        {
            "system_id": sid,
            "name": name,
            "purpose": purpose,
            "parent_domain": parent,
            "affected_populations": ex.get("pop", "residents_and_institutions"),
            "affected_institutions": ex.get("inst", "governments_operators_partners"),
            "scope": scope,
            "classification": clas,
            "architecture_decision": decision,
            "authoritative_institution_requirement": ex.get(
                "auth", "defined_per_jurisdiction_or_federation_charter"
            ),
            "major_dependencies": ex.get("deps", "identity;privacy;security;records"),
            "sensitive_data_classes": ex.get("data", "pii;credentials"),
            "failure_abuse_consequences": ex.get(
                "fail", "service_outage;rights_harm;trust_loss"
            ),
            "human_rights_implications": ex.get(
                "hr", "access;privacy;non_discrimination;due_process"
            ),
            "required_specialists": ex.get("spec", "engineers;domain_experts;counsel"),
            "required_standards": ex.get("std", "open_interop;security_baselines"),
            "assurance_certification": ex.get("assure", "security_privacy_a11y_review"),
            "accessibility_nondigital_alternatives": ex.get(
                "a11y", "required_for_claimed_services"
            ),
            "deployment_operating_model": ex.get("ops", "federated_multi_operator"),
            "lifecycle_status": "planned",
            "maturity_target_y5": m5,
            "maturity_target_y10": m10,
            "maturity_target_y20": m20,
            "first_wave_funding_status": fw,
            "doc11_mapping": ex.get("map11", ""),
            "never_centralize_globally": ex.get("never_c", "false"),
            "notes": ex.get("notes", ""),
        }
    )


horiz_src = HORIZ if HORIZ.exists() else DATA / "system-inventory-horizontal.json"
if not horiz_src.exists():
    raise SystemExit(f"missing horizontal inventory: tried {HORIZ} and {DATA / 'system-inventory-horizontal.json'}")
systems.extend(json.loads(horiz_src.read_text()))

base = json.loads((DATA / "system-inventory-base-domains.json").read_text())
for code, payload in base.items():
    parent, map11, items = payload["parent"], payload["map11"], payload["items"]
    for i, row in enumerate(items, 1):
        n, p, clas, d, m5, m10, m20, fw, ex = row
        never = ex.get("never_c")
        if never is None:
            never = "true" if d in ("prohibit-global-central", "leave-to-J") else "false"
        S(
            f"{code}-{i:03d}",
            n,
            p,
            parent,
            ex.get("scope", "jurisdictional"),
            clas,
            d,
            m5,
            m10,
            m20,
            fw,
            map11=ex.get("map11", map11),
            data=ex.get("data", "pii;domain_sensitive"),
            never_c=never,
            notes=ex.get("notes", ""),
            spec=ex.get("spec", "domain_specialists;engineers;counsel"),
            auth=ex.get("auth", "jurisdictional_authority"),
        )

_exp_path = Path(__file__).resolve().parent / "system-inventory-domain-expansions.py"
_spec = importlib.util.spec_from_file_location("system_inventory_domain_expansions", _exp_path)
_exp = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_exp)

for code, extra_items in _exp.EXPANSIONS.items():
    parent = base[code]["parent"]
    map11 = base[code]["map11"]
    start = sum(1 for s in systems if s["system_id"].startswith(code + "-")) + 1
    for j, item in enumerate(extra_items):
        n, p, clas, d, m5, m10, m20, fw, ex = item
        i = start + j
        never = ex.get("never_c")
        if never is None:
            never = "true" if d in ("prohibit-global-central", "leave-to-J") else "false"
        S(
            f"{code}-{i:03d}",
            n,
            p,
            parent,
            ex.get("scope", "jurisdictional"),
            clas,
            d,
            m5,
            m10,
            m20,
            fw,
            map11=ex.get("map11", map11),
            data=ex.get("data", "pii;domain_sensitive"),
            never_c=never,
            notes=ex.get("notes", ""),
            spec=ex.get("spec", "domain_specialists;engineers;counsel"),
            auth=ex.get("auth", "jurisdictional_authority"),
        )

existing_ids = {s["system_id"] for s in systems}
for hx in _exp.HORIZONTAL_EXTRA:
    sid, n, p, parent, scope, clas, d, m5, m10, m20, fw, ex = hx
    if sid in existing_ids:
        continue
    S(
        sid,
        n,
        p,
        parent,
        scope,
        clas,
        d,
        m5,
        m10,
        m20,
        fw,
        map11=ex.get("map11", "core-platform"),
        never_c=ex.get("never_c", "false"),
        notes=ex.get("notes", ""),
        auth=ex.get("auth", "federation_or_core_charter"),
    )

OUT.mkdir(parents=True, exist_ok=True)
fields = list(systems[0].keys())
inv_csv = OUT / "12-comprehensive-system-inventory-v0.1.csv"
with inv_csv.open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(systems)

gap_w = {
    "adequate": 0,
    "partial": 0.15,
    "framework-only": 0.4,
    "hidden-in-J-II": 0.25,
    "absent": 0.7,
    "double-count-risk": 0.1,
}
unit_gap = {"shared-core": 40, "domain-specific": 60, "integration": 35}
unfunded = sum(
    unit_gap.get(s["classification"], 50) * gap_w.get(s["first_wave_funding_status"], 0.5)
    for s in systems
)

meta12 = {
    "version": "0.1",
    "date": "2026-08-10",
    "system_count": len(systems),
    "horizontal_count": sum(1 for s in systems if s["system_id"].startswith("H-")),
    "domain_count": sum(1 for s in systems if s["system_id"].startswith("D-")),
    "first_wave_funding_status_counts": dict(
        Counter(s["first_wave_funding_status"] for s in systems)
    ),
    "architecture_decision_counts": dict(
        Counter(s["architecture_decision"] for s in systems)
    ),
    "classification_counts": dict(Counter(s["classification"] for s in systems)),
    "never_centralize_globally_count": sum(
        1 for s in systems if s["never_centralize_globally"] == "true"
    ),
    "operate_directly_count": sum(
        1 for s in systems if s["architecture_decision"] == "operate"
    ),
    "indicative_first_wave_unfunded_or_weak_usd_b": round(unfunded / 1000, 2),
    "disclaimer": "Catalog is extensive but not metaphysically complete; expect growth.",
}
(OUT / "12-comprehensive-system-inventory-v0.1.meta.json").write_text(
    json.dumps(meta12, indent=2) + "\n"
)

# Persist horizontal for regen without /tmp dependency (exclude H-X extras so regen is idempotent)
(DATA / "system-inventory-horizontal.json").write_text(
    json.dumps(
        [s for s in systems if s["system_id"].startswith("H-") and not s["system_id"].startswith("H-X-")],
        indent=2,
    )
    + "\n"
)

y1_5 = {"constrained": 20.6, "base": 37.5, "accelerated": 87.3}
y6_10 = {
    "constrained": {"dev": 18, "ops": 25, "expand_j": 22, "assure": 4, "reserves": 6},
    "base": {"dev": 35, "ops": 55, "expand_j": 50, "assure": 8, "reserves": 12},
    "accelerated": {"dev": 80, "ops": 120, "expand_j": 140, "assure": 20, "reserves": 30},
}
y11_20 = {
    "constrained": {
        "dev": 40,
        "ops": 90,
        "expand_j": 60,
        "assure": 12,
        "reserves": 20,
        "replace": 15,
    },
    "base": {
        "dev": 90,
        "ops": 220,
        "expand_j": 160,
        "assure": 30,
        "reserves": 45,
        "replace": 40,
    },
    "accelerated": {
        "dev": 220,
        "ops": 550,
        "expand_j": 400,
        "assure": 70,
        "reserves": 100,
        "replace": 90,
    },
}


def sumd(d):
    return sum(d.values())


rows13 = []
for scen in ("constrained", "base", "accelerated"):
    a = y1_5[scen]
    b = sumd(y6_10[scen])
    c = sumd(y11_20[scen])
    rows13.append(
        {
            "scenario": scen,
            "years_1_5_usd_b": a,
            "years_6_10_usd_b": b,
            "years_11_20_usd_b": c,
            "years_1_10_usd_b": round(a + b, 1),
            "years_1_20_usd_b": round(a + b + c, 1),
            "y6_10_breakdown": json.dumps(y6_10[scen]),
            "y11_20_breakdown": json.dumps(y11_20[scen]),
        }
    )

wshares = [0.08, 0.14, 0.20, 0.26, 0.32]
ann = []
for i, wi in enumerate(wshares, 1):
    t = round(37.5 * wi, 2)
    ann.append(
        {
            "year": i,
            "scenario": "base",
            "total_usd_b": t,
            "maintain_usd_b": round(t * 0.25, 2),
            "expand_usd_b": round(t * 0.65, 2),
            "replace_usd_b": round(t * 0.10, 2),
        }
    )
y6_10_totals = [22, 26, 30, 36, 46]
assert abs(sum(y6_10_totals) - sumd(y6_10["base"])) < 1
for i, t in enumerate(y6_10_totals):
    ann.append(
        {
            "year": 6 + i,
            "scenario": "base",
            "total_usd_b": t,
            "maintain_usd_b": round(t * 0.45, 2),
            "expand_usd_b": round(t * 0.45, 2),
            "replace_usd_b": round(t * 0.10, 2),
        }
    )
y11_20_totals = [40, 44, 48, 52, 56, 60, 64, 68, 72, 81]
assert abs(sum(y11_20_totals) - sumd(y11_20["base"])) < 1
for i, t in enumerate(y11_20_totals):
    ann.append(
        {
            "year": 11 + i,
            "scenario": "base",
            "total_usd_b": t,
            "maintain_usd_b": round(t * 0.55, 2),
            "expand_usd_b": round(t * 0.30, 2),
            "replace_usd_b": round(t * 0.15, 2),
        }
    )

with (OUT / "13-ten-and-twenty-year-program-cost-v0.1.csv").open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows13[0].keys()))
    w.writeheader()
    w.writerows(rows13)

with (OUT / "13-annual-cashflow-base-v0.1.csv").open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(ann[0].keys()))
    w.writeheader()
    w.writerows(ann)

meta13 = {
    "version": "0.1",
    "date": "2026-08-10",
    "currency": "USD",
    "disclaimer": "Preliminary long-horizon planning ranges — not budgets, bids, or commitments.",
    "scenarios": rows13,
    "post_y5_annual_first_wave_ops_usd_b": "2-5+",
    "post_y10_annual_ops_indicative_base_usd_b": "12-25",
    "post_y20_annual_ops_indicative_base_usd_b": "40-90",
    "method": "Bottom-up from first-wave model + expansion drivers. Not forced to a preset grand total.",
}
(OUT / "13-ten-and-twenty-year-program-cost-v0.1.meta.json").write_text(
    json.dumps(meta13, indent=2) + "\n"
)

print(json.dumps(meta12, indent=2))
print("y1_20", {r["scenario"]: r["years_1_20_usd_b"] for r in rows13})
