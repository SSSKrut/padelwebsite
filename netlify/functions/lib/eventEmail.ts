import { buildSiteUrl } from "./siteUrl";

type EventEmailInput = {
  id: string;
  title: string;
  date: Date;
  location?: string | null;
};

export function buildEventEmailData(event: EventEmailInput) {
  const eventDate = event.date.toISOString().split("T")[0];
  const eventTime = event.date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Vienna",
  });

  return {
    eventTitle: event.title,
    eventDate,
    eventTime,
    eventVenue: event.location ?? undefined,
    actionUrl: buildSiteUrl(`/events/${event.id}`),
  };
}
