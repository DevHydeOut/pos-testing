// next-auth.d.ts (create this file in your project root or src folder)
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

// ✅ Extend the default session user
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string | null;
      role?: UserRole;
      companyCode?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    username?: string | null;
    role?: UserRole;
    companyCode?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    username?: string | null;
    role?: UserRole;
    companyCode?: string;
  }
}

// ✅ Export ExtendedUser type for use in components
export type ExtendedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
  role?: UserRole;
  companyCode?: string;
};