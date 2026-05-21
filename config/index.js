const dotenv= require("dotenv")
const path = require("path")
const env = process.env.NODE_ENV
            ?`.env.${process.env.NODE_ENV}`
            :`.env`


dotenv.config({path:path.resolve(__dirname, '..', env)})


const config = {
    env:process.env.NODE_ENV || 'development',
    port:process.env.PORT,
    db:{
        url:process.env.DATABASE_URL,
    },
    redis:{
        url:process.env.REDIS_URL
    },
    email:{
        host:process.env.EMAIL_HOST,
        port:process.env.EMAIL_PORT,
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    },
    jwt:{
        secret:process.env.JWT_SECRET
    },
    frontend:{
        url:process.env.FRONTEND_URL
    },
    company:{
        name:process.env.COMPANY_NAME,
        supportEmail:process.env.SUPPORT_EMAIL
    },
    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY
  },
  googleMap:{
    apiKeys:process.env.GOOGLE_MAPS_API_KEY
  }

}



module.exports= config