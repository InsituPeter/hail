//const AuthService = require("../services/AuthService");
const {AuthorizationError}= require("../error")

const authenticate =(authService)=>(req, res, next)=>{
      const header= req.headers.authorization
      if(!header?.startsWith("Bearer ")){
        throw new AuthorizationError("Authorization header missing")
      }

      const token= header.split(' ')[1]
      try{
        req.user=authService.verifyAccessToken(token)
        next()
      }
      catch(err){
         next(err)
      }
}

module.exports= authenticate