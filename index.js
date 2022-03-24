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

const remove_user_by_name_and_by_id = (user_ID,username) => {
  console.log("a user remove_user_by_name_and_by_id.");
  console.log(user_ID);
  console.log(username);
  users_all = users_all.filter((user) =>  String(user.user_ID).valueOf() !== String("in_header").valueOf() && user.user_name !== username );
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
//https

  var httpsOptions = { key: fs.readFileSync('./tencent.key'), cert: fs.readFileSync('./tencent.crt') };        
  var secureServer = require('https').createServer(httpsOptions, app);
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

    console.log("a user connected.");
    socket.on("addUser", ({user_ID,user_name}) => {

      console.log("addUser user_name");
      console.log(user_name);

      addUser( user_ID, user_name, socket.id );
      io.to(socket.id).emit("yourID",socket.id);

      console.log("yourID",socket.id);
      console.log("addUser");
      console.log(users_all);
    });

    socket.on("sendMessage", ({ senderId, senderName, receiverId, receiverName, text }) => {
      const user = getUser(receiverId);
      console.log("sendMessage");
      console.log(senderId);
      console.log(senderName);
      console.log(receiverId);
      console.log(receiverName);
      console.log(text);
      console.log(user);
      
      
      send_message = { _id:0, body:text, fromObj: [ { _id:senderId, username:senderName } ] }

      
      const user_by_name = get_user_by_name(receiverName);
      console.log("get_user_by_name");
      console.log(user_by_name);

      if(  user_by_name !== undefined  )
      {
        user_by_name.map(user=>{
            console.log(user.socketId);
            io.to(user.socketId).emit("getMessage",send_message);
        })
        
      }

      if(  user !== undefined &&  user_by_name.length === 0 )
      {
        console.log(user.socketId);
        io.to(user.socketId).emit("getMessage", send_message);
      }

    });


    //if (!users_peer[socket.id]) {
    //    users_peer[socket.id] = socket.id;
    //     console.log(users_peer);
    //}

    io.sockets.emit("allUsers_peer", users_all);

    socket.on("callUser", (data) => {
        io.to(data.userToCall).emit('hey', {signal: data.signalData, from: data.from});
        console.log("hey");
        console.log(data);
    })

    socket.on("acceptCall", (data) => {
        io.to(data.to).emit('callAccepted', data.signal);
        console.log("data");
        console.log(data);
    })

    socket.on("disconnect", () => {
      console.log("a user disconnected!");
      //delete users_peer[socket.id];
      removeUser(socket.id);
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