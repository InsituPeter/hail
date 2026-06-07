const RideService =require("../../services/rideService")
const {NotFoundError, ConflictError, ForbiddenError} = require("../../error")


 function makeRideRepository(overrides={}){
 return{
    create:jest.fn(),
    findById:jest.fn(),
    findByRider:jest.fn(),
    findByDriver:jest.fn(),
    findActiveByDriver:jest.fn(),
    findActiveByRider:jest.fn(),
    updateState:jest.fn(),
    acceptRide:jest.fn(),
    ...overrides
 }
}


 function makeDriverRepository(overrides={}){
    return{
       create:jest.fn(),
    findById:jest.fn(),
    findByUserId:jest.fn(),
    findProfile:jest.fn(),
    updateProfile:jest.fn(),
    updateAvailability:jest.fn(),
    upsertLocation:jest.fn(),
    findLocation:jest.fn(),
    ...overrides 
    }
 }

 function makeRiderRepository(overrides={}){
    return{
        create:jest.fn(),
        findByRiderId:jest.fn(),
        updateRiderProfile:jest.fn(),
        findByUserId:jest.fn(),
        ...overrides    
 }
}


function makePaymentService(overrides={}){
   return{
    initiatePayment:jest.fn(),
    handlePaymentSuccess:jest.fn(),
    handlePaymentFailure:jest.fn(),
    confirmCashPayment:jest.fn(),
    ...overrides
   }
}


function makeMapService(overrides={}){
    return{
        getDistanceAndDuration:jest.fn(),
        ...overrides
    }
}

function makeEventPublisher(overrides={}){
    return{
        publishRideEvent:jest.fn(),
        publishRideRequested:jest.fn(),
        publishPaymentEvent:jest.fn(),
        ...overrides
     
    }
}

const data={
    pickupLat:6.5244,
    pickupLng:3.3792,
    dropoffLat:6.465422,
    dropoffLng:3.406448,
    pickupAddress:"Lagos Island",
    dropoffAddress:"Victoria Island",
    vehicleType:"ECONOMY"
}

const rider={
    riderProfileId:1,
    userId:4,
    rating:4.5,
    totalRides:100,
    

}

const ride={
    rideId:3,
    riderId:2,
    driverProfileId:2,
    pickupLat:6.5244,
    pickupLng:3.3792,
    dropoffLat:6.465422,
    dropoffLng:3.406448,
    pickupAddress:"Lagos Island",
    dropoffAddress:"Victoria Island",
    vehicleType:"ECONOMY",
    paymentMethod:"CASH"
}



const driver={
    driverProfileId:2,
    userId:5,
    licenseNumber:"ABC123",
    vehicleMake:"Toyota",
    vehicleModel:"Camry",
    vehicleYear:2020,
}

describe("RideService.createRide()", ()=>{
    let rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher, rideService
    beforeEach(()=>{
        rideRepository=makeRideRepository(),
        driverRepository=makeDriverRepository(),
        riderRepository=makeRiderRepository(),
        paymentService=makePaymentService(),
        mapService=makeMapService(),
        eventPublisher=makeEventPublisher(),
        rideService=new RideService(rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher)
    })



    it("Throws not found error if rider profile does not exist", async()=>{
        riderRepository.findByUserId.mockResolvedValue(null)
        await expect(rideService.createRide(1, data)).rejects.toThrow(NotFoundError)
    })

    it("Throws conflict error if the rider is already on an active ride", async()=>{
        riderRepository.findByUserId.mockResolvedValue(rider)
        rideRepository.findActiveByRider.mockResolvedValue({ rideId: 99 })
        await expect(rideService.createRide(1, data)).rejects.toThrow(ConflictError)
    })

    it("Creates  a ride successfully", async()=>{
        riderRepository.findByUserId.mockResolvedValue(rider)
        rideRepository.findActiveByRider.mockResolvedValue(null)
        mapService.getDistanceAndDuration.mockResolvedValue({ distanceKm: 5 })
        rideRepository.create.mockResolvedValue({rideId:1, ...data})
        driverRepository.findProfile.mockResolvedValue([])
        eventPublisher.publishRideRequested.mockResolvedValue()
        const result=await rideService.createRide(1, data)
        expect(mapService.getDistanceAndDuration).toHaveBeenCalledWith(data.pickupLat, data.pickupLng, data.dropoffLat, data.dropoffLng)
        expect(rideRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            riderId:rider.riderProfileId,
            pickupLat:data.pickupLat,
            pickupLng:data.pickupLng,
            dropoffLat:data.dropoffLat,
            dropoffLng:data.dropoffLng,
            pickupAddress:data.pickupAddress,
            dropoffAddress:data.dropoffAddress,
            vehicleType:data.vehicleType,
            estimatedFare: 1000
        }))
        expect(eventPublisher.publishRideRequested).toHaveBeenCalledWith(expect.objectContaining({
            rideId:1,
            vehicleType:data.vehicleType,       
            pickupAddress:data.pickupAddress,
        }))
        expect(result).toEqual({rideId:1, ...data})
    })
})


describe("RideService.acceptRide()", ()=>{
    let rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher, rideService
    beforeEach(()=>{
        rideRepository=makeRideRepository(),
        driverRepository=makeDriverRepository(),
        riderRepository=makeRiderRepository(),
        paymentService=makePaymentService(),
        mapService=makeMapService(),
        eventPublisher=makeEventPublisher(),
        rideService=new RideService(rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher)
    })

  it("Throws not found error if ride does not exist", async()=>{
    rideRepository.findById.mockResolvedValue(null)
    await expect(rideService.acceptRide(1, 4)).rejects.toThrow(NotFoundError)

  })

  it("Throws conflict error if the ride is not in requested state", async()=>{
    
    
    rideRepository.findById.mockResolvedValue({...ride, state:"ACCEPTED"})
    await expect(rideService.acceptRide(1, 4)).rejects.toThrow(ConflictError)
  }
  )

  it("Throws not found error if driver profile does not exist", async()=>{
      rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED"})
      driverRepository.findByUserId.mockResolvedValue(null)
      await expect(rideService.acceptRide(1, 4)).rejects.toThrow(NotFoundError)
  })
  it("Throws Forbidden error if driver is unavailable", async()=>{
        rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED"})
        driverRepository.findByUserId.mockResolvedValue({...driver, isAvailable:false})
        await expect(rideService.acceptRide(1, 4)).rejects.toThrow(ForbiddenError) 
  })

  it("Throws forbidden error if approval state isn't approved", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED"})
    driverRepository.findByUserId.mockResolvedValue({...driver, isAvailable:true, approvalState:"PENDING"})
    await expect(rideService.acceptRide(1, 4)).rejects.toThrow(ForbiddenError) 
  })

  it("Throws conflict error if driver is on another active ride", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED"})
    driverRepository.findByUserId.mockResolvedValue({...driver, isAvailable:true, approvalState:"APPROVED"})
    rideRepository.findActiveByDriver.mockResolvedValue(ride)
    await expect(rideService.acceptRide(1, 4)).rejects.toThrow(ConflictError)

  })

  it("Accepts ride successfully", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED"})
    driverRepository.findByUserId.mockResolvedValue({...driver, isAvailable:true, approvalState:"APPROVED"})
    rideRepository.findActiveByDriver.mockResolvedValue(null)
    rideRepository.acceptRide.mockResolvedValue({...ride, state:"ACCEPTED", driverProfileId:driver.driverProfileId, acceptedAt: new Date("2024-11-26")})
    eventPublisher.publishRideEvent.mockResolvedValue()
    const result = await rideService.acceptRide(ride.rideId, 4)
    expect(result).toEqual({...ride, state:"ACCEPTED", driverProfileId:driver.driverProfileId, acceptedAt: new Date("2024-11-26")})
    expect(eventPublisher.publishRideEvent).toHaveBeenCalledWith(ride.rideId, "ride:accepted", expect.objectContaining({
        rideId:ride.rideId,
        driverProfileId:driver.driverProfileId}))
   expect(rideRepository.acceptRide).toHaveBeenCalledWith(ride.rideId, driver.driverProfileId)
  })
})

describe("RideService.startRide()",()=>{
    let rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher, rideService
    beforeEach(()=>{
        rideRepository=makeRideRepository(),
        driverRepository=makeDriverRepository(),
        riderRepository=makeRiderRepository(),
        paymentService=makePaymentService(),
        mapService=makeMapService(),
        eventPublisher=makeEventPublisher(),
        rideService=new RideService(rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher)              
})
it("Throws not found error if ride does not exist", async()=>{
   rideRepository.findById.mockResolvedValue(null)
    await expect(rideService.startRide(1, 4)).rejects.toThrow(NotFoundError)

})
it("Throws conflict error if the ride is not in accepted state", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED"})
    await expect(rideService.startRide(1, 4)).rejects.toThrow(ConflictError)

})

it("Throws not found error if the driver does not exist", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"ACCEPTED"})
    driverRepository.findByUserId.mockResolvedValue(null)
    await expect(rideService.startRide(1, 4)).rejects.toThrow(NotFoundError)
})
it("Throws Forbidden error if the driver is not assigned to the ride", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"ACCEPTED", driverProfileId:2})
    driverRepository.findByUserId.mockResolvedValue({...driver, driverProfileId:3})
    await expect(rideService.startRide(1, 4)).rejects.toThrow(ForbiddenError)
})
it("Starts ride successfully", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"ACCEPTED", driverProfileId:2})
    driverRepository.findByUserId.mockResolvedValue(driver)
    rideRepository.updateState.mockResolvedValue({...ride, state:"IN_PROGRESS", pickupAt: new Date("2024-11-26")})
    eventPublisher.publishRideEvent.mockResolvedValue()
    const result=await rideService.startRide(ride.rideId, 4)
    expect(result).toEqual({...ride, state:"IN_PROGRESS", pickupAt: new Date("2024-11-26")})
    expect(rideRepository.updateState).toHaveBeenCalledWith(ride.rideId, "IN_PROGRESS", expect.objectContaining({
        pickupAt: expect.any(Date)
    }))
    expect(eventPublisher.publishRideEvent).toHaveBeenCalledWith(ride.rideId, "ride:started", expect.objectContaining({
        rideId:ride.rideId
    }))
})

describe("RideService.completeRide()", ()=>{
    let rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher, rideService
    beforeEach(()=>{
        rideRepository=makeRideRepository(),
        driverRepository=makeDriverRepository(),
        riderRepository=makeRiderRepository(),
        paymentService=makePaymentService(),
        mapService=makeMapService(),
        eventPublisher=makeEventPublisher(),
        rideService=new RideService(rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher)
})
it("Throws not found error if ride does not exist", async()=>{
   rideRepository.findById.mockResolvedValue(null)
    await expect(rideService.completeRide(1, 4)).rejects.toThrow(NotFoundError)

})
it("Throws conflict error if ride is not in progress", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED"})
    await expect(rideService.completeRide(1, 4)).rejects.toThrow(ConflictError)

})
it("Throws not found error if driver does not exist", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"IN_PROGRESS"})
    driverRepository.findByUserId.mockResolvedValue(null)
    await expect(rideService.completeRide(1, 4)).rejects.toThrow(NotFoundError)

})
it("Throws forbidden error if wrong driver", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"IN_PROGRESS", driverProfileId:2})
    driverRepository.findByUserId.mockResolvedValue({...driver, driverProfileId:3})
    await expect(rideService.completeRide(1, 4)).rejects.toThrow(ForbiddenError)

})
it("Completes ride and initiates payment on success", async()=>{
    rideRepository.findById.mockResolvedValue({...ride, state:"IN_PROGRESS", driverProfileId:2, estimatedFare:1500})
    driverRepository.findByUserId.mockResolvedValue(driver)
    riderRepository.findByRiderId.mockResolvedValue(rider)
    paymentService.initiatePayment.mockResolvedValue()
    rideRepository.updateState.mockResolvedValue({...ride, state:"COMPLETED", finalFare:1500, completedAt: new Date("2024-11-26")})
    eventPublisher.publishRideEvent.mockResolvedValue()
    const result=await rideService.completeRide(ride.rideId, 4)
    expect(rideRepository.updateState).toHaveBeenCalledWith(ride.rideId, "COMPLETED", expect.objectContaining({
        completedAt: expect.any(Date),
        finalFare:1500,
    }))
    expect(paymentService.initiatePayment).toHaveBeenCalledTimes(1)
    expect(eventPublisher.publishRideEvent).toHaveBeenCalledWith(ride.rideId, "ride:completed", expect.objectContaining({
        rideId:ride.rideId,
        finalFare:1500,
    }))
})

})

describe("RideService.cancelRide()", ()=>{
    let rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher, rideService
    beforeEach(()=>{
        rideRepository=makeRideRepository(),
        driverRepository=makeDriverRepository(),
        riderRepository=makeRiderRepository(),
        paymentService=makePaymentService(),
        mapService=makeMapService(),
        eventPublisher=makeEventPublisher(),
        rideService=new RideService(rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher)
    })

    it("throws NotFoundError when ride does not exist", async()=>{
        rideRepository.findById.mockResolvedValue(null)
        await expect(rideService.cancelRide(1, 4, "RIDER")).rejects.toThrow(NotFoundError)
    })

    it("throws ConflictError when ride is in progress", async()=>{
        rideRepository.findById.mockResolvedValue({...ride, state:"IN_PROGRESS"})
        await expect(rideService.cancelRide(1, 4, "RIDER")).rejects.toThrow(ConflictError)
    })

    it("throws ForbiddenError when rider cancels another rider's ride", async()=>{
        rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED", riderId:2})
        riderRepository.findByUserId.mockResolvedValue({...rider, riderProfileId:99})
        await expect(rideService.cancelRide(1, 4, "RIDER")).rejects.toThrow(ForbiddenError)
    })

    it("throws ForbiddenError when driver cancels another driver's ride", async()=>{
        rideRepository.findById.mockResolvedValue({...ride, state:"ACCEPTED", driverProfileId:2})
        driverRepository.findByUserId.mockResolvedValue({...driver, driverProfileId:99})
        await expect(rideService.cancelRide(1, 4, "DRIVER")).rejects.toThrow(ForbiddenError)
    })

    it("rider cancels their own ride successfully", async()=>{
        rideRepository.findById.mockResolvedValue({...ride, state:"REQUESTED", riderId:4})
        riderRepository.findByUserId.mockResolvedValue({...rider, riderProfileId:4})
        rideRepository.updateState.mockResolvedValue({...ride, state:"CANCELLED", cancellationReason:"changed mind"})
        eventPublisher.publishRideEvent.mockResolvedValue()
        const result=await rideService.cancelRide(1, 4, "RIDER", "changed mind")
        expect(result.state).toBe("CANCELLED")
        expect(eventPublisher.publishRideEvent).toHaveBeenCalledWith(1, "ride:cancelled", expect.objectContaining({
            rideId:1,
            reason:"changed mind"
        }))
    })

    it("driver cancels their own ride successfully", async()=>{
        rideRepository.findById.mockResolvedValue({...ride, state:"ACCEPTED", driverProfileId:2, riderId:4})
        riderRepository.findByUserId.mockResolvedValue({...rider, riderProfileId:4})
        driverRepository.findByUserId.mockResolvedValue(driver)
        rideRepository.updateState.mockResolvedValue({...ride, state:"CANCELLED", cancellationReason:"traffic"})
        eventPublisher.publishRideEvent.mockResolvedValue()
        const result=await rideService.cancelRide(1, 5, "DRIVER", "traffic")
        expect(result.state).toBe("CANCELLED")
        expect(eventPublisher.publishRideEvent).toHaveBeenCalledWith(1, "ride:cancelled", expect.objectContaining({
            rideId:1,
            reason:"traffic"
        }))
    })
})

describe("RideService.confirmCashPayment()", ()=>{
    let rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher, rideService
    beforeEach(()=>{
        rideRepository=makeRideRepository(),
        driverRepository=makeDriverRepository(),
        riderRepository=makeRiderRepository(),
        paymentService=makePaymentService(),
        mapService=makeMapService(),
        eventPublisher=makeEventPublisher(),
        rideService=new RideService(rideRepository, driverRepository, riderRepository, paymentService, mapService, eventPublisher)
    })

    it("delegates to paymentService.confirmCashPayment", async()=>{
        paymentService.confirmCashPayment.mockResolvedValue()
        await rideService.confirmCashPayment(1, 5)
        expect(paymentService.confirmCashPayment).toHaveBeenCalledWith(1, 5)
    })
})
})