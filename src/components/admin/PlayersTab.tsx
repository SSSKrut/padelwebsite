import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Edit, Trophy, Crown, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

interface PlayersTabProps {
  confirmAction: (title: string, desc: string, action: () => void) => void;
}

export function PlayersTab({ confirmAction }: PlayersTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => apiFetch("/.netlify/functions/admin-users"),
  });

  const { data: achievements } = useQuery({
    queryKey: ["admin_achievements"],
    queryFn: () => apiFetch("/.netlify/functions/admin-achievements"),
  });

  const mutateUser = useMutation({
    mutationFn: (data: any) => apiFetch("/.netlify/functions/admin-users", "PATCH", data),
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const grantAch = useMutation({
    mutationFn: (data: any) => apiFetch("/.netlify/functions/admin-user-achievement", "POST", data),
    onSuccess: () => {
      toast.success("Achievement granted");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeAch = useMutation({
    mutationFn: (data: any) => apiFetch("/.netlify/functions/admin-user-achievement", "DELETE", data),
    onSuccess: () => {
      toast.success("Achievement removed");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePremium = useMutation({
    mutationFn: ({ userId, revoke }: { userId: string; revoke: boolean }) =>
      apiFetch("/.netlify/functions/admin-premium", revoke ? "DELETE" : "POST", { userId }),
    onSuccess: (_data, variables) => {
      toast.success(variables.revoke ? "Premium revoked" : "Premium granted");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const [playerForm, setPlayerForm] = useState<any>(null);
  const [grantAchForm, setGrantAchForm] = useState<any>(null);
  const [playerSort, setPlayerSort] = useState<{ field: string; asc: boolean }>({ field: "elo", asc: false });
  const [isRebuildingWeeklyRankings, setIsRebuildingWeeklyRankings] = useState(false);

  const sortedPlayers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      let valA = a[playerSort.field];
      let valB = b[playerSort.field];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return playerSort.asc ? -1 : 1;
      if (valA > valB) return playerSort.asc ? 1 : -1;
      return 0;
    });
  }, [users, playerSort]);

  const toggleSort = (field: string) => {
    setPlayerSort((prev) => ({
      field,
      asc: prev.field === field ? !prev.asc : true,
    }));
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (playerSort.field !== field) return null;
    return playerSort.asc ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />;
  };

  const handleRebuildWeeklyRankings = async () => {
    setIsRebuildingWeeklyRankings(true);
    try {
      const result = await apiFetch("/.netlify/functions/trigger-weekly-rankings", "POST");
      const updatedCount = typeof result?.updated === "number" ? ` (${result.updated} users)` : "";
      toast.success(`Weekly rankings rebuilt${updatedCount}`);
      queryClient.invalidateQueries({ queryKey: ["players"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to rebuild weekly rankings");
    } finally {
      setIsRebuildingWeeklyRankings(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-background/80 shadow-sm overflow-hidden p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold">All Players</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Weekly ranking snapshots run Mondays at 03:00 UTC. Use the admin trigger to rebuild if needed.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            confirmAction(
              "Rebuild weekly rankings",
              "This will snapshot current ratings for the week. Continue?",
              handleRebuildWeeklyRankings,
            )
          }
          disabled={isRebuildingWeeklyRankings}
        >
          {isRebuildingWeeklyRankings ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Rebuild weekly rankings
        </Button>
      </div>
      {usersLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("firstName")}>
                  First Name <SortIcon field="firstName" />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("lastName")}>
                  Last Name <SortIcon field="lastName" />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("email")}>
                  Email <SortIcon field="email" />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("role")}>
                  Role <SortIcon field="role" />
                </TableHead>
                <TableHead>Achievements</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("elo")}>
                  ELO <SortIcon field="elo" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.firstName}</TableCell>
                  <TableCell className="font-medium">{p.lastName}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>
                    <span>{p.role}</span>
                    {(p.premiumSubscriptions?.length > 0) && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                        <Crown className="w-3 h-3" /> Premium
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {p.achievements?.map((ua: any) => (
                        <div key={ua.id} className="flex items-center justify-between text-xs py-1 px-2 bg-secondary rounded-md">
                          <span className="truncate max-w-[120px]" title={ua.achievement?.title}>
                            {ua.achievement?.title}
                          </span>
                          <button
                            onClick={() => confirmAction("Remove Achievement", "Are you sure?", () => removeAch.mutate({ userAchievementId: ua.id }))}
                            className="text-destructive hover:text-red-600 ml-2"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {playerForm?.id === p.id ? (
                      <Input
                        type="number"
                        className="w-20 inline-block"
                        value={playerForm.elo}
                        onChange={(e) => setPlayerForm({ ...playerForm, elo: e.target.value })}
                      />
                    ) : (
                      p.elo
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {playerForm?.id === p.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            confirmAction("Save ELO", `Set ELO to ${playerForm.elo}?`, () => {
                              mutateUser.mutate({ userId: p.id, elo: playerForm.elo });
                              setPlayerForm(null);
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPlayerForm(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setPlayerForm({ id: p.id, elo: p.elo })} title="Edit ELO">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setGrantAchForm({ userId: p.id, achId: "" })} title="Grant Achievement">
                          <Trophy className="w-4 h-4" />
                        </Button>
                        {p.premiumSubscriptions?.length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600"
                            onClick={() => confirmAction("Revoke Premium", "Remove premium status?", () => togglePremium.mutate({ userId: p.id, revoke: true }))}
                            title="Revoke Premium"
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmAction("Grant Premium", "Grant premium status?", () => togglePremium.mutate({ userId: p.id, revoke: false }))}
                            title="Grant Premium"
                          >
                            <Crown className="w-4 h-4" />
                          </Button>
                        )}

                        {p.role !== "UNVERIFIED_USER" && p.role !== "SUPER_ADMIN" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmAction("Unverify User", "Demote to UNVERIFIED_USER?", () => mutateUser.mutate({ userId: p.id, role: "UNVERIFIED_USER" }))}
                            className="text-orange-500"
                          >
                            Unverify
                          </Button>
                        )}
                        {user?.role === "SUPER_ADMIN" && p.role !== "SUPER_ADMIN" && (
                          p.role === "ADMIN" ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => confirmAction("Demote Admin", "Remove ADMIN rights?", () => mutateUser.mutate({ userId: p.id, role: "USER" }))}
                            >
                              Demote Admin
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => confirmAction("Promote to Admin", "Grant ADMIN rights?", () => mutateUser.mutate({ userId: p.id, role: "ADMIN" }))}
                            >
                              Make Admin
                            </Button>
                          )
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {grantAchForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Grant Achievement</h3>
            <Select value={grantAchForm.achId} onValueChange={(val) => setGrantAchForm({ ...grantAchForm, achId: val })}>
              <SelectTrigger className="mb-4">
                <SelectValue placeholder="Select Achievement" />
              </SelectTrigger>
              <SelectContent>
                {achievements?.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setGrantAchForm(null)}>
                Cancel
              </Button>
              <Button
                disabled={!grantAchForm.achId || grantAch.isPending}
                onClick={() =>
                  confirmAction("Grant", "Grant this achievement?", () => {
                    grantAch.mutate({
                      userId: grantAchForm.userId,
                      achievementId: grantAchForm.achId,
                    });
                    setGrantAchForm(null);
                  })
                }
              >
                Grant
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
