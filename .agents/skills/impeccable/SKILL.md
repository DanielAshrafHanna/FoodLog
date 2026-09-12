---
name: impeccable
description: Use when designing, reviewing, or refining a frontend interface.
metadata:
  version: 4.3.1
---

# Impeccable

Create distinctive, production-ready interface work grounded in the user's brief, product truth, and incumbent design where one exists.

## Start

Run `<skill-base-dir>/scripts/impeccable context` once per session from the project root. The skill directory containing this file is `<skill-base-dir>`; use its scripts for every Impeccable command. On Windows without `sh`, use `scripts/impeccable.cmd`. Pass a named source file or route with `--target <path>`.

If the launcher fails, state that context loading did not run, inspect the project's available product and design context directly, and continue without inventing missing context.

Route only to guidance needed for the request:

- For an explicit or clearly implied Impeccable command, read its reference from [reference/routing.md](reference/routing.md).
- For a bare `$impeccable` invocation or a workflow question, read [reference/routing.md](reference/routing.md).
- For a new surface or replacement visual world, read [reference/new-work.md](reference/new-work.md).
- For a narrow refinement, work from the incumbent implementation and the context command's findings.
- Before editing UI, read [reference/craft-floor.md](reference/craft-floor.md) after the direction is settled. Planning-only work does not need it.

## Design boundaries

- The user's brief wins. Preserve explicitly chosen aesthetics, materials, type, and palette.
- Refinement preserves the incumbent identity, behavior, copy, and out-of-scope areas. Redesign may replace the visual identity while preserving product truth, content, function, native affordances, and technical constraints.
- Ask before replacing factual copy or adding claims the user did not provide.
- Treat existing screenshots, tokens, components, and assets as visual evidence. A missing `DESIGN.md` does not make an existing product greenfield.
- Choose the visitor mode from the requested surface: **Persuade** for decisions and action, **Operate** for task completion, **Read** for comprehension, and **Experience** when the work itself should lead. Use [reference/operate.md](reference/operate.md) when Operate or Read needs deeper guidance.
- Do not repair reported context drift during unrelated design work unless the finding is marked `auto` or the user asks for repair. Use [reference/doctor.md](reference/doctor.md) for requested drift diagnosis.

## Completion

For implementation work, continue until the requested surface is implemented, inspected once across its relevant viewports or device classes, and material findings are fixed. Confirm the fixes with at most one additional inspection pass, then stop. Preserve reduced-motion and accessibility behavior where applicable.

For audits, critiques, plans, and workflow questions, finish the requested deliverable without beginning implementation unless the user also requested changes. A missing user-supplied asset or a real approval boundary may remain open when it is clearly reported.
