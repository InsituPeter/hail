const EmailService = require("../../services/emailService")

function makeTransporter(overrides = {}) {
    return {
        sendMail: jest.fn(),
        verify: jest.fn(),
        ...overrides,
    }
}

function makeTemplateDomain(overrides = {}) {
    return {
        renderWelcomeEmail: jest.fn(),
        renderPasswordReset: jest.fn(),
        renderEmailVerification: jest.fn(),
        companyName: "Hail",
        ...overrides,
    }
}

describe("EmailService.verifyConnection()", () => {
    it("returns true when transporter verifies successfully", async () => {
        const transporter = makeTransporter()
        transporter.verify.mockResolvedValue(true)
        const emailService = new EmailService(transporter, makeTemplateDomain(), "http://localhost:5173")
        const result = await emailService.verifyConnection()
        expect(result).toBe(true)
    })

    it("returns false when transporter verify fails", async () => {
        const transporter = makeTransporter()
        transporter.verify.mockRejectedValue(new Error("Connection refused"))
        const emailService = new EmailService(transporter, makeTemplateDomain(), "http://localhost:5173")
        const result = await emailService.verifyConnection()
        expect(result).toBe(false)
    })
})

describe("EmailService.sendEmail()", () => {
    it("calls transporter.sendMail with correct options", async () => {
        const transporter = makeTransporter()
        transporter.sendMail.mockResolvedValue({ messageId: "abc123" })
        const emailService = new EmailService(transporter, makeTemplateDomain(), "http://localhost:5173")
        const options = { to: "test@test.com", subject: "Test", html: "<p>Hi</p>" }
        await emailService.sendEmail(options)
        expect(transporter.sendMail).toHaveBeenCalled()
    })
})

describe("EmailService.sendWelcomeEmail()", () => {
    it("sends welcome email with dashboard URL", async () => {
        const transporter = makeTransporter()
        const templateDomain = makeTemplateDomain()
        templateDomain.renderWelcomeEmail.mockReturnValue("<html>Welcome</html>")
        transporter.sendMail.mockResolvedValue({ messageId: "abc" })
        const emailService = new EmailService(transporter, templateDomain, "http://localhost:5173")

        await emailService.sendWelcomeEmail("user@test.com", "User")

        expect(templateDomain.renderWelcomeEmail).toHaveBeenCalledWith({
            userName: "User",
            dashboardUrl: "http://localhost:5173/dashboard",
        })
        expect(transporter.sendMail).toHaveBeenCalled()
    })

    it("catches error and logs without throwing", async () => {
        const transporter = makeTransporter()
        const templateDomain = makeTemplateDomain()
        templateDomain.renderWelcomeEmail.mockImplementation(() => { throw new Error("Render failed") })
        const emailService = new EmailService(transporter, templateDomain, "http://localhost:5173")

        await expect(emailService.sendWelcomeEmail("user@test.com", "User")).resolves.toBeUndefined()
    })
})

describe("EmailService.sendPasswordResetEmail()", () => {
    it("sends password reset email with reset URL", async () => {
        const transporter = makeTransporter()
        const templateDomain = makeTemplateDomain()
        templateDomain.renderPasswordReset.mockReturnValue("<html>Reset</html>")
        transporter.sendMail.mockResolvedValue({ messageId: "abc" })
        const emailService = new EmailService(transporter, templateDomain, "http://localhost:5173")

        await emailService.sendPasswordResetEmail("user@test.com", "User", "token123")

        expect(templateDomain.renderPasswordReset).toHaveBeenCalledWith({
            userName: "User",
            resetUrl: "http://localhost:5173/reset-password?token=token123",
            expirationTime: "1 hour",
        })
        expect(transporter.sendMail).toHaveBeenCalled()
    })
})

describe("EmailService.sendVerificationEmail()", () => {
    it("sends verification email with verification URL", async () => {
        const transporter = makeTransporter()
        const templateDomain = makeTemplateDomain()
        templateDomain.renderEmailVerification.mockReturnValue("<html>Verify</html>")
        transporter.sendMail.mockResolvedValue({ messageId: "abc" })
        const emailService = new EmailService(transporter, templateDomain, "http://localhost:5173")

        await emailService.sendVerificationEmail("user@test.com", "User", "verify123")

        expect(templateDomain.renderEmailVerification).toHaveBeenCalledWith({
            userName: "User",
            verificationUrl: "http://localhost:5173/verify-email?token=verify123",
        })
        expect(transporter.sendMail).toHaveBeenCalled()
    })
})
