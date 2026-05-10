import { BookingCoordinatorPort, BookingResult } from "@/src/core/application/ports/BookingCoordinatorPort";
import { CalendarPort } from "@/src/core/application/ports/CalendarPort";
import { TenantId, LeadId } from "@/src/core/domain/shared/ids";

export interface BookingOptions {
  durationMinutes: number;
  bufferMinutes: number;
  minLeadTimeHours: number;
  maxLeadTimeDays: number;
  maxSlotsToOffer: number;
}

export class BookingCoordinatorAdapter implements BookingCoordinatorPort {
  private readonly defaultOptions: BookingOptions = {
    durationMinutes: 15,
    bufferMinutes: 15,
    minLeadTimeHours: 4,
    maxLeadTimeDays: 14,
    maxSlotsToOffer: 3,
  };

  constructor(
    private readonly calendar: CalendarPort,
    private readonly options: Partial<BookingOptions> = {}
  ) {}

  async book(input: { tenantId: string; leadId: string }): Promise<BookingResult> {
    const config = { ...this.defaultOptions, ...this.options };
    
    // Calculate search window
    const now = new Date();
    const startSearch = new Date(now.getTime() + config.minLeadTimeHours * 60 * 60 * 1000);
    const endSearch = new Date(now.getTime() + config.maxLeadTimeDays * 24 * 60 * 60 * 1000);

    const slots = await this.calendar.getAvailableSlots(input.leadId, startSearch, endSearch);
    
    // Filter slots by duration and buffer (simplified for now, assuming calendar handles it)
    const validSlots = slots.slice(0, config.maxSlotsToOffer);

    if (validSlots.length > 0) {
      // In a real scenario, we'd offer slots and wait for confirmation.
      // For the 'book' port, we'll assume we're finalizing a selection or auto-booking if allowed.
      const selectedSlot = validSlots[0];
      
      const event = await this.calendar.createEvent(input.leadId, {
        summary: `Discovery Call: ${input.tenantId} x ${input.leadId}`,
        description: "Scheduled via Autonomous Lead Engine",
        start: selectedSlot.start,
        end: selectedSlot.end,
        attendeeEmail: "prospect@example.com", // Should be fetched from lead repository
      });

      return {
        booked: true,
        meetingId: event.eventId,
        metadata: {
          slot: selectedSlot,
          offeredSlotsCount: validSlots.length,
        }
      };
    }

    return { booked: false, reason: "No available slots found within the search window." };
  }

  async handleNoShow(input: { tenantId: string; leadId: string; meetingId: string }): Promise<void> {
    const config = { ...this.defaultOptions, ...this.options };
    
    // 1. Fetch new slots
    const now = new Date();
    const startSearch = new Date(now.getTime() + 1 * 60 * 60 * 1000); // Start looking in 1 hour
    const endSearch = new Date(now.getTime() + config.maxLeadTimeDays * 24 * 60 * 60 * 1000);
    
    const slots = await this.calendar.getAvailableSlots(input.leadId, startSearch, endSearch);
    const newSlots = slots.slice(0, 3); // Offer 3 new slots as per R&D doc

    console.log(`[NoShowHandled] Lead ${input.leadId} missed meeting ${input.meetingId}. Offered ${newSlots.length} new slots.`);
    
    // 2. In a real system, this would trigger an email via the ComposerAgent
    // For now, we log the intent.
  }
}
