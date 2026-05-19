const Router = require('express');
const authController = require("../controllers /auth.controller");
const { authUser } = require('../middlewares/auth.middleware');
const authrouter = Router()
/**
 * @route POST /api/auth/register
 * @description Register a new user 
 * @access Public
 */
authrouter.post("/register",authController.registerUserController)


/**
 * @route POST /api/auth/login
 * @description Login user with email and password
 * @access Public
 */
authrouter.post("/login",authController.loginUserController)

/**
 * @route POST /api/auth/logout
 * @description clear token from user cookie and add the token in blacklist
 * @access Public
 */
authrouter.get("/logout",authController.logoutUserController)


/**
 * @route POST /api/auth/get-me
 * @description get the current logged in user details
 * @access Private
 */
authrouter.get("/get-me",authUser,authController.getMeController)

module.exports = authrouter