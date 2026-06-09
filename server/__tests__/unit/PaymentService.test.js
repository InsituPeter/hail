const crypto = require("crypto")
const {
    AuthorizationError,
    NotFoundError,
    ConflictError,
    ForbiddenError,
} = require("../../error")
const PaymentService = require("../../services/PaymentService")

function makePaystackGateway(overrides = {}) {
    return {
        initializeTransaction: jest.fn(),
        chargeAuthorization: jest.fn(),
        createSubaccount: jest.fn(),
        verifyTransaction: jest.fn(),
        ...overrides,
    }
}

function makePaymentRepository(overrides = {}) {
    return {
        create: jest.fn(),
        findByReference: jest.fn(),
        findByRideId: jest.fn(),
        capture: jest.fn(),
        fail: jest.fn(),
        ...overrides,
    }
}

function makeRideRepository(overrides = {}) {
    return {
        findById: jest.fn(),
        ...overrides,
    }
}

function makeRiderRepository(overrides = {}) {
    return {
        findByRiderId: jest.fn(),
        UpdateRiderProfile: jest.fn(),
        ...overrides,
    }
}

function makeDriverRepository(overrides = {}) {
    return {
        findByUserId: jest.fn(),
        ...overrides,
    }
}

function makeEventPublisher(overrides = {}) {
    return {
        publishPaymentEvent: jest.fn(),
        ...overrides,
    }
}

const config = {
    paystack: { secretKey: "test_secret" },
    frontend: { url: "http://localhost:5173" },
}

const ride = {
    rideId: 1,
    finalFare: 2500,
    paymentMethod: "CASH",
    driverProfileId: 5,
    riderId: 10,
    state: "COMPLETED",
}

const riderWithAuth = {
    riderProfileId: 20,
    paystackAuthorizationCode: "auth_abc123",
    paystackEmail: "rider@test.com",
    user: { email: "rider@test.com" },
}

const riderWithoutAuth = {
    riderProfileId: 20,
    paystackAuthorizationCode: null,
    user: { email: "rider@test.com" },
}

const driverProfile = {
    driverProfileId: 5,
    userId: 50,
}

const paymentRecord = {
    rideId: 1,
    amount: 2500,
    state: "PENDING",
}

describe("PaymentService.initiatePayment()", () => {
    let paymentRepository, paystackGateway, paymentService

    beforeEach(() => {
        paystackGateway = makePaystackGateway()
        paymentRepository = makePaymentRepository()
        paymentService = new PaymentService(
            paystackGateway, paymentRepository, makeRideRepository(),
            makeRiderRepository(), makeDriverRepository(), config, makeEventPublisher()
        )
    })

    it("creates a cash payment record when payment method is CASH", async () => {
        paymentRepository.create.mockResolvedValue()

        const result = await paymentService.initiatePayment(ride, riderWithoutAuth)

        expect(paymentRepository.create).toHaveBeenCalledWith(1, 2500, "CASH")
        expect(result).toBeUndefined()
    })

    it("charges existing authorization code when rider has one", async () => {
        const rideCard = { ...ride, paymentMethod: "CARD" }
        paymentRepository.create.mockResolvedValue()
        paystackGateway.chargeAuthorization.mockResolvedValue()

        const result = await paymentService.initiatePayment(rideCard, riderWithAuth)

        expect(paystackGateway.chargeAuthorization).toHaveBeenCalledWith(
            "rider@test.com", 2500, "auth_abc123", expect.any(String)
        )
        expect(result).toEqual({ method: "silent" })
    })

    it("initializes a checkout when rider has no saved authorization code", async () => {
        const rideCard = { ...ride, paymentMethod: "CARD" }
        paymentRepository.create.mockResolvedValue()
        paystackGateway.initializeTransaction.mockResolvedValue({
            authorization_url: "https://paystack.com/checkout/abc",
        })

        const result = await paymentService.initiatePayment(rideCard, riderWithoutAuth)

        expect(paystackGateway.initializeTransaction).toHaveBeenCalledWith(
            "rider@test.com", 2500, expect.any(String), "http://localhost:5173/payment/callback"
        )
        expect(result).toEqual({
            method: "checkout",
            authorizationUrl: "https://paystack.com/checkout/abc",
        })
    })
})

describe("PaymentService.constructWebhookEvent()", () => {
    let paymentService

    beforeEach(() => {
        paymentService = new PaymentService(
            makePaystackGateway(), makePaymentRepository(), makeRideRepository(),
            makeRiderRepository(), makeDriverRepository(), config, makeEventPublisher()
        )
    })

    it("returns parsed body when signature matches", () => {
        const rawBody = JSON.stringify({ event: "charge.success" })
        const signature = crypto
            .createHmac("sha512", "test_secret")
            .update(rawBody)
            .digest("hex")

        const result = paymentService.constructWebhookEvent(rawBody, signature)

        expect(result).toEqual({ event: "charge.success" })
    })

    it("throws AuthorizationError when signature does not match", () => {
        const rawBody = JSON.stringify({ event: "charge.success" })

        expect(() => {
            paymentService.constructWebhookEvent(rawBody, "bad_signature")
        }).toThrow(AuthorizationError)
    })
})

describe("PaymentService.handlePaymentSuccess()", () => {
    let paymentRepository, rideRepository, riderRepository, eventPublisher, paymentService

    beforeEach(() => {
        paymentRepository = makePaymentRepository()
        rideRepository = makeRideRepository()
        riderRepository = makeRiderRepository()
        eventPublisher = makeEventPublisher()
        paymentService = new PaymentService(
            makePaystackGateway(), paymentRepository, rideRepository,
            riderRepository, makeDriverRepository(), config, eventPublisher
        )
    })

    it("does nothing when payment is not found", async () => {
        paymentRepository.findByReference.mockResolvedValue(null)

        await paymentService.handlePaymentSuccess("ref_1", null, null)

        expect(paymentRepository.capture).not.toHaveBeenCalled()
    })

    it("does nothing when payment is already captured", async () => {
        paymentRepository.findByReference.mockResolvedValue({
            ...paymentRecord,
            state: "CAPTURED",
        })

        await paymentService.handlePaymentSuccess("ref_1", null, null)

        expect(paymentRepository.capture).not.toHaveBeenCalled()
    })

    it("captures payment and publishes event when payment is pending", async () => {
        paymentRepository.findByReference.mockResolvedValue(paymentRecord)
        paymentRepository.capture.mockResolvedValue()

        await paymentService.handlePaymentSuccess("ref_1", null, null)

        expect(paymentRepository.capture).toHaveBeenCalledWith(1, 2500, "ref_1")
        expect(eventPublisher.publishPaymentEvent).toHaveBeenCalledWith(
            1, "payment:captured", { rideId: 1 }
        )
    })

    it("saves authorization code when rider does not have one", async () => {
        const found = { ...paymentRecord }
        paymentRepository.findByReference.mockResolvedValue(found)
        paymentRepository.capture.mockResolvedValue()
        rideRepository.findById.mockResolvedValue(ride)
        riderRepository.findByRiderId.mockResolvedValue({
            ...riderWithoutAuth,
            riderProfileId: 20,
        })
        riderRepository.UpdateRiderProfile.mockResolvedValue()

        await paymentService.handlePaymentSuccess("ref_1", "auth_new", "new@test.com")

        expect(riderRepository.UpdateRiderProfile).toHaveBeenCalledWith(20, {
            paystackAuthorizationCode: "auth_new",
            paystackEmail: "new@test.com",
        })
    })
})

describe("PaymentService.handlePaymentFailure()", () => {
    let paymentRepository, paymentService

    beforeEach(() => {
        paymentRepository = makePaymentRepository()
        paymentService = new PaymentService(
            makePaystackGateway(), paymentRepository, makeRideRepository(),
            makeRiderRepository(), makeDriverRepository(), config, makeEventPublisher()
        )
    })

    it("does nothing when payment is not found", async () => {
        paymentRepository.findByReference.mockResolvedValue(null)
        await paymentService.handlePaymentFailure("ref_1")
        expect(paymentRepository.fail).not.toHaveBeenCalled()
    })

    it("marks payment as failed when found", async () => {
        paymentRepository.findByReference.mockResolvedValue(paymentRecord)
        paymentRepository.fail.mockResolvedValue()

        await paymentService.handlePaymentFailure("ref_1")

        expect(paymentRepository.fail).toHaveBeenCalledWith(1)
    })
})

describe("PaymentService.confirmCashPayment()", () => {
    let paymentRepository, rideRepository, driverRepository, eventPublisher, paymentService

    beforeEach(() => {
        paymentRepository = makePaymentRepository()
        rideRepository = makeRideRepository()
        driverRepository = makeDriverRepository()
        eventPublisher = makeEventPublisher()
        paymentService = new PaymentService(
            makePaystackGateway(), paymentRepository, rideRepository,
            makeRiderRepository(), driverRepository, config, eventPublisher
        )
    })

    it("throws NotFoundError when ride does not exist", async () => {
        rideRepository.findById.mockResolvedValue(null)
        await expect(paymentService.confirmCashPayment(1, 50)).rejects.toThrow(NotFoundError)
    })

    it("throws ConflictError when ride is not completed", async () => {
        rideRepository.findById.mockResolvedValue({ ...ride, state: "IN_PROGRESS" })
        await expect(paymentService.confirmCashPayment(1, 50)).rejects.toThrow(ConflictError)
    })

    it("throws NotFoundError when driver profile does not exist", async () => {
        rideRepository.findById.mockResolvedValue(ride)
        driverRepository.findByUserId.mockResolvedValue(null)
        await expect(paymentService.confirmCashPayment(1, 50)).rejects.toThrow(NotFoundError)
    })

    it("throws ForbiddenError when wrong driver tries to confirm", async () => {
        rideRepository.findById.mockResolvedValue(ride)
        driverRepository.findByUserId.mockResolvedValue({ ...driverProfile, driverProfileId: 99 })
        await expect(paymentService.confirmCashPayment(1, 50)).rejects.toThrow(ForbiddenError)
    })

    it("captures payment and publishes event on success", async () => {
        rideRepository.findById.mockResolvedValue(ride)
        driverRepository.findByUserId.mockResolvedValue(driverProfile)
        paymentRepository.findByRideId.mockResolvedValue(paymentRecord)
        paymentRepository.capture.mockResolvedValue()

        await paymentService.confirmCashPayment(1, 50)

        expect(paymentRepository.capture).toHaveBeenCalledWith(1, 2500)
        expect(eventPublisher.publishPaymentEvent).toHaveBeenCalledWith(
            1, "payment:captured", { rideId: 1 }
        )
    })
})
