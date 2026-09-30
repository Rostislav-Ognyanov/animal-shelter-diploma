import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    animalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

favoriteSchema.index({ userId: 1, animalId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1, _id: -1 });

export default mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);
