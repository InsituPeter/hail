const { NotFoundError, ConflictError, ForbiddenError } = require("../../error")
const RiderService = require("../../services/riderService")

function makeRiderRepository(overrides = {}) {
    return {
        create: jest.fn(),
        findByUserId: jest.fn(),
        findByRiderId: jest.fn(),
        UpdateRiderProfile: jest.fn(),
        ...overrides,
    }
}

function makeRideRepository(overrides = {}) {
    return {
        findActiveByDriver: jest.fn(),
        ...overrides,
    }
}

function makeDriverRepository(overrides = {}) {
    return {
        findByUserId: jest.fn(),
        ...overrides,
    }
}

const rider = {
    riderProfileId: 1,
    userId: 10,
    rating: 4.5,
    totalRides: 50,
}

const driverProfile = {
    driverProfileId: 5,
    userId: 20,
}

describe("RiderService.createRiderProfile()", () => {
    let riderRepository, riderService

    beforeEach(() => {
        riderRepository = makeRiderRepository()
        riderService = new RiderService(riderRepository, makeRideRepository(), makeDriverRepository())
    })

    it("throws ConflictError when profile already exists", async () => {
        riderRepository.findByUserId.mockResolvedValue(rider)
        await expect(riderService.createRiderProfile(10)).rejects.toThrow(ConflictError)
    })

    it("creates rider profile on success", async () => {
        riderRepository.findByUserId.mockResolvedValue(null)
        riderRepository.create.mockResolvedValue(rider)
        const result = await riderService.createRiderProfile(10)
        expect(riderRepository.create).toHaveBeenCalledWith(10)
        expect(result).toEqual(rider)
    })
})

describe("RiderService.getRider()", () => {
    let riderRepository, rideRepository, driverRepository, riderService

    beforeEach(() => {
        riderRepository = makeRiderRepository()
        rideRepository = makeRideRepository()
        driverRepository = makeDriverRepository()
        riderService = new RiderService(riderRepository, rideRepository, driverRepository)
    })

    it("throws NotFoundError when driver profile does not exist", async () => {
        driverRepository.findByUserId.mockResolvedValue(null)
        await expect(riderService.getRider(1, 99)).rejects.toThrow(NotFoundError)
    })

    it("throws ForbiddenError when driver has no active ride with that rider", async () => {
        driverRepository.findByUserId.mockResolvedValue(driverProfile)
        rideRepository.findActiveByDriver.mockResolvedValue(null)
        await expect(riderService.getRider(1, 20)).rejects.toThrow(ForbiddenError)
    })

    it("returns rider on success", async () => {
        driverRepository.findByUserId.mockResolvedValue(driverProfile)
        rideRepository.findActiveByDriver.mockResolvedValue({ riderId: 1 })
        riderRepository.findByRiderId.mockResolvedValue(rider)
        const result = await riderService.getRider(1, 20)
        expect(result).toEqual(rider)
    })
})

describe("RiderService.getProfile()", () => {
    let riderRepository, riderService

    beforeEach(() => {
        riderRepository = makeRiderRepository()
        riderService = new RiderService(riderRepository, makeRideRepository(), makeDriverRepository())
    })

    it("throws NotFoundError when rider does not exist", async () => {
        riderRepository.findByUserId.mockResolvedValue(null)
        await expect(riderService.getProfile(10)).rejects.toThrow(NotFoundError)
    })

    it("returns rider profile", async () => {
        riderRepository.findByUserId.mockResolvedValue(rider)
        const result = await riderService.getProfile(10)
        expect(result).toEqual(rider)
    })
})

describe("RiderService.updateRiderProfile()", () => {
    let riderRepository, riderService

    beforeEach(() => {
        riderRepository = makeRiderRepository()
        riderService = new RiderService(riderRepository, makeRideRepository(), makeDriverRepository())
    })

    it("throws NotFoundError when rider does not exist", async () => {
        riderRepository.findByUserId.mockResolvedValue(null)
        await expect(riderService.updateRiderProfile(10, { rating: 5 })).rejects.toThrow(NotFoundError)
    })

    it("updates rider profile on success", async () => {
        const updates = { rating: 5 }
        riderRepository.findByUserId.mockResolvedValue(rider)
        riderRepository.UpdateRiderProfile.mockResolvedValue({ ...rider, ...updates })
        const result = await riderService.updateRiderProfile(10, updates)
        expect(riderRepository.UpdateRiderProfile).toHaveBeenCalledWith(1, updates)
        expect(result.rating).toBe(5)
    })
})
