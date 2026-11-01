import cors from "cors";
import "dotenv/config";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("together-wecan");
const eventsCollection = db.collection("allevents");
const eventParticipantsCollection = db.collection("eventParticipants");

await eventParticipantsCollection.createIndex(
  { eventId: 1, userId: 1 },
  { unique: true }
);

app.post("/create-events", async (req, res) => {
  try {
    const data = req.body;

    const result = await eventsCollection.insertOne(data);

    res.status(201).send(result);
  } catch (error) {
    console.error("Create event error:", error);

    res.status(500).send({
      message: "Failed to create event.",
    });
  }
});

app.get("/events", async (req, res) => {
  try {
    const result = await eventsCollection.find().toArray();

    res.send(result);
  } catch (error) {
    console.error("Fetch events error:", error);

    res.status(500).send({
      message: "Failed to fetch events.",
    });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID.",
      });
    }

    const result = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        message: "Event not found.",
      });
    }

    res.send(result);
  } catch (error) {
    console.error("Fetch event error:", error);

    res.status(500).send({
      message: "Failed to fetch event.",
    });
  }
});

app.patch("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID.",
      });
    }

    const {
      title,
      eventType,
      eventDate,
      location,
      imageUrl,
      description,
      organizerEmail,
    } = req.body;

    const updatedEvent = {
      title,
      eventType,
      eventDate,
      location,
      imageUrl,
      description,
      organizerEmail,
    };

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedEvent }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Event not found.",
      });
    }

    res.status(200).send({
      message: "Event updated successfully.",
    });
  } catch (error) {
    console.error("Update event error:", error);

    res.status(500).send({
      message: "Failed to update event.",
    });
  }
});

app.post("/eventParticipants", async (req, res) => {
  try {
    const data = req.body;

    const { eventId, userId, userEmail } = data;

    if (!eventId || !userId || !userEmail) {
      return res.status(400).send({
        message: "Missing required information.",
      });
    }

    if (!ObjectId.isValid(eventId)) {
      return res.status(400).send({
        message: "Invalid event ID.",
      });
    }

    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });

    if (!event) {
      return res.status(404).send({
        message: "Event not found.",
      });
    }

    const existingParticipant = await eventParticipantsCollection.findOne({
      eventId,
      userId,
    });

    if (existingParticipant) {
      return res.status(409).send({
        message: "You have already joined this event.",
      });
    }

    const participantData = {
      ...data,
      eventTitle: event.title,
      eventDate: event.eventDate,
      joinedAt: new Date(),
    };

    const result = await eventParticipantsCollection.insertOne(
      participantData
    );

    res.status(201).send({
      message: "Successfully joined the event!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({
        message: "You have already joined this event.",
      });
    }

    console.error("Join event error:", error);

    res.status(500).send({
      message: "Failed to join the event.",
    });
  }
});

app.get("/eventParticipants/check", async (req, res) => {
  try {
    const { eventId, userId } = req.query;

    if (!eventId || !userId) {
      return res.status(400).send({
        message: "Event ID and User ID are required.",
      });
    }

    const existingParticipant =
      await eventParticipantsCollection.findOne({
        eventId,
        userId,
      });

    res.send({
      joined: Boolean(existingParticipant),
    });
  } catch (error) {
    console.error("Check participation error:", error);

    res.status(500).send({
      message: "Failed to check participation.",
    });
  }
});

app.get("/myjoinedevents/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const joinedEvents = await eventParticipantsCollection
      .find({ userId })
      .toArray();

    const result = await Promise.all(
      joinedEvents.map(async (joinedEvent) => {
        let event = null;

        if (ObjectId.isValid(joinedEvent.eventId)) {
          event = await eventsCollection.findOne({
            _id: new ObjectId(joinedEvent.eventId),
          });
        }

        return {
          ...joinedEvent,
          event,
          eventTitle:
            event?.title ||
            joinedEvent.eventTitle ||
            "Event unavailable",
          eventDate: event?.eventDate || null,
          joinedAt: joinedEvent.joinedAt || null,
        };
      })
    );

    result.sort((a, b) => {
      if (!a.eventDate) return 1;
      if (!b.eventDate) return -1;

      return (
        new Date(`${a.eventDate.slice(0, 10)}T00:00:00Z`).getTime() -
        new Date(`${b.eventDate.slice(0, 10)}T00:00:00Z`).getTime()
      );
    });

    res.send(result);
  } catch (error) {
    console.error("Fetch joined events error:", error);

    res.status(500).send({
      message: "Failed to fetch joined events.",
    });
  }
});

app.delete("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID.",
      });
    }

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Event not found.",
      });
    }

    res.send({
      message: "Event deleted successfully.",
    });
  } catch (error) {
    console.error("Delete event error:", error);

    res.status(500).send({
      message: "Failed to delete event.",
    });
  }
});

app.get("/", (req, res) => {
  res.send({
    message: "Server is running fine!",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

export default app;