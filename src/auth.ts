import NextAuth from "next-auth" 
import { PrismaAdapter } from "@auth/prisma-adapter";

import { db } from "./lib/db";
import { getUserById } from "./data/users";
import { UserRole } from "@prisma/client";
import authConfig from "./auth.config";

export const { 
  handlers: { GET, POST}, 
  auth, 
  signIn,
  signOut,
} = NextAuth({
  callbacks: {
    async session({ session, token }) {

      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.role && session.user) {
        session.user.role = token.role as UserRole;
      }

      // Map your actual database fields to session
      if (token.name && session.user) {
        session.user.name = token.name as string;
      }

      if (token.username && session.user) {
        session.user.username = token.username as string;
      }

      if (token.image && session.user) {
        session.user.image = token.image as string;
      }

      return session;
    },
    
    async jwt({ token }) {

      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);
      if (!existingUser) return token;

      // Map your database fields to token
      token.role = existingUser.role;
      token.name = existingUser.name;
      token.username = existingUser.username ?? undefined;
      token.image = existingUser.image;

      return token;
    }
  },
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
});