import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AchievementsTabProps {
  confirmAction: (title: string, desc: string, action: () => void) => void;
}

export function AchievementsTab({ confirmAction }: AchievementsTabProps) {
  const queryClient = useQueryClient();
  const [achForm, setAchForm] = useState<any>(null);

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["admin_achievements"],
    queryFn: () => apiFetch("/.netlify/functions/admin-achievements"),
  });

  const mutateAch = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/.netlify/functions/admin-achievements", data.id ? "PATCH" : "POST", data),
    onSuccess: () => {
      toast.success("Achievement saved");
      queryClient.invalidateQueries({ queryKey: ["admin_achievements"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAch = useMutation({
    mutationFn: (id: string) =>
      apiFetch("/.netlify/functions/admin-achievements", "DELETE", { id }),
    onSuccess: () => {
      toast.success("Achievement deleted");
      queryClient.invalidateQueries({ queryKey: ["admin_achievements"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border bg-background/80 shadow-sm overflow-hidden p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Achievements</h3>
        <Button onClick={() => setAchForm({ title: "", description: "", icon: "" })}>
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </div>

      {achForm && (
        <div className="bg-muted p-4 rounded-xl mb-6">
          <h4 className="font-semibold mb-3">{achForm.id ? "Edit Achievement" : "Create Achievement"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Title</Label>
              <Input
                value={achForm.title}
                onChange={(e) => setAchForm({ ...achForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Icon Emoji/Text</Label>
              <Input
                value={achForm.icon || ""}
                onChange={(e) => setAchForm({ ...achForm, icon: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input
                value={achForm.description || ""}
                onChange={(e) => setAchForm({ ...achForm, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() =>
                confirmAction("Save Achievement", "Are you sure?", () => {
                  mutateAch.mutate(achForm);
                  setAchForm(null);
                })
              }
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => setAchForm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {achievements?.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-2xl">{a.icon}</TableCell>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{a.description}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setAchForm(a)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        confirmAction(
                          "Delete Achievement",
                          "Are you sure? This will remove it from all users!",
                          () => deleteAch.mutate(a.id)
                        )
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
