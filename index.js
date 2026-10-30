import cors from "cors";
import 'dotenv/config';
import express from "express";
import { MongoClient, ObjectId } from 'mongodb';

const app = express()
const PORT = 8000



app.use(cors())
app.use(express.json())


const client = new MongoClient (process.env.MONGODB_URL)


export async function connectToMongoDB() {
    try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}


const mongoClient = await connectToMongoDB()
const db = mongoClient.db('togetherWeCan')
const eventsCollection = db.collection("allEvents")


// create events 
app.post('/create-events', async(req, res) => {
  const data = req.body
  const result = await eventsCollection.insertOne(data)
  res.send(result)
})
// get all events
app.get('/events', async (req, res) => {
  const result = await eventsCollection.find().toArray();
  res.send(result);
});


app.get("/events/:id", async (req, res) => {
  const { id } = req.params;

  const result = await eventsCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});



// Home server 
// http://localhost:8000/
app.get('/', (req, res) => {
    res.send({message: `Server is running fine!`})
} )

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`)
})