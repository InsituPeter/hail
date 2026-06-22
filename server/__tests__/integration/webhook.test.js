const http = require("http")
const request = require("supertest")
const crypto = require("crypto")
const expressApp = require("../../app")
const app = http.createServer(expressApp)
const prisma = require("../../config/prisma")

jest.setTimeout(30000)

const PAYSTACK_SECRET = "sk_test_92da32c952c81cc0f060abee644c40b62977501f"

const createSignature = (body) => {
  const raw = JSON.stringify(body)
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(raw)
    .digest("hex")
  return hash
}

describe("POST /webhook/paystack", () => {
  it("rejects invalid signature", async () => {
    const res = await request(app)
      .post("/webhook/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", "invalid-signature")
      .send({ event: "charge.success", data: {} })
    expect(res.status).toBe(400)
  })

  it("handles charge.success event", async () => {
    const payload = {
      event: "charge.success",
      data: {
        reference: "ref_test_success",
        authorization: { authorization_code: "AUTH_test123" },
        customer: { email: "rider@test.com" }
      }
    }
    const signature = createSignature(payload)

    const res = await request(app)
      .post("/webhook/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", signature)
      .send(payload)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true })
  })

  it("handles charge.failed event", async () => {
    const payload = {
      event: "charge.failed",
      data: {
        reference: "ref_test_failed"
      }
    }
    const signature = createSignature(payload)

    const res = await request(app)
      .post("/webhook/paystack")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", signature)
      .send(payload)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true })
  })
})
