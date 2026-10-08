# My Home Group

Vehicle Duration Management Website for construction site vehicle entry, exit and duration tracking.

## Features

- User registration and login
- Security Guard authentication
- Admin role support
- Vehicle management
- Vehicle type management
- Driver and contractor details
- Vehicle entry and exit tracking
- Automatic duration calculation
- Multiple vehicle entries per day
- Calendar view
- Daily, weekly and monthly reports
- Vehicle-wise reports
- Driver-wise reports
- Contractor-wise reports
- Notifications
- User profile
- Password change
- Responsive mobile-friendly interface
- PostgreSQL database
- JWT authentication

## Vehicle Types

The application supports common construction-site vehicles such as:

- TM / Transit Mixer
- Truck
- Dumper
- Excavator
- JCB
- Loader
- Crane
- Tractor
- Water Tanker
- Other

## Project Structure

```text
My-Home-Group/
│
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   │
│   ├── assets/
│   │   ├── logo.png
│   │   └── icons/
│   │
│   └── pages/
│       ├── login.html
│       ├── register.html
│       ├── dashboard.html
│       ├── vehicles.html
│       ├── add-entry.html
│       ├── calendar.html
│       ├── reports.html
│       ├── profile.html
│       └── notifications.html
│
├── server.js
├── package.json
├── .gitignore
└── README.md
