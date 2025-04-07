//app/api/user/profile
// app/api/user/profile/route.ts
import { NextResponse } from 'next/server';
import { currentUser, auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Use `auth()` to get the user's ID
    const { userId } = await auth();

    // Protect the route by checking if the user is signed in
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use `currentUser()` to get the Backend API User object
    const user = await currentUser();

    // Return the user data
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}