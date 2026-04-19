import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EventParticipant, MatchTableMatch } from "@/types/events";

const STATUS_OPTIONS = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
  "WALKOVER",
  "NO_CONTEST",
] as const;

type MatchStatus = (typeof STATUS_OPTIONS)[number];

type MatchDraft = {
  courtNumber: number;
  round: number;
  status: MatchStatus;
  pair1Player1Id: string;
  pair1Player2Id: string;
  pair2Player1Id: string;
  pair2Player2Id: string;
};

type MatchPayload = MatchDraft & { eventId: string; matchId?: string };
type MatchDeletePayload = { eventId: string; matchId: string };

const PLAYER_FIELDS = [
  "pair1Player1Id",
  "pair1Player2Id",
  "pair2Player1Id",
  "pair2Player2Id",
] as const;
type PlayerField = (typeof PLAYER_FIELDS)[number];

const buildDraftFromMatch = (match: MatchTableMatch): MatchDraft => ({
  courtNumber: match.courtNumber,
  round: match.round,
  status: (match.status ?? "SCHEDULED") as MatchStatus,
  pair1Player1Id: match.pair1[0]?.id ?? "",
  pair1Player2Id: match.pair1[1]?.id ?? "",
  pair2Player1Id: match.pair2[0]?.id ?? "",
  pair2Player2Id: match.pair2[1]?.id ?? "",
});

const emptyDraft = (participants: EventParticipant[]): MatchDraft => {
  const defaults = participants.slice(0, 4).map((p) => p.user.id);
  return {
    courtNumber: 1,
    round: 1,
    status: "SCHEDULED",
    pair1Player1Id: defaults[0] ?? "",
    pair1Player2Id: defaults[1] ?? "",
    pair2Player1Id: defaults[2] ?? "",
    pair2Player2Id: defaults[3] ?? "",
  };
};

const validateDraft = (draft: MatchDraft) => {
  const ids = [
    draft.pair1Player1Id,
    draft.pair1Player2Id,
    draft.pair2Player1Id,
    draft.pair2Player2Id,
  ];

  if (ids.some((id) => !id)) {
    return "Select all four players.";
  }

  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return "Players must be unique within a match.";
  }

  if (!Number.isFinite(draft.courtNumber) || draft.courtNumber < 1) {
    return "Court number must be at least 1.";
  }

  if (!Number.isFinite(draft.round) || draft.round < 1) {
    return "Round must be at least 1.";
  }

  return null;
};

export function CustomMatchesAdminPanel({
  eventId,
  participants,
  matches,
  status,
  courtNumbers,
}: {
  eventId: string;
  participants: EventParticipant[];
  matches: MatchTableMatch[];
  status: "DRAFT" | "OPEN" | "CONFIRMED";
  courtNumbers: number[];
}) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, MatchDraft>>({});
  const [newMatch, setNewMatch] = useState<MatchDraft>(() => emptyDraft(participants));
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { score1: string; score2: string }>>({});
  const [savingScoreId, setSavingScoreId] = useState<string | null>(null);

  const canEdit = status === "OPEN";

  useEffect(() => {
    const nextDrafts: Record<string, MatchDraft> = {};
    matches.forEach((match) => {
      nextDrafts[match.id] = buildDraftFromMatch(match);
    });
    setDrafts(nextDrafts);
  }, [matches]);

  useEffect(() => {
    const nextScores: Record<string, { score1: string; score2: string }> = {};
    matches.forEach((match) => {
      nextScores[match.id] = {
        score1: match.score1 !== null ? String(match.score1) : "",
        score2: match.score2 !== null ? String(match.score2) : "",
      };
    });
    setScoreDrafts(nextScores);
  }, [matches]);

  useEffect(() => {
    setNewMatch(emptyDraft(participants));
  }, [participants]);

  const participantOptions = useMemo(
    () =>
      participants
        .map((p) => ({ id: p.user.id, label: p.user.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [participants],
  );

  const orderedCourts = useMemo(() => {
    const source = courtNumbers.length ? courtNumbers : matches.map((match) => match.courtNumber);
    const unique = Array.from(new Set(source)).sort((a, b) => a - b);
    return unique.length ? unique : [1];
  }, [courtNumbers, matches]);

  const matchesByCourt = useMemo(() => {
    const map = new Map<number, MatchTableMatch[]>();
    matches.forEach((match) => {
      const list = map.get(match.courtNumber) ?? [];
      list.push(match);
      map.set(match.courtNumber, list);
    });
    return map;
  }, [matches]);

  const selectedPlayers = useMemo(() => new Set(PLAYER_FIELDS.map((field) => newMatch[field]).filter(Boolean)), [
    newMatch,
  ]);

  const handleAssignPlayer = (playerId: string) => {
    if (selectedPlayers.has(playerId)) {
      toast.error("Player already selected in this match.");
      return;
    }
    const nextSlot = PLAYER_FIELDS.find((field) => !newMatch[field]);
    if (!nextSlot) {
      toast.error("All player slots are filled.");
      return;
    }
    setNewMatch((prev) => ({ ...prev, [nextSlot]: playerId }));
  };

  const clearPlayers = () => {
    setNewMatch((prev) => ({
      ...prev,
      pair1Player1Id: "",
      pair1Player2Id: "",
      pair2Player1Id: "",
      pair2Player2Id: "",
    }));
  };

  const swapSides = () => {
    setNewMatch((prev) => ({
      ...prev,
      pair1Player1Id: prev.pair2Player1Id,
      pair1Player2Id: prev.pair2Player2Id,
      pair2Player1Id: prev.pair1Player1Id,
      pair2Player2Id: prev.pair1Player2Id,
    }));
  };

  const createMatch = useMutation({
    mutationFn: (payload: MatchPayload) =>
      apiFetch("/.netlify/functions/admin-event-matches", "POST", payload),
    onSuccess: () => {
      toast.success("Match created");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create match");
    },
  });

  const updateMatch = useMutation({
    mutationFn: (payload: MatchPayload) =>
      apiFetch("/.netlify/functions/admin-event-matches", "PATCH", payload),
    onSuccess: () => {
      toast.success("Match updated");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update match");
    },
  });

  const deleteMatch = useMutation({
    mutationFn: (payload: MatchDeletePayload) =>
      apiFetch("/.netlify/functions/admin-event-matches", "DELETE", payload),
    onSuccess: () => {
      toast.success("Match deleted");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete match");
    },
  });

  const saveScore = useMutation({
    mutationFn: (payload: { eventId: string; matchId: string; score1?: number; score2?: number; status?: MatchStatus }) =>
      apiFetch("/.netlify/functions/event-match-table", "PATCH", payload),
    onMutate: (payload) => {
      setSavingScoreId(payload.matchId);
    },
    onSuccess: () => {
      toast.success("Score saved");
      queryClient.invalidateQueries({ queryKey: ["matchTable", eventId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save score");
    },
    onSettled: () => {
      setSavingScoreId(null);
    },
  });

  const updateDraft = (matchId: string, patch: Partial<MatchDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        ...patch,
      },
    }));
  };

  const handleCreate = () => {
    const error = validateDraft(newMatch);
    if (error) {
      toast.error(error);
      return;
    }

    createMatch.mutate({ eventId, ...newMatch });
  };

  const handleUpdate = (matchId: string) => {
    const draft = drafts[matchId];
    if (!draft) return;
    const error = validateDraft(draft);
    if (error) {
      toast.error(error);
      return;
    }

    updateMatch.mutate({ eventId, matchId, ...draft });
  };

  const handleSaveScore = (match: MatchTableMatch) => {
    const draft = scoreDrafts[match.id];
    const rawScore1 = draft?.score1 ?? "";
    const rawScore2 = draft?.score2 ?? "";
    const hasScores = rawScore1 !== "" || rawScore2 !== "";
    const score1 = Number.parseInt(rawScore1, 10);
    const score2 = Number.parseInt(rawScore2, 10);

    if (hasScores && (Number.isNaN(score1) || Number.isNaN(score2))) {
      toast.error("Enter valid numeric scores for both teams.");
      return;
    }

    const status = drafts[match.id]?.status ?? (match.status ?? "SCHEDULED");

    if (status === "COMPLETED" && !hasScores) {
      toast.error("Scores are required to mark match as completed.");
      return;
    }

    saveScore.mutate({
      eventId,
      matchId: match.id,
      status,
      ...(hasScores && { score1, score2 }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-3">
        <h4 className="font-semibold">Add Custom Match</h4>
        <div className="space-y-2">
          <Label>Quick player picker</Label>
          <div className="flex flex-wrap gap-2">
            {participantOptions.map((option) => (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={selectedPlayers.has(option.id) ? "secondary" : "outline"}
                onClick={() => handleAssignPlayer(option.id)}
                disabled={!canEdit}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={clearPlayers} disabled={!canEdit}>
              Clear slots
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={swapSides} disabled={!canEdit}>
              Swap sides
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Court</Label>
            <Input
              type="number"
              min={1}
              value={newMatch.courtNumber}
              onChange={(e) =>
                setNewMatch((prev) => ({
                  ...prev,
                  courtNumber: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Round</Label>
            <Input
              type="number"
              min={1}
              value={newMatch.round}
              onChange={(e) =>
                setNewMatch((prev) => ({
                  ...prev,
                  round: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={newMatch.status}
              onValueChange={(value) => setNewMatch((prev) => ({ ...prev, status: value as MatchStatus }))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            {PLAYER_FIELDS.map((field, index) => (
              <div key={field}>
                <Label>Player {index + 1}</Label>
                <Select
                  value={newMatch[field] || "none"}
                  onValueChange={(value) =>
                    setNewMatch((prev) => ({
                      ...prev,
                      [field]: value === "none" ? "" : value,
                    }))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select player</SelectItem>
                    {participantOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={!canEdit || createMatch.isPending}>
            {createMatch.isPending ? "Creating..." : "Add Match"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={`court-${orderedCourts[0]}`} className="space-y-4">
        <TabsList className="flex flex-wrap">
          {orderedCourts.map((courtNumber) => (
            <TabsTrigger key={courtNumber} value={`court-${courtNumber}`}>
              Court {courtNumber}
            </TabsTrigger>
          ))}
        </TabsList>

        {orderedCourts.map((courtNumber) => {
          const courtMatches = matchesByCourt.get(courtNumber) ?? [];
          return (
            <TabsContent key={courtNumber} value={`court-${courtNumber}`}>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Court</TableHead>
                      <TableHead>Round</TableHead>
                      <TableHead>Side A</TableHead>
                      <TableHead>Side B</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courtMatches.map((match) => {
                      const draft = drafts[match.id] ?? buildDraftFromMatch(match);
                      return (
                        <TableRow key={match.id}>
                          <TableCell className="w-24">
                            <Input
                              type="number"
                              min={1}
                              value={draft.courtNumber}
                              onChange={(e) =>
                                updateDraft(match.id, { courtNumber: Number.parseInt(e.target.value, 10) || 1 })
                              }
                              disabled={!canEdit}
                            />
                          </TableCell>
                          <TableCell className="w-24">
                            <Input
                              type="number"
                              min={1}
                              value={draft.round}
                              onChange={(e) =>
                                updateDraft(match.id, { round: Number.parseInt(e.target.value, 10) || 1 })
                              }
                              disabled={!canEdit}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="grid gap-2">
                              {(["pair1Player1Id", "pair1Player2Id"] as PlayerField[]).map((field) => (
                                <Select
                                  key={field}
                                  value={draft[field] || "none"}
                                  onValueChange={(value) =>
                                    updateDraft(match.id, { [field]: value === "none" ? "" : value })
                                  }
                                  disabled={!canEdit}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select player" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Select player</SelectItem>
                                    {participantOptions.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="grid gap-2">
                              {(["pair2Player1Id", "pair2Player2Id"] as PlayerField[]).map((field) => (
                                <Select
                                  key={field}
                                  value={draft[field] || "none"}
                                  onValueChange={(value) =>
                                    updateDraft(match.id, { [field]: value === "none" ? "" : value })
                                  }
                                  disabled={!canEdit}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select player" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Select player</SelectItem>
                                    {participantOptions.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[160px]">
                            <Select
                              value={draft.status}
                              onValueChange={(value) => updateDraft(match.id, { status: value as MatchStatus })}
                              disabled={!canEdit}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                min={0}
                                className="w-16 text-right"
                                disabled={!canEdit}
                                value={scoreDrafts[match.id]?.score1 ?? ""}
                                onChange={(e) =>
                                  setScoreDrafts((prev) => ({
                                    ...prev,
                                    [match.id]: {
                                      score1: e.target.value,
                                      score2: prev[match.id]?.score2 ?? "",
                                    },
                                  }))
                                }
                              />
                              <span className="text-muted-foreground">:</span>
                              <Input
                                type="number"
                                min={0}
                                className="w-16 text-right"
                                disabled={!canEdit}
                                value={scoreDrafts[match.id]?.score2 ?? ""}
                                onChange={(e) =>
                                  setScoreDrafts((prev) => ({
                                    ...prev,
                                    [match.id]: {
                                      score1: prev[match.id]?.score1 ?? "",
                                      score2: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdate(match.id)}
                              disabled={!canEdit || updateMatch.isPending}
                            >
                              Save Match
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveScore(match)}
                              disabled={!canEdit || saveScore.isPending}
                            >
                              {saveScore.isPending && savingScoreId === match.id ? "Saving..." : "Save Score"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMatch.mutate({ eventId, matchId: match.id })}
                              disabled={!canEdit || deleteMatch.isPending}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!courtMatches.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                          No matches for this court.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
