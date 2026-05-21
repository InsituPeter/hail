const prisma= require('../config/prisma')

class RideRepository{
    async create(data){
         return await prisma.$transaction(async (tx) =>{
            const ride =await tx.ride.create({data})
            await tx.rideStateTransition.create({
                data:{rideId:ride.rideId, fromState: null, toState:ride.state}
            })
            return await tx.ride.findUnique({
                where:{rideId:ride.rideId},
                include:{
                      rider: { include: { user: { select: { userId: true } } } },
                      driver:true,
                      payment:true
                }
            })
         })

    }

    async findById(rideId){
        return await prisma.ride.findUnique({
             where: { rideId },
            include: {
                rider: { include: { user: { select: { userId: true } } } },
                driver: true,
                payment: true,
            }
        })
    }
    async findByRider(riderId){
        return await prisma.ride.findMany({
            where:{riderId},
            orderBy:{createdAt:'desc'},
            include:{
                 rider: { include: { user: { select: { userId: true } } } },
                driver: true,
                payment: true,
            }
        })
    }
    async findByDriver(driverProfileId){
        return await prisma.ride.findMany({
            where:{driverProfileId},
            orderBy: { createdAt: 'desc' },
            include: {
                rider: { include: { user: { select: { userId: true } } } },
                driver: true,
                payment: true,
            }
        })
    }

    async findActiveByDriver(driverProfileId){
        return await prisma.ride.findFirst({
            where: {
                driverProfileId,
                state: { notIn: ["COMPLETED", "CANCELLED"] }
            }
        })
    }

    async findActiveByRider(riderId){
        return await prisma.ride.findFirst({
            where: {
                riderId,
                state: { notIn: ["COMPLETED", "CANCELLED"] }
            }
        })
    }

    async updateState(rideId, state, data = {}){
        return await prisma.ride.update({
            where: { rideId },
            data: { state, ...data }
        })
    }
}

module.exports = RideRepository