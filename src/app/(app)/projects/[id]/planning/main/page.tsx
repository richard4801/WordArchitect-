"use client";

import { useParams } from "next/navigation";
import { PlanningWorkspace } from "../PlanningWorkspace";

export default function MainPipelinePage() {
  const { id: bookId } = useParams<{ id: string }>();
  return <PlanningWorkspace bookId={bookId} pipelineType="full" />;
}
