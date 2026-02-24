import { db } from "@/lib/db";

export const getUserByUsername = async (username: string) => {
    try{
        const user = await db.user.findUnique({
        where: { username },
        });
        return user;
    } catch {
        return null;
    }
};

export const getUserById = async (id: string) => {
  try{
        const user = await db.user.findUnique({
        where: { id },
        });
        return user;
    } catch {
        return null;
    }
};

