const { gql } = require('apollo-server');

module.exports = gql`
  type Post {
    id: ID!
    body: String!
    createdAt: String!
    username: String!
    user: ID!
    comments: [Comment]!
    likes: [Like]!
    likeCount: Int!
    commentCount: Int!
    thoughtArea : String!
    honesty:String!
    ability:String!
    position:String!
    salary:String!
    person:String!
  }
  type Comment {
    id: ID!
    createdAt: String!
    username: String!
    body: String!
  }
  type Like {
    id: ID!
    createdAt: String!
    username: String!
  }
  type User {
    id: ID!
    email: String!
    token: String!
    username: String!
    createdAt: String!
    vip_expired_date : String!
  }
  input RegisterInput {
    username: String!
    password: String!
    confirmPassword: String!
    email: String!
  }
  type Query {
    getPosts: [Post]
    getUserPosts(username: String!, limit: Int!, skip: Int!): [Post]
    getAreaPosts(thoughtArea: String!, limit: Int!, skip: Int!): [Post]
    getPost(postId: ID!): Post
  }
  type Mutation {
    register(registerInput: RegisterInput): User!
    login(username: String!, password: String!): User!
    createPost(body: String!): Post!
    createAreaPost(body: String!,thoughtArea:String!): Post!
    createAreaHonestyPost(body: String!, thoughtArea: String!, honesty: String!, ability: String!): Post!
    createAreaHonestyPostionPost(body: String!, thoughtArea: String!, honesty: String!, ability: String!, position: String!, salary: String!, person: String!): Post!
    deletePost(postId: ID!): String!
    createComment(postId: String!, body: String!): Post!
    deleteComment(postId: ID!, commentId: ID!): Post!
    likePost(postId: ID!): Post!
  }
  type Subscription {
    newPost: Post!
  }
`;
