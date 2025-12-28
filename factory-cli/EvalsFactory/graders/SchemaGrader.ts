import { BaseGrader, GradeResult } from './BaseGrader';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';

/**
 * E6: SchemaGrader
 * 
 * Validates PlannerPlan JSON against schema.
 */
export class SchemaGrader extends BaseGrader {
  private ajv: Ajv;
  private schema: any;

  constructor() {
    super();
    this.ajv = new Ajv();
    const schemaPath = path.join(__dirname, '../../schemas/planner-plan.schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    this.schema = JSON.parse(schemaContent);
  }

  grade(testCase: any, output: any): GradeResult {
    // If output is PlannerPlanV2, we should validate it
    const validate = this.ajv.compile(this.schema);
    const valid = validate(output);

    return {
      criterion: 'SchemaCompliance',
      score: valid ? 1.0 : 0.0,
      reasoning: valid ? 'Schema validation passed' : `Schema validation failed: ${this.ajv.errorsText(validate.errors)}`,
      flagged: !valid,
      details: { errors: validate.errors },
    };
  }
}
