import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  dateTime: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
