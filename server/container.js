const config = require("./config")
const transporter = require("./config/email")
const redis = require("./config/redis")

// Repositories
const UserRepository = require("./repo/userRepo")
const TokenRepository = require("./repo/tokenrepo")
const PaymentRepository = require("./repo/paymentRepo")
const RideRepository = require("./repo/rideRepo")
const RiderRepository = require("./repo/riderRepo")
const DriverRepository= require("./repo/driverRepo")

// Gateway
const PaystackGateway = require("./gateway/PaystackGateway")

// Domain
const TemplateDomain = require("./Domain/emailtemplate")

// Services
const EmailService = require("./services/emailService")
const AuthService = require("./services/AuthService")
const UserService = require("./services/userService")
const PaymentService = require("./services/PaymentService")
const DriverService= require("./services/driverService")
const RiderService= require("./services/riderService")
const RideService = require("./services/rideService")
const MapsService = config.env === 'development' || config.env === 'test'
    ? require("./services/mockMapService")
    : require("./services/mapService")
const EventPublisher = require("./services/eventPublisher")
const AdminService = require("./services/adminService")


// Controllers
const AuthController = require("./controller/authController")
const WebhookController = require("./controller/webhookController")
const DriverController = require("./controller/driverController")
const RiderController= require("./controller/riderController")
const RideController  = require("./controller/rideController")
const AdminController = require("./controller/adminController")


// Instantiate repositories
const userRepository = new UserRepository()
const tokenRepository = new TokenRepository()
const paymentRepository = new PaymentRepository()
const rideRepository = new RideRepository()
const riderRepository = new RiderRepository()
const driverRepository= new DriverRepository()
// Instantiate gateway
const paystackGateway = new PaystackGateway(config.paystack.secretKey)

// Instantiate domain
const templateDomain = new TemplateDomain(config.frontend.url, config.company.name, config.company.supportEmail)

// Instantiate services
const emailService = new EmailService(transporter, templateDomain, config.frontend.url)
const authService = new AuthService(userRepository, emailService, tokenRepository)
const userService = new UserService(userRepository, riderRepository)
const mapsService = new MapsService(config)
const eventPublisher = new EventPublisher(redis)
const paymentService = new PaymentService(paystackGateway, paymentRepository, rideRepository, riderRepository, driverRepository, config, eventPublisher)
const driverService = new DriverService(driverRepository, paystackGateway)
const riderService = new RiderService(riderRepository, rideRepository, driverRepository)
const rideService = new RideService(rideRepository, driverRepository, riderRepository, paymentService, mapsService, eventPublisher)

const adminService = new AdminService(rideRepository, driverRepository, userRepository, paymentRepository)

// Instantiate controllers
const authController = new AuthController(userService, authService)
const webhookController = new WebhookController(paymentService)
const driverController = new DriverController(driverService)
const riderController = new RiderController(riderService)
const rideController = new RideController(rideService)
const adminController = new AdminController(adminService)

module.exports = { authController, webhookController, driverController, authService, riderController, rideController, adminController, driverRepository }
