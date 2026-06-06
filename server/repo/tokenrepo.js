const prisma = require("../config/prisma")


class TokenRepository{
    async create(userId, expiresAt, hashedToken, type, ipAddress, userAgent){
      return   await prisma.token.create({
            data:{userId:parseInt(userId),
                  expiresAt,
                  type,
                  token:hashedToken,
                  ipAddress,
                  userAgent,
                  state:"ACTIVE"

                  
            }
         })

    }
    async findByToken(token){
      return  await prisma.token.findUnique({
            where:{token},
            include:{
                user:{
                    select:{
                        userId:true,
                        email:true,
                        name:true,
                        role:true,
                        emailVerifiedAt:true,
                        deletedAt:true
                    }
                }
            }
        })
    }

    async findByUserId(userId){
      return  await prisma.token.findMany({
            where:{userId:parseInt(userId),
                    type:"REFRESH"
            }
        })
    }

    async markUsed(token){
        return await prisma.token.update({
            where:{token},
            data:{state:"USED", usedAt: new Date()}
        })
    }

    async revokeToken(token){
      return  await prisma.token.update({
            where:{token},
            data:{state: "REVOKED"}
        })
    }
  
    async deleteStale(){
        return  await prisma.token.deleteMany({
            where:{
                OR:[
                    {expiresAt:{lt:new Date()}},
                    {state:{in:["USED", "REVOKED", "EXPIRED"]}}
                ]
            }
        })
    }
    
}


module.exports= TokenRepository
    