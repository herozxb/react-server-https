const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const keys = require("../../config/keys");
const verify = require("../../utilities/verify-token");
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");
const User = require("../../models/User");

const WxPay = require('wechatpay-node-v3');
const fs = require('fs');
const crypto =  require('crypto');

const redis = require('redis');
const client = redis.createClient();  

async function client_connect(){
  await client.connect()
}

client_connect();

router.get("/", (req, res) => {
  try {
    let jwtUser = jwt.verify(verify(req), keys.secretOrKey);
    let id = mongoose.Types.ObjectId(jwtUser.id);

    User.aggregate([{ $skip : 3 },{ $limit: 2 }])
      .match({ _id: { $not: { $eq: id } } })
      .project({
        password: 0,
        __v: 0,
        date: 0,
      })
      .exec((err, users) => {
        if (err) {
          //console.log(err);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Failure" }));
          res.sendStatus(500);
        } else {
          res.send(users);
        }
      });
  } catch (err) {
    //console.log(err);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Unauthorized" }));
    res.sendStatus(401);
  }
});


router.post("/", (req, res) => {
  try {
    let jwtUser = jwt.verify(verify(req), keys.secretOrKey);
    let id = mongoose.Types.ObjectId(jwtUser.id);

    //console.log("==========body============")
    //console.log(req.body)

    User.aggregate([{ $skip : req.body.page * 10 },{ $limit: 10 }])
      .match({ _id: { $not: { $eq: id } } })
      .project({
        password: 0,
        __v: 0,
        date: 0,
      })
      .exec((err, users) => {
        if (err) {
          //console.log(err);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Failure" }));
          res.sendStatus(500);
        } else {
          res.send(users);
        }
      });
  } catch (err) {
    //console.log(err);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Unauthorized" }));
    res.sendStatus(401);
  }
});




router.post("/register", (req, res) => {
  // Form validation
  const { errors, isValid } = validateRegisterInput(req.body);
  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  User.findOne({ username: req.body.username }).then((user) => {
    if (user) {
      return res.status(400).json({ message: "Username already exists" });
    } else {
      var d = new Date();
      d.setMonth(d.getMonth() - 1);
      const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        createdAt: new Date().toISOString(),
        vip_expired_date: d.toISOString()
      });
      // Hash password before saving in database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then((user) => {
              const payload = {
                id: user.id,
                name: user.name,
              };
              // Sign token
              jwt.sign(
                payload,
                keys.secretOrKey,
                {
                  expiresIn: 31556926, // 1 year in seconds
                },
                (err, token) => {
                  if (err) {
                    //console.log(err);
                  } else {
                    req.io.sockets.emit("users", user.username);
                    res.json({
                      success: true,
                      token: "Bearer " + token,
                      name: user.name,
                      username: user.username,
                      id: user._id,
                      vip_expired_date:user.vip_expired_date
                    });
                  }
                }
              );
            })
            .catch(/*(err) => console.log(err)//*/);
        });
      });
    }
  });
});

router.post("/login", (req, res) => {
  // Form validation
  const { errors, isValid } = validateLoginInput(req.body);
  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  const username = req.body.username;
  const password = req.body.password;
  // Find user by username
  User.findOne({ username }).then((user) => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ usernamenotfound: "Username not found" });
    }
    // Check password
    bcrypt.compare(password, user.password).then((isMatch) => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          username: user.username,
        };
        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 31556926, // 1 year in seconds
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token,
              name: user.name,
              username: user.username,
              id: user._id,
              vip_expired_date: user.vip_expired_date
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
});


const pay = new WxPay({
  appid: 'wx5af78029e81ba904',
  mchid: '1572014821',
  publicKey: fs.readFileSync('./apiclient_cert.pem'), // 公钥
  privateKey: fs.readFileSync('./apiclient_key.pem'), // 秘钥
});


router.post("/wechat_qr", async (req, res) => {



  const nonce_str = Math.random().toString(36).substr(2, 15);// 随机字符串
  const timestamp = parseInt(+new Date() / 1000 + '').toString(); // 时间戳 秒\\
  
  const out_trade_no = nonce_str +"_"+ timestamp;

  //console.log(out_trade_no);
  //console.log(req.body);
  //console.log(req.body.username);


  client.set( out_trade_no, req.body.username )

  const params = {
      description: '中文编程VIP会员',
      out_trade_no: out_trade_no,
      notify_url: 'https://www.xtalentyou.com:5002/api/users/wechat_pay',
      amount: {
        total: 100,
      },
    };
  const result = await pay.transactions_native(params);
  res.json(result);

});

router.post("/wechat_pay", async (req, res) => {

  
  const key = "49966677xlanguageherozxb49966677"

  let ciphertext = req.body.resource.ciphertext
  let nonce = req.body.resource.nonce
  let associated_data = req.body.resource.associated_data


  ciphertext = Buffer.from(ciphertext, 'base64');
  let authTag = ciphertext.slice(ciphertext.length - 16);
  let data = ciphertext.slice(0, ciphertext.length - 16);
  let decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associated_data));
  let decoded = decipher.update(data, null, 'utf8');
  decipher.final();
  let payData = JSON.parse(decoded); //解密后的数据

  const value = await client.get(payData.out_trade_no)
  
  const state_trade = payData.trade_state

  if ( state_trade == "SUCCESS" ) 
  {

    User.findOne({ "username" : value }).then((user) => {

      var vip_expired = new Date(user.vip_expired_date)
      var today = new Date();
      var vip_date;
      if( today > vip_expired )
      {
        vip_date = today.setMonth(today.getMonth() + 1).toISOString();
      }
      else
      {
        vip_date = vip_expired.setMonth(vip_expired.getMonth() + 1).toISOString();
      }

      const update = {
        "$set": {
            "vip_expired_date" : vip_date
        }
      };

      const options = { returnNewDocument: true };

      User.findOneAndUpdate({ "username" : value }, update, options).then(updatedDocument => {
          if(updatedDocument) {
          //console.log(`Successfully updated document: ${updatedDocument}.`)
          } else {
          //console.log("No document matches the provided query.")
          }
          return updatedDocument
        }).catch(/*err => console.error(`Failed to find and update document: ${err}`)//*/)

    })

    res.json("<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>");
  }

  

});


router.post("/user_vip", (req, res) => {

  const username = req.body.username;

  // Find user by username
  User.findOne({ "username" : username }).then((user) => {


    // Check if user exists
    if (!user) {
      return res.status(404).json({ usernamenotfound: "Username not found" });
    }

    res.json({
      success: true,
      username: user.username,
      id: user._id,
      vip_expired_date: user.vip_expired_date
    });
  });
});



module.exports = router;
