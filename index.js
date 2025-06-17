const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
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

    
    // ✅ Get All Posts
    app.get("/volunteer", async (req, res) => {
      const result = await volunteerCollection.find().toArray();
      res.send(result);
    });

    // ✅ Get Top 6 by Deadline
    app.get("/volunteer/top", async (req, res) => {
      const result = await volunteerCollection.find().sort({ deadline: 1 }).limit(6).toArray();
      res.send(result);
    });

    // ✅ Get One Post
    app.get("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const post = await volunteerCollection.findOne({ _id: new ObjectId(id) });
      res.send(post);
    });

    // ✅ Create New Post
    app.post("/volunteer", async (req, res) => {
      const data = req.body;
      const result = await volunteerCollection.insertOne(data);
      res.send(result);
    });

    // ✅ Update Post
    app.put("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const result = await volunteerCollection.updateOne({ _id: new ObjectId(id) }, { $set: data });
      res.send(result);
    });

    // ✅ Delete Post
    app.delete("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const result = await volunteerCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ✅ Search by Title
    app.get("/volunteer-search", async (req, res) => {
      const keyword = req.query.q || "";
      const result = await volunteerCollection.find({ title: { $regex: keyword, $options: "i" } }).toArray();
      res.send(result);
    });

    // ✅ Check if User Already Applied
    app.get("/volunteer-requests/check", async (req, res) => {
      const { userEmail, postId } = req.query;
      const exists = await requestCollection.findOne({ userEmail, postId });
      res.send({ alreadyApplied: !!exists });
    });

    // ✅ Get Volunteer Requests (optional filters)
    app.get("/volunteer-requests", async (req, res) => {
      const { userEmail, postId } = req.query;
      const query = {};
      if (userEmail) query.userEmail = userEmail;
      if (postId) query.postId = postId;
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });

    // ✅ Add Request (Apply as Volunteer)
    app.post("/volunteer-requests", async (req, res) => {
      const request = req.body;
      const result = await requestCollection.insertOne(request);
      res.send(result);
    });
    // // ✅ Cancel Request (uncomment to use)
    // /*
    app.delete("/volunteer-requests/:id", async (req, res) => {
      const id = req.params.id;
      const request = await requestCollection.findOne({ _id: new ObjectId(id) });
      await requestCollection.deleteOne({ _id: new ObjectId(id) });
      await volunteerCollection.updateOne({ _id: new ObjectId(request.postId) }, { $inc: { volunteers: 1 } });
      res.send({ message: "Request cancelled" });
    });
    

    await client.db("admin").command({ ping: 1 });
    console.log(" Connected to MongoDB");
  } finally {
    // await client.close(); // Keep open for server
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Volunteer Management Server Running ');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
