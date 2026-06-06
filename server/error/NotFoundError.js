const AppError= require("./AppError")


class NotFoundError extends AppError {
  constructor(resource, id){
    const message = resource && id ? `${resource} with id ${id} was not found` : `Resource not found`
    super(message, 404)
    this.resource= resource
    this.resourceId = id
  }
  
}

module.exports = NotFoundError