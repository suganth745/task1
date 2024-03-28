var mongoose = require("mongoose");

var User = require("./userModel");
var Post = require("./postModel");
const bcrypt = require("bcryptjs");
const authUserMiddleware = require("./jwt.middleware");

const express = require("express");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");
const router = require("./routes");
const rateLimit = require("express-rate-limit");

const swaggerOption = {
  swaggerDefinition: {
    info: {
      title: "Api Task",
      version: "1.0.0",
    },
  },
  apis: ["app.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOption);

mongoose
  .connect(
    "mongodb+srv://cpplid:mouseBall100@cpplid.a2erh4i.mongodb.net/task?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("db connected");
  })
  .catch(() => {
    console.log("error in db connection");
  });

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(limiter);

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));

app.get("/", (req, res) => {
  const { param1 } = req.query;

  res.send("Hello World!<br>Param1 = " + param1);
});

/**
 * @openapi
 * /login:
 *   post:
 *     description: Login
 *     parameters:
 *     - name: email
 *       type: String
 *     - name: password
 *       type: String
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
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

/**
 * @openapi
 * /register:
 *   post:
 *     description: Register
 *     parameters:
 *     - name: email
 *       type: String
 *     - name: name
 *       type: String
 *     - name: password
 *       type: String
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
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

/**
 * @openapi
 * /post:
 *   post:
 *     description: Create Post
 *     parameters:
 *     - name: title
 *       type: String
 *     - name: content
 *       type: String
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
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

/**
 * @openapi
 * /post/:id:
 *   put:
 *     description: Update Post
 *     parameters:
 *     - name: title
 *       type: String
 *     - name: content
 *       type: String
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
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

/**
 * @openapi
 * /post/:id:
 *   delete:
 *     description: Delete Post
 *     parameters:
 *     - name: id
 *       type: String
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
app.delete("/post/:id", authUserMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    await Post.findByIdAndDelete(id).exec();

    return res.send("deleted successfully");
  } catch (err) {
    return res.status(500).json({ error: "something went wrong" });
  }
});

// Follow / Un Follow

/**
 * @openapi
 * /user/follow/:id:
 *   put:
 *     description: Follow User
 *     parameters:
 *     - name: id
 *       type: String
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
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

/**
 * @openapi
 * /user/unfollow/:id:
 *   put:
 *     description: Unfollow User
 *     parameters:
 *     - name: id
 *       type: String
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
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

/**
 * @openapi
 * /user/following:
 *   get:
 *     description: Get following users
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
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

/**
 * @openapi
 * /user/followers:
 *   get:
 *     description: Get Followers
 *     responses:
 *       200:
 *         description: Returns a user object.
 */
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

app.listen(3000, () => {
  console.log("Listening on port 3000!");
});
