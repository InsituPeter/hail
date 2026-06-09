const { z } = require("zod")

const createRideSchema = z.object({
    pickupAddress: z.string().min(1).trim(),
    pickupLat: z.number(),
    pickupLng: z.number(),
    dropoffAddress: z.string().min(1).trim(),
    dropoffLat: z.number(),
    dropoffLng: z.number(),
    vehicleType: z.enum(["ECONOMY", "COMFORT", "XL"]),
    paymentMethod: z.enum(["CASH", "CARD", "USSD", "TRANSFER"])
})

module.exports = { createRideSchema }
