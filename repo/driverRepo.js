const prisma = require("../config/prisma")

class DriverRepository{
    
    async create(userId, data){
        await prisma.driverProfile.create({
            data:{
                userId, ...data
            }
        })
    }

    async findById(driverProfileId){
        return await prisma.driverProfile.findUnique({
            where:{driverProfileId}
        })
    }

    async findByUserId(userId){
        return prisma.driverProfile.findUnique({
            where:{userId}
        })
    }

    async findManyByIds(ids){
        return prisma.driverProfile.findMany({
            where:{driverProfileId: {in:ids}},
            select:{
                  driverProfileId:true,
                  vehicleType:true,
                  vehicleMake:true,
                  vehicleModel:true,
                  rating: true,
                  isAvailable:true,
                  approvalState:true,
                  user:{select:{name: true}}
            }
        })
    }
    async updateProfile(driverProfileId, data){
        return await prisma.driverProfile.update({
            where:{driverProfileId},
            data
        })
    }
    async updateAvailability(userId, isAvailable){
        return await prisma.driverProfile.update({
            where:{userId},
            data:{isAvailable}
        })

      
    }

    async upsertLocation(driverProfileId,lat, lng, heading){
        return await prisma.driverLocation.upsert({
            where:{driverProfileId},
            create:{driverProfileId, lat, lng, heading},
            update:{lat, lng, heading}
        })
    }

    async findLocation(driverProfileId){
        return await prisma.driverLocation.findUnique({
            where:{driverProfileId}
        })
    }

}

module.exports= DriverRepository