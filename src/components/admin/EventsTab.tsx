import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Edit, Plus, Trash2, CheckCircle, Clock, RefreshCw, Download, Loader2, Ban } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatEventDate } from "@/lib/utils";
import { exportEventCsv } from "@/lib/exportEventCsv";
import type { EventFormat } from "@/types/events";

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

const DEFAULT_FORMAT_CONFIG_TEXT = `{
  "playersPerCourt": 5,
  "teamSize": 2,
  "rounds": 5,
  "pairingStrategy": "KOTC_5P_CLASSIC",
  "distribution": {
    "mode": "ELO_BUCKET",
    "courtSize": 5,
    "balance": "snake",
    "allowBench": true
  },
  "rotation": {
    "benchEveryRounds": 1,
    "benchCount": 1
  },
  "scoring": {
    "win": 1,
    "draw": 0.5,
    "loss": 0,
    "tiebreakers": ["points", "diff", "name"]
  },
  "elo": {
    "system": "ELO",
    "kFactor": 40,
    "mode": "PER_MATCH"
  }
}`;

const stringifyConfig = (config: any) => {
  if (!config) return "";
  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return "";
  }
};

const parseConfig = (raw: string, label: string) => {
  if (!raw.trim()) {
    return { ok: true, value: undefined as any };
  }

  try {
    return { ok: true, value: JSON.parse(raw) } as const;
  } catch {
    return { ok: false, error: `${label} must be valid JSON.` } as const;
  }
};

export function EventsTab({ confirmAction }: EventsTabProps) {
  const queryClient = useQueryClient();
  const [eventForm, setEventForm] = useState<any>(null);
  const [formatForm, setFormatForm] = useState<any>(null);
  const [cancelForm, setCancelForm] = useState<{ eventId: string; title: string } | null>(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const [exportingEventId, setExportingEventId] = useState<string | null>(null);

  const buildEventForm = (source: any) => {
    const hasFormatConfig = source?.formatConfig !== undefined && source?.formatConfig !== null;
    return {
      ...source,
      formatId: source?.formatId ?? null,
      formatConfigEnabled: hasFormatConfig,
      formatConfigText: hasFormatConfig ? stringifyConfig(source.formatConfig) : "",
    };
  };

  const buildFormatForm = (source: EventFormat) => ({
    ...source,
    configText: stringifyConfig(source.config),
  });

  const buildEventPayload = (form: any) => {
    const payload = { ...form };
    const formatConfigEnabled = Boolean(payload.formatConfigEnabled);
    const formatConfigText = String(payload.formatConfigText ?? "");

    delete payload.formatConfigEnabled;
    delete payload.formatConfigText;

    payload.formatId = payload.formatId || null;

    if (formatConfigEnabled) {
      const parsed = parseConfig(formatConfigText, "Format config");
      if (!parsed.ok) {
        toast.error(parsed.error);
        return null;
      }
      if (parsed.value === undefined) {
        toast.error("Format config cannot be empty when override is enabled.");
        return null;
      }
      payload.formatConfig = parsed.value;
    } else {
      payload.formatConfig = null;
    }

    return payload;
  };

  const buildFormatPayload = (form: any) => {
    const payload = { ...form };
    const configText = String(payload.configText ?? "");
    delete payload.configText;

    const parsed = parseConfig(configText, "Format config");
    if (!parsed.ok) {
      toast.error(parsed.error);
      return null;
    }
    if (parsed.value !== undefined) {
      payload.config = parsed.value;
    } else {
      payload.config = null;
    }

    return payload;
  };

  const exportEventUsers = async (eventId: string) => {
    setExportingEventId(eventId);
    try {
      await exportEventCsv(eventId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export event users CSV");
    } finally {
      setExportingEventId(null);
    }
  };

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin_events"],
    queryFn: () => apiFetch("/.netlify/functions/admin-events"),
  });

  const { data: formats, isLoading: formatsLoading } = useQuery<EventFormat[]>({
    queryKey: ["admin_event_formats"],
    queryFn: () => apiFetch("/.netlify/functions/admin-event-formats"),
  });

  const mutateEvent = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/.netlify/functions/admin-events", data.id ? "PATCH" : "POST", data),
    onSuccess: () => {
      toast.success("Event saved successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
      setEventForm(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const mutateFormat = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/.netlify/functions/admin-event-formats", data.id ? "PATCH" : "POST", data),
    onSuccess: () => {
      toast.success("Format saved successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_event_formats"] });
      setFormatForm(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteFormat = useMutation({
    mutationFn: (id: string) =>
      apiFetch("/.netlify/functions/admin-event-formats", "DELETE", { id }),
    onSuccess: () => {
      toast.success("Format deleted");
      queryClient.invalidateQueries({ queryKey: ["admin_event_formats"] });
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

  const cancelEvent = useMutation({
    mutationFn: (data: { eventId: string; message: string }) =>
      apiFetch("/.netlify/functions/admin-event-cancel", "POST", data),
    onSuccess: (data: any) => {
      toast.success(`Event cancelled. ${data.notified} participant(s) notified.`);
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
      setCancelForm(null);
      setCancelMessage("");
    },
    onError: (e) => toast.error(e.message),
  });

  const triggerPublish = useMutation({
    mutationFn: () => apiFetch("/.netlify/functions/trigger-publish", "POST"),
    onSuccess: (data: any) => {
      toast.success(`Published ${data.published} scheduled event(s)`);
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const hasScheduledEvents = events?.some((e: any) => e.status === "SCHEDULED") || false;
  const activeEvents = events?.filter((e: any) => e.status !== "ARCHIVED") || [];
  const pastEvents = events?.filter((e: any) => e.status === "ARCHIVED") || [];
  const selectedFormat = eventForm?.formatId
    ? formats?.find((format) => format.id === eventForm.formatId)
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-background/80 shadow-sm overflow-hidden p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Upcoming / Active Events</h3>
          <div className="flex gap-2">
            {hasScheduledEvents && (
              <Button
                variant="outline"
                onClick={() =>
                  confirmAction(
                    "Publish Scheduled Events",
                    "Publish all scheduled events whose publish time has passed?",
                    () => triggerPublish.mutate(),
                  )
                }
                disabled={triggerPublish.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${triggerPublish.isPending ? "animate-spin" : ""}`} />
                Publish Now
              </Button>
            )}
            <Button
              onClick={() =>
                setEventForm({
                  title: "",
                  date: "",
                  endDate: "",
                  location: "",
                  description: "",
                  status: "DRAFT",
                  publishAt: null,
                  price: "",
                  disclaimer: "",
                  formatId: null,
                  formatConfigEnabled: false,
                  formatConfigText: "",
                })
              }
            >
              <Plus className="w-4 h-4 mr-1" /> New Event
            </Button>
          </div>
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
                    setEventForm({
                      ...eventForm,
                      status: val,
                      // Clear publishAt when switching away from SCHEDULED
                      ...(val !== "SCHEDULED" && { publishAt: null }),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="SCHEDULED">SCHEDULED</SelectItem>
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
                <Label>Match Format</Label>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Select
                    value={eventForm.formatId || "none"}
                    onValueChange={(val) =>
                      setEventForm({
                        ...eventForm,
                        formatId: val === "none" ? null : val,
                      })
                    }
                  >
                    <SelectTrigger className="md:w-[320px]">
                      <SelectValue
                        placeholder={formatsLoading ? "Loading formats..." : "Select format"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No format (manual)</SelectItem>
                      {(formats || []).map((format) => (
                        <SelectItem key={format.id} value={format.id}>
                          {format.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedFormat && (
                    <div className="text-xs text-muted-foreground">
                      {selectedFormat.strategyKey}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use a format template to define player counts, distribution rules, and scoring.
                </p>
              </div>
              <div className="md:col-span-2 border rounded-xl p-3 flex items-center justify-between gap-4">
                <div>
                  <Label>Override format config</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable to customize player counts, distribution, or scoring rules for this event.
                  </p>
                </div>
                <Switch
                  checked={Boolean(eventForm.formatConfigEnabled)}
                  onCheckedChange={(checked) =>
                    setEventForm({
                      ...eventForm,
                      formatConfigEnabled: checked,
                      formatConfigText: checked
                        ? eventForm.formatConfigText ||
                          (selectedFormat?.config ? stringifyConfig(selectedFormat.config) : DEFAULT_FORMAT_CONFIG_TEXT)
                        : "",
                    })
                  }
                />
              </div>
              {eventForm.formatConfigEnabled && (
                <div className="md:col-span-2">
                  <Label>Format Config (JSON)</Label>
                  <Textarea
                    rows={10}
                    value={eventForm.formatConfigText || ""}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        formatConfigText: e.target.value,
                      })
                    }
                    placeholder={DEFAULT_FORMAT_CONFIG_TEXT}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEventForm({
                          ...eventForm,
                          formatConfigText: selectedFormat?.config
                            ? stringifyConfig(selectedFormat.config)
                            : DEFAULT_FORMAT_CONFIG_TEXT,
                        })
                      }
                    >
                      Use template config
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEventForm({
                          ...eventForm,
                          formatConfigText: DEFAULT_FORMAT_CONFIG_TEXT,
                        })
                      }
                    >
                      Load example
                    </Button>
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input
                  value={eventForm.description || ""}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  placeholder="e.g. 15 EUR"
                  value={eventForm.price || ""}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, price: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Disclaimer</Label>
                <Input
                  placeholder="Shown before registration"
                  value={eventForm.disclaimer || ""}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, disclaimer: e.target.value })
                  }
                />
              </div>
            </div>
            {eventForm.status === "SCHEDULED" && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-xl mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h5 className="font-semibold text-amber-800 dark:text-amber-200">
                    Scheduled Publishing
                  </h5>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  This event will automatically become visible and open for registration at the specified time.
                </p>
                <div className="max-w-sm">
                  <Label>Publish At (Your Local Time)</Label>
                  <Input
                    type="datetime-local"
                    value={formatForDatetimeLocal(eventForm.publishAt)}
                    onChange={(e) => {
                      const dateObj = new Date(e.target.value);
                      if (!isNaN(dateObj.getTime())) {
                        setEventForm({
                          ...eventForm,
                          publishAt: dateObj.toISOString(),
                        });
                      }
                    }}
                    required
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const payload = buildEventPayload(eventForm);
                  if (!payload) return;
                  confirmAction(
                    eventForm.id ? "Update Event" : "Create Event",
                    "Are you sure?",
                    () => mutateEvent.mutate(payload),
                  );
                }}
              >
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEventForm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {cancelForm && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 rounded-xl mb-6">
            <h4 className="font-semibold mb-1 text-red-800 dark:text-red-200 flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Cancel Event: {cancelForm.title}
            </h4>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              This will archive the event and send a cancellation email to all registered participants and waitlisted users.
            </p>
            <div className="mb-4">
              <Label>Cancellation Message</Label>
              <Textarea
                placeholder="Explain why the event is being cancelled..."
                value={cancelMessage}
                onChange={(e) => setCancelMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={!cancelMessage.trim() || cancelEvent.isPending}
                onClick={() =>
                  confirmAction(
                    "Cancel Event",
                    "This will archive the event and notify all participants. Continue?",
                    () => cancelEvent.mutate({ eventId: cancelForm.eventId, message: cancelMessage }),
                  )
                }
              >
                {cancelEvent.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Confirm Cancellation
              </Button>
              <Button variant="ghost" onClick={() => { setCancelForm(null); setCancelMessage(""); }}>
                Close
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
                      <Badge
                        variant={e.status === "SCHEDULED" ? "outline" : "default"}
                        className={e.status === "SCHEDULED" ? "border-amber-500 text-amber-700 dark:text-amber-300" : ""}
                      >
                        {e.status}
                      </Badge>
                      {e.status === "SCHEDULED" && e.publishAt && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatEventDate(e.publishAt, true)}
                        </div>
                      )}
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
                        onClick={() => setEventForm(buildEventForm(e))}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Export Event Users CSV"
                        onClick={() => exportEventUsers(e.id)}
                        disabled={exportingEventId === e.id}
                      >
                        {exportingEventId === e.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Cancel Event & Notify"
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                        onClick={() => setCancelForm({ eventId: e.id, title: e.title })}
                      >
                        <Ban className="w-4 h-4" />
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Match Formats</h3>
          <Button
            onClick={() =>
              setFormatForm({
                name: "",
                strategyKey: "",
                description: "",
                configText: DEFAULT_FORMAT_CONFIG_TEXT,
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" /> New Format
          </Button>
        </div>

        {formatForm && (
          <div className="bg-muted p-4 rounded-xl mb-6">
            <h4 className="font-semibold mb-3">
              {formatForm.id ? "Edit Format" : "Create Format"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formatForm.name}
                  onChange={(e) =>
                    setFormatForm({ ...formatForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Strategy Key</Label>
                <Input
                  value={formatForm.strategyKey}
                  onChange={(e) =>
                    setFormatForm({ ...formatForm, strategyKey: e.target.value })
                  }
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input
                  value={formatForm.description || ""}
                  onChange={(e) =>
                    setFormatForm({ ...formatForm, description: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label>Config (JSON)</Label>
                <Textarea
                  rows={10}
                  value={formatForm.configText || ""}
                  onChange={(e) =>
                    setFormatForm({ ...formatForm, configText: e.target.value })
                  }
                  placeholder={DEFAULT_FORMAT_CONFIG_TEXT}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFormatForm({
                        ...formatForm,
                        configText: DEFAULT_FORMAT_CONFIG_TEXT,
                      })
                    }
                  >
                    Load example
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const payload = buildFormatPayload(formatForm);
                  if (!payload) return;
                  confirmAction(
                    formatForm.id ? "Update Format" : "Create Format",
                    "Are you sure?",
                    () => mutateFormat.mutate(payload),
                  );
                }}
              >
                Save
              </Button>
              <Button variant="ghost" onClick={() => setFormatForm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {formatsLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Strategy Key</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(formats || []).map((format) => (
                  <TableRow key={format.id}>
                    <TableCell className="font-medium">{format.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format.strategyKey}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format.description || "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFormatForm(buildFormatForm(format))}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          confirmAction(
                            "Delete Format",
                            "This will remove the format template. Continue?",
                            () => deleteFormat.mutate(format.id),
                          )
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!formats?.length && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-4"
                    >
                      No formats yet
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
                        onClick={() => setEventForm(buildEventForm(e))}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Export Event Users CSV"
                        onClick={() => exportEventUsers(e.id)}
                        disabled={exportingEventId === e.id}
                      >
                        {exportingEventId === e.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
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
