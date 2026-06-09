const { NotFoundError, ConflictError, ForbiddenError } = require("../error")

class RiderService {
    constructor(riderRepository, rideRepository, driverRepository) {
        this.riderRepository = riderRepository
        this.rideRepository = rideRepository
        this.driverRepository = driverRepository
    }

    async createRiderProfile(userId) {
        const existing = await this.riderRepository.findByUserId(userId)
        if (existing) throw new ConflictError("Rider profile already exists")
        return await this.riderRepository.create(userId)
    }

    async getRider(riderProfileId, driverUserId) {
        const driverProfile= await this.driverRepository.findByUserId(driverUserId)
        if(!driverProfile) throw new NotFoundError("Driver Profile")

        const activeRide = await this.rideRepository.findActiveByDriver(driverProfile.driverProfileId)
        if (!activeRide || activeRide.riderId !== riderProfileId) throw new ForbiddenError("Not authorized to view this rider")

        const rider = await this.riderRepository.findByRiderId(riderProfileId)
        if (!rider) throw new NotFoundError("Rider")
        return rider
    }
    async getProfile(userId){
        const rider = await this.riderRepository.findByUserId(userId)
        if(!rider) throw new NotFoundError("Rider")
        return rider
    }

    async updateRiderProfile(userId, data) {
        const rider = await this.riderRepository.findByUserId(userId)
        if (!rider) throw new NotFoundError("Rider")
        return await this.riderRepository.UpdateRiderProfile(rider.riderProfileId, data)
    }
}

module.exports = RiderService
