const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const config = require("../config")
const {
    ValidationError,
    NotFoundError,
    ForbiddenError,
    AuthorizationError,
    ConflictError,
} = require("../error")


class AuthService{
    constructor(userRepository, emailService, tokenRepository){
        this.userRepository = userRepository
        this.emailService = emailService
        this.tokenRepository = tokenRepository
    }

    generateAccessToken(payload){
        return jwt.sign(payload, config.jwt.secret, {expiresIn: "1h"})
    }

    verifyAccessToken(token){
        try{
            return jwt.verify(token, config.jwt.secret)
        }
        catch(error){
            throw new AuthorizationError("Invalid or expired access token")
        }
    }

    _hashToken(rawToken){
        return crypto.createHash('sha256').update(rawToken).digest('hex')
    }

    _generateRawToken(){
        return crypto.randomBytes(64).toString('hex')
    }

    async _generateRefreshToken(userId, ipAddress, userAgent){
        const rawToken = this._generateRawToken()
        const hashedToken = this._hashToken(rawToken)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        await this.tokenRepository.create(userId, expiresAt, hashedToken, 'REFRESH', ipAddress, userAgent)
        return rawToken
    }

    async login(email, password, ipAddress, userAgent){
        const user = await this.userRepository.findByEmail(email)
        if(!user || user.deletedAt) throw new NotFoundError("Invalid credentials")
        if(user.suspendedAt) throw new ForbiddenError("Your account has been suspended")
        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch) throw new ForbiddenError("Invalid credentials")
        if(!user.emailVerifiedAt) throw new ForbiddenError("Please verify your email before logging in")

        const accessToken = this.generateAccessToken({
            userId: user.userId,
            email: user.email,
            role: user.role
        })

        const refreshToken = await this._generateRefreshToken(user.userId, ipAddress, userAgent)
        const {password: _, ...safeUser} = user
        return {user: safeUser, accessToken, refreshToken}
    }

    async refreshAccessToken(rawToken, ipAddress, userAgent){
        const hashedToken = this._hashToken(rawToken)
        const stored = await this.tokenRepository.findByToken(hashedToken)

        if(!stored) throw new AuthorizationError("Invalid token")
        if(stored.type !== 'REFRESH') throw new AuthorizationError('Invalid token type')
        if(stored.state !== 'ACTIVE') throw new AuthorizationError('Refresh token no longer valid')
        if(new Date() > stored.expiresAt) throw new AuthorizationError('Refresh token has expired')

        await this.tokenRepository.revokeToken(hashedToken)

        const newRefreshToken = await this._generateRefreshToken(stored.user.userId, ipAddress, userAgent)
        const accessToken = this.generateAccessToken({
            userId: stored.user.userId,
            email: stored.user.email,
            role: stored.user.role
        })

        return { accessToken, refreshToken: newRefreshToken }
    }

    async logout(rawToken){
        const hashedToken = this._hashToken(rawToken)
        const stored = await this.tokenRepository.findByToken(hashedToken)
        if(!stored) throw new AuthorizationError("Invalid token")
        await this.tokenRepository.revokeToken(hashedToken)
    }

    async logoutAllDevices(userId){
        const tokens = await this.tokenRepository.findByUserId(userId)
        await Promise.all(
            tokens.map(t => this.tokenRepository.revokeToken(t.token))
        )
    }

    async sendVerificationEmail(userId){
        const user = await this.userRepository.findById(userId)
        if(!user) throw new NotFoundError("User")
        if(user.emailVerifiedAt) throw new ConflictError("Email already verified")

        const rawToken = this._generateRawToken()
        const hashedToken = this._hashToken(rawToken)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await this.tokenRepository.create(user.userId, expiresAt, hashedToken, 'EMAIL', null, null)
        await this.emailService.sendVerificationEmail(user.email, user.name, rawToken)
    }

    async verifyEmailToken(rawToken){
        const hashedToken = this._hashToken(rawToken)
        const stored = await this.tokenRepository.findByToken(hashedToken)

        if(!stored) throw new AuthorizationError("Invalid verification link")
        if(stored.type !== 'EMAIL') throw new AuthorizationError('Invalid token type')
        if(stored.state !== 'ACTIVE') throw new AuthorizationError('Verification link already used')
        if(new Date() > stored.expiresAt) throw new AuthorizationError('Verification link has expired')

        await this.tokenRepository.markUsed(hashedToken)
        await this.userRepository.activateUser(stored.user.userId)
    }

    async forgotPassword(email){
        const user = await this.userRepository.findByEmail(email)
        if(!user) throw new NotFoundError("No account associated with this email")

        const rawToken = this._generateRawToken()
        const hashedToken = this._hashToken(rawToken)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

        await this.tokenRepository.create(user.userId, expiresAt, hashedToken, 'PASSWORD', null, null)
        await this.emailService.sendPasswordResetEmail(user.email, user.name, rawToken)
    }

    async resetPassword(rawToken, newPassword){
        const hashedToken = this._hashToken(rawToken)
        const stored = await this.tokenRepository.findByToken(hashedToken)

        if(!stored) throw new AuthorizationError('Invalid or expired reset link')
        if(stored.type !== 'PASSWORD') throw new AuthorizationError('Invalid token type')
        if(stored.state !== 'ACTIVE') throw new AuthorizationError('Reset link already used')
        if(new Date() > stored.expiresAt) throw new AuthorizationError('Reset link has expired')

        const hashed = await bcrypt.hash(newPassword, 10)
        await this.userRepository.updateProfile(stored.user.userId, {password: hashed})
        await this.tokenRepository.markUsed(hashedToken)
        await this.logoutAllDevices(stored.user.userId)
    }

    async cleanupStaleTokens(){
        await this.tokenRepository.deleteStale()
    }
}


module.exports = AuthService
