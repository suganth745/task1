const { default: mongoose } = require("mongoose");
const jwt = require("jsonwebtoken");

const PostSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Types.ObjectId, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("posts", PostSchema);
