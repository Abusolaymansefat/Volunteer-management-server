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

    const db = client.db('volunteerDB');
    const volunteerCollection = db.collection('volunteer');
    const requestCollection = db.collection('volunteerRequests');

    // 🔹 Add new volunteer post
    app.post('/volunteer', async (req, res) => {
      const postData = req.body;
      const result = await volunteerCollection.insertOne(postData);
      res.send(result);
    });

    // 🔹 Get all volunteer posts
    app.get('/volunteer', async (req, res) => {
      const posts = await volunteerCollection.find().toArray();
      res.send(posts);
    });

    // 🔹 Get 6 posts sorted by deadline (soonest first)
    app.get('/volunteer/sorted', async (req, res) => {
      const posts = await volunteerCollection
        .find()
        .sort({ deadline: 1 })
        .limit(6)
        .toArray();
      res.send(posts);
    });

    // 🔹 Get post by ID
    app.get('/volunteer/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const post = await volunteerCollection.findOne({ _id: new ObjectId(id) });
        if (!post) {
          return res.status(404).send({ message: 'Volunteer post not found' });
        }
        res.send(post);
      } catch (error) {
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    // 🔹 Search by title
    app.get('/volunteer-posts', async (req, res) => {
      const search = req.query.search;
      const query = search
        ? { title: { $regex: search, $options: 'i' } }
        : {};
      const posts = await volunteerCollection.find(query).toArray();
      res.send(posts);
    });

    // 🔹 Get posts by logged-in user (email)
    app.get('/my-posts', async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: 'Email required' });
      const posts = await volunteerCollection
        .find({ organizerEmail: email })
        .toArray();
      res.send(posts);
    });

    // 🔹 Delete post by ID
    app.delete('/volunteer-posts/:id', async (req, res) => {
      const id = req.params.id;
      const result = await volunteerCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // 🔹 Add volunteer request
    app.post('/volunteer-requests', async (req, res) => {
      const data = req.body;
      const result = await requestCollection.insertOne(data);
      res.send(result);
    });

    // 🔹 Get volunteer requests of user
    app.get('/my-requests', async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: 'Email required' });
      const requests = await requestCollection
        .find({ volunteerEmail: email })
        .toArray();
      res.send(requests);
    });

    // 🔹 Delete volunteer request
    app.delete('/volunteer-requests/:id', async (req, res) => {
      const id = req.params.id;
      const result = await requestCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
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
