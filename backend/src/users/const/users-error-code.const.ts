export enum UsersErrorCode {
  /**
   * The provided username is already in use by another account.
   */
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',

  /**
   * The provided email address is already registered to another account.
   */
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',

  /**
   * An IP address must be provided when a user attempts to change their password.
   */
  IP_ADDRESS_REQUIRED_FOR_PASSWORD_CHANGE = 'IP_ADDRESS_REQUIRED_FOR_PASSWORD_CHANGE',
}
