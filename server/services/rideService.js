const { NotFoundError, ConflictError, ForbiddenError } = require("../error")
const logger = require("../config/logger")

class RideService {
    constructor(rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher) {
        this.rideRepository = rideRepository
        this.driverRepository = driverRepository
        this.riderRepository = riderRepository
        this.paymentService = paymentService
        this.mapService = mapService
        this.eventPublisher = eventPublisher
    }

    _haversine(lat1, lng1, lat2, lng2){
        const R = 6371
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLng = (lng2 - lng1) * Math.PI / 180
        const a = Math.sin(dLat/2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    _calculateFare(distanceKm, vehicleType) {
        const rates = { ECONOMY: 100, COMFORT: 150, XL: 200 }
        const baseFare = 500
        const ratePerKm = rates[vehicleType] ?? 100
        return baseFare + distanceKm * ratePerKm
    }

    async createRide(userId, data) {
        const riderProfile = await this.riderRepository.findByUserId(userId)
        if (!riderProfile) throw new NotFoundError("Rider profile")

        const activeRide = await this.rideRepository.findActiveByRider(riderProfile.riderProfileId)
        if (activeRide) throw new ConflictError("Rider already has an active ride")

        const { distanceKm } = await this.mapService.getDistanceAndDuration(
            data.pickupLat,
            data.pickupLng,
            data.dropoffLat,
            data.dropoffLng
        )
        const estimatedFare = this._calculateFare(distanceKm, data.vehicleType)
        const ride = await this.rideRepository.create({ riderId: riderProfile.riderProfileId, ...data, estimatedFare })

        const candidates = await this.driverRepository.findProfile(ride.vehicleType)
        const nearbyDriverIds = candidates
            .filter(d => d.location)
            .filter(d => this._haversine(data.pickupLat, data.pickupLng, d.location.lat, d.location.lng) <= 10)
            .map(d => d.driverProfileId)

        await this.eventPublisher.publishRideRequested({ rideId: ride.rideId, vehicleType: ride.vehicleType, pickupAddress: ride.pickupAddress, estimatedFare: ride.estimatedFare, nearbyDriverIds })
        return ride
    }

    async acceptRide(rideId, userId) {
        const ride = await this.rideRepository.findById(rideId)
        if (!ride) throw new NotFoundError("Ride")
        if (ride.state !== "REQUESTED") throw new ConflictError("Ride is no longer available")

        const driverProfile = await this.driverRepository.findByUserId(userId)
        if (!driverProfile) throw new NotFoundError("Driver profile")
        if (!driverProfile.isAvailable) throw new ForbiddenError("Driver is not available")
        if (driverProfile.approvalState !== "APPROVED") throw new ForbiddenError("Driver is not approved")

        const activeRide = await this.rideRepository.findActiveByDriver(driverProfile.driverProfileId)
        if (activeRide) throw new ConflictError("Driver already has an active ride")

        const updatedRide = await this.rideRepository.acceptRide(rideId, driverProfile.driverProfileId)
        await this.eventPublisher.publishRideEvent(rideId, "ride:accepted", { rideId, driverProfileId: driverProfile.driverProfileId })
        return updatedRide
    }

    async startRide(rideId, userId) {
        const ride = await this.rideRepository.findById(rideId)
        if (!ride) throw new NotFoundError("Ride")
        if (ride.state !== "ACCEPTED") throw new ConflictError("Ride cannot be started")

        const driverProfile = await this.driverRepository.findByUserId(userId)
        if (!driverProfile) throw new NotFoundError("Driver profile")
        if (ride.driverProfileId !== driverProfile.driverProfileId) throw new ForbiddenError("Not authorized to start this ride")

        const updatedRide = await this.rideRepository.updateState(rideId, "IN_PROGRESS", {
            pickupAt: new Date()
        })
        await this.eventPublisher.publishRideEvent(rideId, "ride:started", { rideId })
        return updatedRide
    }

    async cancelRide(rideId, userId, role, reason) {
        const ride = await this.rideRepository.findById(rideId)
        if (!ride) throw new NotFoundError("Ride")
        if (!["REQUESTED", "ACCEPTED"].includes(ride.state)) throw new ConflictError("Ride cannot be cancelled")

        if (role === "RIDER") {
            const riderProfile = await this.riderRepository.findByUserId(userId)
            if (!riderProfile || ride.riderId !== riderProfile.riderProfileId) throw new ForbiddenError("Not authorized to cancel this ride")
        } else if (role === "DRIVER") {
            const driverProfile = await this.driverRepository.findByUserId(userId)
            if (!driverProfile || ride.driverProfileId !== driverProfile.driverProfileId) throw new ForbiddenError("Not authorized to cancel this ride")
        }

        const updatedRide = await this.rideRepository.updateState(rideId, "CANCELLED", {
            cancelledAt: new Date(),
            cancellationReason: reason
        })
        await this.eventPublisher.publishRideEvent(rideId, "ride:cancelled", { rideId, reason })
        return updatedRide
    }

    async confirmCashPayment(rideId, userId) {
        return await this.paymentService.confirmCashPayment(rideId, userId)
    }

    async completeRide(rideId, userId) {
        const ride = await this.rideRepository.findById(rideId)
        if (!ride) throw new NotFoundError("Ride")
        if (ride.state !== "IN_PROGRESS") throw new ConflictError("Ride is not in progress")

        const driverProfile = await this.driverRepository.findByUserId(userId)
        if (!driverProfile) throw new NotFoundError("Driver profile")
        if (ride.driverProfileId !== driverProfile.driverProfileId) throw new ForbiddenError("Not authorized to complete this ride")

        const finalFare = ride.estimatedFare

        const completedRide = await this.rideRepository.updateState(rideId, "COMPLETED", {
            completedAt: new Date(),
            finalFare
        })

        const rider = await this.riderRepository.findByRiderId(ride.riderId)
        try {
            await this.paymentService.initiatePayment(completedRide, rider)
        } catch(error) {
            logger.error({ rideId, riderId: ride.riderId, finalFare, error }, "Payment initiation failed after ride completion")
            throw error
        }
        await this.eventPublisher.publishRideEvent(rideId, "ride:completed", { rideId, finalFare })

        return completedRide
    }
}

module.exports = RideService
