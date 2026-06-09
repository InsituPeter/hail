const prisma = require("../config/prisma")
class  PaymentRepository{
   async create(rideId, amount, method, paystackReference){
      return await prisma.payment.create({
        data:{rideId, amount, method, paystackReference}
      })
   }

   async fail(rideId){
    return await prisma.payment.update({
        where:{rideId},
        data:{state: 'FAILED'}
    })
   }

   async findByRideId(rideId){
    return await prisma.payment.findUnique({
        where:{rideId}
    })
   }

   async findByReference(paystackReference){
      return await prisma.payment.findFirst({
        where:{paystackReference}
      })
   }
    async capture(rideId, finalAmount, paystackReference = null) {
        return await prisma.payment.update({
            where: { rideId },
            data: { state: 'CAPTURED', amount: finalAmount, ...(paystackReference && { paystackReference }) }
        })
    }
    async findAll({amount, method, state, to, from, query, page=1, limit=20}={}){
        const where={}
        if(amount)where.amount=amount
        if(method)where.method=method
        if(state)where.state=state
        if(from||to){
            where.createdAt={}
            if(from) where.createdAt.gte= new Date(from)
            if(to)   where.createdAt.lte = new Date(to)
        }

        if(query){
            where.OR=[
                {ride:{rider:{user:{name:{contains:query, mode:"insensitive"}}}}},
                {ride:{driver:{user:{name:{contains:query, mode:"insensitive"}}}}}
            ]
        }

        const take= parseInt(limit)
        const skip=(parseInt(page)-1) *take
        const [payment, total] =await prisma.$transaction([
                prisma.payment.findMany({
                    where,
                    orderBy:{ createdAt: "desc" },
                    take,
                    skip
                }),
                prisma.payment.count({ where })
        ])
        return{payment, total, page:parseInt(page), limit}
    }
}


module.exports= PaymentRepository