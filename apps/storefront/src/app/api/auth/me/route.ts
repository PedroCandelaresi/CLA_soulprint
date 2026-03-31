import { NextRequest, NextResponse } from 'next/server';
import { appendVendureSetCookieHeaders } from '@/lib/vendure/client';
import { fetchActiveCustomerWithHeaders } from '../utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const result = await fetchActiveCustomerWithHeaders(request.headers.get('cookie') || undefined);
        const response = NextResponse.json({
            success: true,
            customer: result.customer,
        });
        appendVendureSetCookieHeaders(result.headers, response.headers);
        return response;
    } catch {
        return NextResponse.json({
            success: true,
            customer: null,
        });
    }
}
