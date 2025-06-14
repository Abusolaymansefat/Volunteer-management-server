const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sq4up6y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const volunteerCollection = client.db('volunteerDB').collection('volunteer');

    app.post('/volunteer', async (req, res) => {
      const postData = req.body;
      const result = await volunteerCollection.insertOne(postData);
      res.send(result);
    });

   app.get('/volunteer', async (req, res) => {
  const posts = await volunteerCollection.find().toArray();
  res.send(posts);
});

    app.get('/volunteer/sorted', async (req, res) => {
  const posts = await volunteerCollection
    .find()
    .sort({ deadline: 1 })
    .limit(6)
    .toArray();
  res.send(posts);
});
    app.get('/volunteer/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const post = await volunteerCollection.findOne({ _id: new ObjectId(id) });

    if (!post) {
      return res.status(404).send({ message: 'Volunteer post not found' });
    }

    res.send(post);
  } catch (error) {
    console.error('Error fetching post by ID:', error.message);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Volunteer management')
})

app.listen(port, () => {
    console.log(`Volunteer management server is running on port ${port}`)
})