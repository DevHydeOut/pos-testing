import { db } from "@/lib/db"

export const getPasswordResetTokenByToken = async (token: string) => {
    try {
        const passwordResetToken = await db.passwordResetToken.findUnique({
            where: { token }
        });

        return passwordResetToken;
    } catch {
        return null;
    }
}

export const getPasswordResetTokenByUsername = async (username: string) => {
    try {
        const passwordResetToken = await db.passwordResetToken.findFirst({
            where: { username }
        });

        return passwordResetToken;
    } catch {
        return null;
    }
}