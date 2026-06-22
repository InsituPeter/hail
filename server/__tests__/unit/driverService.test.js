process.env.JWT_SECRET="test-jwt-secret"

const DriverService = require("../../services/driverService")
const{
    ConflictError,
    ForbiddenError,
    NotFoundError,
    PaystackPermanentError,

}= require("../../error")



function makeDriverRepository(overrides={}){
   return {
    create:jest.fn(),
    findById:jest.fn(),
    findByUserId:jest.fn(),
    updateProfile:jest.fn(),
    updateAvailability:jest.fn(),
    upsertLocation:jest.fn(),
    findLocation:jest.fn(),
    ...overrides
   } 
}



function makepaystackGateway(overrides={}){
    return{
        initializeTransaction:jest.fn(),
        verifyTransaction:jest.fn(),
        chargeAuthorization:jest.fn(),
        createSubaccount:jest.fn(),
        ...overrides
    }}

 const driver={
    userId:23,
    driverProfileId:21,
    licenseNumber:"l234rftg",
    vehicleType:"ECONOMY",
    vehicleMake:"HONDA",
    vehiclePlate:"233333uht",

 }

 const data={
    vehicleType:"XL",
    vehicleMake:"Toyota"
 }
    describe("DriverService.createDriver()", ()=>{
    let driverRepository, paystackGateway, driverService
    beforeEach(()=>{
           driverRepository=makeDriverRepository(),
           paystackGateway=makepaystackGateway(),
           driverService= new DriverService(driverRepository, paystackGateway)
    })
    it("Throws conflict error if driver already exists", async()=>{
         driverRepository.findByUserId.mockResolvedValue(driver)
        await expect(driverService.createDriver(1, driver )).rejects.toThrow(ConflictError)
    
    })

    it("return driver", async()=>{
         driverRepository.findByUserId.mockResolvedValue(null)
         driverRepository.create.mockResolvedValue(driver)
         paystackGateway.createSubaccount.mockResolvedValue({subaccountCode:"SUB_123"})
        const result= await driverService.createDriver(1, driver)
        expect(result).toHaveProperty("userId")
        expect(result).toHaveProperty("licenseNumber")
        expect(driverRepository.updateProfile).toHaveBeenCalledWith(
             driver.driverProfileId,
            {paystackSubaccountCode: "SUB_123"}
        
        )
       

    })

    it("deletes driver record and re-throws on PaystackPermanentError", async () => {
        const permError = new PaystackPermanentError("Subaccount creation failed")
        driverRepository.findByUserId.mockResolvedValue(null)
        driverRepository.create.mockResolvedValue(driver)
        driverRepository.deleteById = jest.fn().mockResolvedValue()
        paystackGateway.createSubaccount.mockRejectedValue(permError)

        await expect(driverService.createDriver(1, driver)).rejects.toThrow(PaystackPermanentError)
        expect(driverRepository.deleteById).toHaveBeenCalledWith(driver.driverProfileId)
    })

    it("retries updateProfile up to 3 times on transient failure", async () => {
        driverRepository.findByUserId.mockResolvedValue(null)
        driverRepository.create.mockResolvedValue(driver)
        paystackGateway.createSubaccount.mockResolvedValue({subaccountCode:"SUB_123"})
        const err = new Error("DB timeout")
        driverRepository.updateProfile
            .mockRejectedValueOnce(err)
            .mockRejectedValueOnce(err)
            .mockResolvedValue({ ...driver, paystackSubaccountCode: "SUB_123" })

        const result = await driverService.createDriver(1, driver)

        expect(driverRepository.updateProfile).toHaveBeenCalledTimes(3)
        expect(result).toHaveProperty("licenseNumber")
    })

    it("throws after 3 failed updateProfile attempts", async () => {
        driverRepository.findByUserId.mockResolvedValue(null)
        driverRepository.create.mockResolvedValue(driver)
        paystackGateway.createSubaccount.mockResolvedValue({subaccountCode:"SUB_123"})
        const err = new Error("DB timeout")
        driverRepository.updateProfile
            .mockRejectedValueOnce(err)
            .mockRejectedValueOnce(err)
            .mockRejectedValueOnce(err)

        await expect(driverService.createDriver(1, driver)).rejects.toThrow("DB timeout")
        expect(driverRepository.updateProfile).toHaveBeenCalledTimes(3)
    })
    })

    describe("DriverService.findDriver()", ()=>{
    let driverRepository, driverService
    beforeEach(()=>{
        driverRepository= makeDriverRepository(),
        driverService = new DriverService(driverRepository, makepaystackGateway())

    })

    it("throw NotFound Error", async()=>{
        driverRepository.findById.mockResolvedValue(null)
        await expect(driverService.findDriver(45)).rejects.toThrow(NotFoundError)
    })
    it("return driver", async()=>{
        driverRepository.findById.mockResolvedValue(driver)
        const result = await driverService.findDriver(21)
        expect(result.licenseNumber).toBe("l234rftg")
        expect(result.vehiclePlate).toBe("233333uht")
    })
    })


    describe("DriverService.getProfile()", ()=>{
        let driverRepository, driverService
        beforeEach(()=>{
            driverRepository= makeDriverRepository()
            driverService= new DriverService(driverRepository, makepaystackGateway())
        })
        it("throw Not Found Error", async()=>{
            driverRepository.findByUserId.mockResolvedValue(null)
            await expect( driverService.getProfile(23)).rejects.toThrow(NotFoundError)
        })
        it("return user", async()=>{
            driverRepository.findByUserId.mockResolvedValue(driver)
            const result = await driverService.getProfile(23)
            expect(result.userId).toBe(23)
            expect(result.vehicleMake).toBe("HONDA")
        })
    })

    describe("DriverService.updateDriverProfile()", ()=>{
        let driverRepository, driverService
        beforeEach(()=>{
            driverRepository= makeDriverRepository()
            driverService= new DriverService(driverRepository, makepaystackGateway())
        })
       it("throws NotFoundError when driver does not exist", async()=>{
          driverRepository.findByUserId.mockResolvedValue(null)
          await expect(driverService.updateDriverProfile(23, data)).rejects.toThrow(NotFoundError)
       })
       it("returns updated profile", async()=>{
          driverRepository.findByUserId.mockResolvedValue(driver)
          driverRepository.updateProfile.mockResolvedValue({ ...driver, ...data })
          const result = await driverService.updateDriverProfile(23, data)
          expect(result.vehicleMake).toBe("Toyota")
          expect(result.vehicleType).toBe("XL")
       })
    })

    describe("DriverService.setAvailability()", ()=>{
        let driverRepository, driverService
        beforeEach(()=>{
            driverRepository= makeDriverRepository()
            driverService= new DriverService(driverRepository, makepaystackGateway())
        })
        it("throws NotFoundError when driver does not exist", async()=>{
            driverRepository.findByUserId.mockResolvedValue(null)
            await expect(driverService.setAvailability(23, true)).rejects.toThrow(NotFoundError)
        })
        it("updates availability", async()=>{
            driverRepository.findByUserId.mockResolvedValue(driver)
            driverRepository.updateAvailability.mockResolvedValue({ ...driver, isAvailable: true })
            const result = await driverService.setAvailability(23, true)
            expect(result.isAvailable).toBe(true)
        })
    })

    describe("DriverService.updateLocation()", ()=>{
        let driverRepository, driverService
        beforeEach(()=>{
            driverRepository= makeDriverRepository()
            driverService= new DriverService(driverRepository, makepaystackGateway())
        })
        it("throws NotFoundError when driver does not exist", async()=>{
            driverRepository.findById.mockResolvedValue(null)
            await expect(driverService.updateLocation(21, 6.5, 3.3, 90)).rejects.toThrow(NotFoundError)
        })
        it("upserts driver location", async()=>{
            driverRepository.findById.mockResolvedValue(driver)
            driverRepository.upsertLocation.mockResolvedValue()
            await driverService.updateLocation(21, 6.5, 3.3, 90)
            expect(driverRepository.upsertLocation).toHaveBeenCalledWith(21, 6.5, 3.3, 90)
        })
    })

