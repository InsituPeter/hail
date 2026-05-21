class RiderController{
    constructor(riderService){
        this.riderService=riderService
    }

    createRiderProfile=async(req, res)=>{
        const {userId}= req.user
        const rider = await this.riderService.createRiderProfile(userId)
        res.status(201).json(rider)
    }

    getRider=async(req, res)=>{
        const {id:riderProfileId}= req.params
        const {userId} = req.user
        const rider= await this.riderService.getRider(Number(riderProfileId), userId)
        res.status(200).json(rider)
    }


    updateRiderProfile=async(req, res)=>{
        const {userId}= req.user
        const data = req.body
        const rider = await this.riderService.updateRiderProfile(userId, data)
        res.status(200).json(rider)
    }
    
    getProfile=async(req, res)=>{
        const {userId}= req.user
        const rider = await this.riderService.getProfile(userId)
        res.status(200).json(rider)
    }
}

module.exports=RiderController