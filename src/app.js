const express = require("express");
const cookieparser = require("cookie-parser")
const cors = require("cors");
// const {resume,selfDescription,jobDescription} = require("./services/temp")
const app = express();
app.use(express.json());
app.use(cookieparser())
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))
// require all the routes here
const authrouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.route");
// const {generateInterviewReport} = require("./services/ai.service");
// generateInterviewReport({resume,selfDescription,jobDescription})
// using all the routes here
app.use("/api/auth", authrouter);
app.use("/api/interview/",interviewRouter)
module.exports = app;
