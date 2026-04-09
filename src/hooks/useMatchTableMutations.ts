import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import type { MatchTableMatch, MatchTableResponse } from "@/types/events";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useMatchTableMutations({
  eventId,
  scoreDrafts,
  manualEloDrafts,
  manualWinnerDrafts,
  assignmentDrafts,
  matchTable,
  confirmAction,
}: {
  eventId: string | undefined;
  scoreDrafts: Record<string, { score1: string; score2: string }>;
  manualEloDrafts: Record<string, string>;
  manualWinnerDrafts: Record<string, boolean>;
  assignmentDrafts: Record<string, number>;
  matchTable: MatchTableResponse | undefined;
  confirmAction: (title: string, desc: string, action: () => void) => void;
}) {
  const queryClient = useQueryClient();
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const updateMatch = useMutation({
    mutationFn: (payload: { eventId: string; matchId: string; score1: number; score2: number }) =>
      apiFetch("/.netlify/functions/event-match-table", "PATCH", payload),
    onMutate: (payload) => {
      setSavingMatchId(payload.matchId);
    },
    onSuccess: () => {
      toast.success("Score updated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update score");
    },
    onSettled: () => {
      setSavingMatchId(null);
    },
  });

  const generateTable = useMutation({
    mutationFn: (payload: { eventId: string; mode: "AUTO_COURTS" | "MANUAL_ELO" }) =>
      apiFetch("/.netlify/functions/admin-event-match-table", "POST", payload),
    onSuccess: () => {
      toast.success("Match table generated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to generate table");
    },
  });

  const updateAssignments = useMutation({
    mutationFn: (payload: { eventId: string; assignments: { userId: string; courtNumber: number }[] }) =>
      apiFetch("/.netlify/functions/admin-event-match-table", "PATCH", payload),
    onSuccess: () => {
      toast.success("Court assignments updated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update courts");
    },
  });

  const saveManualElo = useMutation({
    mutationFn: (payload: { eventId: string; entries: { userId: string; newElo: number; isWinner: boolean }[] }) =>
      apiFetch("/.netlify/functions/admin-event-manual-elo", "POST", payload),
    onSuccess: () => {
      toast.success("Manual ELO saved");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save manual ELO");
    },
  });

  const confirmTable = useMutation({
    mutationFn: (payload: { eventId: string }) =>
      apiFetch("/.netlify/functions/admin-event-match-table", "PUT", payload),
    onSuccess: () => {
      toast.success("Match table confirmed and ELO updated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to confirm table");
    },
  });

  const handleSaveMatch = (match: MatchTableMatch) => {
    if (!eventId) return;
    const draft = scoreDrafts[match.id];
    const score1 = Number.parseInt(draft?.score1 ?? "", 10);
    const score2 = Number.parseInt(draft?.score2 ?? "", 10);

    if (Number.isNaN(score1) || Number.isNaN(score2)) {
      toast.error("Enter valid numeric scores for both teams.");
      return;
    }

    updateMatch.mutate({ eventId, matchId: match.id, score1, score2 });
  };

  const handleSaveManualElo = () => {
    if (!eventId || !matchTable) return;
    const manualPlayers = matchTable.courts
      .filter((court) => matchTable.mode === "MANUAL_ELO" || court.isManual)
      .flatMap((court) => court.players);

    if (!manualPlayers.length) {
      toast.error("No manual courts found.");
      return;
    }

    const entries = manualPlayers.map((player) => {
      const raw = manualEloDrafts[player.id];
      return {
        userId: player.id,
        newElo: Number.parseInt(raw ?? "", 10),
        isWinner: manualWinnerDrafts[player.id] ?? false,
      };
    });

    const invalid = entries.find((entry) => Number.isNaN(entry.newElo) || entry.newElo < 0);
    if (invalid) {
      toast.error("Enter valid manual ELO values for all players in manual courts.");
      return;
    }

    saveManualElo.mutate({ eventId, entries });
  };

  const handleApplyAssignments = () => {
    if (!eventId) return;
    const assignments = Object.entries(assignmentDrafts)
      .filter(([userId]) => UUID_REGEX.test(userId))
      .map(([userId, courtNumber]) => ({
        userId,
        courtNumber,
      }));

    if (!assignments.length) {
      toast.error("No valid court assignments to save.");
      return;
    }

    confirmAction(
      "Update Courts",
      "This will regenerate matchups and clear current scores and manual ELO values. Continue?",
      () => updateAssignments.mutate({ eventId, assignments }),
    );
  };

  const handleConfirmTable = () => {
    if (!eventId) return;
    confirmAction(
      "Confirm Match Table",
      "Confirming will apply Elo updates and lock scores. Continue?",
      () => confirmTable.mutate({ eventId }),
    );
  };

  return {
    savingMatchId,
    updateMatch,
    generateTable,
    updateAssignments,
    saveManualElo,
    confirmTable,
    handleSaveMatch,
    handleSaveManualElo,
    handleApplyAssignments,
    handleConfirmTable,
  };
}
