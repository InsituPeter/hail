class RideController {
    constructor(rideService) {
        this.rideService = rideService
    }

    createRide = async (req, res) => {
        const { userId } = req.user
        const ride = await this.rideService.createRide(userId, req.body)
        res.status(200).json(ride)
    }

    acceptRide = async (req, res) => {
        const { userId } = req.user
        const { rideId } = req.params
        const ride = await this.rideService.acceptRide(rideId, userId)
        res.status(200).json(ride)
    }

    startRide = async (req, res) => {
        const { userId } = req.user
        const { rideId } = req.params
        const ride = await this.rideService.startRide(rideId, userId)
        res.status(200).json(ride)
    }

    cancelRide = async (req, res) => {
        const { userId, role } = req.user
        const { rideId } = req.params
        const { reason } = req.body
        const ride = await this.rideService.cancelRide(rideId, userId, role, reason)
        res.status(200).json(ride)
    }

    completeRide = async (req, res) => {
        const { userId } = req.user
        const { rideId } = req.params
        const ride = await this.rideService.completeRide(rideId, userId)
        res.status(200).json(ride)
    }

    confirmCashPayment = async (req, res) => {
        const { userId } = req.user
        const { rideId } = req.params
        await this.rideService.confirmCashPayment(rideId, userId)
        res.status(200).json({ message: "Cash payment confirmed" })
    }
}

module.exports = RideController
