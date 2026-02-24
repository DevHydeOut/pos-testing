"use server"

import * as z from "zod";

import { LoginSchema } from "@/schemas";
import { signIn } from "@/auth";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { AuthError } from "next-auth";

export const login = async (
    values: z.infer<typeof LoginSchema>
): Promise<{ error?: string; success?: string }> => {
    const validatedFields = LoginSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid login credentials" };
    }

    const { username, password } = validatedFields.data;

    try {
        await signIn("credentials", {
            username,
            password,
            redirectTo: DEFAULT_LOGIN_REDIRECT,
        });

        return { success: "Logged in successfully!" };

    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid Credentials" };
                default:
                    return { error: "Something went wrong" };
            }
        }
        
        throw error;
    }
};