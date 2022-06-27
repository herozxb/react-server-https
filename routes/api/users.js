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
          console.log(err);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Failure" }));
          res.sendStatus(500);
        } else {
          res.send(users);
        }
      });
  } catch (err) {
    console.log(err);
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
          console.log(err);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Failure" }));
          res.sendStatus(500);
        } else {
          res.send(users);
        }
      });
  } catch (err) {
    console.log(err);
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
      d.setMonth(d.getMonth() + 1);
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
                    console.log(err);
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
            .catch((err) => console.log(err));
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

async function wechat_pay_qr() {

  const nonce_str = Math.random().toString(36).substr(2, 15);// 随机字符串
  const timestamp = parseInt(+new Date() / 1000 + '').toString(); // 时间戳 秒\\
  
  const out_trade_no = nonce_str +"_"+ timestamp;

  const params = {
      description: '中文编程VIP会员',
      out_trade_no: out_trade_no,
      notify_url: 'https://www.xtalentyou.com:5002/api/users/wechat_pay',
      amount: {
        total: 100,
      },
    };
  const result = await pay.transactions_native(params);
  console.log(result);
  return result;
}


router.post("/wechat_qr", async (req, res) => {

  const nonce_str = Math.random().toString(36).substr(2, 15);// 随机字符串
  const timestamp = parseInt(+new Date() / 1000 + '').toString(); // 时间戳 秒\\
  
  const out_trade_no = nonce_str +"_"+ timestamp;

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

router.post("/wechat_pay", (req, res) => {
  // Form validation
  //const { errors, isValid } = validateLoginInput(req.body);
  // Check validation
  //if (!isValid) {
  //  return res.status(400).json(errors);
  //}

  console.log("==============req.body=====================");
  console.log(req.body);
  console.log(req.body.summary);
  
  const key = "49966677xlanguageherozxb49966677"

  let ciphertext = req.body.resource.ciphertext
  let nonce = req.body.resource.nonce
  let associated_data = req.body.resource.associated_data

  // 解密 ciphertext字符  AEAD_AES_256_GCM算法
  ciphertext = Buffer.from(ciphertext, 'base64');
  let authTag = ciphertext.slice(ciphertext.length - 16);
  let data = ciphertext.slice(0, ciphertext.length - 16);
  let decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associated_data));
  let decoded = decipher.update(data, null, 'utf8');
  decipher.final();
  let payData = JSON.parse(decoded); //解密后的数据

  console.log(payData);

  var d = new Date();
  d.setMonth(d.getMonth() + 1);


  User.findOne({ "username" : "vip" }).then((user) => {

    console.log("================user====================")
    console.log(user)
    var  vip_date = Date.parse(user.vip_expired_date)
    vip_date.setMonth(vip_date.getMonth() + 10);

    const update = {
      "$set": {
        "vip_expired_date" : vip_date.toISOString();
      }
    };

    User.findOneAndUpdate({ "username" : "vip" }, update);

  })


  res.send("<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>");


});


module.exports = router;
