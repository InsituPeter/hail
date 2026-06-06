const {PaystackTransientError, PaystackPermanentError} = require("../error")

class  PaystackGateway{
    constructor(secretKey){
        this.client=axios.create({
            baseUrl:"http://api.paystack.io",
            headers:{
             Authorization:`Bearer ${secretKey}`,
             "Content-Type":"application/json"
            }
        })

      
    }

    _handleError(error){
       const message=error.response.data?.message?? "Paystack request failed"
       const nextStep= error.response.data?.meta.nextStep
       if(!error.response|| error.response.status  >=500){
        throw new PaystackTransientError(`${message}:${nextStep}`)
       }
       throw new PaystackPermanentError(`${message}:${nextStep}`)
    }
      async createSubAccount(business_name,settlement_bank, account_number, percentage_charge){
            const data= await this.client.post("/subaccount", {
                business_name,
                settlement_bank,
                account_number,
                percentage_charge
            })
            return data.data
        }

     
        
}