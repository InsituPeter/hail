class MockMapsService {
    async getDistanceAndDuration(originLat, originLng, destLat, destLng) {
        return { distanceKm: 5, durationMin: 15 }
    }
}

module.exports = MockMapsService
