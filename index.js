const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

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
      res.cookie('tokan', token, {
        httpOnly: true,
        secure: false
      })

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
        { _id: new ObjectId(id) },
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

    app.get("/volunteer-search", async (req, res) => {
      const keyword = req.query.q || "";
      const result = await volunteerCollection
        .find({ title: { $regex: keyword, $options: "i" } })
        .toArray();
      res.send(result);
    });

    app.get("/volunteer-requests/check", async (req, res) => {
      const { userEmail, postId } = req.query;
      const exists = await requestCollection.findOne({ userEmail, postId });
      res.send({ alreadyApplied: !!exists });
    });

    app.get("/volunteer-requests", async (req, res) => {
      const { userEmail, postId } = req.query;
      console.log('indide application api', req.cookies)
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
      const request = await requestCollection.findOne({
        _id: new ObjectId(id),
      });

      await requestCollection.deleteOne({ _id: new ObjectId(id) });

      await volunteerCollection.updateOne(
        { _id: new ObjectId(request.postId) },
        { $inc: { volunteers: 1 } }
      );
      res.send({ message: "Request cancelled" });
    });

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
