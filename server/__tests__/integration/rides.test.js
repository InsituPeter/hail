const http = require("http")
const request = require("supertest")
const expressApp = require("../../app")
const app = http.createServer(expressApp)
const prisma = require("../../config/prisma")
const bcrypt = require("bcryptjs")

jest.setTimeout(30000)

const registerAndLogin = async (email, password = "Pass1234", role = "RIDER") => {
  const reg = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password, name: role.toLowerCase(), role })
  expect(reg.status).toBe(201)

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerifiedAt: new Date() }
  })

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password })
  expect(login.status).toBe(200)

  return login.body.data.accessToken
}

const validRideData = {
  pickupAddress: "10 Test Street, Lagos",
  pickupLat: 6.5244,
  pickupLng: 3.3792,
  dropoffAddress: "20 Test Avenue, Lagos",
  dropoffLat: 6.6244,
  dropoffLng: 3.4792,
  vehicleType: "ECONOMY",
  paymentMethod: "CASH"
}

describe("POST /api/v1/rides", () => {
  it("rejects missing fields", async () => {
    const token = await registerAndLogin("rideride@test.com", "Pass1234", "RIDER")
    const res = await request(app)
      .post("/api/v1/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ pickupAddress: "only this" })
    expect(res.status).toBe(422)
  })

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/v1/rides")
      .send(validRideData)
    expect(res.status).toBe(401)
  })

  it("rejects non-rider role", async () => {
    const token = await registerAndLogin("driveride@test.com", "Pass1234", "DRIVER")
    const res = await request(app)
      .post("/api/v1/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(validRideData)
    expect(res.status).toBe(403)
  })
})

describe("PATCH /api/v1/rides/:rideId/accept", () => {
  let rideId
  let driverToken

  beforeAll(async () => {
    const riderToken = await registerAndLogin("ridaccept@test.com", "Pass1234", "RIDER")
    const riderUser = await prisma.user.findUnique({ where: { email: "ridaccept@test.com" } })
    const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: riderUser.userId } })

    const ride = await prisma.ride.create({
      data: {
        riderId: riderProfile.riderProfileId,
        pickupAddress: "10 Test Street",
        pickupLat: 6.5244,
        pickupLng: 3.3792,
        dropoffAddress: "20 Test Ave",
        dropoffLat: 6.6244,
        dropoffLng: 3.4792,
        vehicleType: "ECONOMY",
        paymentMethod: "CASH",
        estimatedFare: 1500,
        state: "REQUESTED"
      }
    })
    rideId = ride.rideId

    await prisma.rideStateTransition.create({
      data: { rideId: ride.rideId, fromState: null, toState: "REQUESTED" }
    })

    driverToken = await registerAndLogin("driaccept@test.com", "Pass1234", "DRIVER")
    await request(app)
      .post("/api/v1/drivers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        licenseNumber: "LIC_ACCEPT",
        vehicleType: "ECONOMY",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehiclePlate: "PLT_ACCEPT",
        vehicleYear: 2020,
        settlementBank: "044",
        accountNumber: "0000000000"
      })

    const driverUser = await prisma.user.findUnique({ where: { email: "driaccept@test.com" } })
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.userId } })
    await prisma.driverProfile.update({
      where: { driverProfileId: driverProfile.driverProfileId },
      data: { isAvailable: true, approvalState: "APPROVED" }
    })
  })

  it("accepts a ride", async () => {
    console.log("rideId:", rideId, "type:", typeof rideId)
    const driverUser = await prisma.user.findUnique({ where: { email: "driaccept@test.com" } })
    const dp = await prisma.driverProfile.findUnique({ where: { userId: driverUser.userId } })
    console.log("driverProfile:", JSON.stringify(dp))
    const ride = await prisma.ride.findUnique({ where: { rideId } })
    console.log("ride:", JSON.stringify(ride))
    const res = await request(app)
      .patch(`/api/v1/rides/${rideId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`)
    console.log("accept response body:", JSON.stringify(res.body))
    expect(res.status).toBe(200)
  })
})

describe("PATCH /api/v1/rides/:rideId/start", () => {
  let rideId
  let driverToken

  beforeAll(async () => {
    const riderToken = await registerAndLogin("ridstart@test.com", "Pass1234", "RIDER")
    const riderUser = await prisma.user.findUnique({ where: { email: "ridstart@test.com" } })
    const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: riderUser.userId } })

    driverToken = await registerAndLogin("dristart@test.com", "Pass1234", "DRIVER")
    const driverReg = await request(app)
      .post("/api/v1/drivers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        licenseNumber: "LIC_START",
        vehicleType: "ECONOMY",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehiclePlate: "PLT_START",
        vehicleYear: 2020,
        settlementBank: "044",
        accountNumber: "0000000000"
      })
    expect(driverReg.status).toBe(201)

    const driverUser = await prisma.user.findUnique({ where: { email: "dristart@test.com" } })
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.userId } })

    const ride = await prisma.ride.create({
      data: {
        riderId: riderProfile.riderProfileId,
        driverProfileId: driverProfile.driverProfileId,
        pickupAddress: "10 Test Street",
        pickupLat: 6.5244,
        pickupLng: 3.3792,
        dropoffAddress: "20 Test Ave",
        dropoffLat: 6.6244,
        dropoffLng: 3.4792,
        vehicleType: "ECONOMY",
        paymentMethod: "CASH",
        estimatedFare: 1500,
        state: "ACCEPTED",
        acceptedAt: new Date()
      }
    })
    rideId = ride.rideId

    await prisma.rideStateTransition.create({
      data: { rideId: ride.rideId, fromState: "REQUESTED", toState: "ACCEPTED" }
    })
  })

  it("starts a ride", async () => {
    const res = await request(app)
      .patch(`/api/v1/rides/${rideId}/start`)
      .set("Authorization", `Bearer ${driverToken}`)
    expect(res.status).toBe(200)
  })
})

describe("PATCH /api/v1/rides/:rideId/cancel", () => {
  describe("as rider", () => {
    let rideId
    let riderToken

    beforeAll(async () => {
      riderToken = await registerAndLogin("ridcancel@test.com", "Pass1234", "RIDER")
      const riderUser = await prisma.user.findUnique({ where: { email: "ridcancel@test.com" } })
      const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: riderUser.userId } })

      const ride = await prisma.ride.create({
        data: {
          riderId: riderProfile.riderProfileId,
          pickupAddress: "10 Test Street",
          pickupLat: 6.5244,
          pickupLng: 3.3792,
          dropoffAddress: "20 Test Ave",
          dropoffLat: 6.6244,
          dropoffLng: 3.4792,
          vehicleType: "ECONOMY",
          paymentMethod: "CASH",
          estimatedFare: 1500,
          state: "REQUESTED"
        }
      })
      rideId = ride.rideId

      await prisma.rideStateTransition.create({
        data: { rideId: ride.rideId, fromState: null, toState: "REQUESTED" }
      })
    })

    it("cancels a ride as rider", async () => {
      const res = await request(app)
        .patch(`/api/v1/rides/${rideId}/cancel`)
        .set("Authorization", `Bearer ${riderToken}`)
        .send({ reason: "Changed my mind" })
      expect(res.status).toBe(200)
    })
  })

  describe("as driver", () => {
    let rideId
    let driverToken

    beforeAll(async () => {
      const riderToken = await registerAndLogin("ridcandrv@test.com", "Pass1234", "RIDER")
      const riderUser = await prisma.user.findUnique({ where: { email: "ridcandrv@test.com" } })
      const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: riderUser.userId } })

      driverToken = await registerAndLogin("dricancel@test.com", "Pass1234", "DRIVER")
      const driverReg = await request(app)
        .post("/api/v1/drivers")
        .set("Authorization", `Bearer ${driverToken}`)
        .send({
          licenseNumber: "LIC_CANCL",
          vehicleType: "ECONOMY",
          vehicleMake: "Toyota",
          vehicleModel: "Camry",
          vehiclePlate: "PLT_CANCL",
          vehicleYear: 2020,
          settlementBank: "044",
          accountNumber: "0000000000"
        })
      expect(driverReg.status).toBe(201)

      const driverUser = await prisma.user.findUnique({ where: { email: "dricancel@test.com" } })
      const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.userId } })

      const ride = await prisma.ride.create({
        data: {
          riderId: riderProfile.riderProfileId,
          driverProfileId: driverProfile.driverProfileId,
          pickupAddress: "10 Test Street",
          pickupLat: 6.5244,
          pickupLng: 3.3792,
          dropoffAddress: "20 Test Ave",
          dropoffLat: 6.6244,
          dropoffLng: 3.4792,
          vehicleType: "ECONOMY",
          paymentMethod: "CASH",
          estimatedFare: 1500,
          state: "ACCEPTED",
          acceptedAt: new Date()
        }
      })
      rideId = ride.rideId

      await prisma.rideStateTransition.create({
        data: { rideId: ride.rideId, fromState: "REQUESTED", toState: "ACCEPTED" }
      })
    })

    it("cancels a ride as driver", async () => {
      const res = await request(app)
        .patch(`/api/v1/rides/${rideId}/cancel`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ reason: "Vehicle issue" })
      expect(res.status).toBe(200)
    })
  })
})

describe("PATCH /api/v1/rides/:rideId/complete", () => {
  let rideId
  let driverToken

  beforeAll(async () => {
    const riderToken = await registerAndLogin("ridcompl@test.com", "Pass1234", "RIDER")
    const riderUser = await prisma.user.findUnique({ where: { email: "ridcompl@test.com" } })
    const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: riderUser.userId } })

    driverToken = await registerAndLogin("dricompl@test.com", "Pass1234", "DRIVER")
    const driverReg = await request(app)
      .post("/api/v1/drivers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        licenseNumber: "LIC_CMPLT",
        vehicleType: "ECONOMY",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehiclePlate: "PLT_CMPLT",
        vehicleYear: 2020,
        settlementBank: "044",
        accountNumber: "0000000000"
      })
    expect(driverReg.status).toBe(201)

    const driverUser = await prisma.user.findUnique({ where: { email: "dricompl@test.com" } })
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.userId } })

    const ride = await prisma.ride.create({
      data: {
        riderId: riderProfile.riderProfileId,
        driverProfileId: driverProfile.driverProfileId,
        pickupAddress: "10 Test Street",
        pickupLat: 6.5244,
        pickupLng: 3.3792,
        dropoffAddress: "20 Test Ave",
        dropoffLat: 6.6244,
        dropoffLng: 3.4792,
        vehicleType: "ECONOMY",
        paymentMethod: "CASH",
        estimatedFare: 1500,
        state: "IN_PROGRESS",
        acceptedAt: new Date(),
        pickupAt: new Date()
      }
    })
    rideId = ride.rideId

    await prisma.rideStateTransition.create({
      data: { rideId: ride.rideId, fromState: "ACCEPTED", toState: "IN_PROGRESS" }
    })
  })

  it("completes a ride", async () => {
    const res = await request(app)
      .patch(`/api/v1/rides/${rideId}/complete`)
      .set("Authorization", `Bearer ${driverToken}`)
    expect(res.status).toBe(200)
  })
})

describe("PATCH /api/v1/rides/:rideId/confirm-cash", () => {
  let rideId
  let driverToken

  beforeAll(async () => {
    const riderToken = await registerAndLogin("ridcash@test.com", "Pass1234", "RIDER")
    const riderUser = await prisma.user.findUnique({ where: { email: "ridcash@test.com" } })
    const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: riderUser.userId } })

    driverToken = await registerAndLogin("dricash@test.com", "Pass1234", "DRIVER")
    const driverReg = await request(app)
      .post("/api/v1/drivers")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        licenseNumber: "LIC_CASH",
        vehicleType: "ECONOMY",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehiclePlate: "PLT_CASH",
        vehicleYear: 2020,
        settlementBank: "044",
        accountNumber: "0000000000"
      })
    expect(driverReg.status).toBe(201)

    const driverUser = await prisma.user.findUnique({ where: { email: "dricash@test.com" } })
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.userId } })

    const ride = await prisma.ride.create({
      data: {
        riderId: riderProfile.riderProfileId,
        driverProfileId: driverProfile.driverProfileId,
        pickupAddress: "10 Test Street",
        pickupLat: 6.5244,
        pickupLng: 3.3792,
        dropoffAddress: "20 Test Ave",
        dropoffLat: 6.6244,
        dropoffLng: 3.4792,
        vehicleType: "ECONOMY",
        paymentMethod: "CASH",
        estimatedFare: 1500,
        finalFare: 1500,
        state: "COMPLETED",
        acceptedAt: new Date(),
        pickupAt: new Date(),
        completedAt: new Date()
      }
    })
    rideId = ride.rideId

    await prisma.rideStateTransition.create({
      data: { rideId: ride.rideId, fromState: "IN_PROGRESS", toState: "COMPLETED" }
    })

    await prisma.payment.create({
      data: { rideId: ride.rideId, amount: 1500, method: "CASH" }
    })
  })

  it("confirms cash payment", async () => {
    const res = await request(app)
      .patch(`/api/v1/rides/${rideId}/confirm-cash`)
      .set("Authorization", `Bearer ${driverToken}`)
    expect(res.status).toBe(200)
  })
})
