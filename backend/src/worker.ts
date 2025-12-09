
import { Hono } from 'hono';

// Define the type for the environment variables
type Bindings = {
  // Add your bindings here (D1, R2, KV, etc.)
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Define your routes here
app.get('/', (c) => {
  return c.text('Hello Hono!');
});


export default app;
