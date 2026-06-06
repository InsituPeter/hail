const pino = require("pino")
const config= require("./index")

const levels={
   development:"debug",
   production:"info",
   test:"silent"
}


const logger = pino({
    level:levels[config.env] ?? "info",

})


module.exports = logger