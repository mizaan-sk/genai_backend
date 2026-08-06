require("dotenv").config();
const app = require("./src/app");
// const {resume,selfDescription,jobDescription} = require("./src/services/temp")
const connectToDb = require("./src/config/database");
// const genrateInterviewReport = require("./src/services/ai.service");
connectToDb();
// genrateInterviewReport({resume,selfDescription,jobDescription});
// Render injects PORT — fall back to 3000 for local dev
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
