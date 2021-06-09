//const { ApolloServer, PubSub } = require('apollo-server');
const mongoose = require('mongoose');

const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { MONGODB } = require('./config.js');

//const pubsub = new PubSub();

const PORT = process.env.port || 5000;
//////////////////////////////////////////////////////////
const express =  require('express');
const { ApolloServer } =  require('apollo-server-express');
const fs =  require('fs');
const https =  require('https');
const http =  require('http');

async function startApolloServer() {
  const configurations = {
    // Note: You may need sudo to run on port 443
    production: { ssl: true, port: 5000, hostname: 'localhost' },
    development: { ssl: false, port: 5000, hostname: 'localhost' },
  };

  const environment = process.env.NODE_ENV || 'production';
  const config = configurations[environment];

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  const app = express();
  server.applyMiddleware({ app });

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
      console.log(`Server running at ${res.url}`);
    })
    .catch(err => {
      console.error(err)
    });
  })
  console.log(
    '🚀 web Server ready at',
    `http${config.ssl ? 's' : ''}://${config.hostname}:${config.port}${server.graphqlPath}`
  );
  return { httpServer, app };
}

startApolloServer();
//////////////////////////////////////////////////////////



//const server = new ApolloServer({
//  typeDefs,
//  resolvers,
//  context: ({ req }) => ({ req, pubsub })
//});

/*
mongoose
  .connect(MONGODB, { useNewUrlParser: true })
  .then(() => {
    console.log('MongoDB Connected');
    return server.listen({ port: PORT });
  })
  .then((res) => {
    console.log(`Server running at ${res.url}`);
  })
  .catch(err => {
    console.error(err)
  })
//*/
//const http = require('http');
//const express = require('express');
///////////////////////////////////////////////////////////////////////////
//Socket IO

var key = fs.readFileSync('./selfsigned.key');
var cert = fs.readFileSync('./selfsigned.crt');
var options = {
  key: key,
  cert: cert
};

const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom, get_user_by_name,remove_user_by_name,get_user_id_by_name } = require('./users');

const router = require('./router');

const app_chat = express();
//const server_chat = http.createServer(app_chat);
const server_chat = https.createServer(options, app_chat);
const io = socketio(server_chat);

app_chat.use(cors());
app_chat.use(router);

io.on('connect', (socket) => {

  socket.on('logout', ({ name, room }, callback) => {
    name = name.trim().toLowerCase();
    room = room.trim().toLowerCase();

    //console.log("=========0.1.0.1========");
    const user_get = get_user_id_by_name(name); //worked
    //console.log(user_get);
    //console.log("=========0.1.0.2========");
    const user = remove_user_by_name(name);
    //console.log(user);
    //console.log(io.sockets.connected[socket.id]);
    //console.log(socket.id);
    //s7n3hgQhHlQ3QRhiAAAF
  });

  socket.on('join', ({ name, room }, callback) => {

    name = name.trim().toLowerCase();
    room = room.trim().toLowerCase();

    //console.log("=========1.0========");
    
    let { error, user } = addUser({ id: socket.id, name, room });
    //console.log(socket.id);
    //console.log(user);
    //console.log(error);


    //console.log("=========1.0.1========");
    //const user_get = get_user_id_by_name(name); //worked
    //console.log(user_get);

    //user = user_get;
    //console.log("=========1.0.1.1========");
    //console.log(user);

//    console.log("=========1.0.2========");
//    const user_in_room = getUsersInRoom(room);
//    console.log(user_in_room);
//    console.log(user_in_room[0].name);
//    console.log(name);

//    if (user_in_room[0].name === name ) 
//    {
//      console.log("=========1.0.2.1========");
//      console.log(user_in_room);
//    };

    //if (io.sockets.connected[user_in_room.id]) {
    //  io.sockets.connected[user_in_room.id].disconnect();
    //}


    //console.log("=========1.0.3========");
    //const user_by_id = getUser(socket.id);
    //console.log(user_by_id);

    if(error)
    { 
      //console.log("=========1.1========");
      //console.log(socket.id);
      //io.sockets.connected[socket.id].connect();
      //const user_previous = remove_user_by_name(name);
      //console.log(user_previous.room);
      //socket.emit('message', { user: 'admin', text: `same use .`});
      return callback(error);
    }
    //console.log("=========2.0========");
    //console.log(user.room);
    socket.join(user.room);


    socket.emit('message', { user: 'admin', text: `${user.name}, 欢迎来到${user.room}房间`});
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });

    if(user===null)
    {}
    else
    {
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    }
    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    if(user===null)
    {}
    else
    {
      io.to(user.room).emit('message', { user: user.name, text: message });
    }

    callback();
  });

  socket.on('disconnect', (test) => {
    console.log(test);
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} 离开了房间.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

server_chat.listen(process.env.PORT || 2001, () => console.log(`Chat Server has started.`));