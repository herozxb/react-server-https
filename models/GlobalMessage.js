const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema for Users
const GlobalMessageSchema = new Schema({
    from: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    body: {
        type: String,
        required: true,
    },
    date: {
        type: String,
        default: Date.now,
    },
    expire_at: {type: Date, default: Date.now() + 60 * 60 * 1000  }   // expires in 3 minutes}
    //expire: { type: Date, index: { expireAfterSeconds: 300 } }
});
module.exports = GlobalMessage = mongoose.model(
    'global_messages',
    GlobalMessageSchema
);
