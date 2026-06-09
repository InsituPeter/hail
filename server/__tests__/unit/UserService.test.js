jest.mock("bcryptjs")
const bcrypt = require("bcryptjs")
const { NotFoundError, ConflictError, ValidationError } = require("../../error")
const UserService = require("../../services/userService")

function makeUserRepository(overrides = {}) {
    return {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        existByEmail: jest.fn(),
        create: jest.fn(),
        softDelete: jest.fn(),
        ...overrides,
    }
}

function makeRiderRepository(overrides = {}) {
    return {
        create: jest.fn(),
        findByUserId: jest.fn(),
        ...overrides,
    }
}

const userData = {
    email: "rider@test.com",
    password: "plain_password",
    name: "Test Rider",
    role: "RIDER",
    phone: "08012345678",
}

const createdUser = {
    userId: 1,
    email: "rider@test.com",
    password: "hashed_password",
    name: "Test Rider",
    role: "RIDER",
    phone: "08012345678",
}

describe("UserService.createUser()", () => {
    let userRepository, riderRepository, userService

    beforeEach(() => {
        userRepository = makeUserRepository()
        riderRepository = makeRiderRepository()
        userService = new UserService(userRepository, riderRepository)
    })

    it("throws ValidationError when required fields are missing", async () => {
        await expect(userService.createUser({ email: "only@email.com" })).rejects.toThrow(ValidationError)
    })

    it("throws ConflictError when email already exists", async () => {
        userRepository.existByEmail.mockResolvedValue(true)
        await expect(userService.createUser(userData)).rejects.toThrow(ConflictError)
    })

    it("creates rider profile when role is RIDER", async () => {
        userRepository.existByEmail.mockResolvedValue(false)
        bcrypt.hash.mockResolvedValue("hashed_password")
        userRepository.create.mockResolvedValue(createdUser)
        riderRepository.create.mockResolvedValue()

        const result = await userService.createUser(userData)

        expect(riderRepository.create).toHaveBeenCalledWith(createdUser.userId)
        expect(result).not.toHaveProperty("password")
    })

    it("does not create rider profile when role is DRIVER", async () => {
        userRepository.existByEmail.mockResolvedValue(false)
        bcrypt.hash.mockResolvedValue("hashed_password")
        userRepository.create.mockResolvedValue({ ...createdUser, role: "DRIVER" })

        await userService.createUser({ ...userData, role: "DRIVER" })

        expect(riderRepository.create).not.toHaveBeenCalled()
    })
})

describe("UserService.getUserById()", () => {
    let userRepository, userService

    beforeEach(() => {
        userRepository = makeUserRepository()
        userService = new UserService(userRepository, makeRiderRepository())
    })

    it("throws NotFoundError when user does not exist", async () => {
        userRepository.findById.mockResolvedValue(null)
        await expect(userService.getUserById(99)).rejects.toThrow(NotFoundError)
    })

    it("returns user without password field", async () => {
        userRepository.findById.mockResolvedValue(createdUser)
        const result = await userService.getUserById(1)
        expect(result.email).toBe("rider@test.com")
        expect(result).not.toHaveProperty("password")
    })
})

describe("UserService.deleteUser()", () => {
    let userRepository, userService

    beforeEach(() => {
        userRepository = makeUserRepository()
        userService = new UserService(userRepository, makeRiderRepository())
    })

    it("throws NotFoundError when user does not exist", async () => {
        userRepository.findById.mockResolvedValue(null)
        await expect(userService.deleteUser(99)).rejects.toThrow(NotFoundError)
    })

    it("soft deletes the user", async () => {
        userRepository.findById.mockResolvedValue(createdUser)
        userRepository.softDelete.mockResolvedValue()
        await userService.deleteUser(1)
        expect(userRepository.softDelete).toHaveBeenCalledWith(1)
    })
})
