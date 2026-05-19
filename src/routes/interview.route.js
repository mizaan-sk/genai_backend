const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers /interview.controller");
const { upload } = require("../middlewares/file.middleware");
const interviewRouter = express.Router();

/**
 * @route POST /api/interview
 * @description generate new interview report based on candidate resume, self description and job description
 * @access private
 */
interviewRouter.post("/",authMiddleware.authUser,upload.single("resume"),interviewController.generateInterviewReportController)
interviewRouter.post
module.exports = interviewRouter;