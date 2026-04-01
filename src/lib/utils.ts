import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export function isEventLocked(eventDate: string | Date, now: Date = new Date()): boolean {
  const date = eventDate instanceof Date ? eventDate : new Date(eventDate);
  return date.getTime() - now.getTime() < MS_IN_DAY;
}

export function formatEventDate(dateInput: string | Date, isShort: boolean = false, endDateInput?: string | Date | null) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  let endDate: Date | null = null;
  if (endDateInput) {
    const parsedEnd = new Date(endDateInput);
    if (!isNaN(parsedEnd.getTime())) {
      endDate = parsedEnd;
    }
  }

  const baseOptions: Intl.DateTimeFormatOptions = isShort 
    ? {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    : {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
      };

  const timeOnlyOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit"
  };

  const viennaTz = { timeZone: "Europe/Vienna" };

  let viennaStr = new Intl.DateTimeFormat("en-GB", { ...baseOptions, ...viennaTz }).format(date);
  let localStrMatch = new Intl.DateTimeFormat("en-GB", baseOptions).format(date);
  let localStrFull = new Intl.DateTimeFormat("en-GB", { ...baseOptions, timeZoneName: "short" }).format(date);

  if (endDate) {
    // Check if end date is on the same day in formatting
    const startDayVienna = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "numeric", day: "numeric", ...viennaTz }).format(date);
    const endDayVienna = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "numeric", day: "numeric", ...viennaTz }).format(endDate);
    
    if (startDayVienna === endDayVienna) {
      const viennaEndStr = new Intl.DateTimeFormat("en-GB", { ...timeOnlyOptions, ...viennaTz }).format(endDate);
      viennaStr += ` - ${viennaEndStr}`;
    } else {
      const viennaEndStr = new Intl.DateTimeFormat("en-GB", { ...baseOptions, ...viennaTz }).format(endDate);
      viennaStr += ` - ${viennaEndStr}`;
    }

    const startDayLocal = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "numeric", day: "numeric" }).format(date);
    const endDayLocal = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "numeric", day: "numeric" }).format(endDate);

    if (startDayLocal === endDayLocal) {
      const localEndMatch = new Intl.DateTimeFormat("en-GB", timeOnlyOptions).format(endDate);
      localStrMatch += ` - ${localEndMatch}`;

      const localEndFull = new Intl.DateTimeFormat("en-GB", { ...timeOnlyOptions, timeZoneName: "short" }).format(endDate);
      localStrFull += ` - ${localEndFull}`;
    } else {
      const localEndMatch = new Intl.DateTimeFormat("en-GB", baseOptions).format(endDate);
      localStrMatch += ` - ${localEndMatch}`;

      const localEndFull = new Intl.DateTimeFormat("en-GB", { ...baseOptions, timeZoneName: "short" }).format(endDate);
      localStrFull += ` - ${localEndFull}`;
    }
  }

  const viennaResult = `${viennaStr} (Austria)`;

  if (viennaStr === localStrMatch) {
    return viennaResult;
  }

  return `${viennaResult} / ${localStrFull} (Local)`;
}
