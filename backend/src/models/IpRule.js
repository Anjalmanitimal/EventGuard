const mongoose = require('mongoose');

const ipRuleSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['block', 'allow'],
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IpRule', ipRuleSchema);
