const bcrypt = require('bcryptjs')
const {
    ValidationError,
    NotFoundError,
    ForbiddenError,
    AuthorizationError,
    ConflictError,
} = require("../error")

class UserService{
    constructor(userRepository, riderRepository){
        this.userRepository= userRepository
        this.riderRepository= riderRepository
    }
  
    async createUser(data){
      const {email, password, name, role, phone} = data
      if(!email || !password || !name || !role){
        throw new ValidationError('All fields are required')
      }
      const exists= await this.userRepository.existByEmail(email)
      if(exists) throw new ConflictError('User')
      const hashed= await bcrypt.hash(password,10)
      const user=await this.userRepository.create(email, hashed, name, role, phone)
     if(role ==="RIDER"){
        await this.riderRepository.create(user.userId)
     }
     const {password: _, ...safeUser} = user
     return safeUser
    }

    async getUserById(userId){
        const user= await this.userRepository.findById(userId)
        if(!user) throw new NotFoundError('User')
        const{password:_, ...safeUser}= user
        return safeUser
    }
    async  deleteUser(userId){
        const user = await this.userRepository.findById(userId)
        if(!user) throw new NotFoundError('User')
        await this.userRepository.softDelete(userId)
    }
}

module.exports = UserService