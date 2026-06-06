const prisma= require("../config/prisma")

class UserRepository{
    
    async create(email, password, name, phone, role){
      return await prisma.user.create({
        data:{email:email.toLowerCase(), password, name, role, phone}
      })
    }

    async findByEmail(email){
        return await prisma.user.findUnique({
            where:{email: email.toLowerCase()}
        })
    }

    async findById(userId){
        return await prisma.user.findUnique({
            where:{userId:parseInt(userId)}
        })
    }

    async activateUser(userId){
        return await prisma.user.update({
            where:{userId:parseInt(userId)},
            data:{emailVerifiedAt:new Date()}

        })
    }

    async updateProfile(userId, data){
        return await prisma.user.update({
            where:{userId: parseInt(userId)},
            data:{...data, version:{increment:1}}
        })
    }


    async softDelete(userId){
        return await prisma.user.update({
            where:{userId:parseInt(userId)},
            data:{deletedAt: new Date()}
        })
    }

    async existByEmail(email){
     const user= await prisma.user.findUnique({
        where:{email:email.toLowerCase()},
        select:{userId: true}
     })
      return !! user
     
    
    }   
  async getAll({ role, version, from, to, query,page=1, limit=20,  suspended, deleted}={}){
      const where={}
      if(role) where.role =role
      if(version) where.version=version
      if(from||to){
           where.createdAt={}
           if (from) where.createdAt.gte= new Date(from)
           if (to)  where.createdAt.lte= new Date(to)
      }
      if(suspended ==="true") where.suspendedAt={not:null}
      if(suspended==="false") where.suspendedAt= null

      if(deleted === "true") where.deletedAt={not:null}
      if(deleted === "false") where.deletedAt=null
      if(query){
        where.OR=[
            {name:{contains:query, mode:"insensitive"}},
            {email:{contains:query, mode:"insensitive"}}
        ]

      }

      const take=parseInt(limit)
      const skip=(parseInt(page) -1) *take

      const[users, total]=await prisma.$transaction([
           prisma.user.findMany({
            where,
            orderBy:{createdAt:"desc"},
            skip,
            take
           }),
           prisma.user.count({where})
      ])

      return{users, total, page:parseInt(page), limit:take}
  }

  async suspendUser(userId){
    return await prisma.user.update({
        where:{userId},
        data:{suspendedAt:new Date()},
        
    })
  }
  
}


module.exports= UserRepository