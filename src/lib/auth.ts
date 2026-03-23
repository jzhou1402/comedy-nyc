import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const db = getDb();
        db.prepare(`
          INSERT INTO users (email, name, google_id)
          VALUES (?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET
            name = excluded.name,
            google_id = excluded.google_id
        `).run(user.email, user.name, account.providerAccountId);
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const db = getDb();
        const dbUser = db.prepare("SELECT id FROM users WHERE email = ?").get(session.user.email) as { id: number } | undefined;
        if (dbUser) {
          (session as any).userId = dbUser.id;
        }
      }
      return session;
    },
  },
});
