# UnlockMe - Room Booking Platform

## Project Overview

UnlockMe is a fullstack web application designed to connect room owners with clients looking to book spaces for events, meetings, or coworking.

The platform simplifies the process of searching, booking, and managing rooms through an intuitive interface.

## Problem

Finding and booking suitable event spaces can be time-consuming and inefficient due to scattered information and lack of centralized platforms.

## Solution

UnlockMe provides a centralized platform where:

* Clients can search and book rooms بسهولة
* Owners can publish and manage their spaces
* Admins can monitor and control the system


## Features

* Advanced search (price, capacity, location, type)
* Interactive map (OpenStreetMap + Leaflet)
* Booking system with date management
* Review system
* Dashboard with statistics
* Secure authentication with JWT

## Technologies Used

### Frontend

* HTML5
* CSS3 / SCSS
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB Atlas (NoSQL)

### Other Tools

* JWT Authentication
* Leaflet (Maps & Geolocation)

## Architecture

The application follows a fullstack architecture:

* Frontend -> User Interface
* Backend -> API & Business Logic
* Database -> MongoDB

### Backend Structure

* `server.js` → entry point
* `routes/` → API routes
* `controllers/` → business logic
* `models/` → database schemas
* `middlewares/` → auth & roles
* `services/` → external services

## Installation

### 1. Backend

bash:
npm install

### 2. Environment variables (.env)

env:
PORT=3000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_secret

### 3. Run server

npx nodemon server.js


### 4. Frontend

Open `index.html` in browser

## Testing

* User registration & login
* Room creation
* Booking system
* Reviews
* Admin dashboard

## Screenshots
<img width="905" height="484" alt="image" src="https://github.com/user-attachments/assets/566a5688-e228-4fa0-a2ac-c6122a6d3d7c" />
<img width="708" height="682" alt="image" src="https://github.com/user-attachments/assets/c1f734df-f9b8-4bbe-9af4-4fce959a2bdd" />

## Future Improvements

* Payment integration
* Mobile version
* Notifications system
* AI-based recommendations


* Your Name
