const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5432/hb' } }
})
p.$connect()
  .then(() => console.log('OK'))
  .catch(e => console.log('ERR', e.message))
  .finally(() => p.$disconnect())
