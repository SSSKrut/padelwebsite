import { useEffect, useRef } from "react";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import type { EventParticipant } from "@/types/events";

export function PlayerChip({
  participant,
  courtNumber,
}: {
  participant: EventParticipant;
  courtNumber: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ type: "court-player", userId: participant.user.id }),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) =>
          source.data.type === "court-player" && source.data.userId !== participant.user.id,
        getData: () => ({
          type: "court-player",
          userId: participant.user.id,
          courtNumber,
        }),
      }),
    );
  }, [participant.user.id, courtNumber]);

  return (
    <span
      ref={ref}
      className="text-xs font-medium px-2 py-1 rounded-full bg-muted cursor-move"
    >
      {participant.user.name} · {participant.user.elo}
    </span>
  );
}
