const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
