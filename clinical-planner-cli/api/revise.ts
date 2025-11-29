/**
 * API Route Template: /api/hac/planner/revise
 *
 * This is a template for the Next.js API route.
 * Copy this to your Next.js app at: app/api/hac/planner/revise/route.ts
 *
 * Usage:
 *   POST /api/hac/planner/revise
 *   Body: { revision_type, remark, input, output }
 *   Returns: Updated PlannerPlan
 */

import { PlanRevisionRequest, RevisionType } from '../../models/PlanRevision';
import { PlanningInput } from '../../models/PlanningInput';
import { PlannerPlan } from '../../models/PlannerPlan';
import { reviseSection } from '../../planner/revisionAgent';

/**
 * Next.js API Route Handler (App Router)
 *
 * Copy this pattern to: app/api/hac/planner/revise/route.ts
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { revision_type, remark, input, output } = body;

    // Validate required fields
    if (!revision_type) {
      return Response.json(
        { error: 'Missing required field: revision_type' },
        { status: 400 }
      );
    }

    if (!remark || remark.trim().length === 0) {
      return Response.json(
        { error: 'Missing or empty remark' },
        { status: 400 }
      );
    }

    if (!input || !output) {
      return Response.json(
        { error: 'Missing required fields: input and output' },
        { status: 400 }
      );
    }

    // Validate revision_type
    const validRevisionTypes: RevisionType[] = [
      'signals',
      'questions',
      'rules',
      'phases',
      'prompt',
      'full',
    ];

    if (!validRevisionTypes.includes(revision_type)) {
      return Response.json(
        { error: `Invalid revision_type: ${revision_type}. Must be one of: ${validRevisionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Construct revision request
    const revisionRequest: PlanRevisionRequest = {
      revision_type: revision_type as RevisionType,
      remark,
      original_input: input as PlanningInput,
      original_output: output as PlannerPlan,
      focus_items: body.focus_items,
    };

    // Process revision
    const useMock = process.env.USE_MOCK_MODE === 'true';
    const revisedPlan = await reviseSection(revisionRequest, useMock);

    // Return revised plan
    return Response.json(revisedPlan);
  } catch (error) {
    console.error('Error in /api/hac/planner/revise:', error);

    return Response.json(
      {
        error: 'Failed to revise plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Next.js API Route Handler (Pages Router - if using pages/ instead of app/)
 *
 * Copy this pattern to: pages/api/hac/planner/revise.ts
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { revision_type, remark, input, output } = req.body;

    // Validate (same as above)
    if (!revision_type || !remark || !input || !output) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Construct revision request
    const revisionRequest: PlanRevisionRequest = {
      revision_type,
      remark,
      original_input: input,
      original_output: output,
      focus_items: req.body.focus_items,
    };

    // Process revision
    const useMock = process.env.USE_MOCK_MODE === 'true';
    const revisedPlan = await reviseSection(revisionRequest, useMock);

    // Return revised plan
    return res.status(200).json(revisedPlan);
  } catch (error) {
    console.error('Error in /api/hac/planner/revise:', error);

    return res.status(500).json({
      error: 'Failed to revise plan',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
