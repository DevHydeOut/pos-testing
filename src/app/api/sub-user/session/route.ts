// app/api/sub-user/session/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('subUserSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    const sessionData = JSON.parse(sessionCookie.value);
    
    // Return the session data to the client
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}

// ✅ Force no caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;