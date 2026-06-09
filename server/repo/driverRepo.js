const prisma = require("../config/prisma")

class DriverRepository{
    
    async create(userId, data){
        return await prisma.driverProfile.create({
            data:{ userId, ...data },
            select:{
                driverProfileId: true,
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehiclePlate: true,
                vehicleYear: true,
                rating: true,
                totalRides: true,
                isAvailable: true,
                approvalState: true,
                user: { select: { name: true } }
            }
        })
    }

    async findById(driverProfileId){
        return await prisma.driverProfile.findUnique({
            where:{driverProfileId},
            select:{
                driverProfileId:true,
                vehicleType:true,
                vehicleMake:true,
                vehiclePlate:true,
                vehicleYear:true,
                rating:true,
                approvalState:true,
                isAvailable:true,
                user:{select:{name:true}}
            }
        })
    }

    async findByUserId(userId){
        return prisma.driverProfile.findUnique({
            where:{userId},
            select:{
                driverProfileId: true,
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehiclePlate: true,
                vehicleYear: true,
                rating: true,
                totalRides: true,
                approvalState: true,
                isAvailable: true,
                user: { select: { name: true } }
            }
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
            data,
            select:{
                driverProfileId: true,
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehiclePlate: true,
                vehicleYear: true,
                rating: true,
                totalRides: true,
                isAvailable: true,
                approvalState: true,
                user: { select: { name: true } }
            }
        })
    }
    async updateAvailability(userId, isAvailable){
        return await prisma.driverProfile.update({
            where:{userId},
            data:{isAvailable},
            select:{
                driverProfileId: true,
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehiclePlate: true,
                vehicleYear: true,
                rating: true,
                totalRides: true,
                isAvailable: true,
                approvalState: true,
                user: { select: { name: true } }
            }
        })


      
    }

    async deleteById(driverProfileId){
        return await prisma.driverProfile.delete({
            where:{driverProfileId}
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

    async  updateApproval(driverProfileId, approvalState){
        return await prisma.driverProfile.update({
            where:{driverProfileId},
            data:{approvalState},
            select:{
                driverProfileId: true,
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehiclePlate: true,
                vehicleYear: true,
                rating: true,
                totalRides: true,
                isAvailable: true,
                approvalState: true,
                user: { select: { name: true } }
            }
        })
    }
    async findAll({approvalState, vehicleType, vehicleMake, vehicleModel, vehiclePlate, isAvailable, rating, from, to, query, page=1, limit=20}={}){
        const where = {}

        if(approvalState) where.approvalState = approvalState
        if(vehicleType) where.vehicleType = vehicleType
        if(vehicleMake) where.vehicleMake = vehicleMake
        if(vehicleModel) where.vehicleModel = vehicleModel
        if(vehiclePlate) where.vehiclePlate = vehiclePlate
        if(isAvailable !== undefined) where.isAvailable = isAvailable === "true"
        if(rating) where.rating = rating
        if(from || to){
            where.createdAt = {}
            if(from) where.createdAt.gte = new Date(from)
            if(to) where.createdAt.lte = new Date(to)
        }
        if(query){
            where.OR = [
                { vehiclePlate: { contains: query, mode: "insensitive" } },
                { vehicleModel: { contains: query, mode: "insensitive" } },
                { user: { name: { contains: query, mode: "insensitive" } } }
            ]
        }

        const take = parseInt(limit)
        const skip = (parseInt(page) - 1) * take

        const [drivers, total] = await prisma.$transaction([
            prisma.driverProfile.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.driverProfile.count({ where })
        ])

        return { drivers, total, page: parseInt(page), limit: take }
    }

    async findProfile(vehicleType){
       return await prisma.driverProfile.findMany({
        where:{
            isAvailable:true,
            approvalState:"APPROVED",
            vehicleType
        },
       select:{
        driverProfileId:true,
        location:{select:{lat:true, lng:true}}
       }
       })
    }
    
   
     

}

module.exports= DriverRepository