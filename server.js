require("dotenv").config();
const app = require("./src/app");
// const {resume,selfDescription,jobDescription} = require("./src/services/temp")
const connectToDb = require("./src/config/database");
// const genrateInterviewReport = require("./src/services/ai.service");
connectToDb();
// genrateInterviewReport({resume,selfDescription,jobDescription});
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
