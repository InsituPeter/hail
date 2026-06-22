const crypto = require('crypto')
const { AuthorizationError, NotFoundError, ForbiddenError, ConflictError } = require("../error")

class PaymentService {
    constructor(paystackGateway, paymentRepository, rideRepository, riderRepository, driverRepository, config, eventPublisher) {
        this.paystackGateway = paystackGateway
        this.paymentRepository = paymentRepository
        this.rideRepository = rideRepository
        this.riderRepository = riderRepository
        this.driverRepository = driverRepository
        this.config = config
        this.eventPublisher = eventPublisher
    }

    async _initiateCashPayment(ride) {
        await this.paymentRepository.create(ride.rideId, ride.finalFare, "CASH")
    }

    async _initiatePaystackPayment(ride, rider) {
        const reference = crypto.randomUUID()
        await this.paymentRepository.create(ride.rideId, ride.finalFare, "CARD", reference)

        if (rider.paystackAuthorizationCode) {
            await this.paystackGateway.chargeAuthorization(
                rider.paystackEmail,
                ride.finalFare,
                rider.paystackAuthorizationCode,
                reference
            )
            return { method: "silent" }
        }

        const result = await this.paystackGateway.initializeTransaction(
            rider.user.email,
            ride.finalFare,
            reference,
            this.config.frontend.url + "/payment/callback"
        )
        return { method: "checkout", authorizationUrl: result.authorization_url }
    }

    async initiatePayment(ride, rider) {
        if (ride.paymentMethod === "CASH") {
            return await this._initiateCashPayment(ride)
        }
        return await this._initiatePaystackPayment(ride, rider)
    }    

    constructWebhookEvent(rawBody, signature) {
        const hash = crypto
            .createHmac("sha512", this.config.paystack.secretKey)
            .update(rawBody)
            .digest("hex")
        if (hash !== signature) throw new AuthorizationError("Webhook signature verification failed")
        return JSON.parse(rawBody)
    }

    async handlePaymentSuccess(reference, authorizationCode, email) {
        const payment = await this.paymentRepository.findByReference(reference)
        if (!payment || payment.state === "CAPTURED") return

        await this.paymentRepository.capture(payment.rideId, payment.amount, reference)
        await this.eventPublisher.publishPaymentEvent(payment.rideId, "payment:captured", { rideId: payment.rideId })

        if (authorizationCode) {
            const ride = await this.rideRepository.findById(payment.rideId)
            const rider = await this.riderRepository.findByRiderId(ride.riderId)
            if (!rider.paystackAuthorizationCode) {
                await this.riderRepository.UpdateRiderProfile(rider.riderProfileId, {
                    paystackAuthorizationCode: authorizationCode,
                    paystackEmail: email
                })
            }
        }
    }

    async handlePaymentFailure(reference) {
        const payment = await this.paymentRepository.findByReference(reference)
        if (payment) await this.paymentRepository.fail(payment.rideId)
    }

    async confirmCashPayment(rideId, userId) {
        rideId = Number(rideId)
        const ride = await this.rideRepository.findById(rideId)
        if (!ride) throw new NotFoundError("Ride")
        if (ride.state !== "COMPLETED") throw new ConflictError("Ride is not completed")

        const driverProfile = await this.driverRepository.findByUserId(userId)
        if (!driverProfile) throw new NotFoundError("Driver profile")
        if (ride.driverProfileId !== driverProfile.driverProfileId) throw new ForbiddenError("Not authorized to confirm payment for this ride")

        const payment = await this.paymentRepository.findByRideId(rideId)
        await this.paymentRepository.capture(rideId, payment.amount)
        await this.eventPublisher.publishPaymentEvent(rideId, "payment:captured", { rideId })
    }
}

module.exports = PaymentService
