const express = require("express")
const router = express.Router()

const authenticate = require("../middleware/authenticate")
const authorize = require("../middleware/authorize")
const validate = require("../middleware/validate")
const { createSchema, updateDriverProfileSchema, updateAvailabilitySchema } = require("../validation/driverSchema")

module.exports = (authService, driverController, riderController) => {
    const auth = authenticate(authService)
    const driverOnly = authorize(["DRIVER"])

    router.post("/", auth, driverOnly, validate(createSchema), driverController.registerDriver)
    router.get("/me", auth, driverOnly, driverController.getMyProfile)
    router.get("/:id", auth, driverController.getDriver)
    router.patch("/me", auth, driverOnly, validate(updateDriverProfileSchema), driverController.updatedriverProfile)
    router.patch("/me/availability", auth, driverOnly, validate(updateAvailabilitySchema), driverController.setAvailability)
    router.get("/riders/:id", auth, driverOnly, riderController.getRider)

    return router
}
