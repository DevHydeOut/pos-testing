"use client";
import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";

export const Social = () => {

    const onClick = (provider: "google" | "github") => {
        signIn(provider, {
            callbackUrl: DEFAULT_LOGIN_REDIRECT
        })
    }

    return (
        <div className="w-[100%] flex items-center gap-x-2">
            <Button 
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => onClick("google")}
            >
                <FcGoogle className="w-5 h-5" />
            </Button>
            <Button 
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => onClick("github")}
            >
                <FaGithub className="w-5 h-5" />
            </Button>
        </div>
    )
}