const AppError = require("./AppError")

class ConflictError extends AppError{
    constructor(message="Conflct"){
        super(message, 409)
    }
}

module.exports = ConflictError