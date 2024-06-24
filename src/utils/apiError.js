class APIError extends Error {
  constructor(
    message = "Internal Server Error",
    statusCode,
    error = [],
    stack = ""
  ) {
    super(message); //to override methods of parent class
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.sucess = false;
    this.error = error;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { APIError };
