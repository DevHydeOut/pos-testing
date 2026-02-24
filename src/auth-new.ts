// auth-new.ts
import NextAuth from "next-auth";
import { db } from "./lib/db";
import authConfig from "./auth-new.config";
import { randomBytes } from "crypto";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  basePath: "/api/auth-new",
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await db.mainUser.findUnique({
          where: { email: user.email! },
        });
        
        if (!existingUser) {
          // ✅ Generate company code for new user
          const baseCode = user.name
            ? user.name.split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6)
            : user.email!.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6);
          
          const suffix = randomBytes(2).toString("hex").toUpperCase();
          const companyCode = `${baseCode}-${suffix}`;
          
          await db.mainUser.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              googleId: account.providerAccountId,
              companyCode,
            },
          });
          
          // ✅ FIXED: Use regular console.log, not template literal
          console.log("✅ Created new user with company code:", companyCode);
        }
        
        return true;
      }
      
      return false;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.email = token.email!;
      }
      return session;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
      }
      return token;
    },
  },
  pages: {
    signIn: "/new-auth/login",
  },
  session: { strategy: "jwt" },
  ...authConfig,
});