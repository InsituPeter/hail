const {z} =require("zod")

const createSchema= z.object({
    licenseNumber:z.string().min(1),
    vehicleType:z.enum(["ECONOMY", "COMFORT", "XL"]),
    vehicleMake:z.string().min(1),
    vehicleModel:z.string().min(1),
    vehiclePlate: z.string().min(1),
    vehicleYear: z.number().int().min(1990).max(new Date().getFullYear())
})

  const updateDriverProfileSchema = z.object({
      vehicleMake: z.string().min(1).optional(),
      vehicleModel: z.string().min(1).optional(),
      vehiclePlate: z.string().min(1).optional(),
      vehicleYear: z.number().int().min(1990).max(new Date().getFullYear()).optional(),
      vehicleType: z.enum(["ECONOMY", "COMFORT", "XL"]).optional()
  }).refine(data=>Object.keys(data).length>0, {
    message:"At least one field must be provided"
  })


  const updateAvailabilitySchema=z.object({
    isAvailable:z.boolean()
  })

   module.exports={createSchema, updateDriverProfileSchema, updateAvailabilitySchema}