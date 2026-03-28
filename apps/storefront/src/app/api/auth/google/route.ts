import { NextRequest } from 'next/server';
import { buildGoogleAuthRedirect } from '../utils';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
    return buildGoogleAuthRedirect(request);
}
