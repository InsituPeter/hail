const axios = require("axios")
const { PaystackTransientError, PaystackPermanentError } = require("../error")


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
     _handleError(error){
          const message=error.response?.data?.message ?? "Paystack request failed"
          const nextStep=error.response?.data?.meta?.nextStep
          if(!error.response || error.response.status  >=500){
              throw new PaystackTransientError(`${message}:${nextStep}`)
          }
          throw new PaystackPermanentError(`${message}:${nextStep}`)
      }
    async initializeTransaction(email, amountNaira, reference, callbackUrl){
        try{
            const {data} = await this.client.post("/transaction/initialize", {
            email,
            amount: Math.round(amountNaira  * 100),
            reference,
            callback_url: callbackUrl
        })
        return data.data
        }
        catch(error){
            this._handleError(error)
        }
    }

    async verifyTransaction(reference){
        try{
            const {data} = await this.client.get(`/transaction/verify/${reference}`)
            return data.data
        }
        catch(error){
            this._handleError(error)
        }
    }

    async chargeAuthorization(email, amountNaira, authorizationCode, reference, subaccountCode = null){
        try {
            const amountInKobo = Math.round(amountNaira * 100)
            const payload = { email, amount: amountInKobo, authorization_code: authorizationCode, reference }
            if(subaccountCode) payload.subaccount = subaccountCode
            const {data} = await this.client.post("/transaction/charge_authorization", payload)
            return data.data
        } catch(error){
            this._handleError(error)
        }
    }

    async createSubaccount(businessName, settlementBank, accountNumber, percentageCharge){
        try {
            const {data} = await this.client.post("/subaccount", {
                business_name: businessName,
                settlement_bank: settlementBank,
                account_number: accountNumber,
                percentage_charge: percentageCharge
            })
            return data.data
        } catch(error){
            this._handleError(error)
        }
    }
}

  module.exports = PaystackGateway