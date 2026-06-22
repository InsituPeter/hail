const http = require("http")
const request = require("supertest")
const expressApp = require("../../app")
const app = http.createServer(expressApp)
const prisma = require("../../config/prisma")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

jest.setTimeout(30000)

let adminToken
let driverProfileId
let userId

beforeAll(async () => {
  const hashed = await bcrypt.hash("Pass1234", 10)
  await prisma.user.create({
    data: {
      email: "admin@test.com",
      password: hashed,
      name: "Admin",
      role: "ADMIN",
      emailVerifiedAt: new Date()
    }
  })

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admin@test.com", password: "Pass1234" })
  expect(login.status).toBe(200)
  adminToken = login.body.data.accessToken

  const hashed2 = await bcrypt.hash("Pass1234", 10)
  const driverUser = await prisma.user.create({
    data: {
      email: "admindrv@test.com",
      password: hashed2,
      name: "AdminDriver",
      role: "DRIVER",
      emailVerifiedAt: new Date()
    }
  })

  const driverLogin = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admindrv@test.com", password: "Pass1234" })
  expect(driverLogin.status).toBe(200)
  const driverToken = driverLogin.body.data.accessToken

  const driverRes = await request(app)
    .post("/api/v1/drivers")
    .set("Authorization", `Bearer ${driverToken}`)
    .send({
      licenseNumber: "LIC_ADMIN",
      vehicleType: "ECONOMY",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehiclePlate: "PLT_ADMIN",
      vehicleYear: 2020,
      settlementBank: "044",
      accountNumber: "0000000000"
    })
  expect(driverRes.status).toBe(201)
  driverProfileId = driverRes.body.driverProfileId
  userId = driverUser.userId
})

describe("Admin rides", () => {
  it("GET /api/v1/admin/rides returns rides", async () => {
    const res = await request(app)
      .get("/api/v1/admin/rides")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("rides")
    expect(res.body).toHaveProperty("total")
  })

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .get("/api/v1/admin/rides")
    expect(res.status).toBe(401)
  })

  it("rejects non-admin role", async () => {
    const hashed = await bcrypt.hash("Pass1234", 10)
    await prisma.user.create({
      data: {
        email: "notadmin@test.com",
        password: hashed,
        name: "NotAdmin",
        role: "RIDER",
        emailVerifiedAt: new Date()
      }
    })
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "notadmin@test.com", password: "Pass1234" })
    expect(login.status).toBe(200)
    const token = login.body.data.accessToken

    const res = await request(app)
      .get("/api/v1/admin/rides")
      .set("Authorization", `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})

describe("Admin drivers", () => {
  it("GET /api/v1/admin/drivers returns drivers", async () => {
    const res = await request(app)
      .get("/api/v1/admin/drivers")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("drivers")
  })

  it("PATCH /api/v1/admin/drivers/:id/approve approves driver", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/drivers/${driverProfileId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.approvalState).toBe("APPROVED")
  })

  async function createDriver(email, lic, plate) {
    const hashed = await bcrypt.hash("Pass1234", 10)
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: "Driver",
        role: "DRIVER",
        emailVerifiedAt: new Date()
      }
    })
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "Pass1234" })
    expect(login.status).toBe(200)
    const token = login.body.data.accessToken
    const res = await request(app)
      .post("/api/v1/drivers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        licenseNumber: lic,
        vehicleType: "ECONOMY",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehiclePlate: plate,
        vehicleYear: 2020,
        settlementBank: "044",
        accountNumber: "0000000000"
      })
    expect(res.status).toBe(201)
    return { id: res.body.driverProfileId, token }
  }

  it("PATCH /api/v1/admin/drivers/:id/reject rejects driver", async () => {
    const { id } = await createDriver("admindrv2@test.com", "LIC_ADM2", "PLT_ADM2")
    const res = await request(app)
      .patch(`/api/v1/admin/drivers/${id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.approvalState).toBe("REJECTED")
  })

  it("PATCH /api/v1/admin/drivers/:id/suspend suspends driver", async () => {
    const { id } = await createDriver("admindrv3@test.com", "LIC_ADM3", "PLT_ADM3")
    const res = await request(app)
      .patch(`/api/v1/admin/drivers/${id}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.approvalState).toBe("SUSPENDED")
  })
})

describe("Admin users", () => {
  it("GET /api/v1/admin/users returns users", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("users")
  })

  it("PATCH /api/v1/admin/users/:id/suspend suspends user", async () => {
    const hashed = await bcrypt.hash("Pass1234", 10)
    const user = await prisma.user.create({
      data: {
        email: "suspuser@test.com",
        password: hashed,
        name: "SuspUser",
        role: "RIDER"
      }
    })

    const res = await request(app)
      .patch(`/api/v1/admin/users/${user.userId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.suspendedAt).toBeTruthy()
  })

  it("DELETE /api/v1/admin/users/:id deletes user", async () => {
    const hashed = await bcrypt.hash("Pass1234", 10)
    const user = await prisma.user.create({
      data: {
        email: "deluser@test.com",
        password: hashed,
        name: "DelUser",
        role: "RIDER"
      }
    })

    const res = await request(app)
      .delete(`/api/v1/admin/users/${user.userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.deletedAt).toBeTruthy()
  })
})

describe("Admin payments", () => {
  it("GET /api/v1/admin/payments returns payments", async () => {
    const res = await request(app)
      .get("/api/v1/admin/payments")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("payment")
  })
})

describe("Admin get ride by ID", () => {
  it("GET /api/v1/admin/rides/:rideId returns 404 for non-existent ride", async () => {
    const res = await request(app)
      .get("/api/v1/admin/rides/999999")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })
})
