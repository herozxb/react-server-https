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
    production: { ssl: true, port: 5005, hostname: 'localhost' },
    development: { ssl: false, port: 5005, hostname: 'localhost' },
  };

  const environment = process.env.NODE_ENV || 'production';
  const config = configurations[environment];

  const server = new ApolloServer({ typeDefs, resolvers, context: ({ req, res }) => ({ req, res }) });
  //await server.start();

  const app = express();
  server.applyMiddleware({ app });


/////////////////////////////add_chat_with_mongodb//////W////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////
//
  //http
  //const port = process.env.PORT || 5002;
  //const socket_server = app.listen(5002, () =>
  //console.log(`Chat Server running on http://${config.hostname}:${port}`)
  //);
  //const io = require("socket.io").listen(socket_server);

  //https
  //app = module.exports = express();
  var httpsOptions = { key: fs.readFileSync('./tencent.key'), cert: fs.readFileSync('./tencent.crt') };        
  var secureServer = require('https').createServer(httpsOptions, app);
  //io = module.exports = require('socket.io').listen(secureServer,{pingTimeout: 7000, pingInterval: 10000});
  //io.set("transports", ["xhr-polling","websocket","polling", "htmlfile"]);
  //secureServer.listen(3000);

  const port = process.env.PORT || 5002;
  const io = require("socket.io")(secureServer,{
            cors: {
                origin: "*",
                methods: [ "GET", "POST" ],
                credentials:false
        }
  });
  secureServer.listen(5002, () =>console.log(`Chat Server running on https://${config.hostname}:${port}`));

  // The array of all connected user and user's socket id
  let users = [];

  const addUser = (userId, socketId) => {
    !users.some((user) => user.userId === userId) &&
      users.push({ userId, socketId });
  };

  const removeUser = (socketId) => {
    users = users.filter((user) => user.socketId !== socketId);
  };

  const getUser = (userId) => {
    return users.find((user) => user.userId === userId);
  };

  io.on("connection", (socket) => {
    //when ceonnect
    console.log("a user connected.");

    //take userId and socketId from user
    socket.on("addUser", (userId) => {
      addUser(userId, socket.id);
      io.emit("getUsers", users);
      console.log("addUser");
      console.log(users);
    });

    //send and get message
    socket.on("sendMessage", ({ senderId, receiverId, text }) => {
      const user = getUser(receiverId);
      io.to(user.socketId).emit("getMessage", {
        senderId,
        text,
      });
    });

    //when disconnect
    socket.on("disconnect", () => {
      console.log("a user disconnected!");
      removeUser(socket.id);
      console.log("removeUser");
      console.log(users);
      io.emit("getUsers", users);
    });
  });

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
        key: fs.readFileSync('./tencent.key'),
        cert: fs.readFileSync('./tencent.crt')
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
