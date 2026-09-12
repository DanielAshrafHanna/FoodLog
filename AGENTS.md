# Project Agent Rules

These rules apply to work in this repository.

1. Begin every user-facing progress update and final response with **Dany,**.
2. Preserve user-facing functionality unless the task explicitly authorizes changing or removing it. If an unrequested removal is necessary, explain the tradeoff and get Dany's approval before proceeding.
3. Read `thought_Process.md` when work depends on established product behavior, prior implementation decisions, or release history. Update it for durable product, architecture, data, or operational decisions and material unresolved risks. Keep entries concise and factual; never include private chain-of-thought.
4. Use disposable fixtures and mocked remote responses for local automated tests; never write test records to production. Run relevant checks and fix failures introduced by the requested change without pausing for approval.
5. For implementation tasks, continue through implementation, relevant validation, and fixes needed to make the requested behavior work. Stop when the behavior works and relevant checks pass, or when a product decision or external action requires Dany's input.
6. Get explicit approval before destructive or irreversible operations, production data or schema changes, access or permission changes, and publishing or deployment unless Dany's request already authorizes the action.
