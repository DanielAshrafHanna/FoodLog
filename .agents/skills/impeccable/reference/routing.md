# Command guidance

Read this reference for an explicit or implied Impeccable command, a workflow question, or a bare `$impeccable` invocation. Load only the command reference that applies.

## Commands

| Command | Purpose | Reference |
|---|---|---|
| `shape [feature]` | Plan UX/UI before code | [shape.md](shape.md) |
| `init` | Capture durable product context | [init.md](init.md) |
| `document` | Derive `DESIGN.md` from the implementation | [document.md](document.md) |
| `extract [target]` | Extract reusable tokens and components | [extract.md](extract.md) |
| `critique [target]` | Review UX and visual design | [critique.md](critique.md) |
| `audit [target]` | Check accessibility, performance, and responsive quality | [audit.md](audit.md); native: [audit.native.md](audit.native.md) |
| `polish [target]` | Complete a final quality pass | [polish.md](polish.md) |
| `bolder [target]` | Strengthen a safe or bland design | [bolder.md](bolder.md) |
| `quieter [target]` | Reduce visual aggression or stimulation | [quieter.md](quieter.md) |
| `distill [target]` | Remove unnecessary complexity | [distill.md](distill.md) |
| `harden [target]` | Cover errors, i18n, and edge cases | [harden.md](harden.md) |
| `onboard [target]` | Improve first-run and activation flows | [onboard.md](onboard.md) |
| `animate [target]` | Add purposeful motion | [animate.md](animate.md) |
| `colorize [target]` | Apply a deliberate color system | [colorize.md](colorize.md) |
| `typeset [target]` | Improve typography | [typeset.md](typeset.md) |
| `layout [target]` | Improve spacing and hierarchy | [layout.md](layout.md) |
| `delight [target]` | Add fitting personality | [delight.md](delight.md) |
| `overdrive [target]` | Explore an unconventional high-craft direction | [overdrive.md](overdrive.md) |
| `clarify [target]` | Improve labels, UX copy, and errors | [clarify.md](clarify.md) |
| `adapt [target]` | Adapt across devices or sizes | [adapt.md](adapt.md); native: [adapt.native.md](adapt.native.md) |
| `optimize [target]` | Diagnose and improve UI performance | [optimize.md](optimize.md) |
| `live` | Iterate on browser-selected elements | [live.md](live.md) |

`craft` is a deprecated alias for ordinary new-work behavior; see [craft.md](craft.md). `teach` aliases `init`.

## Routing

- For an explicit or clearly implied command, load its reference and follow its constraints. Ask only when two materially different commands fit and the choice changes the outcome.
- For a workflow question, consult relevant references for prerequisites and scope, then answer without executing unless requested. The broader guide is at [impeccable.style/docs](https://impeccable.style/docs/).
- For a bare `$impeccable` invocation, run `impeccable signals` after context. Recommend the two or three highest-value commands supported by those signals, then offer the command menu. Do not execute a command without a user request.
- If `context` reports `NO_PRODUCT_MD`, recommend `init` first while keeping other relevant options available.
- When `scan.targets` contains web files, `impeccable detect --json <targets>` may refine recommendations. Skip the detector for native projects and continue if it fails or the tree is too large.

Use project state as evidence rather than a score: missing design documentation may support `document`; unresolved critique findings may support `polish`; changed UI files may support a scoped `audit`; and a running web server makes `live` available.

## Operational commands

- `impeccable pin <pin|unpin> <command>` manages standalone command shortcuts. Report the script result; on error, relay stderr.
- `$impeccable hooks <on|off|status|ignore-rule|ignore-file|ignore-value|reset>` manages the project design-detector hook. Read [hooks.md](hooks.md) before executing it.
- `$impeccable doctor` diagnoses or repairs drift in Impeccable project artifacts. Read [doctor.md](doctor.md) before executing it.

After `init` writes `PRODUCT.md`, resume the requested work without rerunning context.
