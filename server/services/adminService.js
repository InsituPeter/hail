const { NotFoundError, ConflictError } = require("../error")

class AdminService {
    constructor(rideRepository, driverRepository, userRepository, paymentRepository){
        this.rideRepository = rideRepository
        this.driverRepository = driverRepository
        this.userRepository = userRepository
        this.paymentRepository = paymentRepository
    }

    async getAllRides(filters){
        return await this.rideRepository.findAll(filters)
    }

    async getRide(rideId){
        const ride = await this.rideRepository.findById(rideId)
        if(!ride) throw new NotFoundError("Ride")
        return ride
    }

    async approveDriver(driverProfileId){
        const driver =await this.driverRepository.findById(driverProfileId)
        if(!driver) throw new NotFoundError ("Driver")
        if(driver.approvalState==="APPROVED") throw new ConflictError("Driver already approved")
        return await this.driverRepository.updateApproval(driverProfileId, "APPROVED")
      
    }

  async rejectDriver(driverProfileId){
       const driver= await this.driverRepository.findById(driverProfileId)
       if(!driver) throw new NotFoundError("Driver")
       if(driver.approvalState==="REJECTED") throw new ConflictError("Driver already rejected")
       return await this.driverRepository.updateApproval(driverProfileId, "REJECTED")
    
  }

  async suspendDriver(driverProfileId){
    const driver =await this.driverRepository.findById(driverProfileId)
    if(!driver) throw new NotFoundError("Driver")
    if(driver.approvalState==="SUSPENDED") throw new ConflictError("Driver already suspended")
    return await this.driverRepository.updateApproval(driverProfileId, "SUSPENDED")
  }
async getAllDrivers(filters){
    return await this.driverRepository.findAll(filters)
}
async getAllUsers(filters){
    return await this.userRepository.getAll(filters)
}
async suspendUser(userId){
    const user=await this.userRepository.findById(userId)
    if(!user) throw new NotFoundError("User")
    if(user.suspendedAt) throw new ConflictError("User already suspended")
    return await this.userRepository.suspendUser(user.userId)
}
async deleteUser(userId){
      const user=await this.userRepository.findById(userId)
      if(!user) throw new NotFoundError("User")
      if(user.deletedAt)throw new ConflictError("User already deleted")
    return await this.userRepository.softDelete(userId)
}
async getAllPayment(filters){
      return await this.paymentRepository.findAll(filters)
}
}


module.exports = AdminService
