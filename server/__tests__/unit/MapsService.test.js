jest.mock("@googlemaps/google-maps-services-js", () => ({
    Client: jest.fn().mockImplementation(() => ({
        distancematrix: jest.fn(),
    })),
}))

const { AppError } = require("../../error")
const MapsService = require("../../services/mapService")

const mockConfig = {
    googleMap: { apiKeys: "fake_api_key" },
}

describe("MapsService.getDistanceAndDuration()", () => {
    it("returns distance and duration on successful API response", async () => {
        const mapsService = new MapsService(mockConfig)
        mapsService.client.distancematrix.mockResolvedValue({
            data: {
                rows: [
                    {
                        elements: [
                            {
                                status: "OK",
                                distance: { value: 5000 },
                                duration: { value: 600 },
                            },
                        ],
                    },
                ],
            },
        })

        const result = await mapsService.getDistanceAndDuration(6.5, 3.4, 6.6, 3.5)

        expect(result.distanceKm).toBe(5)
        expect(result.durationMin).toBe(10)
    })

    it("throws AppError when API returns no route", async () => {
        const mapsService = new MapsService(mockConfig)
        mapsService.client.distancematrix.mockResolvedValue({
            data: {
                rows: [
                    {
                        elements: [{ status: "ZERO_RESULTS" }],
                    },
                ],
            },
        })

        await expect(mapsService.getDistanceAndDuration(6.5, 3.4, 6.6, 3.5)).rejects.toThrow(AppError)
    })
})
