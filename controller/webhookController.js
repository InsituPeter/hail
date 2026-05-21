class WebhookController{
    constructor(paymentService){
         this.paymentService=paymentService
    }

  handlePaystackWebhook= async(req, res)=>{
    const signature= req.headers["x-paystack-signature"]
    let event
    try{
        event = this.paymentService.constructWebhookEvent(req.body, signature)
    }
    catch(err){
        return res.status(400).json({error:err.message})
    }
     const {reference, authorization, customer}= event.data ?? {}

     if(event.event ==="charge.success" && reference){
          await this.paymentService.handlePaymentSuccess(
            reference,
            authorization?.authorization_code,
            customer?.email
          )
     } else if(event.event === "charge.failed"  && reference){
        await this.paymentService.handlePaymentFailure(reference)
     }
     res.status(200).json({ received: true })
  }
  
}
module.exports=WebhookController