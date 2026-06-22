const http = require("http")
const request = require("supertest")
const expressApp = require("../../app")
const app = http.createServer(expressApp)
const prisma = require("../../config/prisma")
const jwt = require("jsonwebtoken")

jest.setTimeout(900000)

const registerAndLogin = async(email)=>{
  const reg=  await request(app)
    .post('/api/v1/auth/register')
    .send({email, password:"Pass1234", name:"Driver", role:"DRIVER"})
    expect(reg.status).toBe(201)

    await prisma.user.update({
        where:{email},
        data:{emailVerifiedAt: new Date()}


    })


    const login = await request(app)
    .post("/api/v1/auth/login")
    .send({email, password:"Pass1234"})
    expect(login.status).toBe(200)


    return login.body.data.accessToken
}

const registerAndCreate = async (email, suffix)=>{
    const token = await registerAndLogin(email)
    const data = {
        licenseNumber: `LIC_${suffix}`,
        vehicleType: "ECONOMY",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehiclePlate: `PLT_${suffix}`,
        vehicleYear: 2020,
        settlementBank: "044",
        accountNumber: "0000000000"
    }
    const driver = await request(app)
    .post("/api/v1/drivers")
    .set("Authorization", `Bearer ${token}`)
    .send(data)
    expect(driver.status).toBe(201)
    return { profile: driver.body, token }
}

const registerAndLoginRider = async(email)=>{
   const res= await request(app)
   .post('/api/v1/auth/register')
   .send({email, password:"Pass12345", name:"Rider", role:"RIDER"})
   expect(res.status).toBe(201)

    await prisma.user.update({
        where:{email:email.toLowerCase()},
        data:{emailVerifiedAt: new Date()}
    
    })

     const login = await request(app)
    .post("/api/v1/auth/login")
    .send({email, password:"Pass12345"})
    expect(login.status).toBe(200)


    return login.body.data.accessToken

}


const driverData={
    licenseNumber:"LIC123456",
    vehicleType:"ECONOMY",
    vehicleMake:"Toyota",
    vehicleModel:"Camry",
    vehiclePlate:"ABC-123",
    vehicleYear: 2020,
    settlementBank: "044",
    accountNumber: "0000000000"
}
describe("POST /api/v1/drivers", ()=>{
    it("create driver profile", async()=>{
   const token= await registerAndLogin("d1@test.com")
   const decoded= jwt.decode(token)
   const res = await request(app)
   .post("/api/v1/drivers")
   .set("Authorization", `Bearer ${token}`) 
   .send(driverData) 
   
   expect(res.status).toBe(201)
    
    })

    it("rejects non-driver role", async()=>{
        const token = await registerAndLoginRider("Bad@example.com")
        const res= await request(app)
        .post("/api/v1/drivers")
        .set("Authorization", `Bearer ${token}`)
        .send(driverData)
        expect(res.status).toBe(403)
    })
    it("rejects unauthenticated request", async()=>{
        const res= await request(app)
        .post("/api/v1/drivers")
        .send(driverData)
        expect(res.status).toBe(401)
    })
  it("rejects duplicate driver profile", async()=>{
    const token = await registerAndLogin("dupdriver@test.com")
    const first = await request(app)
    .post("/api/v1/drivers")
    .set("Authorization", `Bearer ${token}`)
    .send({...driverData, licenseNumber:"LIC999999", vehiclePlate:"XYZ-999"})
    expect(first.status).toBe(201)

    const second = await request(app)
    .post("/api/v1/drivers")
    .set("Authorization", `Bearer ${token}`)
    .send({...driverData, licenseNumber:"LIC999999", vehiclePlate:"XYZ-999"})
    expect(second.status).toBe(409)

  })
    
})

describe("GET /api/v1/driver/me", ()=>{
    it("returns the authenticated driver's profile", async()=>{
       const data= await registerAndCreate("tobi@example.com", "TOBI")
       const res= await request(app)
       .get("/api/v1/drivers/me")
       .set("Authorization", `Bearer ${data.token}`)
       expect(res.status).toBe(200)
    })
    it("rejects unauthenticated requests", async()=>{
        const res = await request(app)
        .get("/api/v1/drivers/me")
        expect(res.status).toBe(401)
    })
    it("rejects non-driver requests", async()=>{
        const token = await registerAndLoginRider("girl@example.com")
        const res= await request(app)
        .get("/api/v1/drivers/me")
        expect(res.status).toBe(401)
    })
    
})

describe("GET /api/v1/drivers/:id", ()=>{
    it("fetch driver profile", async()=>{
        const { profile } = await registerAndCreate("groupie@example.com", "GRO")
        const token= await registerAndLoginRider("fee@example.com")
        const res= await request(app)
        
        .get(`/api/v1/drivers/${profile.driverProfileId}`)
        .set("Authorization", `Bearer ${token}`)
        expect(res.status).toBe(200)
        
        expect(res.body.driverProfileId).toBe(profile.driverProfileId)
    })
    it("driver not found", async()=>{
     const { profile } = await registerAndCreate("group@example.com", "GRP")
     const token= await  registerAndLoginRider("rider@example.com")
        const id = "999999"
        const res= await request(app)
        .get(`/api/v1/drivers/${id}`)
        .set("Authorization", `Bearer ${token}`)
        expect(res.status).toBe(404)

    })
  
})

describe("PATCH /api/v1/drivers/me", () => {
    it("updates vehicle fields", async () => {
        const { token } = await registerAndCreate("dupdme@test.com", "UPDME")
        const res = await request(app)
            .patch("/api/v1/drivers/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ vehicleMake: "Honda" })
        expect(res.status).toBe(200)
        expect(res.body.vehicleMake).toBe("Honda")
    })

    it("rejects empty body", async () => {
        const { token } = await registerAndCreate("dupdempty@test.com", "UPDE")
        const res = await request(app)
            .patch("/api/v1/drivers/me")
            .set("Authorization", `Bearer ${token}`)
            .send({})
        expect(res.status).toBe(422)
    })

    it("rejects unauthenticated request", async () => {
        const res = await request(app)
            .patch("/api/v1/drivers/me")
            .send({ vehicleMake: "Honda" })
        expect(res.status).toBe(401)
    })
})

describe("PATCH /api/v1/drivers/me/availability", () => {
    it("sets availability to true", async () => {
        const { token } = await registerAndCreate("davail1@test.com", "AVL1")
        const res = await request(app)
            .patch("/api/v1/drivers/me/availability")
            .set("Authorization", `Bearer ${token}`)
            .send({ isAvailable: true })
        expect(res.status).toBe(200)
        expect(res.body.isAvailable).toBe(true)
    })

    it("sets availability to false", async () => {
        const { token } = await registerAndCreate("davail2@test.com", "AVL2")
        await request(app)
            .patch("/api/v1/drivers/me/availability")
            .set("Authorization", `Bearer ${token}`)
            .send({ isAvailable: true })

        const res = await request(app)
            .patch("/api/v1/drivers/me/availability")
            .set("Authorization", `Bearer ${token}`)
            .send({ isAvailable: false })
        expect(res.status).toBe(200)
        expect(res.body.isAvailable).toBe(false)
    })

    it("rejects unauthenticated request", async () => {
        const res = await request(app)
            .patch("/api/v1/drivers/me/availability")
            .send({ isAvailable: true })
        expect(res.status).toBe(401)
    })
})

describe("GET /api/v1/drivers/riders/:id", () => {
    it("returns rider profile during active ride", async () => {
        const riderToken = await registerAndLoginRider("rvridr@test.com")
        const riderUser = await prisma.user.findUnique({ where: { email: "rvridr@test.com" } })
        const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: riderUser.userId } })

        const { token: driverToken } = await registerAndCreate("rvrdrv@test.com", "RVRD")
        const driverUser = await prisma.user.findUnique({ where: { email: "rvrdrv@test.com" } })
        const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.userId } })
        await prisma.driverProfile.update({
            where: { driverProfileId: driverProfile.driverProfileId },
            data: { isAvailable: true, approvalState: "APPROVED" }
        })

        const ride = await prisma.ride.create({
            data: {
                riderId: riderProfile.riderProfileId,
                driverProfileId: driverProfile.driverProfileId,
                pickupAddress: "10 Test St",
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
        await prisma.rideStateTransition.create({
            data: { rideId: ride.rideId, fromState: "REQUESTED", toState: "ACCEPTED" }
        })

        const res = await request(app)
            .get(`/api/v1/drivers/riders/${riderProfile.riderProfileId}`)
            .set("Authorization", `Bearer ${driverToken}`)
        expect(res.status).toBe(200)
        expect(res.body.riderProfileId).toBe(riderProfile.riderProfileId)
    })

    it("returns 403 when no active ride exists", async () => {
        const riderToken = await registerAndLoginRider("rvidle@test.com")
        const riderUser = await prisma.user.findUnique({ where: { email: "rvidle@test.com" } })
        const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: riderUser.userId } })

        const { token: driverToken } = await registerAndCreate("rvidrv@test.com", "RVID")
        const driverUser = await prisma.user.findUnique({ where: { email: "rvidrv@test.com" } })
        const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.userId } })

        const res = await request(app)
            .get(`/api/v1/drivers/riders/${riderProfile.riderProfileId}`)
            .set("Authorization", `Bearer ${driverToken}`)
        expect(res.status).toBe(403)
    })

    it("returns 403 when no active ride with rider", async () => {
        const { token: driverToken } = await registerAndCreate("rvnfdrv@test.com", "RVNF")
        const res = await request(app)
            .get("/api/v1/drivers/riders/999999")
            .set("Authorization", `Bearer ${driverToken}`)
        expect(res.status).toBe(403)
    })
})
