import { NextRequest } from 'next/server';
import { handleTrainingApplication } from '@/lib/apply/training-registration';

/** Legacy Level 1 endpoint kept for students who started the previous flow. */
export async function POST(req: NextRequest) {
    return handleTrainingApplication(req, 'level1');
}
