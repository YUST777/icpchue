import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({
        error: 'تم اكتمال العدد المطلوب وإغلاق استقبال البطاقات الشخصية.'
    }, { status: 403 });
}

export async function GET() {
    return NextResponse.json({
        status: 'closed',
        message: 'تم إغلاق باب التوثيق.'
    });
}
