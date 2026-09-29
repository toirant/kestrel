import { createFileRoute } from "@tanstack/react-router";
import { FieldPage } from "@/components/kestrel/field-page";
import { Shell } from "@/components/kestrel/shell";

export const Route = createFileRoute("/")({
  component: function Home() {
    return (
      <Shell>
        <FieldPage />
      </Shell>
    );
  },
});
