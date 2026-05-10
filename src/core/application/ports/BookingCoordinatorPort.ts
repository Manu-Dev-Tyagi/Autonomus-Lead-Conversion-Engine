export interface BookingResult {
  readonly booked: boolean;
  readonly meetingId?: string;
}

export interface BookingCoordinatorPort {
  book(input: { tenantId: string; leadId: string }): Promise<BookingResult>;
  handleNoShow(input: { tenantId: string; leadId: string; meetingId: string }): Promise<void>;
}
