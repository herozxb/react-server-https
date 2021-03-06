const { model, Schema } = require('mongoose');


const postSchema = new Schema({
  body: String,
  username: String,
  createdAt: String,
  comments: [
    {
      body: String,
      username: String,
      createdAt: String
    }
  ],
  likes: [
    {
      username: String,
      createdAt: String
    }
  ],
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users'
  },
});

postSchema.add({ thoughtArea: String });
postSchema.add({ honesty: String });
postSchema.add({ ability: String });
postSchema.add({ position: String });
postSchema.add({ salary: String });
postSchema.add({ person: String });

module.exports = model('Post', postSchema);
