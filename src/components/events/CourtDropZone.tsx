import { useEffect, useRef, type ReactNode } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

export function CourtDropZone({
  courtNumber,
  children,
}: {
  courtNumber: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === "court-player",
      getData: () => ({ type: "court", courtNumber }),
    });
  }, [courtNumber]);

  return (
    <div ref={ref} className="rounded-lg border bg-background p-3">
      {children}
    </div>
  );
}
