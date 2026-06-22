process.env.JWT_SECRET = "test-jwt-secret"

jest.mock("bcryptjs")
const bcrypt = require("bcryptjs")

const AuthService = require("../../services/AuthService")
const {
    NotFoundError,
    ForbiddenError,
    AuthorizationError,
    ConflictError,
} = require("../../error")

function makeUserRepository(overrides = {}) {
    return {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        existByEmail: jest.fn(),
        create: jest.fn(),
        activateUser: jest.fn(),
        updateProfile: jest.fn(),
        ...overrides,
    }
}

function makeTokenRepository(overrides = {}) {
    return {
        create: jest.fn(),
        findByToken: jest.fn(),
        findByUserId: jest.fn(),
        revokeToken: jest.fn(),
        markUsed: jest.fn(),
        ...overrides,
    }
}

function makeEmailService(overrides = {}) {
    return {
        sendVerificationEmail: jest.fn().mockResolvedValue(),
        sendWelcomeEmail: jest.fn().mockResolvedValue(),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(),
        ...overrides,
    }
}

const activeUser = {
    userId: 1,
    email: "rider@test.com",
    password: "hashed_password",
    name: "Test_rider",
    role: "RIDER",
    emailVerifiedAt: new Date("2026-01-01"),
    deletedAt: null,
}
 const validToken = {
        tokenId: 10,
        userId: 1,
        type: "EMAIL",
        state: "ACTIVE",
        expiresAt: new Date(Date.now() + 3_600_000),
        user: { userId: 1 },
    }

describe("AuthService.login()", () => {
    let authService, userRepository, tokenRepository

    beforeEach(() => {
        userRepository = makeUserRepository()
        tokenRepository = makeTokenRepository()
        authService = new AuthService(userRepository, makeEmailService(), tokenRepository)
    })

    it("throws NotFoundError when email doesn't exist", async () => {
        userRepository.findByEmail.mockResolvedValue(null)
        await expect(
            authService.login("nobody@test.com", "pass", "127.0.0.1", "agent")
        ).rejects.toThrow(NotFoundError)
    })

    it("throws NotFoundError when account is soft-deleted", async () => {
        userRepository.findByEmail.mockResolvedValue({ ...activeUser, deletedAt: new Date() })
        bcrypt.compare.mockResolvedValue(true)
        await expect(
            authService.login("rider@test.com", "pass", "127.0.0.1", "agent")
        ).rejects.toThrow(NotFoundError)
    })

    it("throws ForbiddenError when password does not match", async () => {
        userRepository.findByEmail.mockResolvedValue(activeUser)
        bcrypt.compare.mockResolvedValue(false)
        await expect(
            authService.login("rider@test.com", "wrongpass", "127.0.0.1", "agent")
        ).rejects.toThrow(ForbiddenError)
    })

    it("throws ForbiddenError when account is suspended", async () => {
        userRepository.findByEmail.mockResolvedValue({ ...activeUser, suspendedAt: new Date() })
        bcrypt.compare.mockResolvedValue(true)
        await expect(
            authService.login("rider@test.com", "pass", "127.0.0.1", "agent")
        ).rejects.toThrow(ForbiddenError)
    })

    it("throws ForbiddenError when email has not been verified", async () => {
        userRepository.findByEmail.mockResolvedValue({ ...activeUser, emailVerifiedAt: null })
        bcrypt.compare.mockResolvedValue(true)
        await expect(
            authService.login("rider@test.com", "pass", "127.0.0.1", "agent")
        ).rejects.toThrow(ForbiddenError)
    })

    it("returns user, accessToken and refreshToken on success", async () => {
        userRepository.findByEmail.mockResolvedValue(activeUser)
        bcrypt.compare.mockResolvedValue(true)
        tokenRepository.create.mockResolvedValue()

        const result = await authService.login("rider@test.com", "pass", "127.0.0.1", "agent")
        expect(result).toHaveProperty("accessToken")
        expect(result).toHaveProperty("refreshToken")
        expect(result.user).not.toHaveProperty("password")
        expect(result.user.email).toBe("rider@test.com")
    })
})

describe("AuthService token helpers", () => {
    let authService

    beforeEach(() => {
        authService = new AuthService(makeUserRepository(), makeEmailService(), makeTokenRepository())
    })

    it("verifyAccessToken recovers the payload from a token it signed", () => {
        const token = authService.generateAccessToken({ userId: 42, email: "a@b.com", role: "RIDER" })
        const decoded = authService.verifyAccessToken(token)

        expect(decoded.userId).toBe(42)
        expect(decoded.email).toBe("a@b.com")
        expect(decoded.role).toBe("RIDER")
    })

    it("verifyAccessToken throws AuthorizationError for a tampered token", () => {
        expect(() => {
            authService.verifyAccessToken("this.is.not.valid")
        }).toThrow(AuthorizationError)
    })
})

describe("AuthService.verifyEmailToken()", () => {
    let authService, userRepository, tokenRepository

   

    beforeEach(() => {
        userRepository = makeUserRepository()
        tokenRepository = makeTokenRepository()
        authService = new AuthService(userRepository, makeEmailService(), tokenRepository)
    })

    it("throws AuthorizationError when token is not in the DB", async () => {
        tokenRepository.findByToken.mockResolvedValue(null)
        await expect(authService.verifyEmailToken("fake")).rejects.toThrow(AuthorizationError)
    })

    it("throws AuthorizationError when token type is wrong", async () => {
        tokenRepository.findByToken.mockResolvedValue({ ...validToken, type: "PASSWORD" })
        await expect(authService.verifyEmailToken("raw")).rejects.toThrow(AuthorizationError)
    })

    it("throws AuthorizationError when token has already been used", async () => {
        tokenRepository.findByToken.mockResolvedValue({ ...validToken, state: "USED" })
        await expect(authService.verifyEmailToken("fake")).rejects.toThrow(AuthorizationError)
    })

    it("throws AuthorizationError when token has expired", async () => {
        tokenRepository.findByToken.mockResolvedValue({
            ...validToken,
            expiresAt: new Date(Date.now() - 1000),
        })
        await expect(authService.verifyEmailToken("fake")).rejects.toThrow(AuthorizationError)
    })

    it("marks token used and activates the user on success", async () => {
        tokenRepository.findByToken.mockResolvedValue(validToken)
        tokenRepository.markUsed.mockResolvedValue()
        userRepository.activateUser.mockResolvedValue()

        await authService.verifyEmailToken("any-raw-token")

        expect(tokenRepository.markUsed).toHaveBeenCalledTimes(1)
        expect(userRepository.activateUser).toHaveBeenCalledWith(validToken.user.userId)
    })
})


describe("AuthService.logout()", () => {
    let authService, userRepository, tokenRepository, emailService

    beforeEach(() => {
        userRepository = makeUserRepository()
        tokenRepository = makeTokenRepository()
        emailService = makeEmailService()
        authService = new AuthService(userRepository, emailService, tokenRepository)
    })

    it("throws AuthorizationError when token is not in DB", async () => {
        tokenRepository.findByToken.mockResolvedValue(null)
        await expect(authService.logout("some-token")).rejects.toThrow(AuthorizationError)
    })

    it("revokes the token on success", async () => {
        const mockFoundToken = { ...validToken, type: "REFRESH" }
        tokenRepository.findByToken.mockResolvedValue(mockFoundToken)
        tokenRepository.revokeToken.mockResolvedValue()

        await authService.logout("some-token")

        expect(tokenRepository.revokeToken).toHaveBeenCalledTimes(1)
    })
})
describe("AuthService.refreshAccessToken()", () => {
    let authService, userRepository, tokenRepository, emailService

    beforeEach(() => {
        userRepository = makeUserRepository()
        tokenRepository = makeTokenRepository()
        emailService = makeEmailService()
        authService = new AuthService(userRepository, emailService, tokenRepository)
    })

    it("throws AuthorizationError when token not in DB", async () => {
        tokenRepository.findByToken.mockResolvedValue(null)
        await expect(
            authService.refreshAccessToken("raw-token", "127.0.0.1", "agent")
        ).rejects.toThrow(AuthorizationError)
    })

    it("throws AuthorizationError when token type is not REFRESH", async () => {
        tokenRepository.findByToken.mockResolvedValue({ ...refreshToken, type: "EMAIL" })
        await expect(
            authService.refreshAccessToken("raw-token", "127.0.0.1", "agent")
        ).rejects.toThrow(AuthorizationError)
    })

    it("throws AuthorizationError when token state is not ACTIVE", async () => {
        tokenRepository.findByToken.mockResolvedValue({ ...refreshToken, state: "USED" })
        await expect(
            authService.refreshAccessToken("raw-token", "127.0.0.1", "agent")
        ).rejects.toThrow(AuthorizationError)
    })

    it("throws AuthorizationError when token has expired", async () => {
        tokenRepository.findByToken.mockResolvedValue({
            ...refreshToken,
            expiresAt: new Date(Date.now() - 1000),
        })
        await expect(
            authService.refreshAccessToken("raw-token", "127.0.0.1", "agent")
        ).rejects.toThrow(AuthorizationError)
    })

    it("revokes old token and returns new tokens on success", async () => {
        tokenRepository.findByToken.mockResolvedValue(refreshToken)
        tokenRepository.revokeToken.mockResolvedValue()
        tokenRepository.create.mockResolvedValue()

        const result = await authService.refreshAccessToken("raw-token", "127.0.0.1", "agent")

        expect(tokenRepository.revokeToken).toHaveBeenCalledTimes(1)
        expect(tokenRepository.create).toHaveBeenCalledWith(
            refreshToken.user.userId,
            expect.any(Date),
            expect.any(String),
            "REFRESH",
            "127.0.0.1",
            "agent"
        )
        expect(result).toHaveProperty("accessToken")
        expect(result).toHaveProperty("refreshToken")
    })
})

describe("AuthService.forgotPassword()", ()=>{
   let authService, emailService, tokenRepository, userRepository
   beforeEach(()=>{
      emailService= makeEmailService()
      tokenRepository= makeTokenRepository()
      userRepository = makeUserRepository()
      authService= new AuthService(userRepository, emailService, tokenRepository)
   })

    it("throws NotFoundError when email is not found", async () => {
        userRepository.findByEmail.mockResolvedValue(null)
        await expect(authService.forgotPassword("nobody@test.com")).rejects.toThrow(NotFoundError)
    })

    it("creates reset token and sends email on success", async () => {
        userRepository.findByEmail.mockResolvedValue(activeUser)
        tokenRepository.create.mockResolvedValue(validToken)
        emailService.sendPasswordResetEmail.mockResolvedValue()

        await authService.forgotPassword(activeUser.email)

        expect(tokenRepository.create).toHaveBeenCalledWith(
            activeUser.userId,
            expect.any(Date),
            expect.any(String),
            'PASSWORD',
            null,
            null
        )
        expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
            activeUser.email,
            activeUser.name,
            expect.any(String)
        )
    })
})
const refreshToken = {
    tokenId: 11,
    userId: 1,
    type: "REFRESH",
    state: "ACTIVE",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    user: { userId: 1, email: "rider@test.com", role: "RIDER" },
}

const passwordToken = {
    ...validToken,
    type: "PASSWORD",
}

describe("AuthService.resetPassword()", () => {
    let authService, emailService, tokenRepository, userRepository

    beforeEach(() => {
        emailService = makeEmailService()
        tokenRepository = makeTokenRepository()
        userRepository = makeUserRepository()
        authService = new AuthService(userRepository, emailService, tokenRepository)
    })

    it("throws AuthorizationError when link invalid or expired", async () => {
        tokenRepository.findByToken.mockResolvedValue(null)
        await expect(authService.resetPassword("token", "hashed")).rejects.toThrow(AuthorizationError)
    })

    it("throws AuthorizationError when token type is invalid", async () => {
        tokenRepository.findByToken.mockResolvedValue(validToken)
        await expect(authService.resetPassword("token", "hashed")).rejects.toThrow(AuthorizationError)
    })

    it("throws AuthorizationError when token state is not active", async () => {
        tokenRepository.findByToken.mockResolvedValue({ ...passwordToken, state: "USED" })
        await expect(authService.resetPassword("rawToken", "newPassword")).rejects.toThrow(AuthorizationError)
    })

    it("updates profile, marks token used, and logs out all devices on success", async () => {
        tokenRepository.findByToken.mockResolvedValue(passwordToken)
        bcrypt.hash.mockResolvedValue("hashed_new_password")
        userRepository.updateProfile.mockResolvedValue()
        tokenRepository.markUsed.mockResolvedValue()
        tokenRepository.findByUserId.mockResolvedValue([])

        await authService.resetPassword("raw-token", "new-password")

        expect(userRepository.updateProfile).toHaveBeenCalledWith(
            passwordToken.user.userId,
            { password: "hashed_new_password" }
        )
        expect(tokenRepository.markUsed).toHaveBeenCalledTimes(1)
    })
})

describe("AuthService.logoutAllDevices()", () => {
    let authService, tokenRepository

    beforeEach(() => {
        tokenRepository = makeTokenRepository()
        authService = new AuthService(makeUserRepository(), makeEmailService(), tokenRepository)
    })

    it("does nothing when user has no tokens", async () => {
        tokenRepository.findByUserId.mockResolvedValue([])
        await authService.logoutAllDevices(1)
        expect(tokenRepository.revokeToken).not.toHaveBeenCalled()
    })

    it("revokes all tokens for the user", async () => {
        const tokens = [
            { token: "hash_abc123" },
            { token: "hash_def456" },
        ]
        tokenRepository.findByUserId.mockResolvedValue(tokens)
        tokenRepository.revokeToken.mockResolvedValue()

        await authService.logoutAllDevices(1)

        expect(tokenRepository.revokeToken).toHaveBeenCalledTimes(2)
        expect(tokenRepository.revokeToken).toHaveBeenCalledWith("hash_abc123")
        expect(tokenRepository.revokeToken).toHaveBeenCalledWith("hash_def456")
    })
})

describe("AuthService.sendVerificationEmail()", () => {
    let authService, userRepository, tokenRepository, emailService

    beforeEach(() => {
        userRepository = makeUserRepository()
        tokenRepository = makeTokenRepository()
        emailService = makeEmailService()
        authService = new AuthService(userRepository, emailService, tokenRepository)
    })

    it("throws NotFoundError when user does not exist", async () => {
        userRepository.findById.mockResolvedValue(null)
        await expect(authService.sendVerificationEmail(99)).rejects.toThrow(NotFoundError)
    })

    it("throws ConflictError when email is already verified", async () => {
        userRepository.findById.mockResolvedValue(activeUser)
        await expect(authService.sendVerificationEmail(1)).rejects.toThrow(ConflictError)
    })

    it("creates email token and sends verification email on success", async () => {
        userRepository.findById.mockResolvedValue({ ...activeUser, emailVerifiedAt: null })
        tokenRepository.create.mockResolvedValue()
        emailService.sendVerificationEmail.mockResolvedValue()

        await authService.sendVerificationEmail(1)

        expect(tokenRepository.create).toHaveBeenCalledWith(
            1,
            expect.any(Date),
            expect.any(String),
            "EMAIL",
            null,
            null
        )
        expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
            activeUser.email,
            activeUser.name,
            expect.any(String)
        )
    })
})

describe("AuthService.cleanupStaleTokens()", () => {
    let authService, tokenRepository

    beforeEach(() => {
        tokenRepository = makeTokenRepository()
        authService = new AuthService(makeUserRepository(), makeEmailService(), tokenRepository)
    })

    it("delegates to tokenRepository.deleteStale", async () => {
        tokenRepository.deleteStale = jest.fn().mockResolvedValue(5)
        const result = await authService.cleanupStaleTokens()
        expect(tokenRepository.deleteStale).toHaveBeenCalledTimes(1)
    })
})
