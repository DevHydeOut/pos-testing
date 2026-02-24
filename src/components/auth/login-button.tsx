"use client"

import { useRouter } from "next/navigation";

import {
    Dialog,
    DialogTrigger,
    DialogContent,
} from "@/components/ui/dialog";
import { LoginForm } from "./login-form";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface LoginButtonProps {
    children: React.ReactNode;
    mode?: "modal" | "redirect",
    asChild?: boolean;
};

export const LoginButton = ({
    children,
    mode= "redirect",
}: LoginButtonProps) => {

    const router = useRouter();

    const onClick = () => {
        router.push("/auth/login");
    }

    if (mode === "modal") { 
        return(
            <Dialog>
                <DialogTrigger asChild>
                    <span className="cursor-pointer">
                        {children}
                    </span>
                </DialogTrigger>
                <DialogContent className="p-0 w-auto bg-transparent border-none">
                    <VisuallyHidden>
                        <DialogTitle>Login</DialogTitle>
                    </VisuallyHidden>
                    <LoginForm />
                </DialogContent>
            </Dialog>
        )
    }

    return(
        <span onClick={onClick} className="cusrsor-pointer">
            {children}
        </span>
    )
}