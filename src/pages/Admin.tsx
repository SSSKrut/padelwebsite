import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Hero } from "@/components/Hero";
import padelHero from "@/assets/padel-hero.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { parseFileNameFromContentDisposition, triggerBlobDownload } from "@/lib/downloadFile";

import { PlayersTab } from "@/components/admin/PlayersTab";
import { UnverifiedTab } from "@/components/admin/UnverifiedTab";
import { EventsTab } from "@/components/admin/EventsTab";
import { AchievementsTab } from "@/components/admin/AchievementsTab";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const { confirmAction, ConfirmDialogComponent } = useConfirm();
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const response = await fetch("/.netlify/functions/admin-db-export-csv", {
        method: "GET",
      });

      if (!response.ok) {
        let errorMessage = "Failed to export database CSV";
        try {
          const errorBody = await response.json();
          if (typeof errorBody?.error === "string") {
            errorMessage = errorBody.error;
          }
        } catch {
          // Keep fallback message when server does not return JSON.
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
        const fileName = parseFileNameFromContentDisposition(
          response.headers.get("Content-Disposition"),
          "users_dump.csv",
        );
        triggerBlobDownload(blob, fileName);

      toast.success("Users CSV export started");
    } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to export users CSV");
    } finally {
      setIsExportingCsv(false);
    }
  };

  if (authLoading) return <Hero title="Loading..." compact />;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))
    return (
      <Hero
        title="Unauthorized"
        subtitle="You do not have permission to view."
        compact
      />
    );

  return (
    <div className="min-h-screen">
      <Hero
        title="Admin Dashboard"
        subtitle="Manage users, events, and achievements."
        backgroundImage={padelHero}
        compact
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-6 flex justify-end">
          <Button onClick={handleExportCsv} disabled={isExportingCsv}>
            {isExportingCsv ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
              Export Users CSV
          </Button>
        </div>
        <Tabs defaultValue="players" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="players">Players List</TabsTrigger>
            <TabsTrigger value="unverified">Pending Approvals</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <PlayersTab confirmAction={confirmAction} />
          </TabsContent>

          <TabsContent value="unverified">
            <UnverifiedTab confirmAction={confirmAction} />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab confirmAction={confirmAction} />
          </TabsContent>

          <TabsContent value="achievements">
            <AchievementsTab confirmAction={confirmAction} />
          </TabsContent>
        </Tabs>
      </section>

      <ConfirmDialogComponent />
    </div>
  );
}
