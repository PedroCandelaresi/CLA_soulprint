import { NextRequest } from 'next/server';
import { proxyAndreaniRequest } from '../utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    return proxyAndreaniRequest('quote', request);
}
