import AttemptResultsPage from "@/components/results/AttemptResultsPage";

export default async function Page({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <AttemptResultsPage attemptId={attemptId}/>;
}
