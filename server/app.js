const http = require("http")
const express = require("express")
const cookieParser = require("cookie-parser")
const config = require("./config/index")
const app = express()


const helmet = require("helmet")
const httpLogger = require("./middleware/httpLogger")
const logger = require("./config/logger")
const errorHandler = require("./middleware/errorHandler")
const notFound = require("./middleware/notFound")
const redis = require("./config/redis")
const prisma = require("./config/prisma")
const initializeSocket = require("./socket")
const { authController, webhookController, driverController, authService, riderController, rideController, adminController,  driverRepository} = require("./container")
const webhookRoutes = require("./routes/webhook")(webhookController)
const authRoutes = require("./routes/authRoutes")(authController)
const driverRoutes = require("./routes/driverRoute")(authService, driverController, riderController)
const riderRoutes = require("./routes/riderRoutes")(authService, riderController)
const rideRoutes = require("./routes/rideRoutes")(authService, rideController)
const adminRoutes = require("./routes/adminRoutes")(authService, adminController)
app.use(helmet())
app.use(httpLogger)
app.use("/webhook", webhookRoutes)

app.use(express.json())
app.use(cookieParser())

app.get("/health", (req, res, next) => {
    res.send("The app is running just fine")
})

app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/drivers", driverRoutes)
app.use("/api/v1/riders", riderRoutes)
app.use("/api/v1/rides", rideRoutes)
app.use("/api/v1/admin", adminRoutes)

app.use(notFound)
app.use(errorHandler)

const server = http.createServer(app)
initializeSocket(server, authService, redis, driverRepository)

const start = async () => {
    try {
        await prisma.$connect()
        await redis.ping()
        const { count } = await authService.cleanupStaleTokens()
        if (count > 0) logger.info(`Cleaned up ${count} stale tokens`)
        server.listen(config.port, () => {
            logger.info(`server is listening on port ${config.port}`)
        })
    }
    catch (error) {
        logger.error("server failed to start", error)
        process.exit(1)
    }
}

start()

module.exports = app
