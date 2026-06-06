const prisma= require("../config/prisma")

class Rating{
    async create(data){
      return await prisma.rating.create({
        data
      })
    }
    async findByRateeId(userId){
        return await prisma.rating.findFirst({
        where:{rateeId:userId}    
        })
    }
    async findByRideAndRater(rideId, raterId){
        return await prisma.rating.findUnique({
            where:{ride}
        })
    }
}