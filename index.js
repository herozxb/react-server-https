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


let users_all = [];

const addUser = ( user_ID, user_name, socketId ) => {
  if (user_ID!==''&&user_name!=='') {
    (!users_all.some((user) => user.user_ID === user_ID) || !users_all.some((user) => user.user_name === user_name)) &&
    users_all.push( { user_ID, user_name, socketId } )
  }

};

const removeUser = (socketId) => {
  users_all = users_all.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users_all.find((user) => user.user_ID === userId);
};

const get_user_by_name = (username) => {
  return users_all.filter((user) => user.user_name === username);
};

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




  io.on("connection", (socket) => {
    //when ceonnect
    console.log("a user connected.");
    console.log('New connection from ' + socket.conn.remoteAddress);

    //take userId and socketId from user
    socket.on("addUser", ({user_ID,user_name}) => {
      console.log("addUser user_name");
      console.log(user_name);
      addUser( user_ID, user_name, socket.id );
      io.emit("getUsers", users_all);
      console.log("addUser");
      console.log(users_all);
    });

    //send and get message
    socket.on("sendMessage", ({ senderId, senderName, receiverId, receiverName, text }) => {
      const user = getUser(receiverId);
      console.log("sendMessage");
      console.log(senderId);
      console.log(senderName);
      console.log(receiverId);
      console.log(receiverName);
      console.log(text);
      console.log(user);

      
      const user_by_name = get_user_by_name(receiverName);
      console.log("get_user_by_name");
      console.log(user_by_name);

      if(  user_by_name !== undefined  )
      {
        user_by_name.map(user=>{
            console.log(user.socketId);
            io.to(user.socketId).emit("getMessage", {
              senderId,
              senderName,
              text,
            });
        })
      }
    });

    //when disconnect
    socket.on("disconnect", () => {
      console.log("a user disconnected!");
      removeUser(socket.id);
      io.emit("getUsers", users_all);
      console.log("disconnect");
      console.log(users_all);
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
