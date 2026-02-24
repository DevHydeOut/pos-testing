// app/new-auth/site/[siteId]/access-denied/page.tsx
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AccessDeniedPage({ 
    params 
}: { 
    params: Promise<{ siteId: string }> 
}) {
    const { siteId } = await params;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <Card className="w-[500px]">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <ShieldAlert className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>
                        You don't have permission to access this page
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                        This URL has been restricted by your administrator.
                        If you believe this is an error, please contact your site administrator.
                    </p>
                    <Button asChild>
                        <Link href={`/new-auth/site/${siteId}/dashboard`}>
                            Go to Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}