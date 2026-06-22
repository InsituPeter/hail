const prisma = require("../config/prisma")
const bcrypt= require("bcryptjs")

const SALT_ROUNDS =10
const PASSWORD ="TestPass123"

const main = async () => {
    const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS)
    const now = new Date()

    await prisma.user.upsert({
        where: { email: "loadtest-admin@test.com" },
        update: {},
        create: { email: "loadtest-admin@test.com", password: hash, name: "Load Test Admin", role: "ADMIN", emailVerifiedAt: now }
    })

    for (let i = 0; i < 10; i++) {
        const rider = await prisma.user.upsert({
            where: { email: `loadtest-rider-${i}@test.com` },
            update: {},
            create: { email: `loadtest-rider-${i}@test.com`, password: hash, name: `Load Test Rider ${i}`, role: "RIDER", emailVerifiedAt: now }
        })

        await prisma.riderProfile.upsert({
            where: { userId: rider.userId },
            update: {},
            create: { userId: rider.userId }
        })
    }

    const types = ["ECONOMY", "COMFORT", "XL"]
    for (let i = 0; i < 10; i++) {
        const driver = await prisma.user.upsert({
            where: { email: `loadtest-driver-${i}@test.com` },
            update: {},
            create: { email: `loadtest-driver-${i}@test.com`, password: hash, name: `Load Test Driver ${i}`, role: "DRIVER", emailVerifiedAt: now }
        })

        await prisma.driverProfile.upsert({
            where: { userId: driver.userId },
            update: {},
            create: {
                userId: driver.userId,
                licenseNumber: `LDT-${String(i).padStart(4, "0")}`,
                vehicleType: types[i % 3],
                vehicleMake: "Toyota",
                vehicleModel: "Camry",
                vehiclePlate: `LDT-${String(i).padStart(3, "0")}-HA`,
                vehicleYear: 2022,
                isAvailable: true,
                approvalState: "APPROVED"
            }
        })
    }

    console.log("Seed complete: 1 admin + 10 riders + 10 drivers")
}

main().catch(console.error).finally(()=> prisma.$disconnect())