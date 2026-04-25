export interface CalendarSlot {
  start: string; // ISO
  end: string;   // ISO
}

export interface CalendarPort {
  getAvailableSlots(ownerId: string, startDate: Date, endDate: Date): Promise<CalendarSlot[]>;
  createEvent(ownerId: string, event: { summary: string; description: string; start: string; end: string; attendeeEmail: string }): Promise<{ eventId: string; meetingLink: string }>;
}
