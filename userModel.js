const { default: mongoose } = require("mongoose");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  token: { type: String, default: null },
  following: [{ type: mongoose.Types.ObjectId, default: null }],
});

UserSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ user_id: user._id, name: user.name }, "mysecret", {
    expiresIn: "365d",
  });

  return token;
};

UserSchema.index({ name: 1, token: 1 });

module.exports = mongoose.model("users", UserSchema);
