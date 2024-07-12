class APIError extends Error {
  constructor(
    statusCode,
    message = "Internal Server Error",
    error = [],
    stack = ""
  ) {
    super(message); // to override methods of the parent class
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false; // corrected typo
    this.error = error;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { APIError };
