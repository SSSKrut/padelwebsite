import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UnverifiedTabProps {
  confirmAction: (title: string, desc: string, action: () => void) => void;
}

export function UnverifiedTab({ confirmAction }: UnverifiedTabProps) {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => apiFetch("/.netlify/functions/admin-users"),
  });

  const mutateUser = useMutation({
    mutationFn: (data: any) => apiFetch("/.netlify/functions/admin-users", "PATCH", data),
    onSuccess: () => {
      toast.success("User approved successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const unverifiedUsers = users?.filter((u: any) => u.role === "UNVERIFIED_USER") || [];

  return (
    <div className="rounded-2xl border bg-background/80 shadow-sm overflow-hidden p-4">
      <h3 className="text-xl font-semibold mb-4">Pending Approvals</h3>
      {isLoading ? (
        <p>Loading...</p>
      ) : !unverifiedUsers.length ? (
        <p className="text-muted-foreground">No unverified users.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unverifiedUsers.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.firstName}</TableCell>
                  <TableCell className="font-medium">{u.lastName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() =>
                        confirmAction("Approve User", `Approve ${u.firstName} for user role?`, () =>
                          mutateUser.mutate({ userId: u.id, role: "USER" })
                        )
                      }
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" /> Approve
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
