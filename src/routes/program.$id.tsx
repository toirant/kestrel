import { createFileRoute } from "@tanstack/react-router";
import { ProgramPage } from "@/components/kestrel/program-page";
import { Shell } from "@/components/kestrel/shell";

export const Route = createFileRoute("/program/$id")({
  component: function ProgramRoute() {
    const { id } = Route.useParams();
    return (
      <Shell>
        <ProgramPage programId={id} />
      </Shell>
    );
  },
});
