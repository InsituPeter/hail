const prisma = require("../config/prisma")

class RiderRepository{
    async create(userId, paystackAuthorizationCode=null, paystackEmail=null ){
       return await prisma.riderProfile.create({
            data:{
                 userId,
                 paystackAuthorizationCode,
                 paystackEmail
            }
        })
    }
    async findByRiderId(riderId){
        return await prisma.riderProfile.findUnique({
            where:{riderProfileId:riderId}
        })
    }

    async UpdateRiderProfile(riderId, data){
        return await prisma.riderProfile.update({
            where:{riderProfileId:riderId},
            data
        })
    }
    async findByUserId(userId){
        return await prisma.riderProfile.findUnique({
            where:{userId}
        })
    }
}

module.exports=RiderRepository