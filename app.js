const express = require("express");
const app = express();
const Handlebars = require("handlebars");
const handlebars = require("express-handlebars");
const {
  allowInsecurePrototypeAccess,
} = require("@handlebars/allow-prototype-access");
const mongoose = require("mongoose");
const user = require("./models/userModel");
const post = require("./models/postModel");
const expressSession = require("express-session");
const session = require("express-session");
const connectMongo = require("connect-mongo");
const fs = require('fs');
var multer = require('multer');
const likedPostModel = require('./models/userLikedPostsModel');



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './assets/post-images');
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname)
  }
})

var upload = multer({ storage: storage });



app.use(express.urlencoded({ extended: true }));
const mongoStore = connectMongo(expressSession);
app.use(
  expressSession({
    secret: "test",
    resave: false,
    saveUninitialized: true,
    store: new mongoStore({ mongooseConnection: mongoose.connection }),
  })
);
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1/instagram", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

app.engine(
  "handlebars",
  handlebars({
    handlebars: allowInsecurePrototypeAccess(Handlebars),
  }),
  handlebars()
);

app.set("view engine", "handlebars");

app.use(express.static("assets"));

function isAuth(req, res, next) {
  if (req.session.userid) {
    return next()
  }
  else {
    res.render("login/login", { layout: "login" });
  }
}

app.get("/", isAuth, (req, res) => {

  user.find({}, (err, suggestUsers) => {
    var limitiedSuggestUserInfo = [];
    user.findById(req.session.userid, (err, user) => {
      const limitiedUserInfo = { email: user.email, firstName: user.firstName, username: user.username };
      const sameUser = user.username == limitiedUserInfo.username ? false : true;

      for (a in suggestUsers) {
        if (suggestUsers[a].username == user.username) {
          continue;
        }

        limitiedSuggestUserInfo.push({ avatar: suggestUsers[a].avatar, email: suggestUsers[a].email, firstName: suggestUsers[a].firstName, username: suggestUsers[a].username });
      }
      res.render("home", { authUser: limitiedUserInfo, suggestUser: limitiedSuggestUserInfo, sameUser: sameUser });
    })
  });
});

app.get('/signup', (req, res) => {
  res.render("login/register", { layout: "login" });
})

app.post('/signup', (req, res) => {
  let availables = { username: false, mail: false };
  user.findOne({ email: req.body.email }, (err, usr) => {
    if (usr) {
      return res.json({ success: false, message: "Mail Adresi Kullanılıyor" });
    }
    else {
      availables.mail = true;
      user.findOne({ username: req.body.username }, (err, usr) => {
        if (usr) {
          res.json({ success: false, message: "Kullanıcı Adı kullanılıyor" });
        }
        else {
          availables.username = true;
          if (availables.username && availables.mail && req.body.submitted) {
            user.create({
              email: req.body.email,
              username: req.body.username,
              firstName: req.body.firstName,
              password: req.body.password
            }, (err, usr) => {
              if (err) { res.json({ success: false, message: "Hesap oluşturulurken bir sorun yaşandı hata:" + err }) }
              else {
                req.session.userid = usr._id;
                res.json({ success: true, message: "Kullanıcı Oluşturuldu" })

              }
            });
          }
        }
      });
    }
  });


})

app.get('/logout', isAuth, (req, res) => {
  req.session.destroy((err) => {
    !err ? res.redirect('/') : res.redirect('/404');
  })
})

app.get('/explore', isAuth, (req, res) => {
  res.render('explore');
})

app.get('/:username', (req, res) => {
  user.findOne({ username: req.params.username }, (err, usr) => {
    if (usr) {
      post.find({ userId: usr._id }, (err, post) => {
        user.findOne({ _id: req.session.userid }, (err, user) => {
          const limitiedUserInfo = { avatar: user.avatar, email: user.email, firstName: user.firstName, username: user.username }
          const sameUser = usr.username == limitiedUserInfo.username ? false : true;
          res.render('account', { authUser: limitiedUserInfo, user: usr, post: post, sameUser: sameUser });
        })
      })
    }
    else {
      res.render('account');
    }

  })
})

app.get('/post/create', isAuth, (req, res) => {
  fs.readFile('./views//modals/createpost.html', 'utf8', (err, text) => {
    err ? res.json({ success: false, message: "dosya okunamadı" }) :
      res.json({ success: true, message: 'dosya okundu', file: text })

  })

})
app.post('/post/create', isAuth, upload.single('image'), (req, res) => {


  let replacedPath = req.file.path.replace('assets', '');
  post.create({
    userId: req.session.userid,
    totalLike: 0,
    date: Date.now(),
    imagePath: replacedPath,
    description: req.body.description
  }, (err, response) => {
    err ? res.json({ success: false, message: err + " olarak hata oluştu" }) : res.json({ success: true, message: "Paylaşım başarılı" })
  })
})


app.post('/account/renderPost', isAuth, (req, res) => {

  post.findById(req.body.post_handle, (err, post) => {
    fs.readFile('./views/modals/viewPostModal.handlebars', 'utf8', (err, text) => {
      if (!post) res.json({ success: false, message: "Post bulunamadı" })
      else {
        text = text.replace('##IMAGE##', post.imagePath);
      }

      err ? res.json({ success: false, message: "dosya okunamadı" }) : res.json({ success: true, message: "dosya okuma başarılı", file: text, post: post });
    });
  })
})



app.post('/post/like', (req, res) => {


  post.findById(req.body.post_handle, (err, findedpost) => {
    likedPostModel.findOne({ ownerId: req.session.userid, likedUserId: findedpost._id }, (err, isLiked) => {
      if (!isLiked) {
        likedPostModel.create({
          ownerId: req.session.userid,
          likedUserId: findedpost._id
        }, (err, callback) => {
          if (!err) {
            post.findByIdAndUpdate(req.body.post_handle, { $inc: { totalLike: 1 } }, (err, post) => {
              !err ? res.json({ success: true, message: 'Liked' }) : res.json({ success: false, message: 'An error when like post' });
            })
          }
          else {
            console.log(err);
          }
        })
      }

    })
  })


})


app.post("/", (req, res) => {
  const { email, password } = req.body;
  user.findOne({ email }, (err, usr) => {
    if (!usr) {
      res.json({ success: "false", message: email + " adında kayıt yok" });
    } else {

      if (usr.password == password && usr.email == email) {
        req.session.userid = usr._id;
        res.json({ success: "true", message: "başarılı yönlendiriliyor." });
      }
      else { res.json({ success: "false", message: "kontrol et" }); }
    }
  });
});

app.listen(3000, () => {
  console.log("server started", "http://localhost:3000");
});

