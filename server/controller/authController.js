const { AuthorizationError } = require('../error')

class AuthController{
    constructor(userService, authService){
        this.authService=authService
        this.userService= userService
    }

    register= async(req, res, next)=>{
      const {email, password, phone, role, name}= req.body
      const user =await this.userService.createUser({email, password, phone, name, role})
      await this.authService.sendVerificationEmail(user.userId)
      res.status(201).json({message:'Registration successful. Please verify email address'})
      
    }

    login= async(req, res)=>{
      const {email, password} = req.body
      const ipAddress = req.ip
      const  userAgent= req.headers['user-agent']
      const {user, accessToken, refreshToken}= await this.authService.login(email, password, ipAddress, userAgent)
    
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure:process.env.NODE_ENV==="production",
        sameSite:"strict",
        maxAge:7 * 24 * 60 * 60 * 1000
      })
      res.status(200).json({data:{accessToken}})
    
    }
 refresh = async (req, res, next) => {
        const rawToken = req.cookies?.refreshToken
        if (!rawToken) return next(new AuthorizationError('Refresh token missing'))

        const ipAddress = req.ip
        const userAgent = req.headers['user-agent']
        const { accessToken, refreshToken } = await this.authService.refreshAccessToken(rawToken, ipAddress, userAgent)

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.status(200).json({ data: { accessToken } })
    }
    verifyEmail=async(req, res, next)=>{
        const {token}= req.query
        await this.authService.verifyEmailToken(token)
        res.status(200).json({message:'Email verified successfully'})
    
    }
    logout = async(req, res, next)=>{
        const rawToken= req.cookies?.refreshToken
        if(rawToken) await this.authService.logout(rawToken)
        res.clearCookie('refreshToken')
        res.status(200).json({message:'Logged out successfully'})
    }
    forgotPassword=async(req, res)=>{
        const {email}= req.body
        await this.authService.forgotPassword(email)
        res.status(200).json({message:"A reset link has been sent"})
    }
    resetPassword=async(req, res)=>{
        const {token, password}= req.body
        await this.authService.resetPassword(token, password)
        res.status(200).json({ message: 'Password reset successfully' })
    }

}

module.exports = AuthController