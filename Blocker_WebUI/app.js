var express = require('express');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var app = express(); // express모듈을 이용해 application 객체를 생성
var bodyParser = require('body-parser');
var bkfd2Password = require('pbkdf2-password');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var hasher = bkfd2Password();
//
// var net = require('net');
// var client = net.connect({port: , host }),function(){
//   console.log('**********Client connected');
// };

var multer = require('multer');
var _storage = multer.diskStorage({
  destination: function (req, file, cb){
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb){
    cb(null, file.originalname);
  }
});
var upload = multer({ storage: _storage });

var mysql      = require('mysql');
var conn = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '111111',
  database : 'carblocker'
});

app.use(express.static('uploads'));
app.use(bodyParser.urlencoded({ extended: false }));  //app에 bodyparser모듈을 연결
app.use(bodyParser.json());         //*******
app.use(session({
  secret:'123456789@asdfqwer', // 키값
  resave: false,
  saveUninitialized: true, //세션 아이디를 실제로 사용하기 전에 발급x
  store: new MySQLStore({
    host: 'localhost',
    port: 3306,
    user:'root',
    password: '111111',
    database:'o2'
  })
}));
app.use(passport.initialize());
app.use(passport.session()); //session 뒤에 붙어야함.

app.locals.pretty = true;

app.set('views', './views');
app.set('view engine', 'pug');

app.get('/main', function(req, res){  //메인
  var sql = 'select * from sell_list';
  conn.query(sql, function(err, cars){
    if(err){
      console.log(err);
      res.status(500);
    }else{
        res.render('index',{user:req.user, cars:cars});
    }
  })
})

passport.serializeUser(function(user, done) {
  console.log('serializeUser', user);
  if(user)
  {
    done(null, user.num); // session store안에 사용자 식별값이 user.authId로 등록됨.
  }
  else {
    done(err, null);
  }
});

passport.deserializeUser(function(id, done) {   // 사용자가 웹페이지 들어올 때,
  console.log('deserializeUser', id);
  var sql = 'SELECT * FROM users WHERE num=?';
  conn.query(sql, [id], function(err, results){
    if(err){
      console.log(err);
      done(err, null);
    }else{
      done(null, results[0]);
    }
  })
});


passport.use(new LocalStrategy(
  function(username, password, done) {
    var uname = username;
    var pwd = password;

    var sql = 'SELECT * FROM users WHERE username=?';
    conn.query(sql, [uname], function(err, results){
      console.log(results);
      if(err){
        return done('There is no user.');
      }
      var user = results[0];
      return hasher({password:pwd, salt:user.salt}, function(err,pass,salt,hash){
        if(hash == user.password){
          console.log('LocalStrategy',user);
          done(null, user); //serializeUser 호출
        }else{
          done(null, false);
        }
      })
    })
}

));


app.post('/main',
  passport.authenticate(
    'local',
    {
      successRedirect: '/main',
      failureRedirect: '/p2',
      failureFlash: false
    }
));

app.get('/p2', function(req, res){ //회원가입 화면
  res.render('fail');
});

app.get('/join', function(req, res){ //회원가입 화면
  res.render('join');
});

app.post('/join', function(req, res){ // 회원가입 시, 데이터 전송     ----> db연길 필요
  hasher({password:req.body.password}, function(err, pass, salt, hash){
      var user = {
        username:req.body.username,
        password:hash,
        salt:salt,
        name:req.body.name,
        date:req.body.date
      };
      var sql= 'INSERT INTO users SET ?';
      conn.query(sql, user, function(err, results){
        if(err){
          console.log(err);
          res.status(500);
        }else{
          res.redirect('/main');
        }
      })
    });
});


app.get('/logout', function(req, res){
    req.logout();
    req.session.save(function(){
      res.redirect('/main');
    });
  })

app.get('/sell', function(req, res){
  res.render('sell1',{user:req.user});
})

app.post('/sell', function(req, res){
  var username=req.user.username;
  var _manu = ['제조사', '현대', '기아','삼성','쉐보레','쌍용'];
  var _model = ['모델', 'k7', 'SM6', '소나타 2018','제네시스'];

  var carnum=req.body.carnum;
  var manu=_manu[req.body.manu];
  var model=_model[req.body.model-1];
  var mileage=req.body.mileage;
  var fuel=req.body.fuel;
  var sql='INSERT INTO sell_list (username, carnum, manu, model, mileage, fuel) VALUES(?,?,?,?,?,?)';
  conn.query(sql, [username, carnum, manu, model, mileage, fuel], function(err, result, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }
    res.redirect('/sell2/'+result.insertId);
  })
});

app.get('/sell2/:id', function(req, res){
  var sql = 'SELECT s_num FROM sell_list';
  conn.query(sql, function(err, topics, fields){
    var id=req.params.id;
    if(id){
      var sql = 'SELECT * FROM sell_list WHERE s_num=?';
      conn.query(sql, [id], function(err, index, fields){
        if(err){
          console.log(err);
          res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
        }else{
          console.log(index[0]);
          res.render('sell2', {index:index[0], user:req.user});
        }
      });
    }else{
      console.log('There is no id.');
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }
  });
})

app.post('/sell2/:id', function(req, res){
  var s_num=req.params.id;
  var price=req.body.price;
  var sql='UPDATE sell_list SET price=? WHERE s_num=?';
  conn.query(sql, [price, s_num], function(err, result, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      res.redirect('/sell3/'+s_num);
    }
  })
});

app.get('/sell3/:id', function(req, res){
  var sql = 'SELECT s_num FROM sell_list';
  conn.query(sql, function(err, topics, fields){
    var s_num=req.params.id;
    if(s_num){
      var sql = 'SELECT * FROM sell_list WHERE s_num=?';
      conn.query(sql, [s_num], function(err, index, fields){
        if(err){
          console.log(err);
          res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
        }else{
          res.render('sell3', {index:index[0], user:req.user});
        }
      });
    }else{
      console.log('There is no id.');
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }
  });
})

app.post('/sell3/:id', function(req, res){
  var phone1 = req.body.phone1;
  var phone2 = req.body.phone2;
  var time1 = req.body.time1;
  var time2 = req.body.time2;
  var explanation = req.body.explanation;

  var s_num = req.params.id;

  var sql='UPDATE sell_list SET phone1=?, phone2=?, time1=?, time2=?, explanation=? WHERE s_num=?';
  conn.query(sql, [phone1, phone2, time1, time2, explanation, s_num], function(err, result, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      res.redirect('/sell4/'+s_num);
    }
  })
});

app.get('/sell4/:id', function(req, res){
  var sql = 'SELECT s_num FROM sell_list';
  conn.query(sql, function(err, topics, fields){
    var s_num=req.params.id;
    if(s_num){
      var sql = 'SELECT * FROM sell_list WHERE s_num=?';
      conn.query(sql, [s_num], function(err, index, fields){
        if(err){
          console.log(err);
          res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
        }else{
          res.render('sell4', {index:index[0], user:req.user});
        }
      });
    }else{
      console.log('There is no id.');
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }
  });
})

app.post('/sell4/:id', upload.single('carImg'),function(req, res){ // 사용자가 파일을 보낸다면 가공해서 req 객체에 파일이라는 property를 추가
  var carImg = req.file;
  var s_num = req.params.id;

  var sql='UPDATE sell_list SET carImg=? WHERE s_num=?';
  conn.query(sql, [carImg.filename, s_num], function(err, result, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      var sql = 'SELECT username, carnum, model, price FROM sell_list WHERE s_num=?';
      conn.query(sql, s_num,function(err, cars, fields){
        if(err){
          console.log(err);
          res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
        }else{
          //res.send(cars[0]);
          res.redirect('/search');
        }
      })
    }
  })
})

app.get('/search', function(req, res){
  var sql = 'SELECT * FROM sell_list';
  conn.query(sql, function(err, cars, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      res.render('search', {cars:cars, user:req.user});
    }
  });
})

app.get('/search/detail/:id', function(req, res){
  var id = req.params.id;
  var sql = 'SELECT * FROM sell_list WHERE s_num=?';
  conn.query(sql, [id],function(err, cars, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      res.render('search_detail', {car:cars[0], user:req.user});
    }
  })
})

app.post('/search/detail/:id', function(req, res){
  var id = req.params.id;
  var sql = 'UPDATE sell_list SET state=1 WHERE s_num=?';
  conn.query(sql, [id],function(err, cars, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      res.redirect('/search');
    }
  })
})

app.get('/mypage/:id', function(req, res){
  var id = req.params.id;
  var sql = 'SELECT * FROM sell_list WHERE username=?';
  conn.query(sql, [req.user.username],function(err, cars, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      res.render('mypage',{user:req.user, cars:cars});
    }
  })
})

app.get('/mypage2', function(req, res){
  var id = req.user.num;

  var sql = 'SELECT * FROM users WHERE num=?';
  conn.query(sql, [id],function(err, result, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      res.render('mypage2',{user:req.user, result:result[0]});
    }
  })
})

app.post('/mypage2', function(req, res){
  var id = req.user.num;

  hasher({password:req.body.password}, function(err, pass, salt, hash){
      var sql= 'UPDATE users SET salt=?, hash=? WHERE num=?';
      conn.query(sql, [salt, hash, id], function(err, results){
        if(err){
          console.log(err);
          res.status(500);
        }
      })
    });
  res.redirect('/mypage/'+id);
})

app.get('/delete', function(req, res){
  var sql ='DELETE FROM users WHERE num=?';
  conn.query(sql, [req.user.num], function(err, result){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');  //상태코드 500일 때 에러.
    }else{
      req.session.destroy();
      res.redirect('/main');
    }
  })
});




app.listen(3000, function(){
  console.log('Connected, 3000 port!');
});
