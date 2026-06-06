const {Server}= require("socket.io")

const initializeSocket=(httpServer,authService, redisClient)=>{
    const io= new Server(httpServer, ()=>{
        cors:{origin:"*"}
    })

    io.use((socket, next)=>{
      const token =socket.handshake.auth.token
      if(!token) return next(new Error("Authentication required"))
      try{
        socket.user= authService.jwtVerify(token)
        next()
      }
      catch(error){
        return next (new Error("Invalid token"))
    }
    
    })

    io.on("connection", (socket)=>{
        socket.on("join:ride", (rideId)=>{
          socket.join(`ride:${rideId}`)
        })

        socket.on("location:update", async({rideId, lat, lng, heading})=>{
            await redisClient.publish(`location:${rideId}`, JSON.stringify({lat, lng, heading}))
        })
    })

    const subscriber= redisClient.duplicate()
    subscriber.psubscribe("ride:*", "location:*", "paymemt:*")
    subscriber.on("pmessage", (pattern, channel, message)=>{
        let data
        try{
          data =JSON.parse(message)
        }
        catch(error){
            logger.error({ err }, "Failed to process pub/sub message")
            return
        }

        if(channel===)
    })

}