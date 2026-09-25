import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 3, maxlength: 50 },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
  },
  passwordHash: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ["user", "seller"], default: "user" },
  refreshToken: { type: String },
});
const UserModel = mongoose.model("User", userSchema);
export default UserModel;
