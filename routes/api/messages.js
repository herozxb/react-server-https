const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const router = express.Router();

const keys = require('../../config/keys');
const verify = require('../../utilities/verify-token');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const GlobalMessage = require('../../models/GlobalMessage');

let jwtUser = null;

// Token verfication middleware
router.use(function(req, res, next) {
    try {
        jwtUser = jwt.verify(verify(req), keys.secretOrKey);
        next();
    } catch (err) {
        console.log(err);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Unauthorized' }));
        res.sendStatus(401);
    }
});

// Get global messages
router.get('/global', (req, res) => {
    GlobalMessage.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },
    ])
        .project({
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .exec((err, messages) => {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'Failure' }));
                res.sendStatus(500);
            } else {
                res.send(messages);
            }
        });
});

// Post global message
router.post('/global', (req, res) => {
    let message = new GlobalMessage({
        from: jwtUser.id,
        body: req.body.body,
    });

    req.io.sockets.emit('messages', req.body.body);

    message.save(err => {
        if (err) {
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Failure' }));
            res.sendStatus(500);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Success' }));
        }
    });
});

// Get conversations list
router.get('/conversations', (req, res) => {
    let from = mongoose.Types.ObjectId(jwtUser.id);
    Conversation.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'recipients',
                foreignField: '_id',
                as: 'recipientObj',
            },
        },
    ])
        .match({ recipients: { $all: [{ $elemMatch: { $eq: from } }] } })
        .project({
            'recipientObj.password': 0,
            'recipientObj.__v': 0,
            'recipientObj.date': 0,
        })
        .exec((err, conversations) => {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'Failure' }));
                res.sendStatus(500);
            } else {
                res.send(conversations);
            }
        });
});



// Get conversations list
router.post('/conversations', (req, res) => {
    let from = mongoose.Types.ObjectId(jwtUser.id);
    Conversation.aggregate([
        { $skip : req.body.page * 10 },{ $limit: 10 },
        {
            $lookup: {
                from: 'users',
                localField: 'recipients',
                foreignField: '_id',
                as: 'recipientObj',
            },
        },
    ])
        .match({ recipients: { $all: [{ $elemMatch: { $eq: from } }] } })
        .project({
            'recipientObj.password': 0,
            'recipientObj.__v': 0,
            'recipientObj.date': 0,
        })
        .exec((err, conversations) => {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'Failure' }));
                res.sendStatus(500);
            } else {
                res.send(conversations);
            }
        });
});


// Get messages from conversation
// based on to & from
router.get('/conversations/query', (req, res) => {
    let user1 = mongoose.Types.ObjectId(jwtUser.id);
    let user2 = mongoose.Types.ObjectId(req.query.userId);
    Message.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'to',
                foreignField: '_id',
                as: 'toObj',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },
    ])
        .match({
            $or: [
                { $and: [{ to: user1 }, { from: user2 }] },
                { $and: [{ to: user2 }, { from: user1 }] },
            ],
        })
        .project({
            'toObj.password': 0,
            'toObj.__v': 0,
            'toObj.date': 0,
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .exec((err, messages) => {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'Failure' }));
                res.sendStatus(500);
            } else {
                res.send(messages);
            }
        });
});

// Get messages from conversation
// based on to & from
router.post('/conversations/query', (req, res) => {
    let user1 = mongoose.Types.ObjectId(jwtUser.id);
    let user2 = mongoose.Types.ObjectId(req.query.userId);

    console.log("========useGetConversationMessagesByPage========");
    console.log(req.body.page)
    console.log(req.query.userId)

    Message.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'to',
                foreignField: '_id',
                as: 'toObj',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },
        {$match : {
            $or: [
                { $and: [{ to: user1 }, { from: user2 }] },
                { $and: [{ to: user2 }, { from: user1 }] },
            ],
        }},
        { $sort : { createdAt : -1} },
        { $skip : req.body.page * 20  },{ $limit: 20 },
        { $sort : { createdAt : 1} },
    ]).project({
            'toObj.password': 0,
            'toObj.__v': 0,
            'toObj.date': 0,
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .exec((err, messages) => {
            if (err) {
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'Failure' }));
                res.sendStatus(500);
            } else {
                console.log("=========return messages===========");
                console.log(messages);
                res.send(messages);
            }
        });
});

// Post private message
router.post('/', (req, res) => {
    let from = mongoose.Types.ObjectId(jwtUser.id);
    let to = mongoose.Types.ObjectId(req.body.to);

    if(from != to)
    {
        Conversation.findOneAndUpdate(
            {
                recipients: {
                    $all: [
                        { $elemMatch: { $eq: from } },
                        { $elemMatch: { $eq: to } },
                    ],
                },
            },
            {
                recipients: [jwtUser.id, req.body.to],
                lastMessage: req.body.body,
                date: Date.now(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
            function(err, conversation) {
                if (err) {
                    console.log(err);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ message: 'Failure' }));
                    res.sendStatus(500);
                } else {
                    let message = new Message({
                        conversation: conversation._id,
                        to: req.body.to,
                        from: jwtUser.id,
                        body: req.body.body,
                    });

                    /*
                    req.io.on('connection', (socket) => {
                          console.log('a user connected in api/application');
                          socket.on('disconnect', () => {
                              console.log('user disconnected');
                          });
                      });
                    //*/
/*
                  req.io.on("connection", (socket) => {
                    //when ceonnect
                    console.log("a user connected.");

                    //take userId and socketId from user
                    socket.on("addUser", (userId) => {
                      addUser(userId, socket.id);
                      io.emit("getUsers", users_all);
                      console.log("addUser");
                      console.log(users_all);
                    });

                    //send and get message
                    socket.on("sendMessage", ({ senderId, receiverId, text }) => {
                      const user = getUser(receiverId);
                      console.log("sendMessage");
                      console.log(senderId);
                      console.log(receiverId);
                      console.log(text);
                      console.log(user);
                      

                      if(  user.socketId !== null )
                      {
                        console.log(user.socketId);
                        io.to(user.socketId).emit("getMessage", {
                          senderId,
                          text,
                        });
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
//*/
                    req.io.sockets.emit('messages', req.body.body);
                    console.log("=====req.io.sockets.message=====");
                    console.log(req.body.body)


                    message.save(err => {
                        if (err) {
                            console.log(err);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ message: 'Failure' }));
                            res.sendStatus(500);
                        } else {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(
                                JSON.stringify({
                                    message: 'Success',
                                    conversationId: conversation._id,
                                })
                            );
                        }
                    });
                }
            }
        );
    }
});

module.exports = router;
