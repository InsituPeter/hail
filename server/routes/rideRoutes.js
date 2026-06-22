const express = require("express")
const router = express.Router()

const authenticate = require("../middleware/authenticate")
const authorize = require("../middleware/authorize")
const validate = require("../middleware/validate")
const { createRideSchema } = require("../validation/rideSchema")

module.exports = (authService, rideController) => {
    const auth = authenticate(authService)
    const riderOnly = authorize("RIDER")
    const driverOnly = authorize("DRIVER")

    router.post("/", auth, riderOnly, validate(createRideSchema), rideController.createRide)
    router.patch("/:rideId/accept", auth, driverOnly, rideController.acceptRide)
    router.patch("/:rideId/start", auth, driverOnly, rideController.startRide)
    router.patch("/:rideId/cancel", auth, authorize("RIDER", "DRIVER"), rideController.cancelRide)
    router.patch("/:rideId/complete", auth, driverOnly, rideController.completeRide)
    router.patch("/:rideId/confirm-cash", auth, driverOnly, rideController.confirmCashPayment)

    return router
}