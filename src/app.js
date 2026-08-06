const express = require("express");
const cookieparser = require("cookie-parser")
const cors = require("cors");
// const {resume,selfDescription,jobDescription} = require("./services/temp")
const app = express();
app.set("trust proxy", 1); // behind Render's proxy, so secure cookies are recognised
app.use(express.json());
app.use(cookieparser())
// allowed frontend origins — CLIENT_URL holds the deployed frontend
const allowedOrigins = [
    "http://localhost:5173",
    process.env.CLIENT_URL
].filter(Boolean)

app.use(cors({
    origin: allowedOrigins,
    credentials:true,
    exposedHeaders:["Content-Disposition"]
}))
// require all the routes here
const authrouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.route");
// const {generateInterviewReport} = require("./services/ai.service");
// generateInterviewReport({resume,selfDescription,jobDescription})
// using all the routes here
app.set("json spaces", 2); // ADD THIS
app.use("/api/auth", authrouter);
app.use("/api/interview/",interviewRouter)
module.exports = app;
