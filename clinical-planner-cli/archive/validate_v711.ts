import { validatePlanV71, printValidationResults } from './planner/externalValidator';
import * as fs from 'fs';

const plan = JSON.parse(fs.readFileSync('./planner_plan.json', 'utf-8'));
const result = validatePlanV71(plan);
printValidationResults(result);
