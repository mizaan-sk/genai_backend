const mongoose = require("mongoose");

/**
 * -job description Schema : String
 * -resume text:String
 * -Self description : Description
 * matchScore:Number
 * -Technical Questions:
 * [{
 *   question:"",
 *   intention:"",
 *   answer:"",
 * }]
 * -Behavior Questions:
 * [{
 *   question:"",
 *   intention:"",
 *   answer:"",
 * }]
 * -Skill Gaps:
 * [{
 * skill:"",
 * severity:{
 * type:String,
 * enum:["low","medium","high"]
 * }
 * }]
 * -preparation plan:
 * [{
 * day:Number,
 * focus:String,
 * tasks:[String]
 * }]
 */

const technicalQuestionsSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Technical question is required"],
    },
    intention: {
      type: String,
      required: [true, "Intention is required"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
    },
  },
  {
    _id: false,
  },
);

const behavioralQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Technical question is required"],
    },
    intention: {
      type: String,
      required: [true, "Intention is required"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
    },
  },
  {
    _id: false,
  },
);

const SkillGapSchema = new mongoose.Schema(
  {
    skill: {
      type: String,
      required: [true, "Skill is required."],
      severity: {
        type: String,
        enum: ["low", "medium", "high"],
        required: [true, "Severity is required."],
      },
    },
  },
  {
    _id: false,
  },
);

const preparationPlanSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: [true, "Day is required."],
    },
    focus: {
      type: String,
      required: [true, "Focus is required."],
    },
    tasks: [
      {
        type: String,
        required: [true, "Task is required."],
      },
    ],
  },
  {
    _id: false,
  },
);

const interviewReportSchema = new mongoose.Schema(
  {
    jobDescription: {
      type: String,
      required: [true, "job description is required"],
    },
    resume: {
      type: String,
    },
    selfDescription: {
      type: String,
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    technicalQuestions: [technicalQuestionsSchema],
    behavioralQuestions: [behavioralQuestionSchema],
    skillGaps: [SkillGapSchema],
    preparationPlan: [preparationPlanSchema],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  {
    timestamps: true,
  },
);

const interviewReportModel = mongoose.model(
  "InterviewReport",
  interviewReportSchema,
);
module.exports = interviewReportModel;
