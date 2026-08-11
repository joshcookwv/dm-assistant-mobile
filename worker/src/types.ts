export interface CreditState {
  limit: 10;
  used: number;
  remaining: number;
  resetAt: string;
}

export interface ReservationResult {
  allowed: boolean;
  reservationId: string | null;
  credits: CreditState;
}
