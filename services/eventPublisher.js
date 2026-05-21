class EventPublisher {
    constructor(redisClient) {
        this.redis = redisClient
    }

    async publishRideEvent(rideId, event, payload) {
        await this.redis.publish(`ride:${rideId}`, JSON.stringify({ event, payload }))
    }

    async publishRideRequested(payload) {
        await this.redis.publish("driver:new-ride", JSON.stringify({ event: "ride:requested", payload }))
    }

    async publishPaymentEvent(rideId, event, payload){
        await this.redis.publish(`payment:${rideId}`, JSON.stringify({ event, payload }))
    }
}

module.exports = EventPublisher
