"use strict";

var express = require("express");

var app = express();

var Handlebars = require("handlebars");

var handlebars = require("express-handlebars");

var _require = require("@handlebars/allow-prototype-access"),
    allowInsecurePrototypeAccess = _require.allowInsecurePrototypeAccess;

var mongoose = require("mongoose");

var user = require("./models/userModel");

var post = require("./models/postModel");

var expressSession = require("express-session");

var session = require("express-session");

var connectMongo = require("connect-mongo");

var fs = require('fs');

var multer = require('multer');

var likedPostModel = require('./models/userLikedPostsModel');

var storage = multer.diskStorage({
  destination: function destination(req, file, cb) {
    cb(null, './assets/post-images');
  },
  filename: function filename(req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
  }
});
var upload = multer({
  storage: storage
});
app.use(express.urlencoded({
  extended: true
}));
var mongoStore = connectMongo(expressSession);
app.use(expressSession({
  secret: "test",
  resave: false,
  saveUninitialized: true,
  store: new mongoStore({
    mongooseConnection: mongoose.connection
  })
}));
app.use(express.json());
mongoose.connect("mongodb://127.0.0.1/instagram", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
app.engine("handlebars", handlebars({
  handlebars: allowInsecurePrototypeAccess(Handlebars)
}), handlebars());
app.set("view engine", "handlebars");
app.use(express["static"]("assets"));

function isAuth(req, res, next) {
  if (req.session.userid) {
    return next();
  } else {
    res.render("login/login", {
      layout: "login"
    });
  }
}

app.get("/", isAuth, function (req, res) {
  user.find({}, function (err, suggestUsers) {
    var limitiedSuggestUserInfo = [];
    user.findById(req.session.userid, function (err, user) {
      var limitiedUserInfo = {
        email: user.email,
        firstName: user.firstName,
        username: user.username
      };
      var sameUser = user.username == limitiedUserInfo.username ? false : true;

      for (a in suggestUsers) {
        if (suggestUsers[a].username == user.username) {
          continue;
        }

        limitiedSuggestUserInfo.push({
          avatar: suggestUsers[a].avatar,
          email: suggestUsers[a].email,
          firstName: suggestUsers[a].firstName,
          username: suggestUsers[a].username
        });
      }

      res.render("home", {
        authUser: limitiedUserInfo,
        suggestUser: limitiedSuggestUserInfo,
        sameUser: sameUser
      });
    });
  });
});
app.get('/signup', function (req, res) {
  res.render("login/register", {
    layout: "login"
  });
});
app.post('/signup', function (req, res) {
  var availables = {
    username: false,
    mail: false
  };
  user.findOne({
    email: req.body.email
  }, function (err, usr) {
    if (usr) {
      return res.json({
        success: false,
        message: "Mail Adresi Kullanılıyor"
      });
    } else {
      availables.mail = true;
      user.findOne({
        username: req.body.username
      }, function (err, usr) {
        if (usr) {
          res.json({
            success: false,
            message: "Kullanıcı Adı kullanılıyor"
          });
        } else {
          availables.username = true;

          if (availables.username && availables.mail && req.body.submitted) {
            user.create({
              email: req.body.email,
              username: req.body.username,
              firstName: req.body.firstName,
              password: req.body.password
            }, function (err, usr) {
              if (err) {
                res.json({
                  success: false,
                  message: "Hesap oluşturulurken bir sorun yaşandı hata:" + err
                });
              } else {
                req.session.userid = usr._id;
                res.json({
                  success: true,
                  message: "Kullanıcı Oluşturuldu"
                });
              }
            });
          }
        }
      });
    }
  });
});
app.get('/logout', isAuth, function (req, res) {
  req.session.destroy(function (err) {
    !err ? res.redirect('/') : res.redirect('/404');
  });
});
app.get('/explore', isAuth, function (req, res) {
  res.render('explore');
});
app.get('/:username', function (req, res) {
  user.findOne({
    username: req.params.username
  }, function (err, usr) {
    if (usr) {
      post.find({
        userId: usr._id
      }, function (err, post) {
        user.findOne({
          _id: req.session.userid
        }, function (err, user) {
          var limitiedUserInfo = {
            avatar: user.avatar,
            email: user.email,
            firstName: user.firstName,
            username: user.username
          };
          var sameUser = usr.username == limitiedUserInfo.username ? false : true;
          res.render('account', {
            authUser: limitiedUserInfo,
            user: usr,
            post: post,
            sameUser: sameUser
          });
        });
      });
    } else {
      res.render('account');
    }
  });
});
app.get('/post/create', isAuth, function (req, res) {
  fs.readFile('./views//modals/createpost.html', 'utf8', function (err, text) {
    err ? res.json({
      success: false,
      message: "dosya okunamadı"
    }) : res.json({
      success: true,
      message: 'dosya okundu',
      file: text
    });
  });
});
app.post('/post/create', isAuth, upload.single('image'), function (req, res) {
  var replacedPath = req.file.path.replace('assets', '');
  post.create({
    userId: req.session.userid,
    totalLike: 0,
    date: Date.now(),
    imagePath: replacedPath,
    description: req.body.description
  }, function (err, response) {
    err ? res.json({
      success: false,
      message: err + " olarak hata oluştu"
    }) : res.json({
      success: true,
      message: "Paylaşım başarılı"
    });
  });
});
app.post('/account/renderPost', isAuth, function (req, res) {
  post.findById(req.body.post_handle, function (err, post) {
    fs.readFile('./views/modals/viewPostModal.handlebars', 'utf8', function (err, text) {
      if (!post) res.json({
        success: false,
        message: "Post bulunamadı"
      });else {
        text = text.replace('##IMAGE##', post.imagePath);
      }
      err ? res.json({
        success: false,
        message: "dosya okunamadı"
      }) : res.json({
        success: true,
        message: "dosya okuma başarılı",
        file: text,
        post: post
      });
    });
  });
});
app.post('/post/like', function (req, res) {
  post.findById(req.body.post_handle, function (err, findedpost) {
    likedPostModel.findOne({
      ownerId: req.session.userid,
      likedUserId: findedpost._id
    }, function (err, isLiked) {
      if (!isLiked) {
        likedPostModel.create({
          ownerId: req.session.userid,
          likedUserId: findedpost._id
        }, function (err, callback) {
          if (!err) {
            post.findByIdAndUpdate(req.body.post_handle, {
              $inc: {
                totalLike: 1
              }
            }, function (err, post) {
              !err ? res.json({
                success: true,
                message: 'Liked'
              }) : res.json({
                success: false,
                message: 'An error when like post'
              });
            });
          } else {
            console.log(err);
          }
        });
      }
    });
  });
});
app.post("/", function (req, res) {
  var _req$body = req.body,
      email = _req$body.email,
      password = _req$body.password;
  user.findOne({
    email: email
  }, function (err, usr) {
    if (!usr) {
      res.json({
        success: "false",
        message: email + " adında kayıt yok"
      });
    } else {
      if (usr.password == password && usr.email == email) {
        req.session.userid = usr._id;
        res.json({
          success: "true",
          message: "başarılı yönlendiriliyor."
        });
      } else {
        res.json({
          success: "false",
          message: "kontrol et"
        });
      }
    }
  });
});
app.listen(3000, function () {
  console.log("server started", "http://localhost:3000");
});