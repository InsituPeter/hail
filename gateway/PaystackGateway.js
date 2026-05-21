const axios = require("axios")


class PaystackGateway{
    constructor(secretKey){
        this.client=axios.create({
            baseURL:"https://api.paystack.co",
            headers:{
                Authorization:`Bearer ${secretKey}`,
                "Content-Type":"application/json"
            }
        })
    }

    async initializeTransaction(email, amountNaira, reference, callbackUrl){
        const {data} = await this.client.post("/transaction/initialize", {
            email,
            amount: Math.round(amountNaira  * 100),
            reference,
            callback_url: callbackUrl
        })
        return data.data
    }

    async verifyTransaction(reference){
        const  {data} =await this.client.get(`/transaction/verify/${reference}`)
        return data.data
    }

         async chargeAuthorization(email, amountNaira, authorizationCode, reference, subaccountCode =
  null) {
          const amountInKobo = Math.round(amountNaira * 100)
          const payload = { email, amount: amountInKobo, authorization_code: authorizationCode,
  reference }
          if (subaccountCode) payload.subaccount = subaccountCode
          const { data } = await this.client.post("/transaction/charge_authorization", payload)
          return data.data
      }

      async createSubaccount(businessName, settlementBank, accountNumber, percentageCharge) {
          const { data } = await this.client.post("/subaccount", {
              business_name: businessName,
              settlement_bank: settlementBank,
              account_number: accountNumber,
              percentage_charge: percentageCharge
          })
          return data.data
      }
}

  module.exports = PaystackGateway