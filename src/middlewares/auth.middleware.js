const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blacklist.model");

/**
 * Pull the jwt off the request.
 * The cookie works when the frontend is same-site with the api; the
 * Authorization header is what survives when they sit on different domains
 * (vercel.app -> onrender.com), where browsers drop third-party cookies.
 */
function getTokenFromRequest(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return req.cookies?.token;
}

async function authUser(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      message: "Token not provided",
    });
  }
  const isTokenBlackListed = await tokenBlackListModel.findOne({ token });
  if(isTokenBlackListed){
    return res.status(401).json({
        message:"Token is invalid"
    })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
}
module.exports = { authUser, getTokenFromRequest };
