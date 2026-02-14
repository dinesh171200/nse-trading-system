const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
    required: true
  },
  agent: {
    type: String,
    enum: ['data-agent', 'chart-agent', 'signal-agent', 'system']
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for querying logs
systemLogSchema.index({ timestamp: -1 });
systemLogSchema.index({ level: 1, timestamp: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
