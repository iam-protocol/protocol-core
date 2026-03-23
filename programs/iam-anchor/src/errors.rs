use anchor_lang::prelude::*;

#[error_code]
pub enum IamAnchorError {
    #[msg("Invalid commitment: must be 32 non-zero bytes")]
    InvalidCommitment,
    #[msg("Unauthorized: caller is not the identity owner")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Invalid protocol config account")]
    InvalidProtocolConfig,
}
