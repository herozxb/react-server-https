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
    createdAt: { type: Date, expires: '1m', default: Date.now }
    //expire_at: {type: Date, default: Date.now() + 24 * 60 * 60 * 1000  }   // expires in 3 minutes}
    //expire_at: {type: Date, default: Date.now() + 24 * 60 * 60 * 1000  }   // expires in 3 minutes}
    //expire_at: { type: Date, index: { expireAfterSeconds: 60 } }
});
module.exports = GlobalMessage = mongoose.model(
    'global_messages',
    GlobalMessageSchema
);
