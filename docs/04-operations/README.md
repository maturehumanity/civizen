# Operations

Developer, release, deployment stubs, and contributor process documentation.

Production host topology, secrets, and privileged runbooks are **not** published here; they remain in the access-controlled operations store. Public stubs under `dev/ssh-and-vps/` and `REMOTE_DB_ACCESS.md` explain what is intentionally omitted.

## Sections

| Section | Purpose |
| --- | --- |
| [`dev/`](./dev/) | Agent notes, release guides, UX specs, federation runbooks |
| [`contributor-processes/`](./contributor-processes/) | Content metadata templates and retrieval rules |

## Canonical starting points

1. [`dev/AGENTS.md`](./dev/AGENTS.md) — mandatory agent context  
2. [`dev/nav-secondary-carousel.md`](./dev/nav-secondary-carousel.md) — Market/Home/Study arc UX  
3. [`dev/ENVIRONMENT_LIFECYCLE.md`](./dev/ENVIRONMENT_LIFECYCLE.md) — release / data isolation  
4. [`dev/RELEASING.md`](./dev/RELEASING.md) — human release steps  

## Related

- Platform architecture: [`../03-platform/`](../03-platform/)
- Policies for public copy: [`../02-policies/institutional/`](../02-policies/institutional/)

## Proposing changes

Update the relevant spec in the same session as the code change. Process changes belong in `AGENTS.md` and `.cursor/rules/civizen-project.mdc`.
