const {Client} = require("@googlemaps/google-maps-services-js")

const {AppError} = require("../error")

class MapsService{
    constructor(client){
        this.client=new Client()
        this.apiKey= config.googleMaps.apiKey
    }

    async getDistanceAndDuration(originLat, originLng, destLat, destLng){
          const response= await this.client.distancematrix({
             params:{
                 origins:[{lat:originLat, lng: originLng}],
                 destinations:[{lat: destLat, lng:destLng}],
                 key:this.apiKey
             }
          })
        const element=response.data.rows[0]?.elements[0]
        if(!element || element.status !=="OK"){
            throw new AppError("Could not calculate route", 502)
        }
        const distanceKm = element.distance.value/1000
        const durationMin = ath.ceil(element.duration.value / 60)
        return { distanceKm, durationMin }
    }
}



module.exports =MapsService