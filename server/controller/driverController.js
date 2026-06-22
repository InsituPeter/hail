class DriverController{
    constructor(driverService){
        this.driverService=driverService
    }
    registerDriver=async(req, res)=>{
        const{userId}= req.user
        const data=req.body
       const driver=  await this.driverService.createDriver(
             userId,
             data
        )
        res.status(201).json(driver)
    }
    getDriver=async(req, res)=>{
        const {id:driverId}=req.params
       const driver= await this.driverService.findDriver(Number(driverId))
        res.status(200).json(driver)
    }

    getMyProfile=async(req,res)=>{
        const {userId}=req.user
        const user = await this.driverService.getProfile(userId)
        res.status(200).json(user)
    }

    updatedriverProfile=async(req, res)=>{
        const{userId}=req.user
        const data= req.body
        const driver=await this.driverService.updateDriverProfile(userId, data)
        res.status(200).json(driver)
    }  
    
   setAvailability=async(req,res)=>{
    const{userId}=req.user
    const {isAvailable}=req.body

    const driver= await this.driverService.setAvailability(userId, isAvailable)
    res.status(200).json(driver)
   }

}


module.exports = DriverController