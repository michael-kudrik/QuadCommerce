export function formatError(error: any): string {
  if (!error) return "Unknown error occurred";
  if (typeof error === "string") return error;
  
  if (error.fieldErrors) {
    const fields = Object.keys(error.fieldErrors);
    if (fields.length > 0) {
      const field = fields[0];
      const messages = error.fieldErrors[field];
      if (Array.isArray(messages) && messages.length > 0) {
        // Return first error from first field
        return `${field}: ${messages[0]}`;
      }
    }
  }

  if (error.formErrors && Array.isArray(error.formErrors) && error.formErrors.length > 0) {
    return error.formErrors[0];
  }

  // Fallback if it's an unexpected object but maybe has a message
  if (error.message && typeof error.message === "string") {
    return error.message;
  }

  return "An unexpected error occurred";
}
