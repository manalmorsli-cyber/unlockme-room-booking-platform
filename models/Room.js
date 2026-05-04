const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  capacity: { type: Number, required: true },
  price: { type: Number, required: true },
   location: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    }
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  // Nouveau champ images
  images: [{
    type: String, // URL ou chemin vers l'image
    default: []
  }],
  // Champ image principale (optionnel)
  mainImage: {
    type: String,
    default: ''
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  amenities: [{
    type: String,
    enum: ["wifi", "projector", "whiteboard", "air-conditioning", "coffee", "parking"]
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Relation virtuelle avec les avis
roomSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "room",
  match: { status: "approved" }
});

// Méthode pour obtenir les avis avec pagination
roomSchema.methods.getReviews = function(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  return mongoose.model("Review")
    .find({ room: this._id, status: "approved" })
    .populate("user", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model("Room", roomSchema);
