import { createFileRoute } from "@tanstack/react-router";
import { ReviewPage } from "@/components/kestrel/review-page";
import { Shell } from "@/components/kestrel/shell";

export const Route = createFileRoute("/review")({
  component: function ReviewRoute() {
    return (
      <Shell>
        <ReviewPage />
      </Shell>
    );
  },
});
