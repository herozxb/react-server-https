//const { ApolloServer, PubSub } = require('apollo-server');
const mongoose = require('mongoose');

const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { MONGODB } = require('./config.js');

const bodyParser = require("body-parser");
const passport = require("passport");
const cors = require("cors");

const users = require("./routes/api/users");
const messages = require("./routes/api/messages");

//const pubsub = new PubSub();

const PORT = process.env.port || 5005;
//////////////////////////////////////////////////////////
const express =  require('express');
const { ApolloServer } =  require('apollo-server-express');
const fs =  require('fs');
const https =  require('https');
const http =  require('http');

async function startApolloServer() {
  const configurations = {
    // Note: You may need sudo to run on port 443
    production: { ssl: false, port: 5005, hostname: 'localhost' },
    development: { ssl: false, port: 5005, hostname: 'localhost' },
  };

  const environment = process.env.NODE_ENV || 'production';
  const config = configurations[environment];

  const server = new ApolloServer({ typeDefs, resolvers });
  //await server.start();

  const app = express();
  server.applyMiddleware({ app });

/////////////////////////////add_chat_with_mongodb//////W////////////////////////////
  const port = process.env.PORT || 5002;
  const socket_server = app.listen(5002, () =>
  console.log(`Chat Server running on http://${config.hostname}:${port}`)
);
  const io = require("socket.io").listen(socket_server);


  // Body Parser middleware to parse request bodies
  app.use(
    bodyParser.urlencoded({
      extended: false,
    })
  );
  app.use(bodyParser.json());

  // CORS middleware
  app.use(cors());

  
  // Passport middleware
  app.use(passport.initialize());
  // Passport config
  require("./config/passport")(passport);

  // Assign socket object to every request
  app.use(function (req, res, next) {
    req.io = io;
    next();
  });

  // Routes
  app.use("/api/users", users);
  app.use("/api/messages", messages);


///////////////////////////////////////////////////////////////
  // Create the HTTPS or HTTP server, per configuration
  let httpServer;
  if (config.ssl) {
    // Assumes certificates are in a .ssl folder off of the package root.
    // Make sure these files are secured.
    httpServer = https.createServer(
      {
        key: fs.readFileSync('./selfsigned.key'),
        cert: fs.readFileSync('./selfsigned.crt')
      },
      app,
    );
  } else {
    httpServer = http.createServer(app);
  }

  await new Promise(resolve => {
    //httpServer.listen({ port: config.port }, resolve);
    mongoose
    .connect(MONGODB, { useNewUrlParser: true })
    .then(() => {
      console.log('MongoDB Connected');
      return httpServer.listen({ port: PORT },resolve);
    })
    .then((res) => {
      console.log(`Post Server running at ${res.url}`);
    })
    .catch(err => {
      console.error(err)
    });
  })
  console.log(
    '🚀 Post web Server ready at',
    `http${config.ssl ? 's' : ''}://${config.hostname}:${config.port}${server.graphqlPath}`
  );
  return { httpServer, app };
}

startApolloServer();
