"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto py-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            My Profile
          </h2>
          <UserProfile />
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto text-center py-16">
        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
          Welcome to SmartSpend
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Track your expenses, forecast future spending, and gain financial
          insights with our AI-powered expense tracker.
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/sign-up"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-medium"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
