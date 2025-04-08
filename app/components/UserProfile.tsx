"use client";

import {useAuth, useUser } from "@clerk/nextjs";


export default function UserProfile() {
    const { isSignedIn, user, isLoaded } = useUser()
    const { userId } = useAuth()

    if (!isLoaded) {
        return <div>Loading...</div>
      }
    
      if (!isSignedIn) {
        // You could also add a redirect to the sign-in page here
        return <div>Sign in to view this page</div>
      }

  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        Hello {user.firstName}! Your user Id is  {userId}! 
       
    </div>
  );
}