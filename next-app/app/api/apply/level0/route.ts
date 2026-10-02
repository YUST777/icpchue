import { NextRequest } from 'next/server';
import { handleTrainingApplication } from '@/lib/apply/training-registration';

export async function POST(req: NextRequest) {
    return handleTrainingApplication(req, 'level0');
}
