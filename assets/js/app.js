const { useState, useEffect, useMemo } = React;

// ==================== DATA ====================
const initWorkspaces = [
  { id: 1, name: "The Hive Coworking", address: "123 Innovation Dr, Lagos, Nigeria", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600", images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=600", "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600", "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=600", "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600"], rating: 4.8, reviews: 124, description: "Premium coworking in Victoria Island with fiber internet, standing desks, and rooftop terrace.", amenities: ["WiFi","Coffee","Meeting Rooms","Parking","24/7 Access","Printing"], pricing: { hourly: 2500, daily: 10000, weekly: 45000, monthly: 150000 }, ownerId: "owner1", availability: { hourly: { total: 40, booked: 12 }, daily: { total: 20, booked: 5 }, weekly: { total: 8, booked: 2 }, monthly: { total: 4, booked: 1 } }, featured: true },
  { id: 2, name: "Pixel Studios", address: "456 Design Ave, Abuja, Nigeria", image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600", images: ["https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600", "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600", "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=600"], rating: 4.6, reviews: 89, description: "Creative workspace for designers and developers. Natural light and dual-monitor setups.", amenities: ["WiFi","Coffee","Meeting Rooms","Kitchen","Bike Storage"], pricing: { hourly: 2000, daily: 8000, weekly: 35000, monthly: 120000 }, ownerId: "owner2", availability: { hourly: { total: 30, booked: 8 }, daily: { total: 15, booked: 3 }, weekly: { total: 6, booked: 1 }, monthly: { total: 3, booked: 0 } }, featured: true },
  { id: 3, name: "LaunchPad Hub", address: "789 Startup Blvd, Lagos, Nigeria", image: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=600", images: ["https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=600", "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600", "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600", "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600"], rating: 4.9, reviews: 203, description: "Startup-focused with pitch rooms, investor lounge, and mentorship programs.", amenities: ["WiFi","Coffee","Meeting Rooms","Event Space","Mentorship","Mail Handling"], pricing: { hourly: 3500, daily: 14000, weekly: 60000, monthly: 200000 }, ownerId: "owner3", availability: { hourly: { total: 50, booked: 20 }, daily: { total: 25, booked: 10 }, weekly: { total: 10, booked: 4 }, monthly: { total: 5, booked: 2 } }, featured: false },
  { id: 4, name: "Quiet Corner Office", address: "321 Focus St, Port Harcourt, Nigeria", image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600", images: ["https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600", "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600"], rating: 4.5, reviews: 67, description: "Minimalist, distraction-free workspace. Soundproof pods and focus rooms.", amenities: ["WiFi","Coffee","Phone Booths","Lockers","Shower"], pricing: { hourly: 1500, daily: 6000, weekly: 25000, monthly: 90000 }, ownerId: "owner4", availability: { hourly: { total: 20, booked: 5 }, daily: { total: 10, booked: 2 }, weekly: { total: 4, booked: 1 }, monthly: { total: 2, booked: 0 } }, featured: false },
  { id: 5, name: "GreenSpace Offices", address: "654 Eco Lane, Ibadan, Nigeria", image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600", images: ["https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600", "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600", "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600"], rating: 4.7, reviews: 95, description: "Sustainable workspace with living walls, solar power, and organic cafe.", amenities: ["WiFi","Organic Cafe","Garden","Yoga Room","EV Charging","Recycling"], pricing: { hourly: 2200, daily: 9000, weekly: 40000, monthly: 140000 }, ownerId: "owner5", availability: { hourly: { total: 35, booked: 15 }, daily: { total: 18, booked: 7 }, weekly: { total: 7, booked: 3 }, monthly: { total: 4, booked: 1 } }, featured: true },
  { id: 6, name: "TechTower Suites", address: "987 Code Way, Lagos, Nigeria", image: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600", images: ["https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600", "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=600", "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600"], rating: 4.4, reviews: 56, description: "Tech-focused with server rooms, dev tools, and 24/7 access.", amenities: ["WiFi","Coffee","Server Room","Gaming Lounge","24/7 Access","Snacks"], pricing: { hourly: 2000, daily: 8500, weekly: 37000, monthly: 130000 }, ownerId: "owner6", availability: { hourly: { total: 25, booked: 10 }, daily: { total: 12, booked: 4 }, weekly: { total: 5, booked: 2 }, monthly: { total: 3, booked: 1 } }, featured: false }
];

const initBookings = [
  { id: 101, workspaceId: 1, userId: "user1", type: "daily", quantity: 2, date: "2026-07-25", total: 20000, status: "confirmed", workspaceName: "The Hive Coworking", userName: "Alex Johnson" },
  { id: 102, workspaceId: 2, userId: "user1", type: "weekly", quantity: 1, date: "2026-07-20", total: 35000, status: "confirmed", workspaceName: "Pixel Studios", userName: "Alex Johnson" },
  { id: 103, workspaceId: 5, userId: "user1", type: "hourly", quantity: 4, date: "2026-07-23", total: 8800, status: "pending", workspaceName: "GreenSpace Offices", userName: "Alex Johnson" }
];

const AMENITIES_LIST = [
  "WiFi", "Coffee", "Meeting Rooms", "Parking", "24/7 Access", "Printing",
  "Kitchen", "Bike Storage", "Event Space", "Mentorship", "Mail Handling",
  "Phone Booths", "Lockers", "Shower", "Organic Cafe", "Garden", "Yoga Room",
  "EV Charging", "Recycling", "Server Room", "Gaming Lounge", "Snacks",
  "Air Conditioning", "Security", "CCTV", "Reception", "Lounge Area", "Whiteboard"
];

const REVIEWS_DATA = {
  1: [
    { id: 1, user: "Chioma Okafor", rating: 5, date: "2026-07-15", text: "Amazing space! The internet is super fast and the rooftop view is incredible. Perfect for my team meetings." },
    { id: 2, user: "Emeka Nwosu", rating: 4, date: "2026-07-10", text: "Great location in VI. Parking can be a bit tight during peak hours but overall excellent experience." },
    { id: 3, user: "Amina Bello", rating: 5, date: "2026-06-28", text: "Love the standing desks and the coffee is top-notch. Will definitely book again!" },
    { id: 4, user: "Tunde Bakare", rating: 4, date: "2026-06-20", text: "Professional environment with all the amenities you need. The meeting rooms are well equipped." }
  ],
  2: [
    { id: 1, user: "Ngozi Eze", rating: 5, date: "2026-07-18", text: "Perfect for creatives! The natural lighting makes such a difference. Dual monitors are a game changer." },
    { id: 2, user: "Femi Adeyemi", rating: 4, date: "2026-07-05", text: "Nice vibe in Abuja. Good community of designers and developers here." }
  ],
  3: [
    { id: 1, user: "Sarah Ogunleye", rating: 5, date: "2026-07-20", text: "The pitch rooms are world-class. Helped me secure my first investor meeting!" },
    { id: 2, user: "Kunle Ajayi", rating: 5, date: "2026-07-12", text: "Mentorship programs are invaluable. The investor lounge is a great place to network." },
    { id: 3, user: "Ifeanyi Okonkwo", rating: 4, date: "2026-06-30", text: "Premium pricing but worth every naira for the connections you make here." }
  ],
  4: [
    { id: 1, user: "Zainab Musa", rating: 4, date: "2026-07-14", text: "Exactly what I needed for focused work. The soundproof pods are fantastic." },
    { id: 2, user: "Olumide Ojo", rating: 5, date: "2026-07-01", text: "Quiet, clean, and professional. The shower facility is a nice bonus for cyclists." }
  ],
  5: [
    { id: 1, user: "Adaobi Nnamdi", rating: 5, date: "2026-07-19", text: "Love the eco-friendly approach! The garden is perfect for breaks and the organic cafe serves great food." },
    { id: 2, user: "Chidi Obi", rating: 4, date: "2026-07-08", text: "Yoga room is a unique feature. Great for work-life balance. EV charging works well too." }
  ],
  6: [
    { id: 1, user: "Bola Tinubu", rating: 4, date: "2026-07-16", text: "Tech paradise! Server room access is rare and super useful for my startup." },
    { id: 2, user: "Yemi Alade", rating: 4, date: "2026-07-02", text: "Gaming lounge is fun for breaks. 24/7 access is essential for my schedule." }
  ]
};

// ==================== ICONS ====================
const I = ({ n, s = 20, c = "" }) => {
  const icons = {
    search: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
    star: <svg width={s} height={s} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    user: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    building: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/></svg>,
    calendar: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    clock: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    check: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>,
    arrowRight: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
    arrowLeft: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
    location: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    plus: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
    edit: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    creditCard: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    logout: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    dashboard: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    dollar: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    menu: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    close: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    trendUp: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    users: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    heart: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    briefcase: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    shield: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    eye: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    image: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
    chevronLeft: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
    chevronRight: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
    mapPin: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    message: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
    flag: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  };
  return <span className={c}>{icons[n] || null}</span>;
};

// ==================== UI COMPONENTS ====================
const Btn = ({ children, v = "primary", s = "md", onClick, className = "", disabled = false, full = false }) => {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 cursor-pointer";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = { primary: "bg-[#0f172a] text-white hover:bg-[#1e293b]", secondary: "bg-white text-[#0f172a] border border-gray-200 hover:bg-gray-50", ghost: "bg-transparent text-gray-600 hover:text-[#0f172a] hover:bg-gray-100", danger: "bg-red-50 text-red-600 hover:bg-red-100", success: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100", accent: "bg-[#f59e0b] text-white hover:bg-[#d97706]", purple: "bg-purple-50 text-purple-700 hover:bg-purple-100" };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[s]} ${variants[v]} ${full ? "w-full" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>{children}</button>;
};

const Badge = ({ children, color = "gray" }) => {
  const colors = { gray: "bg-gray-100 text-gray-700", green: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", purple: "bg-purple-50 text-purple-700" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
};

const Card = ({ children, className = "", onClick, hover = false }) => <div onClick={onClick} className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${hover ? "hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer" : ""} ${className}`}>{children}</div>;

// ==================== AUTH MODAL ====================
const AuthModal = ({ open, onClose, onLogin }) => {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button onClick={() => setMode("login")} className={`flex-1 py-4 text-sm font-medium ${mode === "login" ? "text-[#0f172a] border-b-2 border-[#0f172a]" : "text-gray-400"}`}>Sign In</button>
          <button onClick={() => setMode("signup")} className={`flex-1 py-4 text-sm font-medium ${mode === "signup" ? "text-[#0f172a] border-b-2 border-[#0f172a]" : "text-gray-400"}`}>Sign Up</button>
        </div>
        <div className="p-6">
          <form onSubmit={e => { e.preventDefault(); onLogin({ email, name: name || email.split("@")[0], role }); onClose(); }} className="space-y-4">
            {mode === "signup" && <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="John Doe" required /></div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="you@example.com" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="••••••••" required /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-3">
                <button type="button" onClick={() => setRole("user")} className={`p-3 rounded-lg border-2 text-center ${role === "user" ? "border-[#0f172a] bg-[#0f172a]/5" : "border-gray-200"}`}><I n="user" s={24} c={`mx-auto mb-1 ${role === "user" ? "text-[#0f172a]" : "text-gray-400"}`} /><div className={`text-sm font-medium ${role === "user" ? "text-[#0f172a]" : "text-gray-600"}`}>Seeker</div></button>
                <button type="button" onClick={() => setRole("owner")} className={`p-3 rounded-lg border-2 text-center ${role === "owner" ? "border-[#0f172a] bg-[#0f172a]/5" : "border-gray-200"}`}><I n="building" s={24} c={`mx-auto mb-1 ${role === "owner" ? "text-[#0f172a]" : "text-gray-400"}`} /><div className={`text-sm font-medium ${role === "owner" ? "text-[#0f172a]" : "text-gray-600"}`}>Owner</div></button>
                <button type="button" onClick={() => setRole("superadmin")} className={`p-3 rounded-lg border-2 text-center ${role === "superadmin" ? "border-[#0f172a] bg-[#0f172a]/5" : "border-gray-200"}`}><I n="shield" s={24} c={`mx-auto mb-1 ${role === "superadmin" ? "text-[#0f172a]" : "text-gray-400"}`} /><div className={`text-sm font-medium ${role === "superadmin" ? "text-[#0f172a]" : "text-gray-600"}`}>Admin</div></button>
              </div>
            </div>
            <Btn v="primary" s="lg" full>{mode === "login" ? "Sign In" : "Create Account"}</Btn>
          </form>
          <div className="mt-4 text-center"><button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button></div>
        </div>
      </div>
    </div>
  );
};

// ==================== BOOKING MODAL ====================
const BookingModal = ({ workspace, open, onClose, onBook }) => {
  const [bookingType, setBookingType] = useState("daily");
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState("2026-07-25");
  const [step, setStep] = useState(1);
  if (!open || !workspace) return null;
  const typeLabels = { hourly: "Hours", daily: "Days", weekly: "Weeks", monthly: "Months" };
  const total = workspace.pricing[bookingType] * quantity;
  const fee = Math.round(total * 0.05);
  const grandTotal = total + fee;
  const avail = workspace.availability[bookingType].total - workspace.availability[bookingType].booked;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="relative h-40 bg-gray-100">
          <img src={workspace.image} alt={workspace.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4"><h3 className="text-white text-xl font-bold">{workspace.name}</h3><p className="text-white/80 text-sm">{workspace.address}</p></div>
          <button onClick={onClose} className="absolute top-3 right-3 bg-white/20 backdrop-blur text-white rounded-full p-1.5 hover:bg-white/30"><I n="close" s={18} /></button>
        </div>
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {["hourly","daily","weekly","monthly"].map(t => (
                    <button key={t} onClick={() => { setBookingType(t); setQuantity(1); }} className={`p-2 rounded-lg border-2 text-center ${bookingType === t ? "border-[#0f172a] bg-[#0f172a]/5" : "border-gray-200"}`}>
                      <div className={`text-xs font-semibold capitalize ${bookingType === t ? "text-[#0f172a]" : "text-gray-500"}`}>{t}</div>
                      <div className={`text-xs ${bookingType === t ? "text-[#0f172a]" : "text-gray-400"}`}>₦{workspace.pricing[t].toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of {typeLabels[bookingType]} <span className="text-gray-400 font-normal">(Max: {avail})</span></label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">-</button>
                  <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(avail, quantity + 1))} className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Subtotal</span><span className="font-medium">₦{total.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Service fee (5%)</span><span className="font-medium">₦{fee.toLocaleString()}</span></div>
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between"><span className="font-semibold">Total</span><span className="font-bold text-lg">₦{grandTotal.toLocaleString()}</span></div>
              </div>
              <Btn v="primary" s="lg" full onClick={() => setStep(2)}>Continue to Payment <I n="arrowRight" s={16} /></Btn>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2"><button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button></div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-600">Booking</span><span className="text-sm font-medium">{quantity} {bookingType}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Total</span><span className="text-lg font-bold">₦{grandTotal.toLocaleString()}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                <div className="relative">
                  <input type="text" placeholder="4242 4242 4242 4242" className="w-full px-4 py-2.5 pl-10 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" />
                  <I n="creditCard" s={18} c="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label><input type="text" placeholder="MM/YY" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">CVC</label><input type="text" placeholder="123" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" /></div>
              </div>
              <Btn v="primary" s="lg" full onClick={() => { onBook({ workspaceId: workspace.id, workspaceName: workspace.name, type: bookingType, quantity, date, total: grandTotal }); onClose(); }}><I n="creditCard" s={18} /> Pay ₦{grandTotal.toLocaleString()} & Book</Btn>
              <p className="text-xs text-center text-gray-400">Secured by Paystack. Your payment is encrypted.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== ADD WORKSPACE MODAL ====================
const AddWorkspaceModal = ({ open, onClose, onAdd }) => {
  const [form, setForm] = useState({ name: "", address: "", description: "", website: "", pricing: { hourly: "", daily: "", weekly: "", monthly: "" }, amenities: [], availability: { hourly: { total: "", booked: 0 }, daily: { total: "", booked: 0 }, weekly: { total: "", booked: 0 }, monthly: { total: "", booked: 0 } } });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  if (!open) return null;

  const toggleAmenity = (amenity) => {
    if (form.amenities.includes(amenity)) {
      setForm({...form, amenities: form.amenities.filter(a => a !== amenity)});
    } else {
      setForm({...form, amenities: [...form.amenities, amenity]});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold">Add New Workspace</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><I n="close" s={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd({ ...form, id: Date.now(), image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600", images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=600"], rating: 0, reviews: 0, pricing: { hourly: Number(form.pricing.hourly), daily: Number(form.pricing.daily), weekly: Number(form.pricing.weekly), monthly: Number(form.pricing.monthly) }, availability: { hourly: { total: Number(form.availability.hourly.total), booked: 0 }, daily: { total: Number(form.availability.daily.total), booked: 0 }, weekly: { total: Number(form.availability.weekly.total), booked: 0 }, monthly: { total: Number(form.availability.monthly.total), booked: 0 } }, ownerId: "owner1", featured: false }); onClose(); }} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Workspace Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="e.g. The Hive Coworking" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Address *</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="Full address" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none h-20 resize-none" placeholder="Describe your workspace..." /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pricing (₦)</label>
            <div className="grid grid-cols-4 gap-3">
              {["hourly","daily","weekly","monthly"].map(t => <div key={t}><label className="text-xs text-gray-500 capitalize mb-1 block">{t}</label><div className="relative"><span className="absolute left-3 top-2.5 text-gray-400 text-sm">₦</span><input type="number" value={form.pricing[t]} onChange={e => setForm({...form, pricing: {...form.pricing, [t]: e.target.value}})} className="w-full px-4 py-2.5 pl-7 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="0" required /></div></div>)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
            <div className="grid grid-cols-4 gap-3">
              {["hourly","daily","weekly","monthly"].map(t => <div key={t}><label className="text-xs text-gray-500 capitalize mb-1 block">{t} slots</label><input type="number" value={form.availability[t].total} onChange={e => setForm({...form, availability: {...form.availability, [t]: {...form.availability[t], total: e.target.value}}})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="0" required /></div>)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
            <div className="relative">
              <button 
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none text-left bg-white flex items-center justify-between"
              >
                <span className={form.amenities.length === 0 ? "text-gray-400" : "text-gray-900"}>
                  {form.amenities.length === 0 ? "Select amenities..." : `${form.amenities.length} selected`}
                </span>
                <I n={dropdownOpen ? "chevronLeft" : "arrowRight"} s={16} c="text-gray-400" />
              </button>
              {dropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {AMENITIES_LIST.map(amenity => (
                    <label key={amenity} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={form.amenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="w-4 h-4 rounded border-gray-300 text-[#0f172a] focus:ring-[#0f172a]"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {form.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.amenities.map(a => <span key={a} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">{a}<button type="button" onClick={() => toggleAmenity(a)} className="text-gray-400 hover:text-red-500"><I n="close" s={12} /></button></span>)}
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-gray-100 flex gap-3">
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
            <Btn v="primary" full>Add Workspace</Btn>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== EDIT AVAILABILITY MODAL ====================
const EditAvailabilityModal = ({ workspace, open, onClose, onSave }) => {
  const [availability, setAvailability] = useState(workspace?.availability || {});
  useEffect(() => { if (workspace) setAvailability(workspace.availability); }, [workspace]);
  if (!open || !workspace) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Update Availability</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><I n="close" s={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{workspace.name}</p>
        <div className="space-y-4">
          {["hourly","daily","weekly","monthly"].map(t => (
            <div key={t} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div><div className="font-medium capitalize">{t} Slots</div><div className="text-xs text-gray-500">{availability[t]?.booked || 0} currently booked</div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAvailability({...availability, [t]: {...availability[t], total: Math.max(0, (availability[t]?.total || 0) - 1)}})} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white">-</button>
                <span className="w-10 text-center font-semibold">{availability[t]?.total || 0}</span>
                <button onClick={() => setAvailability({...availability, [t]: {...availability[t], total: (availability[t]?.total || 0) + 1}})} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn v="primary" full onClick={() => { onSave(workspace.id, availability); onClose(); }}>Save Changes</Btn>
        </div>
      </div>
    </div>
  );
};

// ==================== WORKSPACE DETAILS PAGE ====================
const WorkspaceDetails = ({ workspace, onBack, onBook, onToggleFav, isFav, reviews }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  if (!workspace) return null;

  const workspaceReviews = reviews[workspace.id] || [];
  const avgRating = workspaceReviews.length > 0 ? (workspaceReviews.reduce((a, b) => a + b.rating, 0) / workspaceReviews.length).toFixed(1) : workspace.rating;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Image Gallery */}
      <div className="relative bg-gray-900">
        <div className="h-[400px] md:h-[500px] relative overflow-hidden">
          <img 
            src={workspace.images[activeImage] || workspace.image} 
            alt={workspace.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Navigation */}
          <button 
            onClick={() => setActiveImage(prev => prev === 0 ? (workspace.images?.length || 1) - 1 : prev - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur text-white p-2 rounded-full hover:bg-white/30"
          >
            <I n="chevronLeft" s={24} />
          </button>
          <button 
            onClick={() => setActiveImage(prev => (prev + 1) % (workspace.images?.length || 1))}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur text-white p-2 rounded-full hover:bg-white/30"
          >
            <I n="chevronRight" s={24} />
          </button>

          {/* Back Button */}
          <button onClick={onBack} className="absolute top-4 left-4 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/30">
            <I n="arrowLeft" s={16} /> Back
          </button>

          {/* Favorite */}
          <button 
            onClick={() => onToggleFav(workspace.id)}
            className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur transition-all ${isFav ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
          >
            <I n="heart" s={20} />
          </button>

          {/* Image Counter */}
          <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {activeImage + 1} / {workspace.images?.length || 1}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
          <div className="flex gap-2 overflow-x-auto pb-4">
            {(workspace.images || [workspace.image]).map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${activeImage === idx ? "border-[#f59e0b]" : "border-transparent"}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#0f172a]">{workspace.name}</h1>
                  <p className="text-gray-500 mt-1 flex items-center gap-1"><I n="location" s={16} /> {workspace.address}</p>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg">
                  <I n="star" s={18} c="text-amber-500" />
                  <span className="font-bold text-amber-700">{avgRating}</span>
                  <span className="text-amber-600 text-sm">({workspaceReviews.length || workspace.reviews} reviews)</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 border-b border-gray-100 mb-6">
                {["overview", "reviews", "pricing"].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-medium capitalize ${activeTab === tab ? "text-[#0f172a] border-b-2 border-[#0f172a]" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg mb-2">About this space</h3>
                    <p className="text-gray-600 leading-relaxed">{workspace.description}</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-3">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {workspace.amenities.map(a => (
                        <div key={a} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <I n="check" s={16} c="text-emerald-500" />
                          <span className="text-sm text-gray-700">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-3">Availability</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {["hourly","daily","weekly","monthly"].map(t => {
                        const avail = workspace.availability[t].total - workspace.availability[t].booked;
                        return (
                          <div key={t} className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-500 capitalize">{t}</div>
                            <div className={`text-sm font-semibold ${avail > 0 ? "text-emerald-600" : "text-red-500"}`}>{avail} available</div>
                            <div className="text-xs text-gray-400">{workspace.availability[t].booked} booked</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-4xl font-bold text-[#0f172a]">{avgRating}</div>
                    <div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(star => (
                          <I key={star} n="star" s={18} c={star <= Math.round(avgRating) ? "text-amber-400" : "text-gray-200"} />
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">Based on {workspaceReviews.length || workspace.reviews} reviews</p>
                    </div>
                  </div>

                  {workspaceReviews.map(review => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#0f172a] rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{review.user[0]}</span>
                          </div>
                          <span className="font-medium text-sm">{review.user}</span>
                        </div>
                        <span className="text-xs text-gray-400">{review.date}</span>
                      </div>
                      <div className="flex gap-1 mb-2">
                        {[1,2,3,4,5].map(star => (
                          <I key={star} n="star" s={14} c={star <= review.rating ? "text-amber-400" : "text-gray-200"} />
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm">{review.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "pricing" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-4">Pricing Plans</h3>
                  {["hourly","daily","weekly","monthly"].map(t => (
                    <div key={t} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium capitalize">{t} Rate</div>
                        <div className="text-xs text-gray-500">{t === "hourly" ? "Perfect for short sessions" : t === "daily" ? "Full day access" : t === "weekly" ? "Save with weekly commitment" : "Best value for long-term"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#0f172a]">₦{workspace.pricing[t].toLocaleString()}</div>
                        <div className="text-xs text-gray-400">per {t.slice(0, -2) || "hour"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-[#0f172a]">₦{workspace.pricing.hourly.toLocaleString()}</div>
                <div className="text-gray-400 text-sm">per hour</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Daily rate</span>
                  <span className="font-medium">₦{workspace.pricing.daily.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Weekly rate</span>
                  <span className="font-medium">₦{workspace.pricing.weekly.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Monthly rate</span>
                  <span className="font-medium">₦{workspace.pricing.monthly.toLocaleString()}</span>
                </div>
              </div>

              <Btn v="primary" s="lg" full onClick={() => onBook(workspace)}>Book Now</Btn>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><I n="check" s={12} c="text-emerald-400" /> Instant</span>
                <span className="flex items-center gap-1"><I n="check" s={12} c="text-emerald-400" /> Flexible</span>
                <span className="flex items-center gap-1"><I n="check" s={12} c="text-emerald-400" /> Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== SUPERADMIN DASHBOARD ====================
const SuperAdminDashboard = ({ workspaces, bookings, users, onBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");

  const totalRevenue = bookings.reduce((a, b) => a + b.total, 0);
  const totalWorkspaces = workspaces.length;
  const totalBookings = bookings.length;
  const totalUsers = users.length;
  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;

  const recentBookings = [...bookings].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const filteredWorkspaces = workspaces.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0f172a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <I n="shield" s={24} c="text-amber-400" />
                <h1 className="text-2xl font-bold">SuperAdmin Dashboard</h1>
              </div>
              <p className="text-gray-400 text-sm">Manage all workspaces, bookings, and platform analytics</p>
            </div>
            <Btn v="secondary" s="sm" onClick={onBack}><I n="arrowLeft" s={16} /> Back to Platform</Btn>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}`, icon: "dollar", color: "green" },
            { label: "Workspaces", value: totalWorkspaces, icon: "building", color: "blue" },
            { label: "Total Bookings", value: totalBookings, icon: "calendar", color: "purple" },
            { label: "Users", value: totalUsers, icon: "users", color: "amber" },
            { label: "Pending", value: pendingBookings, icon: "clock", color: "red" }
          ].map(s => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <I n={s.icon} s={20} c={`text-${s.color}-500`} />
                <Badge color={s.color}>{s.label}</Badge>
              </div>
              <div className="text-2xl font-bold text-[#0f172a]">{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {["overview", "workspaces", "bookings", "users"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize ${activeTab === tab ? "text-[#0f172a] border-b-2 border-[#0f172a]" : "text-gray-400 hover:text-gray-600"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Revenue Chart Placeholder */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Revenue Overview</h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <I n="trendUp" s={48} c="text-gray-300" />
                  <p className="text-gray-400 mt-2">Revenue Analytics Chart</p>
                  <p className="text-2xl font-bold text-[#0f172a] mt-1">₦{totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-emerald-600">+12% from last month</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Recent Bookings</h3>
                <div className="space-y-3">
                  {recentBookings.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{b.workspaceName}</div>
                        <div className="text-xs text-gray-500">{b.userName} • {b.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">₦{b.total.toLocaleString()}</div>
                        <Badge color={b.status === "confirmed" ? "green" : "amber"}>{b.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Top Workspaces</h3>
                <div className="space-y-3">
                  {workspaces.slice(0, 5).map(w => (
                    <div key={w.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <img src={w.image} alt={w.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{w.name}</div>
                        <div className="text-xs text-gray-500">{w.address}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <I n="star" s={14} c="text-amber-400" />
                        <span className="text-sm font-medium">{w.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "workspaces" && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <I n="search" s={18} c="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search workspaces..." 
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" 
                />
              </div>
            </div>
            <div className="space-y-3">
              {filteredWorkspaces.map(w => (
                <Card key={w.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <img src={w.image} alt={w.name} className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">{w.name}</h4>
                          <p className="text-sm text-gray-500">{w.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {w.featured && <Badge color="amber">Featured</Badge>}
                          <Badge color={w.rating >= 4.5 ? "green" : "gray"}>{w.rating} ★</Badge>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>Owner: {w.ownerId}</span>
                        <span>Bookings: {bookings.filter(b => b.workspaceId === w.id).length}</span>
                        <span>Revenue: ₦{bookings.filter(b => b.workspaceId === w.id).reduce((a, b) => a + b.total, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-3">
            {bookings.map(b => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="briefcase" s={20} c="text-gray-400" /></div>
                    <div>
                      <div className="font-semibold text-gray-900">{b.workspaceName}</div>
                      <div className="text-sm text-gray-500">{b.userName} • {b.quantity} {b.type} • {b.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#0f172a]">₦{b.total.toLocaleString()}</div>
                    <Badge color={b.status === "confirmed" ? "green" : "amber"}>{b.status}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-3">
            {users.map(u => (
              <Card key={u.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0f172a] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{u.name[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{u.name}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                  <div className="text-right">
                    <Badge color={u.role === "superadmin" ? "purple" : u.role === "owner" ? "amber" : "blue"}>{u.role}</Badge>
                    <div className="text-sm text-gray-500 mt-1">{bookings.filter(b => b.userId === u.id).length} bookings</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== NAVBAR ====================
const Navbar = ({ user, onLogin, onLogout, view, setView }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView("landing")}>
            <div className="w-8 h-8 bg-[#0f172a] rounded-lg flex items-center justify-center"><I n="building" s={18} c="text-white" /></div>
            <span className="text-xl font-bold text-[#0f172a]">WorkSpot</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {!user ? (
              <>
                <button onClick={() => setView("landing")} className={`text-sm font-medium ${view === "landing" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>Find Space</button>
                <button onClick={() => setView("listings")} className={`text-sm font-medium ${view === "listings" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>Listings</button>
                <button onClick={() => setView("how-it-works")} className={`text-sm font-medium ${view === "how-it-works" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>How it Works</button>
              </>
            ) : user.role === "superadmin" ? (
              <>
                <button onClick={() => setView("superadmin-dashboard")} className={`text-sm font-medium ${view === "superadmin-dashboard" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>Admin Dashboard</button>
              </>
            ) : user.role === "owner" ? (
              <>
                <button onClick={() => setView("owner-dashboard")} className={`text-sm font-medium ${view === "owner-dashboard" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>Dashboard</button>
                <button onClick={() => setView("owner-workspaces")} className={`text-sm font-medium ${view === "owner-workspaces" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>My Workspaces</button>
                <button onClick={() => setView("owner-bookings")} className={`text-sm font-medium ${view === "owner-bookings" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>Bookings</button>
              </>
            ) : (
              <>
                <button onClick={() => setView("discover")} className={`text-sm font-medium ${view === "discover" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>Discover</button>
                <button onClick={() => setView("my-bookings")} className={`text-sm font-medium ${view === "my-bookings" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>My Bookings</button>
                <button onClick={() => setView("favorites")} className={`text-sm font-medium ${view === "favorites" ? "text-[#0f172a]" : "text-gray-500 hover:text-gray-700"}`}>Favorites</button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
                  <div className="w-6 h-6 bg-[#0f172a] rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">{user.name[0].toUpperCase()}</span></div>
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  <Badge color={user.role === "superadmin" ? "purple" : user.role === "owner" ? "amber" : "blue"}>{user.role === "superadmin" ? "Admin" : user.role === "owner" ? "Owner" : "User"}</Badge>
                </div>
                <button onClick={onLogout} className="text-gray-400 hover:text-gray-600 p-2"><I n="logout" s={18} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Btn v="ghost" s="sm" onClick={onLogin}>Sign In</Btn>
                <Btn v="primary" s="sm" onClick={onLogin}>Get Started</Btn>
              </div>
            )}
            <button className="md:hidden p-2 text-gray-500" onClick={() => setMobileOpen(!mobileOpen)}><I n={mobileOpen ? "close" : "menu"} s={20} /></button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {!user ? (
            <>
              <button onClick={() => { setView("landing"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Find Space</button>
              <button onClick={() => { setView("listings"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Listings</button>
              <button onClick={() => { setView("how-it-works"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">How it Works</button>
            </>
          ) : user.role === "superadmin" ? (
            <>
              <button onClick={() => { setView("superadmin-dashboard"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Admin Dashboard</button>
            </>
          ) : user.role === "owner" ? (
            <>
              <button onClick={() => { setView("owner-dashboard"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Dashboard</button>
              <button onClick={() => { setView("owner-workspaces"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">My Workspaces</button>
              <button onClick={() => { setView("owner-bookings"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Bookings</button>
            </>
          ) : (
            <>
              <button onClick={() => { setView("discover"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Discover</button>
              <button onClick={() => { setView("my-bookings"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">My Bookings</button>
              <button onClick={() => { setView("favorites"); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Favorites</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

// ==================== HERO ====================
const Hero = ({ onSearch }) => {
  const [location, setLocation] = useState("");
  const [bookingType, setBookingType] = useState("daily");
  return (
    <div className="relative bg-[#0f172a] text-white overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs><pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
          <rect width="100" height="100" fill="url(#g)" />
        </svg>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <Badge color="amber">Now in 30+ cities across Nigeria</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mt-4 mb-6 leading-tight">Find your perfect<br /><span className="text-[#f59e0b]">workspace nearby</span></h1>
          <p className="text-lg text-gray-300 mb-8 max-w-lg">Book desks, offices, and meeting rooms by the hour, day, week, or month. Thousands of workspaces across Nigeria, one simple platform.</p>
          <div className="bg-white rounded-2xl p-2 shadow-2xl max-w-xl">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <I n="location" s={18} c="absolute left-3 top-3.5 text-gray-400" />
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Where do you want to work?" className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 outline-none" />
              </div>
              <select value={bookingType} onChange={e => setBookingType(e.target.value)} className="px-4 py-3 rounded-xl text-gray-900 bg-gray-50 outline-none border-none cursor-pointer">
                <option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
              <Btn v="accent" s="lg" onClick={() => onSearch(location, bookingType)}><I n="search" s={18} /> Search</Btn>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-8 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><I n="check" s={14} c="text-emerald-400" /> Instant booking</span>
            <span className="flex items-center gap-1.5"><I n="check" s={14} c="text-emerald-400" /> Flexible terms</span>
            <span className="flex items-center gap-1.5"><I n="check" s={14} c="text-emerald-400" /> Secure payments</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== WORKSPACE CARD ====================
const WorkspaceCard = ({ workspace, onBook, onToggleFav, isFav, onViewDetails }) => (
  <Card className="group" hover onClick={() => onViewDetails && onViewDetails(workspace)}>
    <div className="relative h-48 overflow-hidden">
      <img src={workspace.image} alt={workspace.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      {workspace.featured && <div className="absolute top-3 left-3 bg-[#f59e0b] text-white text-xs font-bold px-2.5 py-1 rounded-full">Featured</div>}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><I n="star" s={12} c="text-amber-500" /> {workspace.rating}</div>
      {onToggleFav && (
        <button onClick={e => { e.stopPropagation(); onToggleFav(workspace.id); }} className={`absolute bottom-3 right-3 p-2 rounded-full backdrop-blur transition-all ${isFav ? "bg-red-500 text-white" : "bg-white/80 text-gray-400 hover:text-red-500"}`}>
          <I n="heart" s={16} />
        </button>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-bold text-gray-900 text-lg">{workspace.name}</h3>
      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><I n="location" s={14} /> {workspace.address}</p>
      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{workspace.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {workspace.amenities.slice(0, 4).map(a => <span key={a} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{a}</span>)}
        {workspace.amenities.length > 4 && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{workspace.amenities.length - 4}</span>}
      </div>
      <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-100">
        <div>
          <div className="text-xs text-gray-400">From</div>
          <div className="text-xl font-bold text-[#0f172a]">₦{workspace.pricing.hourly.toLocaleString()}<span className="text-sm font-normal text-gray-400">/hr</span></div>
        </div>
        <div className="flex gap-2">
          <div className="text-right mr-2">
            <div className="text-xs text-gray-400">Daily</div>
            <div className="text-sm font-semibold">₦{workspace.pricing.daily.toLocaleString()}</div>
          </div>
          <Btn v="primary" s="sm" onClick={e => { e.stopPropagation(); onBook(workspace); }}>Book Now</Btn>
        </div>
      </div>
    </div>
  </Card>
);

// ==================== FEATURED SECTION ====================
const FeaturedSection = ({ workspaces, onBook, onToggleFav, favorites, onViewDetails }) => (
  <section className="py-16 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div><h2 className="text-2xl font-bold text-[#0f172a]">Featured Workspaces</h2><p className="text-gray-500 mt-1">Hand-picked spaces with top ratings</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.filter(w => w.featured).map(w => <WorkspaceCard key={w.id} workspace={w} onBook={onBook} onToggleFav={onToggleFav} isFav={favorites.includes(w.id)} onViewDetails={onViewDetails} />)}
      </div>
    </div>
  </section>
);

// ==================== HOW IT WORKS ====================
const HowItWorks = () => (
  <section className="py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-[#0f172a]">How WorkSpot Works</h2>
        <p className="text-gray-500 mt-2">Three simple steps to your perfect workspace</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[{ icon: "search", title: "Discover", desc: "Browse thousands of workspaces near you. Filter by price, amenities, and availability." },
          { icon: "calendar", title: "Book", desc: "Reserve by the hour, day, week, or month. Instant confirmation with flexible cancellation." },
          { icon: "building", title: "Work", desc: "Show up and start working. Access WiFi, amenities, and a productive environment." }].map((step, i) => (
          <div key={i} className="text-center">
            <div className="w-16 h-16 bg-[#0f172a] rounded-2xl flex items-center justify-center mx-auto mb-4"><I n={step.icon} s={28} c="text-white" /></div>
            <div className="text-sm font-bold text-[#f59e0b] mb-1">Step {i + 1}</div>
            <h3 className="text-lg font-bold text-[#0f172a] mb-2">{step.title}</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ==================== LISTINGS VIEW ====================
const ListingsView = ({ workspaces, onBook, onToggleFav, favorites, onViewDetails }) => {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("rating");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    let w = [...workspaces];
    if (search) w = w.filter(x => x.name.toLowerCase().includes(search.toLowerCase()) || x.address.toLowerCase().includes(search.toLowerCase()));
    if (filter !== "all") w = w.filter(x => x.amenities.includes(filter));
    if (sort === "rating") w.sort((a, b) => b.rating - a.rating);
    if (sort === "price-low") w.sort((a, b) => a.pricing.daily - b.pricing.daily);
    if (sort === "price-high") w.sort((a, b) => b.pricing.daily - a.pricing.daily);
    return w;
  }, [workspaces, filter, sort, search]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <I n="search" s={18} c="absolute left-3 top-3 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workspaces..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none bg-white">
          <option value="all">All Amenities</option><option value="WiFi">WiFi</option><option value="Coffee">Coffee</option><option value="Meeting Rooms">Meeting Rooms</option><option value="Parking">Parking</option><option value="24/7 Access">24/7 Access</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none bg-white">
          <option value="rating">Top Rated</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(w => <WorkspaceCard key={w.id} workspace={w} onBook={onBook} onToggleFav={onToggleFav} isFav={favorites.includes(w.id)} onViewDetails={onViewDetails} />)}
      </div>
      {filtered.length === 0 && <div className="text-center py-16 text-gray-400">No workspaces found matching your criteria.</div>}
    </div>
  );
};

// ==================== USER DASHBOARD ====================
const UserDashboard = ({ bookings, workspaces, onBook, onViewDetails }) => {
  const stats = [
    { label: "Total Bookings", value: bookings.length, icon: "calendar", color: "blue" },
    { label: "Active Now", value: bookings.filter(b => b.status === "confirmed").length, icon: "check", color: "green" },
    { label: "Pending", value: bookings.filter(b => b.status === "pending").length, icon: "clock", color: "amber" },
    { label: "Total Spent", value: "₦" + bookings.reduce((a, b) => a + b.total, 0).toLocaleString(), icon: "dollar", color: "purple" }
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="text-2xl font-bold text-[#0f172a] mb-6">My Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <I n={s.icon} s={20} c={`text-${s.color}-500`} />
              <Badge color={s.color}>{s.label}</Badge>
            </div>
            <div className="text-2xl font-bold text-[#0f172a]">{s.value}</div>
          </Card>
        ))}
      </div>
      <h3 className="text-lg font-bold text-[#0f172a] mb-4">Recent Bookings</h3>
      <div className="space-y-3">
        {bookings.map(b => (
          <Card key={b.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="briefcase" s={20} c="text-gray-400" /></div>
                <div>
                  <div className="font-semibold text-gray-900">{b.workspaceName}</div>
                  <div className="text-sm text-gray-500">{b.quantity} {b.type} • {b.date}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#0f172a]">₦{b.total.toLocaleString()}</div>
                <Badge color={b.status === "confirmed" ? "green" : "amber"}>{b.status}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <h3 className="text-lg font-bold text-[#0f172a] mt-8 mb-4">Recommended for You</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workspaces.slice(0, 3).map(w => <WorkspaceCard key={w.id} workspace={w} onBook={onBook} onViewDetails={onViewDetails} />)}
      </div>
    </div>
  );
};

// ==================== OWNER DASHBOARD ====================
const OwnerDashboard = ({ workspaces, bookings, onAddWorkspace }) => {
  const myWorkspaces = workspaces.filter(w => w.ownerId === "owner1");
  const myBookings = bookings.filter(b => myWorkspaces.some(w => w.id === b.workspaceId));
  const revenue = myBookings.reduce((a, b) => a + b.total, 0);
  const stats = [
    { label: "My Workspaces", value: myWorkspaces.length, icon: "building", color: "blue" },
    { label: "Total Bookings", value: myBookings.length, icon: "calendar", color: "green" },
    { label: "Revenue", value: "₦" + revenue.toLocaleString(), icon: "dollar", color: "purple" },
    { label: "Occupancy", value: "78%", icon: "trendUp", color: "amber" }
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0f172a]">Owner Dashboard</h2>
        <Btn v="primary" s="sm" onClick={onAddWorkspace}><I n="plus" s={16} /> Add Workspace</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <I n={s.icon} s={20} c={`text-${s.color}-500`} />
              <Badge color={s.color}>{s.label}</Badge>
            </div>
            <div className="text-2xl font-bold text-[#0f172a]">{s.value}</div>
          </Card>
        ))}
      </div>
      <h3 className="text-lg font-bold text-[#0f172a] mb-4">Recent Bookings</h3>
      <div className="space-y-3 mb-8">
        {myBookings.length > 0 ? myBookings.map(b => (
          <Card key={b.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="user" s={20} c="text-gray-400" /></div>
                <div>
                  <div className="font-semibold text-gray-900">{b.userName}</div>
                  <div className="text-sm text-gray-500">{b.workspaceName} • {b.quantity} {b.type}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#0f172a]">₦{b.total.toLocaleString()}</div>
                <Badge color={b.status === "confirmed" ? "green" : "amber"}>{b.status}</Badge>
              </div>
            </div>
          </Card>
        )) : <div className="text-center py-8 text-gray-400">No bookings yet.</div>}
      </div>
    </div>
  );
};

// ==================== OWNER WORKSPACES ====================
const OwnerWorkspaces = ({ workspaces, onAddWorkspace, onEditAvailability }) => {
  const myWorkspaces = workspaces.filter(w => w.ownerId === "owner1");
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0f172a]">My Workspaces</h2>
        <Btn v="primary" s="sm" onClick={onAddWorkspace}><I n="plus" s={16} /> Add Workspace</Btn>
      </div>
      <div className="space-y-4">
        {myWorkspaces.map(w => (
          <Card key={w.id} className="p-5">
            <div className="flex items-start gap-4">
              <img src={w.image} alt={w.name} className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{w.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{w.address}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn v="secondary" s="sm" onClick={() => onEditAvailability(w)}><I n="edit" s={14} /> Availability</Btn>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {["hourly","daily","weekly","monthly"].map(t => {
                    const avail = w.availability[t].total - w.availability[t].booked;
                    return (
                      <div key={t} className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-500 capitalize">{t}</div>
                        <div className="text-sm font-semibold">₦{w.pricing[t].toLocaleString()}</div>
                        <div className={`text-xs ${avail > 0 ? "text-emerald-600" : "text-red-500"}`}>{avail} avail</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==================== OWNER BOOKINGS ====================
const OwnerBookings = ({ workspaces, bookings }) => {
  const myWorkspaces = workspaces.filter(w => w.ownerId === "owner1");
  const myBookings = bookings.filter(b => myWorkspaces.some(w => w.id === b.workspaceId));
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="text-2xl font-bold text-[#0f172a] mb-6">All Bookings</h2>
      <div className="space-y-3">
        {myBookings.length > 0 ? myBookings.map(b => (
          <Card key={b.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="user" s={20} c="text-gray-400" /></div>
                <div>
                  <div className="font-semibold text-gray-900">{b.userName}</div>
                  <div className="text-sm text-gray-500">{b.workspaceName} • {b.quantity} {b.type} • {b.date}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#0f172a]">₦{b.total.toLocaleString()}</div>
                <Badge color={b.status === "confirmed" ? "green" : "amber"}>{b.status}</Badge>
              </div>
            </div>
          </Card>
        )) : <div className="text-center py-16 text-gray-400">No bookings yet.</div>}
      </div>
    </div>
  );
};

// ==================== FAVORITES ====================
const FavoritesView = ({ workspaces, favorites, onBook, onToggleFav, onViewDetails }) => {
  const favWorkspaces = workspaces.filter(w => favorites.includes(w.id));
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="text-2xl font-bold text-[#0f172a] mb-6">My Favorites</h2>
      {favWorkspaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favWorkspaces.map(w => <WorkspaceCard key={w.id} workspace={w} onBook={onBook} onToggleFav={onToggleFav} isFav={true} onViewDetails={onViewDetails} />)}
        </div>
      ) : (
        <div className="text-center py-16">
          <I n="heart" s={48} c="text-gray-300 mb-4" />
          <p className="text-gray-500">No favorites yet. Start exploring workspaces!</p>
          <Btn v="primary" s="sm" className="mt-4">Explore Workspaces</Btn>
        </div>
      )}
    </div>
  );
};

// ==================== MY BOOKINGS ====================
const MyBookingsView = ({ bookings }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
    <h2 className="text-2xl font-bold text-[#0f172a] mb-6">My Bookings</h2>
    <div className="space-y-3">
      {bookings.map(b => (
        <Card key={b.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="briefcase" s={20} c="text-gray-400" /></div>
              <div>
                <div className="font-semibold text-gray-900">{b.workspaceName}</div>
                <div className="text-sm text-gray-500">{b.quantity} {b.type} • {b.date}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-[#0f172a]">₦{b.total.toLocaleString()}</div>
              <Badge color={b.status === "confirmed" ? "green" : "amber"}>{b.status}</Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// ==================== FOOTER ====================
const Footer = () => (
  <footer className="bg-[#0f172a] text-white py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><I n="building" s={18} c="text-[#0f172a]" /></div>
            <span className="text-xl font-bold">WorkSpot</span>
          </div>
          <p className="text-gray-400 text-sm">Find and book the perfect workspace near you. Hourly, daily, weekly, or monthly.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">For Users</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white">Find a Space</a></li>
            <li><a href="#" className="hover:text-white">How it Works</a></li>
            <li><a href="#" className="hover:text-white">Pricing</a></li>
            <li><a href="#" className="hover:text-white">Support</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">For Owners</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white">List Your Space</a></li>
            <li><a href="#" className="hover:text-white">Owner Dashboard</a></li>
            <li><a href="#" className="hover:text-white">Pricing Guide</a></li>
            <li><a href="#" className="hover:text-white">Resources</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white">About Us</a></li>
            <li><a href="#" className="hover:text-white">Careers</a></li>
            <li><a href="#" className="hover:text-white">Blog</a></li>
            <li><a href="#" className="hover:text-white">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
        © 2026 WorkSpot. All rights reserved.
      </div>
    </div>
  </footer>
);

// ==================== MAIN APP ====================
const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [authOpen, setAuthOpen] = useState(false);
  const [bookingWorkspace, setBookingWorkspace] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [addWorkspaceOpen, setAddWorkspaceOpen] = useState(false);
  const [editAvailWorkspace, setEditAvailWorkspace] = useState(null);
  const [editAvailOpen, setEditAvailOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState(initWorkspaces);
  const [bookings, setBookings] = useState(initBookings);
  const [favorites, setFavorites] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Mock users data for superadmin
  const [users] = useState([
    { id: "user1", name: "Alex Johnson", email: "alex@example.com", role: "user" },
    { id: "owner1", name: "Sarah Williams", email: "sarah@example.com", role: "owner" },
    { id: "owner2", name: "Mike Chen", email: "mike@example.com", role: "owner" },
    { id: "owner3", name: "Lisa Park", email: "lisa@example.com", role: "owner" },
    { id: "admin1", name: "Admin User", email: "admin@WorkSpot.ng", role: "superadmin" }
  ]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleLogin = (u) => { 
    setUser(u); 
    showToast(`Welcome, ${u.name}!`); 
    if (u.role === "superadmin") setView("superadmin-dashboard");
    else if (u.role === "owner") setView("owner-dashboard"); 
    else setView("discover"); 
  };

  const handleLogout = () => { setUser(null); setView("landing"); showToast("Signed out successfully"); };

  const handleBook = (ws) => { setBookingWorkspace(ws); setBookingOpen(true); };

  const handleConfirmBook = (b) => {
    const newBooking = { ...b, id: Date.now(), userId: user?.id || "user1", userName: user?.name || "Guest", status: "confirmed" };
    setBookings([newBooking, ...bookings]);
    setWorkspaces(workspaces.map(w => w.id === b.workspaceId ? { ...w, availability: { ...w.availability, [b.type]: { ...w.availability[b.type], booked: w.availability[b.type].booked + b.quantity } } } : w));
    showToast(`Booked ${b.workspaceName} for ${b.quantity} ${b.type}!`);
  };

  const handleToggleFav = (id) => {
    if (favorites.includes(id)) { setFavorites(favorites.filter(f => f !== id)); showToast("Removed from favorites"); }
    else { setFavorites([...favorites, id]); showToast("Added to favorites"); }
  };

  const handleAddWorkspace = (ws) => { setWorkspaces([ws, ...workspaces]); showToast("Workspace added successfully!"); };

  const handleSaveAvailability = (id, avail) => {
    setWorkspaces(workspaces.map(w => w.id === id ? { ...w, availability: avail } : w));
    showToast("Availability updated!");
  };

  const handleViewDetails = (ws) => {
    setSelectedWorkspace(ws);
    setView("workspace-details");
  };

  const handleBackFromDetails = () => {
    setSelectedWorkspace(null);
    setView(user ? (user.role === "owner" ? "owner-dashboard" : "discover") : "landing");
  };

  const renderView = () => {
    switch (view) {
      case "landing": return <><Hero onSearch={(loc, type) => { setView("listings"); }} /><FeaturedSection workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} /><HowItWorks /></>;
      case "listings": return <ListingsView workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} />;
      case "how-it-works": return <HowItWorks />;
      case "discover": return <><Hero onSearch={() => setView("listings")} /><ListingsView workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} /></>;
      case "my-bookings": return <MyBookingsView bookings={bookings} />;
      case "favorites": return <FavoritesView workspaces={workspaces} favorites={favorites} onBook={handleBook} onToggleFav={handleToggleFav} onViewDetails={handleViewDetails} />;
      case "owner-dashboard": return <OwnerDashboard workspaces={workspaces} bookings={bookings} onAddWorkspace={() => setAddWorkspaceOpen(true)} />;
      case "owner-workspaces": return <OwnerWorkspaces workspaces={workspaces} onAddWorkspace={() => setAddWorkspaceOpen(true)} onEditAvailability={(w) => { setEditAvailWorkspace(w); setEditAvailOpen(true); }} />;
      case "owner-bookings": return <OwnerBookings workspaces={workspaces} bookings={bookings} />;
      case "workspace-details": return <WorkspaceDetails workspace={selectedWorkspace} onBack={handleBackFromDetails} onBook={handleBook} onToggleFav={handleToggleFav} isFav={favorites.includes(selectedWorkspace?.id)} reviews={REVIEWS_DATA} />;
      case "superadmin-dashboard": return <SuperAdminDashboard workspaces={workspaces} bookings={bookings} users={users} onBack={() => setView("landing")} />;
      default: return <Hero onSearch={() => setView("listings")} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={user} onLogin={() => setAuthOpen(true)} onLogout={handleLogout} view={view} setView={setView} />
      {renderView()}
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={handleLogin} />
      <BookingModal workspace={bookingWorkspace} open={bookingOpen} onClose={() => setBookingOpen(false)} onBook={handleConfirmBook} />
      <AddWorkspaceModal open={addWorkspaceOpen} onClose={() => setAddWorkspaceOpen(false)} onAdd={handleAddWorkspace} />
      <EditAvailabilityModal workspace={editAvailWorkspace} open={editAvailOpen} onClose={() => setEditAvailOpen(false)} onSave={handleSaveAvailability} />
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-6 py-3 rounded-xl shadow-lg animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
