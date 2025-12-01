## Tech Debt: Decouple Legacy CLI
- [ ] Refactor `package.json` scripts to point to new CLI entry point.
- [ ] Migrate `tests/integration/rpi-workflow.test.ts` to use new Planner.
- [ ] Replace `planner/qa.ts` imports with `qualityAssessment.ts`.
- [ ] DELETE: `cli/plan.ts`, `planner/plannerAgent.ts`, `planner/qa.ts`