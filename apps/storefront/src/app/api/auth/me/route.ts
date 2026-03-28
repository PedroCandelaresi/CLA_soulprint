import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveCustomer } from '../utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const customer = await fetchActiveCustomer(request.headers.get('cookie') || undefined);
        return NextResponse.json({
            success: true,
            customer,
        });
    } catch {
        return NextResponse.json({
            success: true,
            customer: null,
        });
    }
}
