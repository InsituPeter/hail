const express = require("express")
const router = express.Router()

const authenticate = require("../middleware/authenticate")
const authorize = require("../middleware/authorize")

module.exports = (authService, adminController) => {
    const auth = authenticate(authService)
    const adminOnly = authorize(["ADMIN"])

    // Rides
    router.get("/rides", auth, adminOnly, adminController.getAllRides)
    router.get("/rides/:rideId", auth, adminOnly, adminController.getRide)

    // Drivers
    router.get("/drivers", auth, adminOnly, adminController.getAllDrivers)
    router.patch("/drivers/:id/approve", auth, adminOnly, adminController.approveDriver)
    router.patch("/drivers/:id/reject", auth, adminOnly, adminController.rejectDriver)
    router.patch("/drivers/:id/suspend", auth, adminOnly, adminController.suspendDriver)

    // Users
    router.get("/users", auth, adminOnly, adminController.getAllUsers)
    router.patch("/users/:id/suspend", auth, adminOnly, adminController.suspendUser)
    router.delete("/users/:id", auth, adminOnly, adminController.deleteUser)

    // Payments
    router.get("/payments", auth, adminOnly, adminController.getAllPayments)

    return router
}
