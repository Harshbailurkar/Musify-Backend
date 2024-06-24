class APIResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400; //refer status code of server
  }
}
export { APIResponse };
/*
status code:
     1. informational responce : 100-199
     2. successfull responce : 200-299
     3. redirection responce : 300-399
     4. client error responce : 400-499
     5. server error responce : 500-599

*/
