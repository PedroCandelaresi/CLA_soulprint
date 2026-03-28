import { NextRequest } from 'next/server';
import { appendVendureCookies, performLogout, toJsonResponse } from '../utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const result = await performLogout(request.headers.get('cookie') || undefined);
    return appendVendureCookies(result.headers, toJsonResponse(result.body, result.body.success ? 200 : 400));
}
