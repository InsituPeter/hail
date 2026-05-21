const { NotFoundError, ConflictError } = require("../error")

class DriverService{
    constructor(driverRepository, paystackGateway){
        this.driverRepository=driverRepository
        this.paystackGateway=paystackGateway
    }

    async createDriver(userId, data){

            const existing =await this.driverRepository.findByUserId(userId)
             if(existing) throw new ConflictError("Driver already exists")
            const driver = await this.driverRepository.create(userId, data)
            const {subAccountCode}= await this.paystackGateway.createSubaccount(
                data.vehicleMake + " " + data.vehicleModel, 
                data.settlementBank,
                data.accountNumber,
                10
            )
        await this.driverRepository.updateProfile(driver.driverProfileId, {
            paystackSubaccountCode: subAccountCode
        })
        return driver
    }
    async findDriver(driverId){
        const driver= await this.driverRepository.findById(driverId)
        if(!driver) throw new  NotFoundError("Driver")
        return driver
    }
       async getProfile(userId){
        const user= await this.driverRepository.findByUserId(userId)
        if(!user) throw new NotFoundError("User")
        return user
    }
  
    async updateDriverProfile(userId, data){
        const driver= await this.driverRepository.findByUserId(userId)
        if(!driver) throw new NotFoundError("Driver")
        return await this.driverRepository.updateProfile(driver.driverProfileId, data)
    }
    async setAvailability(userId, isAvailable){
        const driver= await this.driverRepository.findByUserId(userId)
        if(!driver) throw new NotFoundError("Driver")
        return await this.driverRepository.updateAvailability(userId, isAvailable)
    }

    async updateLocation(driverId,lat, lng, heading ){
         const driver= await this.driverRepository.findById(driverId)
        if(!driver) throw new NotFoundError("Driver")
        await this.driverRepository.upsertLocation(driverId, lat, lng, heading)
    }

   

   
    
}


module.exports = DriverService