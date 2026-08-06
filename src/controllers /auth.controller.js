const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blacklist.model");

// in production the frontend sits on a different domain, so the cookie has to be
// cross-site: SameSite=None requires Secure, which requires https
const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000, // 1 day, matches the jwt expiry
};

/**
 * @name registerUserController
 * @description Register a new user ,expects a username,emailand password
 * @access Public
 */
async function registerUserController(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide username,email and password" });
  }
  const isUserAlreadyExist = await userModel.findOne({
    $or: [{ username }, { email }], // this or takes and array and check if any of them matches the criteria then return the thing
  });
  if (isUserAlreadyExist) {
    return res.status(400).json({
      message: "Account already exist with this username or email address",
    });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    username,
    email,
    password: hash,
  });
  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
  res.cookie("token", token, cookieOptions);
  res.status(201).json({
    //201 is send when new resource is created means creating a new user
    message: "User Registered Succesfully",
    user: {
      id: user._id,
      username: username,
      email: user.email,
    },
  });
}

/**
 * @name loginUserController
 * @description login a user expects a email and password in the request.body
 * @access Public
 */
async function loginUserController(req, res) {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(400).json({
      message: "Invalid Email or Password",
    });
  }
  const isPasswordValid =await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid Email or Password" });
  }
  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
  res.cookie("token", token, cookieOptions);
  res.status(200).json({
    message: "User Loggedin Succesfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

/**
 * @name logoutUserController 
 * @description clear the token from user cookie and add the token in blacklist so that user cannot use the same token to access protected routes
 * @access  public
 */

async function logoutUserController(req, res) {
  const token = req.cookies.token;
  if(token){
    await tokenBlackListModel.create({token})
  }
res.clearCookie("token", cookieOptions);
res.status(200).json({
  message:"User logged out succesfully"
})
}
/**
 * @name getMeController
 * @description get the current logged in user details
 * @access Private  
 */
async function getMeController(req,res){
  const user  = await userModel.findById(req.user.id);
  res.status(200).json({
    message:"USer Details Fethced Succesfully",
    user:{
      id:user._id,
      username:user.username,
      email:user.email
    }
  })
}

module.exports = { registerUserController, getMeController,loginUserController,logoutUserController };
