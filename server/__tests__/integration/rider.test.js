const http = require("http")
const request = require("supertest")
const expressApp = require("../../app")
const app = http.createServer(expressApp)
const prisma = require("../../config/prisma")

jest.setTimeout(30000)

const registerAndLogin = async (email, role = "RIDER") => {
  const reg = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Pass1234", name: "Rider", role })
  expect(reg.status).toBe(201)

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerifiedAt: new Date() }
  })

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "Pass1234" })
  expect(login.status).toBe(200)

  return login.body.data.accessToken
}

describe("POST /api/v1/riders", () => {
  it("rejects duplicate rider profile (auto-created on register)", async () => {
    const token = await registerAndLogin("riderdup@test.com")
    const res = await request(app)
      .post("/api/v1/riders")
      .set("Authorization", `Bearer ${token}`)
    expect(res.status).toBe(409)
  })

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/v1/riders")
    expect(res.status).toBe(401)
  })

  it("rejects non-rider role", async () => {
    const token = await registerAndLogin("notrider@test.com", "DRIVER")
    const res = await request(app)
      .post("/api/v1/riders")
      .set("Authorization", `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})

describe("GET /api/v1/riders/profile", () => {
  it("gets rider profile", async () => {
    const token = await registerAndLogin("riderget@test.com")
    const res = await request(app)
      .get("/api/v1/riders/profile")
      .set("Authorization", `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.riderProfileId).toBeDefined()
  })

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .get("/api/v1/riders/profile")
    expect(res.status).toBe(401)
  })
})

describe("PATCH /api/v1/riders/profile", () => {
  it("updates rider profile", async () => {
    const token = await registerAndLogin("riderupd@test.com")
    const res = await request(app)
      .patch("/api/v1/riders/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ paystackAuthorizationCode: "AUTH_123" })
    expect(res.status).toBe(200)
  })
})
