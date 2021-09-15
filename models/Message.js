const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema for Users
const MessageSchema = new Schema({
    conversation: {
        type: Schema.Types.ObjectId,
        ref: 'conversations',
    },
    to: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
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
    //expire_at: {type: Date, default: Date.now() + 24 * 60 * 60 * 1000  }   // expires in 3 minutes}
    expire: { type: Date, index: { expireAfterSeconds: 60 } }

});
module.exports = Message = mongoose.model('messages', MessageSchema);
