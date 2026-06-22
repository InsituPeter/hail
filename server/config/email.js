const nodemailer = require("nodemailer")
const config = require("./index")


const transporter = process.env.NODE_ENV === "test"
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host:config.email.host,
        port:config.email.port,
        auth:{
            user:config.email.user,
            pass: config.email.pass
        }
    })


module.exports= transporter