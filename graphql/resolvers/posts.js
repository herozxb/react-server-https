const { AuthenticationError, UserInputError } = require('apollo-server');

const Post = require('../../models/Post');
const checkAuth = require('../../util/check-auth');
const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();

module.exports = {
  Query: {
    async getPosts() {
      try {
        const posts = await Post.find().sort({ createdAt: -1 });
        return posts;
      } catch (err) {
        throw new Error(err);
      }
    },


    async getUserPosts(_, username) {
      try {
        const posts = await Post.find({username:username.username}).limit(username.limit).skip(username.skip).sort({ createdAt: -1 });
        if (posts) {
          return posts;
        } else {
          throw new Error('Post not found');
        }
      } catch (err) {
        throw new Error(err);
      }
    },

    async getAreaPosts(_, thoughtArea) {
      try {
        console.log(thoughtArea)
        const posts = await Post.find({thoughtArea:thoughtArea.thoughtArea}).limit(thoughtArea.limit).skip(thoughtArea.skip).sort({ createdAt: -1 });
        if (posts) {
          return posts;
        } else {
          throw new Error('Post not found');
        }
      } catch (err) {
        throw new Error(err);
      }
    },

    async getPost(_, { postId }) {
      try {
        const post = await Post.findById(postId);
        if (post) {
          return post;
        } else {
          throw new Error('Post not found');
        }
      } catch (err) {
        throw new Error(err);
      }
    }
  },

  Mutation: {
    async createPost(_, { body }, context) {
      const user = checkAuth(context);

      if (body.trim() === '') {
        throw new Error('Post body must not be empty');
      }

      const newPost = new Post({
        body,
        user: user.id,
        username: user.username,
        createdAt: new Date().toISOString(),
        thoughtArea : "default"
      });

      const post = await newPost.save();


      //context.pubsub.publish('NEW_POST', {
      //  newPost: post
      //});
      pubsub.publish('NEW_POST', {
        newPost: post
      });

      return post;
    },
    async createAreaPost(_, { body,thoughtArea },  context) {
      const user = checkAuth(context);

      //console.log("======createAreaPost.runned======");

      if (body.trim() === '') {
        throw new Error('Post body must not be empty');
      }

      const newPost = new Post({
        body,
        user: user.id,
        username: user.username,
        createdAt: new Date().toISOString(),
        thoughtArea : thoughtArea
      });

      const post = await newPost.save();

//      console.log("====2====");
//      console.log(context);

      pubsub.publish('NEW_POST', {
        newPost: post
      });

//      context.pubsub.publish('NEW_POST', {
//        newPost: post
//      });

      return post;
    },

    async createAreaHonestyPost(_, { body, thoughtArea, honesty, ability },  context) {
      const user = checkAuth(context);

      //console.log("======createAreaPost.runned======");

      if (body.trim() === '') {
        throw new Error('Post body must not be empty');
      }

      const newPost = new Post({
        body,
        user: user.id,
        username: user.username,
        createdAt: new Date().toISOString(),
        thoughtArea : thoughtArea,
        honesty : honesty,
        ability : ability,
      });

      const post = await newPost.save();

//      console.log("====2====");
//      console.log(context);

      pubsub.publish('NEW_POST', {
        newPost: post
      });

//      context.pubsub.publish('NEW_POST', {
//        newPost: post
//      });

      return post;
    },

    async createAreaHonestyPostionPost(_, { body, thoughtArea, honesty, ability, position, salary, person },  context) {
      const user = checkAuth(context);

      console.log("======createAreaHonestyPostionPost.runned======");
      console.log(position);
      console.log(salary);
      console.log(person);

      if (body.trim() === '') {
        throw new Error('Post body must not be empty');
      }

      const newPost = new Post({
        body,
        user: user.id,
        username: user.username,
        createdAt: new Date().toISOString(),
        thoughtArea : thoughtArea,
        honesty : honesty,
        ability : ability,
        position: position,
        salary : salary,
        person : person,
      });

      const post = await newPost.save();

//      console.log("====2====");
//      console.log(context);

      pubsub.publish('NEW_POST', {
        newPost: post
      });

//      context.pubsub.publish('NEW_POST', {
//        newPost: post
//      });

      return post;
    },




    async deletePost(_, { postId }, context) {
      const user = checkAuth(context);
      try {
        const post = await Post.findById(postId);

        if (user.username === post.username) {
          await post.delete();
          return 'Post deleted successfully';
        } else {
          throw new AuthenticationError('Action not allowed');
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    async likePost(_, { postId }, context) {
      const { username } = checkAuth(context);

      const post = await Post.findById(postId);
      if (post) {
        if (post.likes.find((like) => like.username === username)) {
          // Post already likes, unlike it
          post.likes = post.likes.filter((like) => like.username !== username);
        } else {
          // Not liked, like post
          post.likes.push({
            username,
            createdAt: new Date().toISOString()
          });
        }

        await post.save();
        return post;
      } else throw new UserInputError('Post not found');
    }
  },
  Subscription: {
    newPost: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator('NEW_POST')
    }
  }
};
