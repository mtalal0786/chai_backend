class ApiError extends Error {
    constructor(
        statuaCode,
        message="Something went wrong"
        ,errors=[],
        stack="") {
        super(message);
        this.statusCode = statuaCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
                
    }
}

export { ApiError };