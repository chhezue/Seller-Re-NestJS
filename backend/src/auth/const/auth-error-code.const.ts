export enum AuthErrorCode {
  /**
   * A generic authentication failure for invalid credentials.
   * It is recommended to use this for standard login failures (wrong email/password)
   * to avoid providing specific details to potential attackers.
   */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  /**
   * The account is locked due to multiple failed login attempts.
   * The client can use this code to display a specific message
   * or guide the user to a password reset flow.
   */
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

  /**
   * The account has been temporarily suspended by an administrator.
   * The user should contact support for resolution.
   */
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',

  /**
   * The provided token is invalid, expired, or malformed.
   * This is a general-purpose error for any token validation failure.
   */
  INVALID_TOKEN = 'INVALID_TOKEN',

  /**
   * The wrong type of token was used for an operation.
   * For example, using an access token to refresh tokens.
   */
  INVALID_TOKEN_TYPE = 'INVALID_TOKEN_TYPE',
  /**
   * A general validation error for request bodies.
   * e.g., trying to unlock an account without providing email or phone.
   */
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  /**
   * The account is not in the required state for the operation.
   * e.g., trying to unlock an account that is not locked.
   */
  ACCOUNT_STATE_INVALID = 'ACCOUNT_STATE_INVALID',
}
