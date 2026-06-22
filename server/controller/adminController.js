class AdminController{
    constructor(adminService){
        this.adminService=adminService
    }

    getAllRides=async(req,res)=>{
        const{state, riderId, driverProfileId, from, to, query, page, limit}=req.query
        const rides = await this.adminService.getAllRides({state, riderId, driverProfileId, from, to, query, page, limit})
        res.status(200).json(rides)
    }

    getRide=async(req, res)=>{
        const{rideId}=req.params
        const ride=await this.adminService.getRide(Number(rideId))
        res.status(200).json(ride)
    }

    approveDriver=async(req,res)=>{
        const {id:driverProfileId}=req.params
        const driver= await this.adminService.approveDriver(Number(driverProfileId))
        res.status(200).json(driver)
    }

    rejectDriver=async(req, res)=>{
        const{id:driverProfileId}=req.params
        const driver=await this.adminService.rejectDriver(Number(driverProfileId))
        res.status(200).json(driver)
    }

    suspendDriver=async(req, res)=>{
        const {id:driverProfileId}=req.params
        const driver=await this.adminService.suspendDriver(Number(driverProfileId))
        res.status(200).json(driver)
    }

    getAllDrivers=async(req,res)=>{
        const{approvalState, vehicleType, vehicleMake, vehicleModel, vehiclePlate, isAvailable, rating, from, to, query, page, limit}=req.query
        const drivers=await this.adminService.getAllDrivers({approvalState, vehicleType, vehicleMake, vehicleModel, vehiclePlate, isAvailable, rating, from, to, query, page, limit})
        res.status(200).json(drivers)
    }

    getAllUsers=async(req,res)=>{
        const{role, from, to, query, suspended, deleted, page, limit}=req.query
        const users=await this.adminService.getAllUsers({role, from, to, query, suspended, deleted, page, limit})
        res.status(200).json(users)
    }

    suspendUser=async(req,res)=>{
        const{id:userId}=req.params
        const user=await this.adminService.suspendUser(Number(userId))
        res.status(200).json(user)
    }

    deleteUser=async(req,res)=>{
        const{id:userId}=req.params
        const user=await this.adminService.deleteUser(Number(userId))
        res.status(200).json(user)
    }

    getAllPayments=async(req,res)=>{
        const{amount, method, state, from, to, query, page, limit}=req.query
        const payments=await this.adminService.getAllPayment({amount, method, state, from, to, query, page, limit})
        res.status(200).json(payments)
    }
}

module.exports = AdminController