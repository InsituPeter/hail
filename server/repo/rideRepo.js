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
                select:{
                    rideId: true,
                    state: true,
                    pickupAddress: true,
                    pickupLat: true,
                    pickupLng: true,
                    dropoffAddress: true,
                    dropoffLat: true,
                    dropoffLng: true,
                    vehicleType: true,
                    paymentMethod: true,
                    estimatedFare: true,
                    requestedAt: true,
                    rider: {
                        select: {
                            riderProfileId: true,
                            user: { select: { userId: true } }
                        }
                    }
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


    async findAll({ state, riderId, driverProfileId, from, to, query, page = 1, limit = 20 } = {}){
        const where = {}

        if(state) where.state = state
        if(riderId) where.riderId = parseInt(riderId)
        if(driverProfileId) where.driverProfileId = parseInt(driverProfileId)
        if(from || to){
            where.createdAt = {}
            if(from) where.createdAt.gte = new Date(from)
            if(to) where.createdAt.lte = new Date(to)
        }
        if(query){
            where.OR = [
                { pickupAddress: { contains: query, mode: "insensitive" } },
                { dropoffAddress: { contains: query, mode: "insensitive" } }
            ]
        }

        const take = parseInt(limit)
        const skip = (parseInt(page) - 1) * take

        const [rides, total] = await prisma.$transaction([
            prisma.ride.findMany({
                where,
                orderBy:{ createdAt: "desc" },
                skip,
                take
            }),
            prisma.ride.count({ where })
        ])

        return { rides, total, page: parseInt(page), limit: take }
    }

    async acceptRide(rideId, driverProfileId){
        return await prisma.$transaction(async(tx)=>{
            const ride = await tx.ride.update({
                where:{ rideId, state: "REQUESTED" },
                data:{ state: "ACCEPTED", driverProfileId, acceptedAt: new Date() }
            })
            await tx.rideStateTransition.create({
                data:{ rideId, fromState: "REQUESTED", toState: "ACCEPTED" }
            })
            return ride
        })
    }

    async updateState(rideId, state, data){
        return await prisma.$transaction(async(tx)=>{
            const current = await tx.ride.findUnique({where:{rideId}})
            const where = current.state?{rideId, state:current.state}:{rideId}
            const ride = await tx.ride.update({
                where:{rideId, },
                data:{state, ...data}
            })

            await tx.rideStateTransition.create({
                data:{rideId, fromState:current.state, toState:state}
            })
            return ride
        })
    }


    
}

module.exports = RideRepository