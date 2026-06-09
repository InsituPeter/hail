const Redis = require('ioredis')

const config = require("./index")
const redis= new Redis(config.redis.url)

redis.on("connect", ()=> console.log("Redis Connected"))
redis.on("error", (err)=> console.error({err}, "Redis error"))


module.exports= redis