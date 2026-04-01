import { useAuth } from "@/context/AuthContext";
import { Hero } from "@/components/Hero";
import padelHero from "@/assets/padel-hero.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/hooks/useConfirm";

import { PlayersTab } from "@/components/admin/PlayersTab";
import { UnverifiedTab } from "@/components/admin/UnverifiedTab";
import { EventsTab } from "@/components/admin/EventsTab";
import { AchievementsTab } from "@/components/admin/AchievementsTab";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const { confirmAction, ConfirmDialogComponent } = useConfirm();

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
