import cors from "cors";
import "dotenv/config";
import express from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const PORT = process.env.PORT || 8000;

// -------------------- Middleware --------------------

app.use(cors());
app.use(express.json());

// -------------------- Environment Variables --------------------

if (!process.env.MONGODB_URL) {
  console.log("MongoDB connection URL is missing. Check your .env file.");
  process.exit(1);
}

if (!process.env.CLIENT_URL) {
  console.log("CLIENT_URL is missing. Check your .env file.");
  process.exit(1);
}

// -------------------- MongoDB Connection --------------------

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("Successfully connected to MongoDB!");

    return client;
  } catch (error) {
    console.log("MongoDB connection error:", error);
    process.exit(1);
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("together-wecan");

const eventsCollection = db.collection("allevents");
const eventParticipantsCollection = db.collection("eventParticipants");
const subscribersCollection = db.collection("subscribers");

// Prevent duplicate participation by the same user in the same event.
await eventParticipantsCollection.createIndex(
  { eventId: 1, userId: 1 },
  { unique: true },
);

// Prevent duplicate newsletter subscriptions.
await subscribersCollection.createIndex(
  { email: 1 },
  { unique: true },
);

// -------------------- JWT Authentication --------------------

// Create the JWKS resolver once and reuse it.
const CLIENT_URL = process.env.CLIENT_URL.replace(/\/$/, "");


const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(authHeader)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({
      message: "Unauthorized. Please provide a valid Bearer token.",
    });
  }

  const token = authHeader.split(" ")[1];

  
  if (!token) {
    return res.status(401).send({
      message: "Unauthorized. Token is missing.",
    });
  }

  try {
    const JWKS = createRemoteJWKSet(new URL(`${CLIENT_URL}/api/auth/jwks`),
    );

    const { payload } = await jwtVerify(token, JWKS);

    if (!payload.sub) {
      return res.status(401).send({
        message: "Invalid authentication token.",
      });
    }

    req.user = payload;

    next();
  } catch (error) {
    console.log("Token verification error:", error);

    return res.status(401).send({
      message: "Invalid or expired token.",
    });
  }
};

// -------------------- Date Helpers --------------------

// Get today's date in Bangladesh timezone.
const getTodayDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// Check whether a date is a real YYYY-MM-DD date.
const isValidDate = (date) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
};

// Allow today's events, but reject dates in the past.
const isValidEventDate = (date) => {
  return isValidDate(date) && date >= getTodayDate();
};

// -------------------- Create Event --------------------

app.post("/create-events", verifyToken, async (req, res) => {
  try {
    const {
      title,
      eventType,
      eventDate,
      location,
      imageUrl,
      description,
    } = req.body;

    if (
      !title ||
      !eventType ||
      !eventDate ||
      !location ||
      !imageUrl ||
      !description
    ) {
      return res.status(400).send({
        message: "All event fields are required.",
      });
    }

    if (!req.user.email) {
      return res.status(401).send({
        message: "Authenticated user email is unavailable.",
      });
    }

    if (!isValidEventDate(eventDate)) {
      return res.status(400).send({
        message: "Please provide a valid event date that is not in the past.",
      });
    }

    const eventData = {
      title: title.trim(),
      eventType,
      eventDate,
      location: location.trim(),
      imageUrl: imageUrl.trim(),
      description: description.trim(),
      organizerEmail: req.user.email,
      createdAt: new Date(),
    };

    const result = await eventsCollection.insertOne(eventData);

    return res.status(201).send({
      message: "Event created successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.log("Create event error:", error);

    return res.status(500).send({
      message: "Failed to create event.",
    });
  }
});

// -------------------- Get All Events (Public) --------------------

app.get("/events", async (req, res) => {
  try {
    const result = await eventsCollection.find().toArray();

    return res.status(200).send(result);
  } catch (error) {
    console.log("Fetch events error:", error);

    return res.status(500).send({
      message: "Failed to fetch events.",
    });
  }
});

// -------------------- Get My Events (Protected) --------------------

app.get("/my-events", verifyToken, async (req, res) => {
  try {
    if (!req.user.email) {
      return res.status(401).send({
        message: "Authenticated user email is unavailable.",
      });
    }

    const result = await eventsCollection
      .find({
        organizerEmail: req.user.email,
      })
      .sort({ eventDate: 1 })
      .toArray();

    return res.status(200).send(result);
  } catch (error) {
    console.log("Fetch my events error:", error);

    return res.status(500).send({
      message: "Failed to fetch your events.",
    });
  }
});

// -------------------- Get Upcoming Events (Public) --------------------

app.get("/upcomingevents", async (req, res) => {
  try {
    const todayString = getTodayDate();

    const upcomingEvents = await eventsCollection
      .find({
        eventDate: { $gte: todayString },
      })
      .sort({ eventDate: 1 })
      .limit(6)
      .toArray();

    return res.status(200).json(upcomingEvents);
  } catch (error) {
    console.log("Fetch upcoming events error:", error);

    return res.status(500).json({
      message: "Failed to fetch upcoming events.",
    });
  }
});

// -------------------- Get Single Event (Public) --------------------

app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID.",
      });
    }

    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).send({
        message: "Event not found.",
      });
    }

    return res.status(200).send(event);
  } catch (error) {
    console.log("Fetch event details error:", error);

    return res.status(500).send({
      message: "Failed to fetch event details.",
    });
  }
});

// -------------------- Update Event (Protected) --------------------

app.patch("/events/:id", verifyToken, async (req, res) => {
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
    } = req.body;

    if (
      !title ||
      !eventType ||
      !eventDate ||
      !location ||
      !imageUrl ||
      !description
    ) {
      return res.status(400).send({
        message: "All event fields are required.",
      });
    }

    if (!isValidEventDate(eventDate)) {
      return res.status(400).send({
        message: "Please provide a valid event date that is not in the past.",
      });
    }

    if (!req.user.email) {
      return res.status(401).send({
        message: "Authenticated user email is unavailable.",
      });
    }

    const updatedEvent = {
      title: title.trim(),
      eventType,
      eventDate,
      location: location.trim(),
      imageUrl: imageUrl.trim(),
      description: description.trim(),
      updatedAt: new Date(),
    };

    const result = await eventsCollection.updateOne(
      {
        _id: new ObjectId(id),
        organizerEmail: req.user.email,
      },
      {
        $set: updatedEvent,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Event not found or you are not authorized to update it.",
      });
    }

    return res.status(200).send({
      message: "Event updated successfully.",
    });
  } catch (error) {
    console.log("Update event error:", error);

    return res.status(500).send({
      message: "Failed to update event.",
    });
  }
});

// -------------------- Join Event (Protected) --------------------

app.post("/eventParticipants", verifyToken, async (req, res) => {
  try {
    const { eventId, userName, userImage } = req.body;

    // Identity comes from the verified JWT.
    const userId = req.user.sub;
    const userEmail = req.user.email;

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

    // Find the event.
    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });

    if (!event) {
      return res.status(404).send({
        message: "Event not found.",
      });
    }

    const eventDate = event.eventDate.slice(0, 10);

    if (!isValidDate(eventDate)) {
      return res.status(400).send({
        message: "The event has an invalid date.",
      });
    }

    if (eventDate < getTodayDate()) {
      return res.status(400).send({
        message:
          "This event has already been completed. Registration is closed.",
      });
    }

    // Check whether the user has already joined.
    const existingParticipant = await eventParticipantsCollection.findOne({
      eventId,
      userId,
    });

    if (existingParticipant) {
      return res.status(409).send({
        message: "You have already joined this event.",
      });
    }

    // Only save trusted event and authenticated user information.
    const participantData = {
      eventId,
      userId,
      userEmail,
      userName: typeof userName === "string" ? userName : "",
      userImage: typeof userImage === "string" ? userImage : "",
      eventTitle: event.title,
      eventDate: event.eventDate,
      joinedAt: new Date(),
    };

    const result = await eventParticipantsCollection.insertOne(
      participantData,
    );

    return res.status(201).send({
      message: "Successfully joined the event!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    // Handle duplicate participation.
    if (error.code === 11000) {
      return res.status(409).send({
        message: "You have already joined this event.",
      });
    }

    console.log("Join event error:", error);

    return res.status(500).send({
      message: "Failed to join the event.",
    });
  }
});

// -------------------- Get My Joined Events (Protected) --------------------

app.get("/myjoinedevents/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.sub) {
      return res.status(403).send({
        message: "You are not authorized to view these events.",
      });
    }

    const joinedEvents = await eventParticipantsCollection
      .find({ userId: req.user.sub })
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
          eventDate: event?.eventDate || joinedEvent.eventDate || null,
          joinedAt: joinedEvent.joinedAt || null,
        };
      }),
    );

    result.sort((a, b) =>
      (a.eventDate || "").localeCompare(b.eventDate || ""),
    );

    return res.status(200).send(result);
  } catch (error) {
    console.log("Fetch joined events error:", error);

    return res.status(500).send({
      message: "Failed to fetch joined events.",
    });
  }
});

// -------------------- Leave Event (Protected) --------------------

app.delete("/eventParticipants", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.sub;

    if (!eventId || !userId) {
      return res.status(400).send({
        message: "Event ID is required.",
      });
    }

    if (!ObjectId.isValid(eventId)) {
      return res.status(400).send({
        message: "Invalid event ID.",
      });
    }

    // Find the event.
    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });

    if (!event) {
      return res.status(404).send({
        message: "Event not found.",
      });
    }

    const eventDate = event.eventDate.slice(0, 10);

    if (!isValidDate(eventDate)) {
      return res.status(400).send({
        message: "The event has an invalid date.",
      });
    }

    if (eventDate < getTodayDate()) {
      return res.status(400).send({
        message:
          "This event has already been completed. Registration is closed.",
      });
    }

    // Remove only the authenticated user's participation.
    const result = await eventParticipantsCollection.deleteOne({
      eventId,
      userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "You have not joined this event.",
      });
    }

    return res.status(200).send({
      message: "You have successfully left this event!",
    });
  } catch (error) {
    console.log("Leave event error:", error);

    return res.status(500).send({
      message: "Failed to leave the event.",
    });
  }
});

// -------------------- Delete Event (Protected) --------------------

app.delete("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID.",
      });
    }

    if (!req.user.email) {
      return res.status(401).send({
        message: "Authenticated user email is unavailable.",
      });
    }

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(id),
      organizerEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Event not found or you are not authorized to delete it.",
      });
    }

    // Remove associated participation records.
    await eventParticipantsCollection.deleteMany({
      eventId: id,
    });

    return res.status(200).send({
      message: "Event deleted successfully.",
    });
  } catch (error) {
    console.log("Delete event error:", error);

    return res.status(500).send({
      message: "Failed to delete event.",
    });
  }
});

// -------------------- Get All Past Events (Public) --------------------

app.get("/pastevents", async (req, res) => {
  try {
    const { today } = req.query;

    if (!isValidDate(today)) {
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

    return res.status(200).send(pastEvents);
  } catch (error) {
    console.log("Fetch past events error:", error);

    return res.status(500).send({
      message: "Failed to fetch past events.",
    });
  }
});

// -------------------- Get Latest 6 Past Events (Public) --------------------

app.get("/pastevents-home", async (req, res) => {
  try {
    const { today } = req.query;

    if (!isValidDate(today)) {
      return res.status(400).send({
        message: "A valid date (YYYY-MM-DD) is required.",
      });
    }

    const pastEvents = await eventsCollection
      .find({
        eventDate: { $lt: today },
      })
      .sort({ eventDate: -1 })
      .limit(6)
      .toArray();

    return res.status(200).send(pastEvents);
  } catch (error) {
    console.log("Fetch homepage past events error:", error);

    return res.status(500).send({
      message: "Failed to fetch past events.",
    });
  }
});

// -------------------- Get Volunteer Count (Public) --------------------

app.get("/eventParticipants/count", async (req, res) => {
  try {
    const { eventId } = req.query;

    if (typeof eventId !== "string" || !ObjectId.isValid(eventId)) {
      return res.status(400).send({
        message: "A valid event ID is required.",
      });
    }

    const count = await eventParticipantsCollection.countDocuments({
      eventId,
    });

    return res.status(200).send({ count });
  } catch (error) {
    console.log("Volunteer count error:", error);

    return res.status(500).send({
      message: "Failed to fetch volunteer count.",
    });
  }
});

// -------------------- Check Participation (Protected) --------------------

app.get("/eventParticipants/check", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.query;
    const userId = req.user.sub;

    if (typeof eventId !== "string" || !ObjectId.isValid(eventId)) {
      return res.status(400).send({
        message: "A valid event ID is required.",
      });
    }

    const participant = await eventParticipantsCollection.findOne({
      userId,
      eventId,
    });

    return res.status(200).send({
      joined: !!participant,
    });
  } catch (error) {
    console.log("Check participation error:", error);

    return res.status(500).send({
      message: "Failed to check participation.",
    });
  }
});

// -------------------- Newsletter Subscription (Public) --------------------

app.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
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

    return res.status(201).send({
      message: "Successfully subscribed!",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({
        message: "This email is already subscribed.",
      });
    }

    console.log("Subscription error:", error);

    return res.status(500).send({
      message: "Failed to subscribe. Please try again.",
    });
  }
});

// -------------------- Server Health Check (Public) --------------------

app.get("/", (req, res) => {
  return res.status(200).send({
    message: "Server is running fine!",
  });
});

// -------------------- Start Server --------------------

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

export default app;