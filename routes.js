var express = require("express");
var mongoose = require("mongoose");
var app = express();
var User = require("./userModel");
var Post = require("./postModel");
const bcrypt = require("bcryptjs");
const authUserMiddleware = require("./jwt.middleware");

app.get("/", (req, res) => {
  const { param1 } = req.query;

  res.send("Hello World!<br>Param1 = " + param1);
});

// User Management
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    var getUser = await User.findOne({ email });

    if (!getUser) return res.status(400).json({ error: "User not found" });

    const hash = bcrypt.compareSync(password, getUser.password);

    if (!hash) return res.status(401).json({ error: "Incorrect password" });

    getUser.token = await getUser.generateAuthToken();
    getUser.save();

    res.send({
      token: getUser.token,
      user_id: getUser._id,
      name: getUser.name,
    });
  } catch (err) {
    console.log("🚀 ~ file: login ", err);
    return res.status(500).json({ error: "something went wrong" });
  }
});

app.post("/register", async (req, res) => {
  const { body } = req;

  const { name, password, email } = body;

  try {
    if (!req.body) {
      res.status(400).json({ error: "Body not specified" });
      return;
    }

    const saltRounds = 10;
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = await bcrypt.hashSync(password, salt);

    const user = new User({
      email,
      name,
      password: hash,
    });

    var response = await user.save();

    res.send(response);
  } catch (err) {
    console.log("🚀 ~ file: create user ", err);
    return res.status(500).json({ error: "something went wrong" });
  }
});

// Post Management
app.post("/post", authUserMiddleware, async (req, res) => {
  const { body } = req;

  const { title, content } = body;

  try {
    if (!req.body) {
      res.status(400).json({ error: "Body not specified" });
      return;
    }

    const post = new Post({
      user_id: req.user._id,
      title,
      content,
    });

    var response = await post.save();

    res.send(response);
  } catch (err) {
    console.log("🚀 ~ file: create user ", err);
    return res.status(500).json({ error: "something went wrong" });
  }
});

app.put("/post/:id", authUserMiddleware, async (req, res) => {
  try {
    const { body } = req;
    const { id } = req.params;

    var response = await Post.findOneAndUpdate(
      { _id: id },
      { ...body },
      {
        new: true,
      }
    ).exec();

    return res.send(response);
  } catch (err) {
    //throw error in json response with status 500.
    return res.status(500).json({ error: "something went wrong" });
  }
});

app.delete("/post/:id", authUserMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    var result = await Post.findByIdAndDelete(id).exec();

    return res.send("deleted successfully");
  } catch (err) {
    return res.status(500).json({ error: "something went wrong" });
  }
});

// Follow / Un Follow

app.put("/user/follow/:id", authUserMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    var getUser = await User.findById(req.user._id);

    const _following = [...getUser.following, id];

    var response = await User.findOneAndUpdate(
      { _id: req.user._id },
      { following: _following },
      {
        new: true,
      }
    ).exec();

    return res.send(response);
  } catch (err) {
    //throw error in json response with status 500.
    return res.status(500).json({ error: "something went wrong" });
  }
});

app.put("/user/unfollow/:id", authUserMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    var getUser = await User.findById(req.user._id).lean();

    const _following = [...getUser.following].filter((o) => o != id);

    var response = await User.findOneAndUpdate(
      { _id: req.user._id },
      { following: _following },
      {
        new: true,
      }
    ).exec();

    return res.send(response);
  } catch (err) {
    console.log("🚀 ~ app.put ~ err:", err);
    //throw error in json response with status 500.
    return res.status(500).json({ error: "something went wrong" });
  }
});

app.get("/user/following", authUserMiddleware, async (req, res) => {
  try {
    var result = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "following",
          foreignField: "_id",
          as: "followers",
        },
      },
    ]);

    var response = result[0]?.followers?.map((o) => {
      return {
        name: o.name,
      };
    });

    return res.send(response);
  } catch (err) {
    console.log("🚀 ~ app.put ~ err:", err);
    //throw error in json response with status 500.
    return res.status(500).json({ error: "something went wrong" });
  }
});

app.get("/user/followers", authUserMiddleware, async (req, res) => {
  try {
    var result = await User.find({
      following: { $in: [new mongoose.Types.ObjectId(req.user._id)] },
    });

    var response = result.map((o) => {
      return {
        name: o.name,
      };
    });

    return res.send(response);
  } catch (err) {
    console.log("🚀 ~ app.put ~ err:", err);
    //throw error in json response with status 500.
    return res.status(500).json({ error: "something went wrong" });
  }
});

module.exports = app;
