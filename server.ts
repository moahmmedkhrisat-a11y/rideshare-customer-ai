import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Mock database
const users = [
  { phone: "0777986116", password: "123456", role: "admin", name: "Admin" }
];
const rides: any[] = [];
const scheduledRides: any[] = [];

// Auth routes
app.post("/api/login", (req, res) => {
  const { phone, password } = req.body;
  const user = users.find(u => u.phone === phone && u.password === password);
  if (user) {
    res.json({ success: true, user: { phone: user.phone, role: user.role, name: user.name } });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.post("/api/signup", (req, res) => {
  const { phone, password, name } = req.body;
  if (users.find(u => u.phone === phone)) {
    return res.status(400).json({ success: false, message: "Phone number already registered" });
  }
  const newUser = { phone, password, name, role: "user" };
  users.push(newUser);
  res.json({ success: true, user: { phone: newUser.phone, role: newUser.role, name: newUser.name } });
});

// Ride routes
app.get("/api/rides", (req, res) => {
  res.json(rides);
});

app.post("/api/book", (req, res) => {
  const ride = {
    ...req.body,
    id: rides.length + 1,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    status: 'Active'
  };
  rides.push(ride);
  res.json({ success: true, ride });
});

app.patch("/api/rides/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const ride = rides.find(r => r.id === id);
  if (ride) {
    ride.status = status;
    res.json({ success: true, ride });
  } else {
    res.status(404).json({ success: false, message: "Ride not found" });
  }
});

// Scheduled Ride routes
app.get("/api/scheduled", (req, res) => {
  res.json(scheduledRides);
});

app.post("/api/schedule", (req, res) => {
  const scheduledRide = {
    ...req.body,
    id: scheduledRides.length + 1,
    status: 'Active'
  };
  scheduledRides.push(scheduledRide);
  res.json({ success: true, scheduledRide });
});

app.delete("/api/schedule/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = scheduledRides.findIndex(r => r.id === id);
  if (index !== -1) {
    scheduledRides.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Scheduled ride not found" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
