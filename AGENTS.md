# Project Agent Rules

These rules apply to every agent working in this repository.

1. Address the user as **Dany** at the beginning of every user-facing response, including progress updates and final responses.
2. Before starting a task, review the installed skills and use any skill whose instructions apply to the request.
3. Never remove, disable, replace, or materially reduce an existing feature or functionality without first explaining the proposed removal and receiving Dany's explicit approval.
4. Keep `thought_Process.md` updated throughout project work. Record:
   - features and functionality added, changed, or removed;
   - how important features were implemented;
   - decisions and assumptions that affect future work;
   - issues encountered, their causes when known, and their resolutions or current status;
   - verification performed and any remaining risks or follow-up work.
5. Read `thought_Process.md` before making project changes. Use it to avoid repeating past mistakes, undoing intentional behavior, duplicating work, or removing functionality that should remain.
6. Do not place private chain-of-thought or hidden reasoning in `thought_Process.md`. Keep it as a concise, factual engineering and product decision log.
7. When a task changes the repository, update `thought_Process.md` in the same task before reporting completion.
8. For bounded operational subtasks—such as checking branch state, preparing or publishing a reviewed commit, running a prescribed release check, or gathering deployment status—prefer delegating to a `gpt-5.6-luna` subagent with `max` reasoning effort when subagents are available. Give it a narrow, reviewable objective and require it to report the exact result. The primary agent remains responsible for product decisions, code and UX changes, data or schema operations, destructive actions, access grants, deployments, and the final verification/report.
