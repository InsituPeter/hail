const prisma = require('./config/prisma'); prisma.user.count().then(c => console.log('User count:', c)).catch(e => console.error(e.message)).finally(() => prisma.\())
