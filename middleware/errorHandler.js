const { PrismaClientKnownRequestError, PrismaClientValidationError } = require("@prisma/client/runtime/library")
const { AppError, ConflictError, NotFoundError } = require("../error")

const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: { code: err.errorCode, message: err.message, timestamp: err.timeStamp } })
    }

    if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            const field = err.meta?.target?.[0] ?? "field"
            const conflict = new ConflictError(`${field} already exists`)
            return res.status(conflict.statusCode).json({ error: { code: conflict.errorCode, message: conflict.message, timestamp: conflict.timeStamp } })
        }
        if (err.code === "P2025") {
            const notFound = new NotFoundError("Record")
            return res.status(notFound.statusCode).json({ error: { code: notFound.errorCode, message: notFound.message, timestamp: notFound.timeStamp } })
        }
    }

    if (err instanceof PrismaClientValidationError) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid request data", timestamp: new Date().toISOString() } })
    } 
    logger.error(err)
    return res.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred",
            timestamp: new Date().toISOString()
        }
    })
}

module.exports = errorHandler