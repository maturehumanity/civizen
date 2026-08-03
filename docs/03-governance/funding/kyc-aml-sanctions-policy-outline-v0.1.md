# KYC, AML, sanctions, and source-of-funds policy outline v0.1

**Status:** Outline stub  
**Related:** Funding Constitution §13, §14, §20 item 8  
**Counsel review:** Not started  
**Product:** No capital acceptance until this policy is counsel-approved and operationally staffed.

## Purpose

Prevent Civizen from accepting funds from sanctioned, fraudulent, or otherwise prohibited sources, and ensure identity verification matches the funding lane’s legal requirements.

## Minimum controls (target)

| Control | Applies when |
|---|---|
| Identity (KYC) / business (KYB) | Investor capital; large donations/grants as required; digital assets |
| Sanctions screening | All capital-accepting lanes |
| Source-of-funds / wealth review | Thresholds set by counsel |
| Beneficial ownership | Entities and complex structures |
| Wallet screening | Any crypto / USDT receipt |
| Ongoing monitoring | Periodic re-screening of active funders |

## Lane notes

- **Investor:** KYC/KYB + accreditation checks as required by offering rules.
- **Donation:** lighter path possible below counsel thresholds; still sanctions screen.
- **Grant/government:** KYB on institutional counterparties; agreement diligence.
- **USDT/digital assets:** disabled in product until custody and this policy are live.

## Records

Screening result, provider reference, timestamp, reviewer, hold/release reason, retention period.

## Product behavior until live

- Interest forms must not request passport/SSN/wallet seeds.
- Admin queue flags “needs KYC” manually after counsel process exists.
- No payment or crypto checkout UI.

## Open questions

- Provider selection
- Jurisdiction-specific thresholds
- Retention and deletion schedule
- Who can override a sanctions hit (answer: nobody without counsel + compliance)
