const { PostgreSqlContainer } = require("@testcontainers/postgresql")
const { RedisContainer } = require("@testcontainers/redis")
const { execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

module.exports = async () => {
  const pg = await new PostgreSqlContainer("postgres:15-alpine")
    .withDatabase("hail_test")
    .withUsername("hail")
    .withPassword("hail")
    .start()

  const redis = await new RedisContainer("redis:7-alpine").start()

  const envPath = path.resolve(__dirname, "../../.env.test")
  const envContent = [
    `DATABASE_URL=${pg.getConnectionUri()}`,
    `REDIS_URL=redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
    "NODE_ENV=test",
    "JWT_SECRET=test-jwt-secret",
    "PAYSTACK_SECRET_KEY=test_sk",
    "FRONTEND_URL=http://localhost:5173",
    "COMPANY_NAME=Hail",
    "SUPPORT_EMAIL=support@hail.com",
    "GOOGLE_MAPS_API_KEY=test_key",
  ].join("\n")

  fs.writeFileSync(envPath, envContent)

  execSync(`"${path.resolve(__dirname, "../../node_modules/.bin/prisma.cmd")}" db push --force-reset`, {
    env: { ...process.env, DATABASE_URL: pg.getConnectionUri() },
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
  })

  return async () => {
    await pg.stop()
    await redis.stop()
  }
}
