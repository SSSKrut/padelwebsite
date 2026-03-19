import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Toast } from "@/components/ui/toast";
import { toast } from "sonner";
import { Edit, Plus, Trash2, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatEventDate } from "@/lib/utils";

interface EventsTabProps {
  confirmAction: (title: string, desc: string, action: () => void) => void;
}

// Helper для конвертации Date/ISO-строки в формат для поля datetime-local (в локальном времени пользователя)
const formatForDatetimeLocal = (dateString?: string) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function EventsTab({ confirmAction }: EventsTabProps) {
  const queryClient = useQueryClient();
  const [eventForm, setEventForm] = useState<any>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin_events"],
    queryFn: () => apiFetch("/.netlify/functions/admin-events"),
  });

  const mutateEvent = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/.netlify/functions/admin-events", data.id ? "PATCH" : "POST", data),
    onSuccess: () => {
      toast.success("Event saved successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) =>
      apiFetch("/.netlify/functions/admin-events", "DELETE", { id }),
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const activeEvents = events?.filter((e: any) => e.status !== "ARCHIVED") || [];
  const pastEvents = events?.filter((e: any) => e.status === "ARCHIVED") || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-background/80 shadow-sm overflow-hidden p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Upcoming / Active Events</h3>
          <Button
            onClick={() =>
              setEventForm({
                title: "",
                date: "",
                endDate: "",
                location: "",
                description: "",
                status: "PUBLISHED",
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" /> New Event
          </Button>
        </div>

        {eventForm && (
          <div className="bg-muted p-4 rounded-xl mb-6">
            <h4 className="font-semibold mb-3">
              {eventForm.id ? "Edit Event" : "Create Event"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Start Date/Time (Your Local Time)</Label>
                <Input
                  type="datetime-local"
                  value={formatForDatetimeLocal(eventForm.date)}
                  onChange={(e) => {
                    const dateObj = new Date(e.target.value);
                    if (!isNaN(dateObj.getTime())) {
                      setEventForm({
                        ...eventForm,
                        date: dateObj.toISOString(),
                      });
                    }
                  }}
                  required
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={eventForm.location || ""}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date/Time (Your Local Time)</Label>
                <Input
                  type="datetime-local"
                  value={formatForDatetimeLocal(eventForm.endDate)}
                  onChange={(e) => {
                    const dateObj = new Date(e.target.value);
                    if (!isNaN(dateObj.getTime())) {
                      setEventForm({
                        ...eventForm,
                        endDate: dateObj.toISOString(),
                      });
                    } else if (e.target.value === "") {
                      setEventForm({
                        ...eventForm,
                        endDate: null,
                      });
                    }
                  }}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={eventForm.status || "DRAFT"}
                  onValueChange={(val) =>
                    setEventForm({ ...eventForm, status: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  min="1"
                  value={eventForm.maxParticipants || 16}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      maxParticipants: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input
                  value={eventForm.description || ""}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  confirmAction(
                    eventForm.id ? "Update Event" : "Create Event",
                    "Are you sure?",
                    () => {
                      mutateEvent.mutate(eventForm);
                      setEventForm(null);
                    },
                  )
                }
              >
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEventForm(null)}>
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
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEvents.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <a
                        className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                        href={"/events/" + e.id}
                      >
                        {e.title}
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap">
                      {formatEventDate(e.date, true, e.endDate)}
                    </TableCell>
                    <TableCell>
                      <Badge>{e.status}</Badge>
                    </TableCell>
                    <TableCell>{e.location}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        title="Complete Event"
                        onClick={() =>
                          confirmAction(
                            "Complete Event",
                            "Mark as ARCHIVED?",
                            () =>
                              mutateEvent.mutate({
                                id: e.id,
                                status: "ARCHIVED",
                              }),
                          )
                        }
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEventForm(e)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          confirmAction(
                            "Delete Event",
                            "Are you sure you want to delete this event?",
                            () => deleteEvent.mutate(e.id),
                          )
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!activeEvents.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-4"
                    >
                      No active events
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-background/80 shadow-sm overflow-hidden p-4">
        <h3 className="text-xl font-semibold mb-4 text-muted-foreground">
          Past / Completed Events
        </h3>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastEvents.map((e: any) => (
                  <TableRow key={e.id} className="opacity-75">
                    <TableCell className="font-medium">
                      <a
                        className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                        href={"/events/" + e.id}
                      >
                        {e.title}
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap">
                      {formatEventDate(e.date, true, e.endDate)}
                    </TableCell>
                    <TableCell>{e.location}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEventForm(e)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          confirmAction(
                            "Delete Event",
                            "Are you sure you want to delete this event?",
                            () => deleteEvent.mutate(e.id),
                          )
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!pastEvents.length && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-4"
                    >
                      No past events
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
