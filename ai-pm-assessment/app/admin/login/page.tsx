import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Header } from "@/components/Header";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Instructor Login" };

const errors: Record<string, string> = {
  invalid: "Invalid email or password.",
  rate: "Too many attempts. Try again in 15 minutes.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (await getAdminSession()) redirect("/admin");
  return (
    <>
      <Header subtitle="Instructor" />
      <main className="mx-auto max-w-sm px-4 py-12 sm:py-20">
        <div className="card px-6 py-8">
          <h1 className="font-serif text-2xl font-semibold">Instructor login</h1>
          <p className="mt-1 text-sm text-muted">Access the results dashboard.</p>
          <LoginForm initialError={error ? errors[error] : undefined} />
        </div>
      </main>
    </>
  );
}
