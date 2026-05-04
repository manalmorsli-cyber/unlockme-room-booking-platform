const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
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
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'La note doit être un entier entre 1 et 5'
    }
  },
  comment: {
    type: String,
    required: true,
    maxlength: 500
  },
  ownerReply: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour éviter les doublons (un avis par réservation)
reviewSchema.index({ booking: 1 }, { unique: true });

// Index pour les requêtes fréquentes
reviewSchema.index({ room: 1, status: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });

// Méthode pour calculer la note moyenne d'une salle
reviewSchema.statics.calculateAverageRating = async function(roomId) {
  const result = await this.aggregate([
    {
      $match: {
        room: mongoose.Types.ObjectId.createFromHexString(roomId),
        status: "approved"
      }
    },
    {
      $group: {
        _id: "$room",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  try {
    const Room = mongoose.model("Room");
    if (result.length > 0) {
      await Room.findByIdAndUpdate(roomId, {
        averageRating: result[0].averageRating.toFixed(1),
        reviewCount: result[0].reviewCount
      });
    } else {
      await Room.findByIdAndUpdate(roomId, {
        averageRating: 0,
        reviewCount: 0
      });
    }
  } catch (error) {
    console.error("Erreur calcul moyenne:", error);
  }
};

// Middleware pour mettre à jour la note moyenne après sauvegarde
reviewSchema.post("save", async function() {
  await this.constructor.calculateAverageRating(this.room);
});

reviewSchema.post("findOneAndDelete", async function(doc) {
  if (doc) {
    await doc.constructor.calculateAverageRating(doc.room);
  }
});

module.exports = mongoose.model("Review", reviewSchema);