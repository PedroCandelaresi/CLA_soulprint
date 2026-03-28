import { NextRequest } from 'next/server';
import { proxyPersonalizationUpload } from '../utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    return proxyPersonalizationUpload(request);
}
