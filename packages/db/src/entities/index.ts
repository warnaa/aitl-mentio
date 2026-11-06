import { AuthRateLimit } from './auth/rate-limit.entity';
import { User } from './auth/user.entity';
import { MentorProfile } from './mentors/mentor-profile.entity';
import { Invitation } from './invitations/invitation.entity';
import { Slot } from './availability/slot.entity';
import { Booking } from './bookings/booking.entity';
import { PaymentAttempt } from './payments/payment-attempt.entity';
import { ProcessedWebhookEvent } from './payments/processed-webhook-event.entity';
import { PaymentResolution } from './payments/payment-resolution.entity';

export { User, type IUser } from './auth/user.entity';
export { AuthRateLimit, type IAuthRateLimit } from './auth/rate-limit.entity';
export { MentorProfile, type IMentorProfile } from './mentors/mentor-profile.entity';
export { Invitation, type IInvitation } from './invitations/invitation.entity';
export { Slot, type ISlot } from './availability/slot.entity';
export { Booking, type IBooking } from './bookings/booking.entity';
export { PaymentAttempt, type IPaymentAttempt } from './payments/payment-attempt.entity';
export { ProcessedWebhookEvent, type IProcessedWebhookEvent } from './payments/processed-webhook-event.entity';
export { PaymentResolution, type IPaymentResolution } from './payments/payment-resolution.entity';
export { baseProperties } from './base.entity';

/** Every entity the ORM should discover. Keep this in sync when adding entities. */
export const entities = [User, MentorProfile, AuthRateLimit, Invitation, Slot, Booking, PaymentAttempt, ProcessedWebhookEvent, PaymentResolution];
