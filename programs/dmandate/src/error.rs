use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Payment cannot be executed before the scheduled time")]
    PaymentTooEarly,

    #[msg("Only the payer or payee can perform this operation")]
    Unauthorized,

    #[msg("Invalid payment history for this mandate")]
    InvalidPaymentHistory,

    #[msg("The mandate is not active")]
    MandateInactive,

    #[msg("Invalid authority")]
    InvalidAuthority,

    #[msg("Name too long")]
    NameTooLong,

    #[msg("Description too long")]
    DescriptionTooLong,

    #[msg("Insufficient token balance")]
    InsufficientBalance,
}
