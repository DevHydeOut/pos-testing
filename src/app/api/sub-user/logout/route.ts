// app/api/sub-user/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Delete the sub-user session cookie
    cookieStore.delete('subUserSession');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// ✅ Force no caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;