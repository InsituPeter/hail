const { NotFoundError, ConflictError } = require("../../error")
const AdminService = require("../../services/adminService")

function makeRideRepository(overrides = {}) {
    return {
        findAll: jest.fn(),
        findById: jest.fn(),
        ...overrides,
    }
}

function makeDriverRepository(overrides = {}) {
    return {
        findAll: jest.fn(),
        findById: jest.fn(),
        updateApproval: jest.fn(),
        ...overrides,
    }
}

function makeUserRepository(overrides = {}) {
    return {
        getAll: jest.fn(),
        findById: jest.fn(),
        suspendUser: jest.fn(),
        softDelete: jest.fn(),
        ...overrides,
    }
}

function makePaymentRepository(overrides = {}) {
    return {
        findAll: jest.fn(),
        ...overrides,
    }
}

const driver = {
    driverProfileId: 1,
    approvalState: "PENDING_REVIEW",
}

const approvedDriver = {
    driverProfileId: 1,
    approvalState: "APPROVED",
}

const rejectedDriver = {
    driverProfileId: 1,
    approvalState: "REJECTED",
}

const suspendedDriver = {
    driverProfileId: 1,
    approvalState: "SUSPENDED",
}

const user = {
    userId: 1,
    email: "user@test.com",
    suspendedAt: null,
    deletedAt: null,
}

const suspendedUser = {
    userId: 1,
    email: "user@test.com",
    suspendedAt: new Date(),
    deletedAt: null,
}

const deletedUser = {
    userId: 1,
    email: "user@test.com",
    suspendedAt: null,
    deletedAt: new Date(),
}

describe("AdminService list methods", () => {
    let rideRepository, driverRepository, userRepository, paymentRepository, adminService

    beforeEach(() => {
        rideRepository = makeRideRepository()
        driverRepository = makeDriverRepository()
        userRepository = makeUserRepository()
        paymentRepository = makePaymentRepository()
        adminService = new AdminService(rideRepository, driverRepository, userRepository, paymentRepository)
    })

    it("getAllRides delegates to rideRepository.findAll", async () => {
        rideRepository.findAll.mockResolvedValue({ rides: [], total: 0 })
        const result = await adminService.getAllRides({ page: 1 })
        expect(rideRepository.findAll).toHaveBeenCalledWith({ page: 1 })
        expect(result).toEqual({ rides: [], total: 0 })
    })

    it("getAllDrivers delegates to driverRepository.findAll", async () => {
        driverRepository.findAll.mockResolvedValue({ drivers: [], total: 0 })
        const result = await adminService.getAllDrivers({ page: 1 })
        expect(driverRepository.findAll).toHaveBeenCalledWith({ page: 1 })
        expect(result).toEqual({ drivers: [], total: 0 })
    })

    it("getAllUsers delegates to userRepository.getAll", async () => {
        userRepository.getAll.mockResolvedValue({ users: [], total: 0 })
        const result = await adminService.getAllUsers({ page: 1 })
        expect(userRepository.getAll).toHaveBeenCalledWith({ page: 1 })
        expect(result).toEqual({ users: [], total: 0 })
    })

    it("getAllPayment delegates to paymentRepository.findAll", async () => {
        paymentRepository.findAll.mockResolvedValue({ payments: [], total: 0 })
        const result = await adminService.getAllPayment({ page: 1 })
        expect(paymentRepository.findAll).toHaveBeenCalledWith({ page: 1 })
        expect(result).toEqual({ payments: [], total: 0 })
    })
})

describe("AdminService.getRide()", () => {
    let rideRepository, adminService

    beforeEach(() => {
        rideRepository = makeRideRepository()
        adminService = new AdminService(rideRepository, makeDriverRepository(), makeUserRepository(), makePaymentRepository())
    })

    it("throws NotFoundError when ride does not exist", async () => {
        rideRepository.findById.mockResolvedValue(null)
        await expect(adminService.getRide(99)).rejects.toThrow(NotFoundError)
    })

    it("returns the ride on success", async () => {
        rideRepository.findById.mockResolvedValue({ rideId: 1 })
        const result = await adminService.getRide(1)
        expect(result.rideId).toBe(1)
    })
})

describe("AdminService driver approval methods", () => {
    let driverRepository, adminService

    beforeEach(() => {
        driverRepository = makeDriverRepository()
        adminService = new AdminService(makeRideRepository(), driverRepository, makeUserRepository(), makePaymentRepository())
    })

    it("approveDriver throws NotFoundError when driver does not exist", async () => {
        driverRepository.findById.mockResolvedValue(null)
        await expect(adminService.approveDriver(99)).rejects.toThrow(NotFoundError)
    })

    it("approveDriver throws ConflictError when already approved", async () => {
        driverRepository.findById.mockResolvedValue(approvedDriver)
        await expect(adminService.approveDriver(1)).rejects.toThrow(ConflictError)
    })

    it("approveDriver updates approval to APPROVED", async () => {
        driverRepository.findById.mockResolvedValue(driver)
        driverRepository.updateApproval.mockResolvedValue({ ...driver, approvalState: "APPROVED" })
        const result = await adminService.approveDriver(1)
        expect(driverRepository.updateApproval).toHaveBeenCalledWith(1, "APPROVED")
        expect(result.approvalState).toBe("APPROVED")
    })

    it("rejectDriver throws NotFoundError when driver does not exist", async () => {
        driverRepository.findById.mockResolvedValue(null)
        await expect(adminService.rejectDriver(99)).rejects.toThrow(NotFoundError)
    })

    it("rejectDriver throws ConflictError when already rejected", async () => {
        driverRepository.findById.mockResolvedValue(rejectedDriver)
        await expect(adminService.rejectDriver(1)).rejects.toThrow(ConflictError)
    })

    it("rejectDriver updates approval to REJECTED", async () => {
        driverRepository.findById.mockResolvedValue(driver)
        driverRepository.updateApproval.mockResolvedValue({ ...driver, approvalState: "REJECTED" })
        const result = await adminService.rejectDriver(1)
        expect(driverRepository.updateApproval).toHaveBeenCalledWith(1, "REJECTED")
        expect(result.approvalState).toBe("REJECTED")
    })

    it("suspendDriver throws NotFoundError when driver does not exist", async () => {
        driverRepository.findById.mockResolvedValue(null)
        await expect(adminService.suspendDriver(99)).rejects.toThrow(NotFoundError)
    })

    it("suspendDriver throws ConflictError when already suspended", async () => {
        driverRepository.findById.mockResolvedValue(suspendedDriver)
        await expect(adminService.suspendDriver(1)).rejects.toThrow(ConflictError)
    })

    it("suspendDriver updates approval to SUSPENDED", async () => {
        driverRepository.findById.mockResolvedValue(driver)
        driverRepository.updateApproval.mockResolvedValue({ ...driver, approvalState: "SUSPENDED" })
        const result = await adminService.suspendDriver(1)
        expect(driverRepository.updateApproval).toHaveBeenCalledWith(1, "SUSPENDED")
        expect(result.approvalState).toBe("SUSPENDED")
    })
})

describe("AdminService user management methods", () => {
    let userRepository, adminService

    beforeEach(() => {
        userRepository = makeUserRepository()
        adminService = new AdminService(makeRideRepository(), makeDriverRepository(), userRepository, makePaymentRepository())
    })

    it("suspendUser throws NotFoundError when user does not exist", async () => {
        userRepository.findById.mockResolvedValue(null)
        await expect(adminService.suspendUser(99)).rejects.toThrow(NotFoundError)
    })

    it("suspendUser throws ConflictError when already suspended", async () => {
        userRepository.findById.mockResolvedValue(suspendedUser)
        await expect(adminService.suspendUser(1)).rejects.toThrow(ConflictError)
    })

    it("suspendUser suspends the user", async () => {
        userRepository.findById.mockResolvedValue(user)
        userRepository.suspendUser.mockResolvedValue({ ...user, suspendedAt: new Date() })
        await adminService.suspendUser(1)
        expect(userRepository.suspendUser).toHaveBeenCalledWith(1)
    })

    it("deleteUser throws NotFoundError when user does not exist", async () => {
        userRepository.findById.mockResolvedValue(null)
        await expect(adminService.deleteUser(99)).rejects.toThrow(NotFoundError)
    })

    it("deleteUser throws ConflictError when already deleted", async () => {
        userRepository.findById.mockResolvedValue(deletedUser)
        await expect(adminService.deleteUser(1)).rejects.toThrow(ConflictError)
    })

    it("deleteUser soft deletes the user", async () => {
        userRepository.findById.mockResolvedValue(user)
        userRepository.softDelete.mockResolvedValue()
        await adminService.deleteUser(1)
        expect(userRepository.softDelete).toHaveBeenCalledWith(1)
    })
})
