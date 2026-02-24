import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#141516] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Welcome to 🐶 Pigaro
        </h1>

        <p className="text-muted-foreground text-lg">
          Your everyday app
        </p>

        <div className="flex gap-4 mt-6">
          <Button
            asChild
            size="lg"
            className="px-8 bg-white text-black hover:bg-gray-200 transition-colors"
          >
            <Link href="/new-auth/login">Master Login</Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="px-8 bg-white text-black hover:bg-gray-200 transition-colors"
          >
            <Link href="/new-auth/staff-login">Staff Login</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}