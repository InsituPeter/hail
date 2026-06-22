    import { check, group, sleep } from 'k6'
import http from 'k6/http'
import { BASE_URL, PASSWORD } from "../config.js"
import { loginUser, signWebhook, sleepBetween } from "../helpers.js"
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true }],
    http_req_duration: ['p(99)<500']
  }
}
const RIDER = { email: "loadtest-rider-0@test.com", password: PASSWORD }
const DRIVER = { email: "loadtest-driver-0@test.com", password: PASSWORD }
const ADMIN = { email: "loadtest-admin@test.com", password: PASSWORD }
export default function () {
  const riderToken = loginUser(BASE_URL, RIDER.email, RIDER.password)
  const driverToken = loginUser(BASE_URL, DRIVER.email, DRIVER.password)
  const adminToken = loginUser(BASE_URL, ADMIN.email, ADMIN.password)
  group("Rider profile", () => {
    const res = http.get(`${BASE_URL}/api/v1/riders/profile`, {
      headers: { Authorization: `Bearer ${riderToken}` }
    })
    check(res, { "GET /riders/profile status 200": (r) => r.status === 200 })
  })
  group("Driver profile + availability", () => {
    const me = http.get(`${BASE_URL}/api/v1/drivers/me`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    })
    check(me, { "GET /drivers/me status 200": (r) => r.status === 200 })
    const avail = http.patch(`${BASE_URL}/api/v1/drivers/me/availability`,
      JSON.stringify({ isAvailable: true }),
      { headers: { Authorization: `Bearer ${driverToken}`, "Content-Type": "application/json" } }
    )
    check(avail, { "PATCH /drivers/me/availability status 200": (r) => r.status === 200 })
  })
  group("Ride lifecycle", () => {
    const create = http.post(`${BASE_URL}/api/v1/rides`,
      JSON.stringify({
        pickupAddress: "Test Pickup", pickupLat: 6.5, pickupLng: 3.4,
        dropoffAddress: "Test Dropoff", dropoffLat: 6.4, dropoffLng: 3.3,
        vehicleType: "ECONOMY", paymentMethod: "CASH"
      }),
      { headers: { Authorization: `Bearer ${riderToken}`, "Content-Type": "application/json" } }
    )
    check(create, { "POST /rides status 200": (r) => r.status === 200 })
    const rideId = create.json("rideId")
    const accept = http.patch(`${BASE_URL}/api/v1/rides/${rideId}/accept`, null, {
      headers: { Authorization: `Bearer ${driverToken}` }
    })
    check(accept, { "PATCH /rides/:id/accept status 200": (r) => r.status === 200 })
    const start = http.patch(`${BASE_URL}/api/v1/rides/${rideId}/start`, null, {
      headers: { Authorization: `Bearer ${driverToken}` }
    })
    check(start, { "PATCH /rides/:id/start status 200": (r) => r.status === 200 })
    const complete = http.patch(`${BASE_URL}/api/v1/rides/${rideId}/complete`, null, {
      headers: { Authorization: `Bearer ${driverToken}` }
    })
    check(complete, { "PATCH /rides/:id/complete status 200": (r) => r.status === 200 })
    const cash = http.patch(`${BASE_URL}/api/v1/rides/${rideId}/confirm-cash`, null, {
      headers: { Authorization: `Bearer ${driverToken}` }
    })
    check(cash, { "PATCH /rides/:id/confirm-cash status 200": (r) => r.status === 200 })
  })
  group("Admin list endpoints", () => {
    const endpoints = ["rides", "drivers", "users", "payments"]
    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}/api/v1/admin/${ep}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      check(res, { "admin list ok": (r) => r.status === 200 })
    }
  })
  group("Webhook", () => {
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "smoke-ref-1", amount: 5000, status: "success" }
    })
    const signature = signWebhook(body, "sk_test_92da32c952c81cc0f060abee644c40b62977501f")
    const res = http.post(`${BASE_URL}/webhook/paystack`, body, {
      headers: { "x-paystack-signature": signature, "Content-Type": "application/json" }
    })
    check(res, { "POST /webhook/paystack status 200": (r) => r.status === 200 })
  })
}