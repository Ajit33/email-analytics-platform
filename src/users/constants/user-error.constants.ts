export const USER_ERRORS = {
  // Not Found
  USER_NOT_FOUND: {
    code: 'USER_001',
    message: 'User not found',
  },
  ORGANIZATION_NOT_FOUND: {
    code: 'USER_002',
    message: 'Organization not found',
  },

  // Conflict
  EMAIL_ALREADY_EXISTS: {
    code: 'USER_003',
    message:
      'A user with this email address already exists',
  },

  // Validation
  INVALID_UUID_FORMAT: {
    code: 'USER_004',
    message: 'Invalid UUID format provided',
  },
  NO_UPDATE_DATA: {
    code: 'USER_005',
    message: 'No update data provided',
  },
  ORGANIZATION_ID_REQUIRED: {
    code: 'USER_006',
    message: 'Organization ID is required',
  },
  INVALID_CREDENTIALS: {
    code: 'USER_007',
    message: 'Invalid email or password',
  },

  // Internal
  USER_CREATION_FAILED: {
    code: 'USER_008',
    message:
      'Failed to create user. Please try again later',
  },
  USER_UPDATE_FAILED: {
    code: 'USER_009',
    message:
      'Failed to update user. Please try again later',
  },
  USER_DELETION_FAILED: {
    code: 'USER_010',
    message:
      'Failed to delete user. Please try again later',
  },
} as const;

export type UserErrorKey =
  keyof typeof USER_ERRORS;
