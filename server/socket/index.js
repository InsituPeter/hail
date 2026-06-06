const { Server } = require("socket.io")
const logger = require("../config/logger")

const initializeSocket = (httpServer, authService, redisClient, driverRepository) => {
    const io = new Server(httpServer, {
        cors: { origin: "*" }
    })

    io.use((socket, next) => {
        const token = socket.handshake.auth.token
        if (!token) return next(new Error("Authentication required"))
        try {
            socket.user = authService.verifyAccessToken(token)
            next()
        } catch {
            next(new Error("Invalid token"))
        }
    })

    io.on("connection", async (socket) => {
        logger.info({ userId: socket.user.id }, "socket connected")

        if(socket.user.role === "DRIVER"){
            socket.join("drivers")
            const driverProfile = await driverRepository.findByUserId(socket.user.userId)
            if(driverProfile) socket.join(`driver:${driverProfile.driverProfileId}`)
        }

        socket.on("disconnect", () => {
            logger.info({ userId: socket.user.id }, "socket disconnected")
        })

        socket.on("join:ride", (rideId) => {
            socket.join(`ride:${rideId}`)
        })

        socket.on("leave:ride", (rideId) => {
            socket.leave(`ride:${rideId}`)
        })

        socket.on("location:update", async ({ rideId, lat, lng, heading }) => {
            await redisClient.publish(`location:${rideId}`, JSON.stringify({ lat, lng, heading }))
        })
    })

    const subscriber = redisClient.duplicate()
    subscriber.psubscribe("ride:*", "location:*", "payment:*", "driver:*")

    subscriber.on("pmessage", (pattern, channel, message) => {
        let data
        try {
            data = JSON.parse(message)
        } catch (err) {
            logger.error({ err }, "Failed to process pub/sub message")
            return
        }

        if (channel === "driver:new-ride") {
            const{nearbyDriverIds, ...ridePayload}=data.payload
            nearbyDriverIds.forEach(id => io.to(`driver:${id}`).emit("ride:requested", ridePayload))
            return
            
        }

        if (channel.startsWith("location:")) {
            const rideId = channel.split(":")[1]
            io.to(`ride:${rideId}`).emit("location:updated", data)
            return
        }

        if (channel.startsWith("ride:")) {
            io.to(channel).emit(data.event, data.payload)
            return
        }

        if (channel.startsWith("payment:")) {
            const rideId = channel.split(":")[1]
            io.to(`ride:${rideId}`).emit(data.event, data.payload)
        }
    })

    return io
}

module.exports = initializeSocket
