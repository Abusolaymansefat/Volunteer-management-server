const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) => {
  console.log("inside the logger ");
  next();
};

const verifytoken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("cooki in the middleware", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorize access" });
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorize access" });
    }
    req.decoded = decoded;
  });
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sq4up6y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("volunteerDB");
    const volunteerCollection = db.collection("volunteer");
    const requestCollection = db.collection("volunteerRequests");

    //jwt tokan related api
    app.post("/jwt", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.JWT_ACCESS_SECRET, {
        expiresIn: "1d",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 3 * 24 * 60 * 60 * 1000,
      });

      res.send({ success: true });
    });

    app.get("/volunteer", async (req, res) => {
      const result = await volunteerCollection.find().toArray();
      res.send(result);
    });

    app.get("/volunteer/top", async (req, res) => {
      const result = await volunteerCollection
        .find()
        .sort({ deadline: 1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const post = await volunteerCollection.findOne({ _id: new ObjectId(id) });
      res.send(post);
    });

    app.put("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const result = await volunteerCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
      );
      res.send(result);
    });
    app.patch("/volunteer/:id", async (req, res) => {
      const id = req.params.id;

      const result = await volunteerCollection.updateOne(
        { _id: new ObjectId(id), volunteers: { $gt: 0 } },
        { $inc: { volunteers: -1 } }
      );
      res.send(result);
    });

    app.delete("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const result = await volunteerCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.patch("/volunteer-decrement/:id", async (req, res) => {
      const id = req.params.id;
      const result = await volunteerCollection.updateOne(
        { _id: new ObjectId(id), volunteers: { $gt: 0 } },
        { $inc: { volunteers: -1 } }
      );
      res.send(result);
    });

    app.get("/volunteer-requests", logger, verifytoken, async (req, res) => {
      const { userEmail, postId } = req.query;
      // console.log('indide application api', req.cookies)
      // if(email !== req.decoded.email){
      //   return res.status(403).send({message: 'forbidden access'})
      // }
      const query = {};
      if (userEmail) query.userEmail = userEmail;
      if (postId) query.postId = postId;
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/volunteer-requests", async (req, res) => {
      const request = req.body;
      const result = await requestCollection.insertOne(request);
      res.send(result);
    });
    app.delete("/volunteer-requests/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const request = await requestCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!request) {
          return res.status(404).send({ message: "Request not found" });
        }

        await requestCollection.deleteOne({ _id: new ObjectId(id) });

        await volunteerCollection.updateOne(
          { _id: new ObjectId(request.postId) },
          { $inc: { volunteers: 1 } }
        );

        res.send({ message: "Request cancelled" });
      } catch (error) {
        console.error("Error deleting request:", error.message);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // app.delete("/volunteer-requests/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const request = await requestCollection.findOne({
    //     _id: new ObjectId(id),
    //   });

    //   await requestCollection.deleteOne({ _id: new ObjectId(id) });

    //   await volunteerCollection.updateOne(
    //     { _id: new ObjectId(request.postId) },
    //     { $inc: { volunteers: 1 } }
    //   );
    //   res.send({ message: "Request cancelled" });
    // });

    await client.db("admin").command({ ping: 1 });
    console.log(" Connected to MongoDB");
  } finally {
    // await client.close(); // Keep open for server
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Volunteer Management Server Running ");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
