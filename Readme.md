# 🌱 TogetherWeCan — Server Side

### Small Actions. Greater Impact.

**TogetherWeCan** is a community-driven social development and volunteering platform. The server-side application provides RESTful APIs for managing community events, handling volunteer participation, retrieving event information, and processing newsletter subscriptions.

Built with **Node.js, Express.js, MongoDB, and JWT verification**, the backend connects the TogetherWeCan client application with its database and authentication system.

---

## 🚀 Live Application

🔗 **Client-side Website:** [Visit TogetherWeCan](https://togetherwecan-client.vercel.app/)

## 📂 GitHub Repositories

- **Client-side:** [TogetherWeCan Client Repository](https://github.com/bhola16/togetherWeCan-Client)
- **Server-side:** [TogetherWeCan Server Repository](https://github.com/bhola16/togetherWeCan-Server)

---

## ✨ Features

### 1. 🚀 Express.js REST API

The backend is built using Express.js and provides RESTful endpoints for the TogetherWeCan application.

- Handle HTTP requests.
- Process JSON request bodies.
- Return structured JSON responses.
- Manage event-related operations.
- Connect the frontend with MongoDB.
- Handle API errors with appropriate HTTP status codes.

### 2. 🗄️ MongoDB Database Integration

TogetherWeCan uses MongoDB to store and manage application data.

**Database name:**

` together-wecan `

The application uses three main collections:

| Collection | Purpose |
|---|---|
| `allevents` | Stores community event information |
| `eventParticipants` | Stores event participation records |
| `subscribers` | Stores newsletter subscriber information |

MongoDB is connected using the official MongoDB Node.js driver.

### 3. 📅 Event Creation

Authenticated users can create community events through the API.

**Endpoint:**

`POST /create-events`

- Accept event information through the request body.
- Verify the user's JWT.
- Store event data in MongoDB.
- Return the inserted document information.
- Respond with HTTP 201 when successful.

Event information includes:

- Event title.
- Event type.
- Event date.
- Location.
- Image URL.
- Description.
- Organizer email.

### 4. 📋 Retrieve All Events

**Endpoint:**

`GET /events`

- Retrieve all available events.
- Return event information in JSON format.
- Does not require authentication.

### 5. 🔐 Protected Event Retrieval

**Endpoint:**

`GET /my-events`

- Requires JWT authentication.
- Verifies the user's authentication token.
- Retrieves event records from MongoDB.

### 6. 📆 Upcoming Events

**Endpoint:**

`GET /upcomingevents`

- Retrieve events scheduled for today or future dates.
- Sort events by event date in ascending order.
- Limit the response to the latest six upcoming events.
- Does not require authentication.

### 7. 🔎 Individual Event Details

**Endpoint:**

`GET /events/:id`

- Retrieve an individual event using its MongoDB ObjectId.
- Return complete event information.
- Return HTTP 404 when the event does not exist.
- Return HTTP 400 for an invalid event ID.
- Does not require authentication.

### 8. ✏️ Update Events

**Endpoint:**

`PATCH /events/:id`

- Requires JWT authentication.
- Validate the event ID.
- Update event information in MongoDB.
- Support updates to event title, category, date, location, image URL, description, and organizer email.
- Return appropriate success or error responses.

### 9. ❌ Delete Events

**Endpoint:**

`DELETE /events/:id`

- Requires JWT authentication.
- Validate the MongoDB ObjectId.
- Delete the selected event.
- Return HTTP 404 if the event does not exist.
- Return a success message after deletion.

### 10. 🤝 Join Community Events

**Endpoint:**

`POST /eventParticipants`

Authenticated users can join available community events.

The API provides the following functionality:

- Verify the user's JWT.
- Retrieve the event using its ID.
- Check whether the event exists.
- Prevent participation in completed events.
- Prevent duplicate participation.
- Store participant information in MongoDB.
- Record the joining date.
- Return HTTP 409 when the user has already joined.

The participant record includes the event ID, authenticated user ID, user email, event title, event date, and joining timestamp.

### 11. 📋 Retrieve Joined Events

**Endpoint:**

`GET /myjoinedevents/:userId`

- Requires JWT authentication.
- Retrieve participation records for the requested user ID.
- Retrieve corresponding event information.
- Include event details in the response.
- Return joined event information in JSON format.

### 12. 🚪 Leave Community Events

**Endpoint:**

`DELETE /eventParticipants`

Authenticated users can leave events they have previously joined.

- Verify the user's JWT.
- Validate the event ID.
- Check whether the event exists.
- Prevent changes to completed events.
- Remove the participant record.
- Return an appropriate response if the user has not joined the event.

### 13. 👥 Event Volunteer Count

**Endpoint:**

`GET /eventParticipants/count?eventId=EVENT_ID`

- Retrieve the number of participants for an event.
- Count matching participant records.
- Return the total count as JSON.
- Does not require authentication.

Example response:

```json
{
  "count": 25
}
```

### 14. ✅ Check Event Participation

**Endpoint:**

`GET /eventParticipants/check?eventId=EVENT_ID`

- Requires JWT authentication.
- Retrieve the authenticated user's ID from the verified token.
- Check whether the user has joined the specified event.
- Return a boolean participation status.

Example response:

```json
{
  "joined": true
}
```

### 15. 🕒 Retrieve Past Events

**Endpoint:**

`GET /pastevents?today=YYYY-MM-DD`

- Retrieve events with dates earlier than the supplied date.
- Sort events by date in descending order.
- Return past event information.
- Validate the date format.
- Does not require authentication.

### 16. 🏠 Homepage Past Events

**Endpoint:**

`GET /pastevents-home?today=YYYY-MM-DD`

- Retrieve previously completed events.
- Sort events by date in descending order.
- Limit the response to the latest six past events.
- Validate the supplied date.
- Does not require authentication.

### 17. 📬 Newsletter Subscription

**Endpoint:**

`POST /subscribe`

The newsletter subscription API allows visitors to subscribe using their email addresses.

- Accept email addresses through the request body.
- Validate email format.
- Convert email addresses to lowercase.
- Remove unnecessary whitespace.
- Check for existing subscriptions.
- Prevent duplicate subscriptions.
- Store subscription information in MongoDB.
- Record the subscription timestamp.

Example request:

```json
{
  "email": "example@gmail.com"
}
```

Example success response:

```json
{
  "message": "Successfully subscribed!"
}
```

### 18. 🔑 JWT Authentication and Authorization

TogetherWeCan uses **Better Auth JWT tokens** to protect authenticated API endpoints.

The backend uses:

- `jose` for JWT verification.
- `createRemoteJWKSet` for retrieving public verification keys.
- `jwtVerify` for verifying JWT tokens.
- The client's JWKS endpoint for public key retrieval.

The verification middleware:

1. Checks the authorization header.
2. Extracts the Bearer token.
3. Retrieves the client's public JWKS endpoint.
4. Verifies the JWT.
5. Attaches the verified token payload to `req.user`.
6. Allows the request to continue when verification succeeds.

Protected routes require the following authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### 19. 🌐 CORS and JSON Middleware

The backend uses Express middleware to support frontend communication.

- `cors()` enables cross-origin requests.
- `express.json()` parses incoming JSON request bodies.
- `dotenv/config` loads environment variables.

### 20. ☁️ Vercel Deployment Configuration

The project includes a `vercel.json` configuration file.

It configures:

- Vercel Node.js runtime.
- `index.js` as the server entry point.
- Routing of incoming requests to the Express application.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js 5 | Backend web framework |
| MongoDB | NoSQL database |
| MongoDB Node.js Driver | Database operations |
| Mongoose | MongoDB object modeling dependency |
| jose | JWT verification |
| CORS | Cross-origin resource sharing |
| dotenv | Environment variable management |
| Vercel | Backend deployment |

---

## 🔗 API Endpoints

The following table summarizes the available backend routes.

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| GET | `/` | Public | Server status |
| POST | `/create-events` | Protected | Create an event |
| GET | `/events` | Public | Retrieve all events |
| GET | `/my-events` | Protected | Retrieve event records |
| GET | `/upcomingevents` | Public | Retrieve upcoming events |
| GET | `/events/:id` | Public | Retrieve event details |
| PATCH | `/events/:id` | Protected | Update an event |
| DELETE | `/events/:id` | Protected | Delete an event |
| POST | `/eventParticipants` | Protected | Join an event |
| GET | `/myjoinedevents/:userId` | Protected | Retrieve joined events |
| DELETE | `/eventParticipants` | Protected | Leave an event |
| GET | `/pastevents` | Public | Retrieve past events |
| GET | `/pastevents-home` | Public | Retrieve latest six past events |
| GET | `/eventParticipants/count` | Public | Retrieve participant count |
| GET | `/eventParticipants/check` | Protected | Check participation |
| POST | `/subscribe` | Public | Subscribe to newsletter |

**Authentication:** Protected endpoints require a valid Bearer JWT token.

---

## 📂 Project Structure

The server-side project is organized as follows:

```text
togetherWeCan-Server/
│
├── index.js
│
├── package.json
│
├── package-lock.json
│
├── vercel.json
│
└── .gitignore
```

### Important Files

**`index.js`**

The main backend application file. It contains:

- Express server configuration.
- MongoDB connection.
- Database collection initialization.
- JWT verification middleware.
- Event management APIs.
- Event participation APIs.
- Newsletter subscription API.
- Server startup configuration.

**`package.json`**

Contains project metadata, scripts, dependencies, and package configuration.

**`vercel.json`**

Contains the deployment configuration for Vercel.

---

## ⚙️ Installation and Setup

Follow these steps to run the TogetherWeCan backend locally.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- npm
- Git
- A MongoDB database or MongoDB Atlas account.
- A running TogetherWeCan client application with Better Auth configured.

### 1. Clone the Server Repository

Open your terminal and run:

```bash
git clone https://github.com/bhola16/togetherWeCan-Server.git
```

### 2. Navigate to the Project Directory

```bash
cd togetherWeCan-Server
```

### 3. Install Dependencies

Install the required packages:

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Configure the following environment variables:

```env
# MongoDB connection string
MONGODB_URL=your_mongodb_connection_string

# Client application URL for JWT verification
CLIENT_URL=http://localhost:3000
```

Replace the placeholder values with your actual configuration.

**Important:**

- `MONGODB_URL` must contain a valid MongoDB connection string.
- `CLIENT_URL` must point to the client application that provides the Better Auth JWKS endpoint.
- For production, use your deployed client URL instead of `http://localhost:3000`.
- Never commit your `.env` file or database credentials to GitHub.

### 5. Start the Backend Server

Run the following command:

```bash
node index.js
```

The server will start on port:

```text
8000
```

### 6. Verify the Server

Open your browser or API testing tool and visit:

[http://localhost:8000/](http://localhost:8000/)

Expected response:

```json
{
  "message": "Server is running fine!"
}
```

The backend is now ready to receive API requests.

---

## 🗄️ Database Configuration

TogetherWeCan uses MongoDB as its primary database.

**Database:**

` together-wecan `

### Collections

**1. allevents**

Stores event information, including:

- Event title.
- Event type.
- Event date.
- Location.
- Image URL.
- Description.
- Organizer email.

**2. eventParticipants**

Stores event participation records, including:

- Event ID.
- User ID.
- User email.
- Event title.
- Event date.
- Joining timestamp.

A unique compound index is created on:

```javascript
{
  eventId: 1,
  userId: 1
}
```

This prevents duplicate participation records for the same event and user.

**3. subscribers**

Stores newsletter subscriber information, including:

- Email address.
- Subscription timestamp.

---

## 🔐 JWT Verification Process

The server verifies authentication tokens using the Better Auth JWKS endpoint.

The JWKS URL is generated using:

```javascript
`${process.env.CLIENT_URL}/api/auth/jwks`
```

The server uses the `jose` package to retrieve the public keys and verify incoming JWT tokens.

### Authentication Flow

```text
User logs in through the client
          |
          v
Better Auth creates an authentication token
          |
          v
Client sends JWT with API request
          |
          v
Express verifyToken middleware
          |
          v
Server retrieves public JWKS
          |
          v
JWT signature is verified
          |
          v
Verified payload is attached to req.user
          |
          v
Protected API endpoint processes request
```

If the token is missing, invalid, or expired, the server returns an unauthorized response.

---

## 📡 Client-Server Communication

The TogetherWeCan client communicates with the backend through HTTP requests.

**Local development:**

```text
Client:  http://localhost:3000
Server:  http://localhost:8000
```

The client uses the environment variable:

```env
NEXT_PUBLIC_SERVER_API_URL=http://localhost:8000
```

The server uses:

```env
CLIENT_URL=http://localhost:3000
```

For production deployment, update these URLs to match the deployed client and backend environments.

---

## ☁️ Deployment

The server repository includes a Vercel deployment configuration.

**Configuration file:**

`vercel.json`

The configuration uses the Vercel Node.js runtime and directs incoming routes to `index.js`.

### Deployment Steps

1. Push the server-side project to GitHub.
2. Import the repository into Vercel.
3. Configure the required environment variables in Vercel project settings.
4. Set `MONGODB_URL` to your production MongoDB connection string.
5. Set `CLIENT_URL` to your deployed client application URL.
6. Deploy the server.
7. Verify the server status endpoint.
8. Test the API endpoints and frontend integration.

**Important:** The server currently uses port `8000` in its Express configuration. Verify the deployment behavior and environment configuration when deploying to Vercel.

---

## 🧪 API Testing

You can test the backend API using tools such as:

- [Postman](https://www.postman.com/)
- [Thunder Client](https://www.thunderclient.com/)
- Browser developer tools.
- `curl` commands.

### Example: Check Server Status

```bash
curl http://localhost:8000/
```

### Example: Retrieve All Events

```bash
curl http://localhost:8000/events
```

### Example: Retrieve Upcoming Events

```bash
curl http://localhost:8000/upcomingevents
```

### Example: Create an Event

```bash
curl -X POST http://localhost:8000/create-events \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{
  "title": "Green Bangladesh Campaign",
  "eventType": "Environmental",
  "eventDate": "2026-12-15",
  "location": "Dhaka, Bangladesh",
  "imageUrl": "https://example.com/event.jpg",
  "description": "A community tree plantation initiative.",
  "organizerEmail": "organizer@example.com"
}'
```

Replace the example values with valid event information and an actual authentication token.

---

## 🐛 Troubleshooting

### 1. MongoDB Connection Errors

- Verify the `MONGODB_URL` value.
- Check your MongoDB credentials.
- Confirm that the database is accessible.
- Check MongoDB Atlas network access settings if applicable.

### 2. JWT Verification Errors

- Verify that `CLIENT_URL` is correct.
- Confirm that the client JWKS endpoint is accessible.
- Check whether the token is valid and not expired.
- Ensure that the client and server authentication configurations match.

### 3. CORS Errors

- Verify the frontend and backend URLs.
- Check browser network requests.
- Ensure the server's CORS configuration allows the client application to make requests.

### 4. API Returns 401 Unauthorized

- Check whether the endpoint requires authentication.
- Confirm that the request contains a Bearer token.
- Verify the JWT using the configured JWKS endpoint.

### 5. Port Already in Use

The server is configured to run on port `8000`.

If another application is already using that port, stop the conflicting process before starting the server.

---

## 🤝 Contributing

Suggestions and improvements are welcome.

If you want to contribute:

1. Fork the repository.
2. Create a new branch for your changes.
3. Make your changes.
4. Test the API endpoints.
5. Submit a pull request.

---

## 👨‍💻 Author

**Bholanath Bala**

- **GitHub:** [@bhola16](https://github.com/bhola16)
- **Client Repository:** [TogetherWeCan Client](https://github.com/bhola16/togetherWeCan-Client)
- **Server Repository:** [TogetherWeCan Server](https://github.com/bhola16/togetherWeCan-Server)
- **Live Website:** [TogetherWeCan](https://togetherwecan-client.vercel.app/)

Electronics & Communication Engineering Graduate  
Khulna University, Bangladesh

---

## 📄 License

This project was developed as part of a web development assignment for educational purposes.

---

<p align="center">
  Made with ❤️ for a better community.
  <br />
  <strong>TogetherWeCan — Small Actions. Greater Impact.</strong>
</p>