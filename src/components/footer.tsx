import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t py-6 text-sm">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Left */}
        <div className="flex items-center gap-6 flex-wrap">
          <span className="font-bold text-lg">▲</span>
          <Link href="/">Home</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/help">Help</Link>
          <Link href="/contact">Contact</Link>
        </div>

        <div className="text-muted-foreground">
          © {new Date().getFullYear()}, Pigaro Inc.
        </div>
      </div>
    </footer>
  );
}
