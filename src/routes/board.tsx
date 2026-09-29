import { createFileRoute } from "@tanstack/react-router";
import { BoardPage } from "@/components/kestrel/board-page";
import { Shell } from "@/components/kestrel/shell";

export const Route = createFileRoute("/board")({
  component: function BoardRoute() {
    return (
      <Shell>
        <BoardPage />
      </Shell>
    );
  },
});
