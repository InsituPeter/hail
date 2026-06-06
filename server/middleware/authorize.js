const {ForbiddenError}= require("../error")

const authorize=(...roles)=>(req, res, next)=>{
  if(!roles.includes(req.user.role)){
    throw new ForbiddenError("Access denied")
  }
  next()
}
module.exports= authorize