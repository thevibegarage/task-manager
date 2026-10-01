import { AssessmentApp } from "@/components/AssessmentApp";
import { Header } from "@/components/Header";
import { getAssessmentOverview } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export default async function Home() {
  const overview = await getAssessmentOverview();
  return (
    <>
      <Header subtitle="RAG & AI Application Assessment" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {overview ? (
          <AssessmentApp overview={overview} />
        ) : (
          <p className="card px-6 py-10 text-center text-ink-soft">The assessment is not available yet.</p>
        )}
      </main>
    </>
  );
}
