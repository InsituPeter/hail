const EventPublisher = require("../../services/eventPublisher")

function makeRedisClient(overrides = {}) {
    return {
        publish: jest.fn(),
        ...overrides,
    }
}

describe("EventPublisher", () => {
    let redisClient, eventPublisher

    beforeEach(() => {
        redisClient = makeRedisClient()
        eventPublisher = new EventPublisher(redisClient)
    })

    it("publishRideEvent publishes to ride channel", async () => {
        redisClient.publish.mockResolvedValue(1)
        await eventPublisher.publishRideEvent(3, "ride:accepted", { rideId: 3 })
        expect(redisClient.publish).toHaveBeenCalledWith(
            "ride:3",
            JSON.stringify({ event: "ride:accepted", payload: { rideId: 3 } })
        )
    })

    it("publishRideRequested publishes to driver:new-ride channel", async () => {
        redisClient.publish.mockResolvedValue(1)
        const payload = { rideId: 1, vehicleType: "ECONOMY" }
        await eventPublisher.publishRideRequested(payload)
        expect(redisClient.publish).toHaveBeenCalledWith(
            "driver:new-ride",
            JSON.stringify({ event: "ride:requested", payload })
        )
    })

    it("publishPaymentEvent publishes to payment channel", async () => {
        redisClient.publish.mockResolvedValue(1)
        await eventPublisher.publishPaymentEvent(1, "payment:captured", { rideId: 1 })
        expect(redisClient.publish).toHaveBeenCalledWith(
            "payment:1",
            JSON.stringify({ event: "payment:captured", payload: { rideId: 1 } })
        )
    })
})
