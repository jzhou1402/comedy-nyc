"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-card-border bg-card-bg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight text-accent">
          Comedy.NYC
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-muted hover:text-foreground transition-colors">
            Lineups
          </Link>
          <Link href="/comedians" className="text-muted hover:text-foreground transition-colors">
            Comedians
          </Link>
          {session ? (
            <>
              <Link href="/favorites" className="text-muted hover:text-foreground transition-colors">
                Favorites
              </Link>
              <button
                onClick={() => signOut()}
                className="text-muted hover:text-foreground transition-colors"
              >
                Sign out
              </button>
              <span className="text-xs text-muted">{session.user?.name}</span>
            </>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="rounded bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
