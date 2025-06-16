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

     // 1. Get all volunteer posts
    app.get("/volunteer", async (req, res) => {
      try {
        const result = await volunteerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get volunteer posts" });
      }
    });

    // 2. Get top 6 volunteer posts sorted by upcoming deadline ascending
    app.get("/volunteer/top", async (req, res) => {
      try {
        const result = await volunteerCollection
          .find()
          .sort({ deadline: 1 })
          .limit(6)
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get top volunteer posts" });
      }
    });

    // 3. Get single volunteer post by ID
    app.get("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const post = await volunteerCollection.findOne({ _id: new ObjectId(id) });
        if (!post) return res.status(404).send({ message: "Post not found" });
        res.send(post);
      } catch (error) {
        console.error(error);
        res.status(400).send({ message: "Invalid ID format" });
      }
    });

    // 4. Add new volunteer post
    app.post("/volunteer", async (req, res) => {
      const data = req.body;
      if (!data.title || !data.organizerEmail) {
        return res.status(400).send({ message: "Title and Organizer Email required" });
      }
      try {
        const result = await volunteerCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add volunteer post" });
      }
    });

    // 5. Get my volunteer posts by organizer email (query param: ?email=)
    app.get("/my-posts", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email query parameter required" });
      try {
        const result = await volunteerCollection.find({ organizerEmail: email }).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get your posts" });
      }
    });

    // 6. Delete volunteer post by ID
    app.delete("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await volunteerCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).send({ message: "Post not found" });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(400).send({ message: "Invalid ID format" });
      }
    });

    // 7. Update volunteer post by ID
    app.put("/volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const updatedPost = req.body;
      try {
        const result = await volunteerCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedPost }
        );
        if (result.matchedCount === 0) return res.status(404).send({ message: "Post not found" });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(400).send({ message: "Invalid ID format" });
      }
    });

    // 8. Search volunteer posts by keyword in title (?q=keyword)
    app.get("/volunteer-search", async (req, res) => {
      const keyword = req.query.q || "";
      try {
        const result = await volunteerCollection
          .find({ title: { $regex: keyword, $options: "i" } })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Search failed" });
      }
    });

    // 9. Check if user already applied for a volunteer post
    // Query params: userEmail & postId
    app.get('/volunteer-requests/check', async (req, res) => {
      const { userEmail, postId } = req.query;
      if (!userEmail || !postId) {
        return res.status(400).send({ message: "userEmail and postId required" });
      }
      try {
        const exists = await requestCollection.findOne({ userEmail, postId });
        res.send({ alreadyApplied: !!exists });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Check failed" });
      }
    });
    app.get("/volunteer-requests", async (req, res) => {
  const { userEmail, postId } = req.query;

  const query = {
    userEmail: userEmail,
    postId: postId,
  };

  const existing = await db.collection("volunteerRequests").find(query).toArray();

  res.send(existing);
});

    // 10. Apply as volunteer (POST request body with user and post details)
    app.post("/volunteer-requests", async (req, res) => {
      const request = req.body;
      if (!request.userEmail || !request.postId) {
        return res.status(400).send({ message: "userEmail and postId required" });
      }
      try {
        // Check for duplicate
        const existingRequest = await requestCollection.findOne({ userEmail: request.userEmail, postId: request.postId });
        if (existingRequest) {
          return res.status(409).send({ message: "Already applied for this post" });
        }

        // Check if volunteers > 0 before applying
        const post = await volunteerCollection.findOne({ _id: new ObjectId(request.postId) });
        if (!post) {
          return res.status(404).send({ message: "Volunteer post not found" });
        }
        if (!post.volunteers || post.volunteers <= 0) {
          return res.status(400).send({ message: "No volunteers needed currently" });
        }

        // Insert volunteer request
        const result = await requestCollection.insertOne(request);

        // Decrement volunteers needed count
        await volunteerCollection.updateOne(
          { _id: new ObjectId(request.postId) },
          { $inc: { volunteers: -1 } }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to apply as volunteer" });
      }
    });
    

    // 11. Get my volunteer requests by user email (?email=)
    app.get("/my-requests", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email query parameter required" });
      try {
        const requests = await requestCollection.find({ userEmail: email }).toArray();
        res.send(requests);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to get your requests" });
      }
    });

    // 12. Cancel a volunteer request by ID
    app.delete("/volunteer-requests/:id", async (req, res) => {
      const id = req.params.id;
      try {
        // Find the request to get postId for increment
        const request = await requestCollection.findOne({ _id: new ObjectId(id) });
        if (!request) return res.status(404).send({ message: "Request not found" });

        const result = await requestCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).send({ message: "Request not found" });

        // Increment volunteers count back
        await volunteerCollection.updateOne(
          { _id: new ObjectId(request.postId) },
          { $inc: { volunteers: 1 } }
        );

        res.send({ message: "Request cancelled successfully" });
      } catch (error) {
        console.error(error);
        res.status(400).send({ message: "Invalid ID format" });
      }
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
