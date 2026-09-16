# Night Canteen Online Ordering System

This is the monorepo for the Night Canteen application. The system consists of three distinct parts that communicate with each other over REST APIs and Socket.IO.

## Project Structure

- `student-app/`: A Flutter mobile application designed strictly for students to browse the menu, place orders, and track order status. 
- `staff-dashboard/`: A React (Vite) web application designed for canteen staff to manage incoming orders, update food availability, and track analytics.
- `backend/`: A Node.js and Express backend that provides APIs, real-time updates via Socket.IO, handles business logic, and interacts with a PostgreSQL database through Prisma.

**Important Architecture Rule**: The `student-app` and `staff-dashboard` are completely separate frontends and never share UI components or code directly. They communicate exclusively through the `backend`.

## Communication Flow

1. **Student Places Order**: The `student-app` sends a POST request to the `backend`.
2. **Staff Notified**: The `backend` saves the order to PostgreSQL and emits a real-time event via Socket.IO to the `staff-dashboard`.
3. **Staff Updates Status**: The canteen staff marks the order as "Preparing" or "Ready" via the `staff-dashboard`.
4. **Student Notified**: The `backend` updates the order in the database and emits an event to the `student-app` (and optionally triggers a Firebase Cloud Messaging push notification).
5. **Collection**: Student collects food, and staff marks order as "Completed".

## Development Workflow

When working on features, ensure you are in the appropriate directory:

- **Student Features**: CD into `student-app/`. Run `flutter run`.
- **Staff Features**: CD into `staff-dashboard/`. Run `npm run dev`.
- **Backend/API/Database Features**: CD into `backend/`. Run `npm run dev` (once configured) or update `prisma/schema.prisma` and run `npx prisma db push`.
