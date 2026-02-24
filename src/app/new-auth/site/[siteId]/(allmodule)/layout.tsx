import Footer from "@/components/footer";
import Navbar from "@/components/new-auth/nav/navbar";

export default function ModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="bg-[#fafafa] py-6 px-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
