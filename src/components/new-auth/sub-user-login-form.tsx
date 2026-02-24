"use client";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubUserLoginSchema } from "@/schemas/new-auth";
import { useState, useTransition } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";
import { loginSubUser } from "@/actions/new-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Lock, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getFirstAccessiblePage } from "@/lib/permissions";

export const SubUserLoginForm = () => {
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof SubUserLoginSchema>>({
    resolver: zodResolver(SubUserLoginSchema),
    defaultValues: {
      companyCode: "",
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof SubUserLoginSchema>) => {
    setError("");
    setSuccess("");

    startTransition(() => {
      loginSubUser(values)
        .then((data) => {
          if (data?.error) {
            setError(data.error);
            return;
          }

          if (data?.success && data?.user) {
            setSuccess(data.success);

            // Store minimal session info in localStorage for UI
            const clientSession = {
              username: data.user.username,
              name: data.user.name,
              companyCode: data.user.companyCode,
              currentSiteId: data.user.currentSiteId,
              currentSiteName: data.user.currentSiteName,
              currentSiteRole: data.user.currentSiteRole,
              permissions: data.user.permissions,
              availableSites: data.user.availableSites,
            };

            localStorage.setItem("subUserSession", JSON.stringify(clientSession));
            window.dispatchEvent(new Event("subUserSessionUpdated"));

            console.log("✅ Login successful, session stored");
            
            // ✅ Use centralized function to determine redirect path
            const redirectPath = getFirstAccessiblePage(
              data.user.permissions || undefined,  // ✅ convert null to undefined
              data.user.currentSiteId
            );
            
            console.log("🔄 Redirecting to:", redirectPath);

            // Hard redirect to ensure cookies are sent
            setTimeout(() => {
              window.location.href = redirectPath;
            }, 1000);
          }
        })
        .catch((err) => {
          console.error("Login error:", err);
          setError("An unexpected error occurred. Please try again.");
        });
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {/* Info Alert */}
      <Alert className="w-full">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Need your company code?</strong>
          <br />
          Contact your administrator to get your unique company code.
        </AlertDescription>
      </Alert>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Staff Login</CardTitle>
          <CardDescription>Sign in with your company credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                {/* Company Code Field */}
                <FormField
                  control={form.control}
                  name="companyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isPending}
                          placeholder="APOLLO-2024"
                          className="uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Your unique organization identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Username Field */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Username
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isPending}
                          placeholder="john_doe"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          disabled={isPending}
                          placeholder="••••••••"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormError message={error} />
              <FormSuccess message={success} />

              <Button disabled={isPending} type="submit" className="w-full">
                {isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};