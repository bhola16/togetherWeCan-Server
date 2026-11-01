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
const subscribersCollection = db.collection("subscribers");

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


app.get("/upcomingevents", async (req, res) => {
  try {
    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const upcomingEvents = await eventsCollection
      .find({
        eventDate: { $gte: todayString },
      })
      .sort({ eventDate: 1 })
      .limit(6)
      .toArray();

    res.status(200).json(upcomingEvents);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({
      message: "Failed to fetch upcoming events",
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
          eventTitle: event?.title || joinedEvent.eventTitle,
          eventDate: event?.eventDate || null,
          joinedAt: joinedEvent.joinedAt || null,
        };
      })
    );

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

// All past events
app.get("/pastevents", async (req, res) => {
  try {
    const { today } = req.query;

    if (
      typeof today !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(today)
    ) {
      return res.status(400).send({
        message: "A valid date (YYYY-MM-DD) is required.",
      });
    }

    const pastEvents = await eventsCollection
      .find({
        eventDate: { $lt: today },
      })
      .sort({ eventDate: -1 })
      .toArray();

    res.status(200).send(pastEvents);
  } catch (error) {
    console.error("Fetch past events error:", error);

    res.status(500).send({
      message: "Failed to fetch past events.",
    });
  }
});



// Latest 6 past events for homepage
app.get("/pastevents-home", async (req, res) => {
  try {
    const { today } = req.query;

    if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
      return res.status(400).send({
        message: "A valid date (YYYY-MM-DD) is required.",
      });
    }

    const pastEvents = await eventsCollection
      .find({
        eventDate: { $lt: today },
      })
      .sort({ eventDate: -1 }).limit(6)
      .toArray();

    res.status(200).send(pastEvents);
  } catch (error) {
    console.error("Fetch past events error:", error);

    res.status(500).send({
      message: "Failed to fetch past events.",
    });
  }
});





app.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).send({
        message: "Please provide a valid email address.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingSubscriber = await subscribersCollection.findOne({
      email: normalizedEmail,
    });

    if (existingSubscriber) {
      return res.status(409).send({
        message: "This email is already subscribed.",
      });
    }

    await subscribersCollection.insertOne({
      email: normalizedEmail,
      subscribedAt: new Date(),
    });

    res.status(201).send({
      message: "Successfully subscribed!",
    });
  } catch (error) {
    console.error("Subscription error:", error);

    res.status(500).send({
      message: "Failed to subscribe. Please try again.",
    });
  }
});

// homepage 
app.get("/", (req, res) => {
  res.send({
    message: "Server is running fine!",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

export default app;