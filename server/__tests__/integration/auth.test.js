const http = require("http")
const request = require("supertest")
const expressApp = require("../../app")
const app = http.createServer(expressApp)
const prisma= require("../../config/prisma")
const crypto = require("crypto")

jest.setTimeout(30000)

const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex")

async function registerUser(email, password, name, role) {
  const reg = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password, name, role })
  return reg
}

async function verifyUser(email) {
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerifiedAt: new Date() }
  })
}


describe('POST  /api/v1/auth/register', ()=>{
    it("rejects missing fields", async()=>{
       const res= await request(app)
         .post("/api/v1/auth/register")
        .send({email:"rider@test.com"})


        expect(res.status).toBe(422)

    })

    it("rejects duplicate fields", async()=>{
       const first= await request(app)
        .post("/api/v1/auth/register")
        .send({email:"dup@test.com", password:"Pass1234", name:"Dup", role:"RIDER"})
         
        expect(first.statusCode).toBe(201)
        const second = await request(app)
        .post("/api/v1/auth/register")
        .send({email:"dup@test.com", password:"Pass1234", name:"Dup", role:"RIDER"})
        
        expect(second.status).toBe(409)
        
        
    })
    it("registers  a rider", async()=>{
      const res= await request(app)
        .post("/api/v1/auth/register")
        .send({email:"rider@test.com", password:"Pass1234", name:"Test", role:"RIDER"})

        expect(res.status).toBe(201)
       // expect(res.body.message).toMatch(/verif/i)
    })
})


describe('POST /api/v1/auth/login', ()=>{
    it('rejects invalid user email', async()=>{
       
      
        
        const res= await request(app)
        .post("/api/v1/auth/login")
        .send({email:"val@example.com",password:"345678766" })


        
        expect(res.status).toBe(404)
    })


    it('rejects wrong password', async()=>{
      

       const res =await request(app)
       .post("/api/v1/auth/register")
       .send({email:"res@example.com", password:"Pass12466", name:"Log", role:"RIDER"})
    
    

       expect(res.status).toBe(201)

        const rider = await request(app)
        .post("/api/v1/auth/login")
        .send({email:"res@example.com", password:"Pass12466y"})
    
      expect(rider.status).toBe(403)
    })
     
    it("denies unverified addresses access ", async ()=>{
        const register = await request(app)
        .post("/api/v1/auth/register")
        .send({email:"ride@example.com", password:'pash2056', name:"Auth", role:"RIDER"})

        expect(register.status).toBe(201)

        const res= await request(app)
        .post('/api/v1/auth/login')
        .send({email:"ride@example.com", password:"pash2056"})

        expect(res.status).toBe(403)
    })
    it("logs in with correct credentials", async()=>{
       const register= await request(app)
        .post("/api/v1/auth/register")
        .send({email:"clear@example.com", password:"Pass1234", name:"Auth ", role:"RIDER"})

        await prisma.user.update({
            where:{email:"clear@example.com"},
            data:({emailVerifiedAt: new Date()})
        })
         expect(register.status).toBe(201)
        const res= await request(app)
        .post("/api/v1/auth/login")
        .send({email:"clear@example.com", password:"Pass1234"})
         
        expect(res.status).toBe(200)
        expect(res.body.data.accessToken).toBeDefined()
    })
  
})

describe('POST /api/v1/auth/refresh', ()=>{
    it('refresh token', async()=>{
        
        const agent = request.agent(app)
        const reg = await agent
        .post("/api/v1/auth/register")
        .send({email:"fresh@example.com", password:"Pass12344", name:"Fresh", role:"RIDER"})
        expect(reg.status).toBe(201)


        await prisma.user.update({
            where:{email:"fresh@example.com"},
            data:{emailVerifiedAt:new Date()}
        })

        const login = await agent
        .post("/api/v1/auth/login")
        .send({email:"fresh@example.com", password:"Pass12344"})
        expect(login.status).toBe(200)


        const refresh= await agent
        .post("/api/v1/auth/refresh")
        expect(refresh.status).toBe(200)
        expect(refresh.body.data.accessToken).toBeDefined()
    })

    it("rejects invalid token", async()=>{
    
        const reg= await request(app)
        .post("/api/v1/auth/register")
        .send({email:"fre@example.com", password:"Pass12344", name:"log", role:"RIDER"})


          await prisma.user.update({
            where:{email:"fre@example.com"},
            data:{emailVerifiedAt:new Date()}
        })
        expect(reg.status).toBe(201)
      
       const login =await request(app)
       .post("/api/v1/auth/login")
       .send({email:"fre@example.com", password:'Pass12344'})

        expect(login.status).toBe(200)

        const refresh= await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", "refreshToken=notarealtoken")
        expect(refresh.status).toBe(401)
    })

    it("rejects missing cookie", async()=>{
           const reg= await request(app)
        .post("/api/v1/auth/register")
        .send({email:"freh@example.com", password:"Pass12344", name:"log", role:"RIDER"})


          await prisma.user.update({
            where:{email:"freh@example.com"},
            data:{emailVerifiedAt:new Date()}
        })
        expect(reg.status).toBe(201)
      
       const login =await request(app)
       .post("/api/v1/auth/login")
        .send({email:"freh@example.com", password:'Pass12344'})

        expect(login.status).toBe(200)

         const refresh= await request(app)
        .post("/api/v1/auth/refresh")
        expect(refresh.status).toBe(401)

    })
})
describe('/POST  /api/v1/auth/logout', ()=>{
    it('logout and revoke token', async()=>{
        const agent = request.agent(app)
        const reg= await agent
        .post("/api/v1/auth/register")
        .send({email:"girllogout@test.com", password:"girl456778", name:"girl", role:"RIDER"})

        expect(reg.status).toBe(201)

        await prisma.user.update({
            where: { email: "girllogout@test.com" },
            data: { emailVerifiedAt: new Date() }
        })

        const login= await agent
        .post("/api/v1/auth/login")
        .send({email:"girllogout@test.com", password:"girl456778"})
          
        expect(login.status).toBe(200)

        const logout= await agent
        .post("/api/v1/auth/logout")

        expect(logout.status).toBe(200)

        const after= await agent.post("/api/v1/auth/refresh")
        expect(after.status).toBe(401)

    })

    it('Invalid Token', async()=>{
        const register= await request(app)
        .post("/api/v1/auth/register")
        .send({email:"tobilogout@test.com", password:'tobipeter', name:"tobi", role:"RIDER"})
         
        expect(register.status).toBe(201)

        await prisma.user.update({
            where: { email: "tobilogout@test.com" },
            data: { emailVerifiedAt: new Date() }
        })

        const login= await request(app)
        .post("/api/v1/auth/login")
        .send({email:"tobilogout@test.com", password:"tobipeter"})

        expect(login.status).toBe(200)


        const refresh =await request(app)
        .post('/api/v1/auth/refresh')
        .set("Cookie", "refreshToken=notarealToken")

        expect(refresh.status).toBe(401)
    })
})

describe("GET /api/v1/auth/verify-email", () => {
    it("verifies email with valid token", async () => {
        const res = await registerUser("verifyok@test.com", "Pass1234", "VerifyOk", "RIDER")
        expect(res.status).toBe(201)

        const user = await prisma.user.findUnique({ where: { email: "verifyok@test.com" } })
        const rawToken = "test_verify_token_ok"
        const hashed = hashToken(rawToken)
        await prisma.token.create({
            data: {
                userId: user.userId,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                token: hashed,
                type: "EMAIL",
                state: "ACTIVE",
                ipAddress: null,
                userAgent: null
            }
        })

        const verify = await request(app)
            .get(`/api/v1/auth/verify-email?token=${rawToken}`)
        expect(verify.status).toBe(200)
        expect(verify.body.message).toMatch(/verified/i)

        const updated = await prisma.user.findUnique({ where: { email: "verifyok@test.com" } })
        expect(updated.emailVerifiedAt).toBeTruthy()
    })

    it("rejects invalid token", async () => {
        const res = await request(app)
            .get("/api/v1/auth/verify-email?token=nonexistent_token")
        expect(res.status).toBe(401)
    })

    it("rejects missing token", async () => {
        const res = await request(app)
            .get("/api/v1/auth/verify-email")
        expect(res.status).toBe(500)
    })
})

describe("POST /api/v1/auth/forgot-password", () => {
    it("sends reset link for existing email", async () => {
        const reg = await registerUser("forgotok@test.com", "Pass1234", "ForgotOk", "RIDER")
        expect(reg.status).toBe(201)
        await verifyUser("forgotok@test.com")

        const res = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({ email: "forgotok@test.com" })
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/reset/i)
    })

    it("returns 404 for non-existent email", async () => {
        const res = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({ email: "nobody@test.com" })
        expect(res.status).toBe(404)
    })

    it("rejects invalid email format", async () => {
        const res = await request(app)
            .post("/api/v1/auth/forgot-password")
            .send({ email: "not-an-email" })
        expect(res.status).toBe(422)
    })
})

describe("POST /api/v1/auth/reset-password", () => {
    it("resets password with valid token", async () => {
        const reg = await registerUser("resetok@test.com", "Pass1234", "ResetOk", "RIDER")
        expect(reg.status).toBe(201)
        await verifyUser("resetok@test.com")

        const user = await prisma.user.findUnique({ where: { email: "resetok@test.com" } })
        const rawToken = "test_reset_token_ok"
        const hashed = hashToken(rawToken)
        await prisma.token.create({
            data: {
                userId: user.userId,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                token: hashed,
                type: "PASSWORD",
                state: "ACTIVE",
                ipAddress: null,
                userAgent: null
            }
        })

        const res = await request(app)
            .post("/api/v1/auth/reset-password")
            .send({ token: rawToken, password: "NewPass5678" })
        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/reset/i)

        const loginAfter = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "resetok@test.com", password: "NewPass5678" })
        expect(loginAfter.status).toBe(200)
    })

    it("rejects invalid token", async () => {
        const res = await request(app)
            .post("/api/v1/auth/reset-password")
            .send({ token: "bad_token", password: "NewPass5678" })
        expect(res.status).toBe(401)
    })

    it("rejects already-used token", async () => {
        const reg = await registerUser("resetused@test.com", "Pass1234", "ResetUsed", "RIDER")
        expect(reg.status).toBe(201)
        await verifyUser("resetused@test.com")

        const user = await prisma.user.findUnique({ where: { email: "resetused@test.com" } })
        const rawToken = "test_reset_token_used"
        const hashed = hashToken(rawToken)
        await prisma.token.create({
            data: {
                userId: user.userId,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                token: hashed,
                type: "PASSWORD",
                state: "USED",
                ipAddress: null,
                userAgent: null,
                usedAt: new Date()
            }
        })

        const res = await request(app)
            .post("/api/v1/auth/reset-password")
            .send({ token: rawToken, password: "NewPass5678" })
        expect(res.status).toBe(401)
    })
})
