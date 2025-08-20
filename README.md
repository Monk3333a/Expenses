# Simple Expense Tracker PWA

A Progressive Web App for tracking daily expenses with customizable categories.

## Features

- **Quick Expense Entry**: Date (auto-filled), Main Category, Sub-category, Amount, Payment Mode
- **Custom Categories**: Add/edit/delete main categories, sub-categories, and payment modes
- **CSV Export**: Download all expenses as CSV file
- **PWA Support**: Install on mobile devices, works offline
- **Responsive Design**: Optimized for mobile and desktop

## Files Included

- `index.html` - Main HTML file
- `style.css` - Stylesheet
- `app.js` - JavaScript application logic
- `manifest.json` - PWA manifest file
- `sw.js` - Service worker for offline functionality

## Installation Instructions

### 1. Upload to GitHub
1. Create a new repository on GitHub
2. Upload all files to the repository
3. Enable GitHub Pages in repository settings

### 2. Deploy to GitHub Pages
1. Go to Settings > Pages
2. Set Source to "Deploy from branch"
3. Select "main" branch and "/ (root)" folder
4. Save and wait for deployment

### 3. Install as PWA on Mobile
**Android (Chrome/Edge):**
- Open the GitHub Pages URL in browser
- Look for "Add to Home Screen" prompt or tap menu > "Install app"

**iPhone (Safari):**
- Open URL in Safari
- Tap Share button > "Add to Home Screen"

## Usage

1. **Add Expenses**: Fill out the form with date, categories, amount, and payment mode
2. **Manage Categories**: Use the "Manage Categories" button to customize your categories
3. **Export Data**: Click "Export CSV" to download your expense data
4. **View Expenses**: All expenses are listed in a table below the form

## Default Categories

**Main Categories:**
- Food (Groceries, Dining Out, Snacks)
- Transport (Fuel, Public Transport, Taxi/Uber)
- Shopping (Clothing, Electronics, Household)
- Bills (Electricity, Internet, Phone)
- Entertainment (Movies, Games, Sports)

**Payment Modes:**
- Cash, Credit Card, Debit Card, UPI, Net Banking

## Technical Notes

- Data is stored in memory during the session
- Works offline once cached by service worker
- Fully responsive design for mobile and desktop
- No backend required - pure client-side PWA

## Browser Support

- Chrome, Edge, Firefox, Safari (latest versions)
- iOS Safari 11.1+, Android Chrome 64+
- PWA features require HTTPS (GitHub Pages provides this automatically)
