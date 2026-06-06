const AppError = require("./AppError")


class PaystackTransientError extends AppError{
    constructor(message= ""){
        super(message, 503, "PAYSTACK_TRANSIENT_ERROR")
    }
}


class PaystackPermanentError extends AppError{
    constructor(message){
        super(message, 422, "PAYSTACK_PERMANENT_ERROR" )
    }
}


module.exports={PaystackTransientError, PaystackPermanentError}