const express = require("express")
const router = express.Router()

const authenticate = require("../middleware/authenticate")
const authorize = require("../middleware/authorize")

module.exports = (authService, riderController) => {
    const auth = authenticate(authService)
    const riderOnly = authorize("RIDER")

    router.post("/", auth, riderOnly, riderController.createRiderProfile)
    router.get("/profile", auth, riderOnly, riderController.getProfile)
    router.patch("/profile", auth, riderOnly, riderController.updateRiderProfile)

    return router
}
