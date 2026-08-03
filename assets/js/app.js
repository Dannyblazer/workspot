const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ==================== MOTION PRIMITIVES ====================
// True when the user prefers reduced motion; motion features no-op when set.
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// True on touch / coarse-pointer devices (custom cursor is disabled there).
const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;

// <Reveal> — fades + rises its children into view once when scrolled to.
// Falls back to always-visible when reduced-motion or IntersectionObserver is unavailable.
const Reveal = ({ children, as = "div", className = "", delay = 0, ...rest }) => {
  const ref = useRef(null);
  const El = as;
  const noMotion = prefersReducedMotion() || typeof IntersectionObserver === "undefined";
  const [visible, setVisible] = useState(noMotion);

  useEffect(() => {
    if (noMotion || !ref.current) return;
    const node = ref.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { setVisible(true); obs.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    obs.observe(node);
    return () => obs.disconnect();
  }, [noMotion]);

  const delayClass = delay ? ` reveal-d${delay}` : "";
  const cls = noMotion ? className : `reveal${delayClass}${visible ? " is-visible" : ""} ${className}`;
  return <El ref={ref} className={cls} {...rest}>{children}</El>;
};

// <CustomCursor> — a difference-blend dot + trailing ring that grows over
// interactive elements. Renders nothing on touch devices or with reduced-motion.
const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || isCoarsePointer()) return;
    const dot = dotRef.current, ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.classList.add("ws-cursor-on");
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my, raf = 0;

    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    };
    const tick = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    const interactive = "a, button, [role=button], input, select, textarea, label, .ws-hover";
    const onOver = (e) => { if (e.target.closest && e.target.closest(interactive)) ring.classList.add("ws-cursor-hover"); };
    const onOut = (e) => { if (e.target.closest && e.target.closest(interactive)) ring.classList.remove("ws-cursor-hover"); };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.body.classList.remove("ws-cursor-on");
    };
  }, []);

  return <>
    <div ref={ringRef} className="ws-cursor-ring" />
    <div ref={dotRef} className="ws-cursor-dot" />
  </>;
};

// ==================== CONSTANTS ====================
// Ordered billing/availability tiers, used throughout the UI.
const BILLING_TYPES = ["hourly", "daily", "weekly", "monthly"];

// Singular noun per tier (for "per day", "3 Days", etc.).
const TIER_UNIT = { hourly: "hour", daily: "day", weekly: "week", monthly: "month" };

const AMENITIES_LIST = [
  "WiFi", "Coffee", "Meeting Rooms", "Parking", "24/7 Access", "Printing",
  "Kitchen", "Bike Storage", "Event Space", "Mentorship", "Mail Handling",
  "Phone Booths", "Lockers", "Shower", "Organic Cafe", "Garden", "Yoga Room",
  "EV Charging", "Recycling", "Server Room", "Gaming Lounge", "Snacks",
  "Air Conditioning", "Security", "CCTV", "Reception", "Lounge Area", "Whiteboard"
];

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
  const base = "ws-hover inline-flex items-center justify-center gap-2 font-medium tracking-tight rounded-button transition-all duration-300 ease-out cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 focus-visible:ring-offset-2 active:scale-[0.97]";
  const sizes = { sm: "px-3.5 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const variants = { primary: "bg-brand text-white hover:bg-brand-hover hover:-translate-y-0.5 shadow-sm hover:shadow-lift", secondary: "bg-white text-gray-900 border border-gray-200 hover:border-gray-900 hover:-translate-y-0.5", ghost: "bg-transparent text-gray-600 hover:text-brand hover:bg-brand-soft", danger: "bg-red-50 text-red-600 hover:bg-red-100", success: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100", accent: "text-white hover:-translate-y-0.5 shadow-sm hover:shadow-lift", purple: "bg-brand-soft text-brand hover:bg-[#E6E6E2]" };
  const brandStyle = v === "primary" ? { backgroundColor: "#171717", color: "#FFFFFF" } : v === "accent" ? { backgroundColor: "#B9683C", color: "#FFFFFF" } : undefined;
  return <button onClick={onClick} disabled={disabled} style={brandStyle} className={`${base} ${sizes[s]} ${variants[v]} ${full ? "w-full" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>{children}</button>;
};

const Badge = ({ children, color = "gray" }) => {
  const colors = { gray: "bg-gray-100 text-gray-700", green: "bg-emerald-50 text-emerald-700", blue: "bg-gray-100 text-gray-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", purple: "bg-brand-soft text-brand" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
};

const Card = ({ children, className = "", onClick, hover = false }) => <div onClick={onClick} className={`bg-white rounded-card border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-500 ease-out ${hover ? "ws-hover hover:shadow-lift hover:border-gray-900/20 hover:-translate-y-1.5 cursor-pointer" : ""} ${className}`}>{children}</div>;

// ==================== AUTH MODAL ====================
const AuthModal = ({ open, onClose, onLogin }) => {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  // Reset form when modal opens (bug fix: state should reset between sessions)
  useEffect(() => {
    if (open) {
      setMode("login");
      setRole("user");
      setEmail("");
      setPassword("");
      setName("");
      setError("");
      setGoogleError("");
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = mode === "login"
        ? await api.login(email, password)
        : await api.register(email, password, name || email.split("@")[0], role);
      api.setToken(res.token);
      onLogin(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google's callback hands back a response object; the JWT is response.credential.
  const handleGoogleLogin = async (response) => {
    const credential = response && response.credential;
    if (!credential) { setGoogleError("Google Sign-In failed"); return; }
    setGoogleError("");
    setGoogleLoading(true);
    try {
      const res = mode === "login"
        ? await api.loginWithGoogle(credential, undefined)
        : await api.loginWithGoogle(credential, role === "owner" ? "owner" : undefined);
      api.setToken(res.token);
      onLogin(res.user);
      onClose();
    } catch (err) {
      setGoogleError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Render the Google button whenever the modal opens (or mode/role change), once
  // the target div is in the DOM. Re-running keeps the callback's mode/role fresh.
  useEffect(() => {
    if (!open) return;
    const clientId = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
    if (typeof google === 'undefined' || !google.accounts) {
      setGoogleError("Google Sign-In is not available");
      return;
    }
    // The button div mounts with the modal; wait a tick so it exists.
    const id = setTimeout(() => {
      const target = document.getElementById("google-login-button");
      if (!target) return;
      try {
        google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleLogin });
        target.innerHTML = "";
        google.accounts.id.renderButton(target, {
          theme: "outline", size: "large", text: "continue_with",
          shape: "rectangular", logo_alignment: "left", width: 320,
        });
      } catch (err) {
        console.error("Google Identity Services initialization failed:", err);
        setGoogleError("Google Sign-In is not available");
      }
    }, 0);
    return () => clearTimeout(id);
  }, [open, mode, role]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-card shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button onClick={() => setMode("login")} className={`flex-1 py-4 text-sm font-semibold tracking-tight ${mode === "login" ? "text-brand border-b-2 border-brand" : "text-gray-400"}`}>Sign In</button>
          <button onClick={() => setMode("signup")} className={`flex-1 py-4 text-sm font-semibold tracking-tight ${mode === "signup" ? "text-brand border-b-2 border-brand" : "text-gray-400"}`}>Sign Up</button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="John Doe" required /></div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="you@example.com" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="••••••••" required /></div>
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setRole("user")} className={`p-3 rounded-control border-2 text-center ${role === "user" ? "border-brand bg-brand-soft" : "border-gray-200"}`}><I n="user" s={24} c={`mx-auto mb-1 ${role === "user" ? "text-brand" : "text-gray-400"}`} /><div className={`text-sm font-medium ${role === "user" ? "text-brand" : "text-gray-600"}`}>Seeker</div></button>
                  <button type="button" onClick={() => setRole("owner")} className={`p-3 rounded-control border-2 text-center ${role === "owner" ? "border-brand bg-brand-soft" : "border-gray-200"}`}><I n="building" s={24} c={`mx-auto mb-1 ${role === "owner" ? "text-brand" : "text-gray-400"}`} /><div className={`text-sm font-medium ${role === "owner" ? "text-brand" : "text-gray-600"}`}>Owner</div></button>
                </div>
              </div>
            )}
            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            {googleError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{googleError}</div>}
            <Btn v="primary" s="lg" full disabled={loading || googleLoading}>{loading || googleLoading ? "Processing..." : (mode === "login" ? "Sign In" : "Create Account")}</Btn>
          </form>
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs uppercase tracking-[0.18em] text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div id="google-login-button" className="flex justify-center min-h-[44px]" />
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

  // Reset state when modal opens (bug fix: state should reset between workspaces)
  useEffect(() => {
    if (open && workspace) {
      setBookingType("daily");
      setQuantity(1);
      setDate("2026-07-25");
      setStep(1);
    }
  }, [open, workspace?.id]);

  if (!open || !workspace) return null;

  const typeLabels = { hourly: "Hours", daily: "Days", weekly: "Weeks", monthly: "Months" };
  const total = workspace.pricing[bookingType] * quantity;
  const fee = Math.round(total * 0.05);
  const grandTotal = total + fee;
  const avail = workspace.availability[bookingType].total - workspace.availability[bookingType].booked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-card shadow-2xl max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="relative h-40 bg-gray-100">
          <img src={workspace.image} alt={workspace.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4"><h3 className="font-display text-white text-xl font-bold tracking-tight">{workspace.name}</h3><p className="text-white/80 text-sm">{workspace.address}</p></div>
          <button onClick={onClose} className="absolute top-3 right-3 bg-white/20 backdrop-blur text-white rounded-full p-1.5 hover:bg-white/30"><I n="close" s={18} /></button>
        </div>
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {BILLING_TYPES.map(t => (
                    <button key={t} onClick={() => { setBookingType(t); setQuantity(1); }} className={`rounded-control border-2 p-2 text-center ${bookingType === t ? "border-brand bg-brand-soft" : "border-gray-200"}`}>
                      <div className={`text-xs font-semibold capitalize ${bookingType === t ? "text-brand" : "text-gray-500"}`}>{t}</div>
                      <div className={`text-xs ${bookingType === t ? "text-brand" : "text-gray-400"}`}>₦{workspace.pricing[t].toLocaleString()}/per {TIER_UNIT[t]}</div>
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
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Subtotal</span><span className="font-medium">₦{total.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Service fee (5%)</span><span className="font-medium">₦{fee.toLocaleString()}</span></div>
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between"><span className="font-semibold">Total</span><span className="font-bold text-lg">₦{grandTotal.toLocaleString()}</span></div>
              </div>
              <Btn v="primary" s="lg" full onClick={() => setStep(2)} disabled={avail < 1}>Continue to Payment <I n="arrowRight" s={16} /></Btn>
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
                  <input type="text" placeholder="4242 4242 4242 4242" className="px-4 py-2.5 pl-10 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" />
                  <I n="creditCard" s={18} c="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label><input type="text" placeholder="MM/YY" className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">CVC</label><input type="text" placeholder="123" className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" /></div>
              </div>
              <Btn v="primary" s="lg" full onClick={() => { onBook({ workspaceId: workspace.id, workspaceName: workspace.name, type: bookingType, quantity, date }); onClose(); }}><I n="creditCard" s={18} /> Pay ₦{grandTotal.toLocaleString()} & Book</Btn>
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
  const emptyForm = { name: "", address: "", description: "", website: "", pricing: { hourly: "", daily: "", weekly: "", monthly: "" }, amenities: [], availability: { hourly: { total: "", booked: 0 }, daily: { total: "", booked: 0 }, weekly: { total: "", booked: 0 }, monthly: { total: "", booked: 0 } } };
  const [form, setForm] = useState(emptyForm);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Reset form when modal opens (bug fix: stale form data between opens)
  useEffect(() => { if (open) { setForm(emptyForm); setDropdownOpen(false); } }, [open]);

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
      <div className="bg-white rounded-card shadow-2xl max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-display text-lg font-bold tracking-tight">Add New Workspace</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><I n="close" s={20} /></button>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          // owner_id is derived server-side from the JWT; ratings/reviews are derived on read.
          onAdd({
            name: form.name,
            address: form.address,
            description: form.description,
            amenities: form.amenities,
            pricing: Object.fromEntries(BILLING_TYPES.map(t => [t, Number(form.pricing[t]) || 0])),
            availability: Object.fromEntries(BILLING_TYPES.map(t => [t, { total: Number(form.availability[t].total) || 0 }])),
          });
          onClose();
        }} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Workspace Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="e.g. The Hive Coworking" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Address *</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="Full address" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none h-20 resize-none" placeholder="Describe your workspace..." /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pricing (₦)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BILLING_TYPES.map(t => <div key={t}><label className="text-xs text-gray-500 capitalize mb-1 block">{t}</label><div className="relative"><span className="absolute left-3 top-2.5 text-gray-400 text-sm">₦</span><input type="number" value={form.pricing[t]} onChange={e => setForm({...form, pricing: {...form.pricing, [t]: e.target.value}})} className="px-4 py-2.5 pl-7 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="0" required /></div></div>)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BILLING_TYPES.map(t => <div key={t}><label className="text-xs text-gray-500 capitalize mb-1 block">{t} slots</label><input type="number" value={form.availability[t].total} onChange={e => setForm({...form, availability: {...form.availability, [t]: {...form.availability[t], total: e.target.value}}})} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="0" required /></div>)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
            <div className="relative">
              <button 
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none text-left bg-white flex items-center justify-between"
              >
                <span className={form.amenities.length === 0 ? "text-gray-400" : "text-gray-900"}>
                  {form.amenities.length === 0 ? "Select amenities..." : `${form.amenities.length} selected`}
                </span>
                <I n={dropdownOpen ? "chevronLeft" : "arrowRight"} s={16} c="text-gray-400" />
              </button>
              {dropdownOpen && (
                <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
            <Btn v="primary" className="rounded-md" full>Add Workspace</Btn>
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
      <div className="bg-white rounded-card shadow-2xl max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold tracking-tight">Update Availability</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><I n="close" s={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{workspace.name}</p>
        <div className="space-y-4">
          {BILLING_TYPES.map(t => (
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
const WorkspaceDetails = ({ workspace, onBack, onBook, onToggleFav, isFav }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [workspaceReviews, setWorkspaceReviews] = useState([]);

  // Fetch reviews from the API whenever the workspace changes.
  useEffect(() => {
    let cancelled = false;
    if (workspace) {
      api.getReviews(workspace.id)
        .then(r => { if (!cancelled) setWorkspaceReviews(r); })
        .catch(() => { if (!cancelled) setWorkspaceReviews([]); });
    }
    return () => { cancelled = true; };
  }, [workspace?.id]);

  if (!workspace) return null;

  const avgRating = workspaceReviews.length > 0 ? (workspaceReviews.reduce((a, b) => a + b.rating, 0) / workspaceReviews.length).toFixed(1) : workspace.rating;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Image Gallery */}
      <div className="relative bg-gray-900">
        <div className="h-[280px] sm:h-[400px] md:h-[500px] relative overflow-hidden">
          <img 
            src={workspace.images[activeImage] || workspace.image} 
            alt={workspace.name} 
            className="h-full object-cover"
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
                <img src={img} alt="" className="h-full object-cover" />
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
            <div className="bg-white rounded-card p-4 sm:p-6 mb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[-0.035em] text-gray-900">{workspace.name}</h1>
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
                    className={`pb-3 text-sm font-semibold capitalize ${activeTab === tab ? "text-brand border-b-2 border-brand" : "text-gray-400 hover:text-gray-600"}`}
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {BILLING_TYPES.map(t => {
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
                  {BILLING_TYPES.map(t => (
                    <div key={t} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium capitalize">{t} Rate</div>
                        <div className="text-xs text-gray-500">{t === "hourly" ? "Perfect for short sessions" : t === "daily" ? "Full day access" : t === "weekly" ? "Save with weekly commitment" : "Best value for long-term"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#0f172a]">₦{workspace.pricing[t].toLocaleString()}</div>
                        <div className="text-xs text-gray-400">per {TIER_UNIT[t]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-card p-4 sm:p-6 lg:sticky lg:top-24">
              <div className="text-center mb-6">
                <div className="font-display text-3xl font-bold tracking-tight text-gray-900">₦{workspace.pricing.hourly.toLocaleString()}</div>
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

              <Btn v="primary" s="lg" className="rounded-md" full onClick={() => onBook(workspace)}>Book Now</Btn>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-400">
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
const SuperAdminDashboard = ({ workspaces, bookings, stats, users, onBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Platform totals come from the server; fall back to client-derived if absent.
  const totalRevenue = stats?.totalRevenue ?? bookings.reduce((a, b) => a + b.total, 0);
  const totalWorkspaces = stats?.totalWorkspaces ?? workspaces.length;
  const totalBookings = stats?.totalBookings ?? bookings.length;
  const totalUsers = stats?.totalUsers ?? users.length;
  const pendingBookings = stats?.pendingBookings ?? bookings.filter(b => b.status === "pending").length;
  const confirmedBookings = stats?.confirmedBookings ?? bookings.filter(b => b.status === "confirmed").length;

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
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em]">SuperAdmin Dashboard</h1>
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
            { label: "Workspaces", value: totalWorkspaces, icon: "building", color: "gray" },
            { label: "Total Bookings", value: totalBookings, icon: "calendar", color: "gray" },
            { label: "Users", value: totalUsers, icon: "users", color: "amber" },
            { label: "Pending", value: pendingBookings, icon: "clock", color: "red" }
          ].map(s => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <I n={s.icon} s={20} c={`text-${s.color}-500`} />
                <Badge color={s.color}>{s.label}</Badge>
              </div>
              <div className="font-display text-2xl font-bold tracking-tight text-gray-900">{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {["overview", "workspaces", "bookings", "users"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold capitalize ${activeTab === tab ? "text-brand border-b-2 border-brand" : "text-gray-400 hover:text-gray-600"}`}
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
                  className="pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" 
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
    <nav className="sticky top-0 z-40 bg-[#FAFAF8]/80 backdrop-blur-xl border-b border-gray-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="ws-hover flex items-center gap-2 cursor-pointer" onClick={() => setView("landing")}>
            <img src="assets/workspot-logo.svg" alt="" className="h-9 w-9" />
            <span className="font-display text-xl font-bold tracking-[-0.03em] text-gray-900">WorkSpot</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {!user ? (
              <>
                <button onClick={() => setView("landing")} className={`link-sweep text-sm font-medium tracking-tight ${view === "landing" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>Find Space</button>
                <button onClick={() => setView("listings")} className={`link-sweep text-sm font-medium tracking-tight ${view === "listings" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>Listings</button>
                <button onClick={() => setView("how-it-works")} className={`link-sweep text-sm font-medium tracking-tight ${view === "how-it-works" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>How it Works</button>
              </>
            ) : user.role === "superadmin" ? (
              <>
                <button onClick={() => setView("superadmin-dashboard")} className={`link-sweep text-sm font-medium tracking-tight ${view === "superadmin-dashboard" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>Admin Dashboard</button>
              </>
            ) : user.role === "owner" ? (
              <>
                <button onClick={() => setView("owner-dashboard")} className={`link-sweep text-sm font-medium tracking-tight ${view === "owner-dashboard" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>Dashboard</button>
                <button onClick={() => setView("owner-workspaces")} className={`link-sweep text-sm font-medium tracking-tight ${view === "owner-workspaces" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>My Workspaces</button>
                <button onClick={() => setView("owner-bookings")} className={`link-sweep text-sm font-medium tracking-tight ${view === "owner-bookings" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>Bookings</button>
              </>
            ) : (
              <>
                <button onClick={() => setView("discover")} className={`link-sweep text-sm font-medium tracking-tight ${view === "discover" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>Discover</button>
                <button onClick={() => setView("my-bookings")} className={`link-sweep text-sm font-medium tracking-tight ${view === "my-bookings" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>My Bookings</button>
                <button onClick={() => setView("favorites")} className={`link-sweep text-sm font-medium tracking-tight ${view === "favorites" ? "text-brand-accent" : "text-gray-500 hover:text-gray-900"}`}>Favorites</button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-soft rounded-full">
                  <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">{user.name[0].toUpperCase()}</span></div>
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  <Badge color={user.role === "superadmin" ? "purple" : user.role === "owner" ? "amber" : "blue"}>{user.role === "superadmin" ? "Admin" : user.role === "owner" ? "Owner" : "User"}</Badge>
                </div>
                <button onClick={onLogout} className="text-gray-400 hover:text-gray-600 p-2"><I n="logout" s={18} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Btn v="ghost" s="sm" onClick={onLogin} className="rounded-md">Sign In</Btn>
                <Btn v="primary" s="sm" onClick={onLogin} className="rounded-md">Get Started</Btn>
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
              <button onClick={() => { setView("landing"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Find Space</button>
              <button onClick={() => { setView("listings"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Listings</button>
              <button onClick={() => { setView("how-it-works"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">How it Works</button>
            </>
          ) : user.role === "superadmin" ? (
            <>
              <button onClick={() => { setView("superadmin-dashboard"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Admin Dashboard</button>
            </>
          ) : user.role === "owner" ? (
            <>
              <button onClick={() => { setView("owner-dashboard"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Dashboard</button>
              <button onClick={() => { setView("owner-workspaces"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">My Workspaces</button>
              <button onClick={() => { setView("owner-bookings"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Bookings</button>
            </>
          ) : (
            <>
              <button onClick={() => { setView("discover"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Discover</button>
              <button onClick={() => { setView("my-bookings"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">My Bookings</button>
              <button onClick={() => { setView("favorites"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Favorites</button>
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
  const [people, setPeople] = useState("1");
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-white">
      <div className="absolute right-0 top-0 hidden h-full w-[54%] lg:block">
        <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=85" alt="Bright, modern workspace" className="h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-14 sm:pt-28 sm:pb-20">
        <Reveal className="max-w-2xl">
          <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-brand-accent uppercase">Flexible workspaces, on your terms</p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-[80px] font-bold tracking-[-0.04em] leading-[0.98] text-gray-900">Find the perfect <span className="text-brand-accent">workspace</span>, anywhere.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-gray-500">Book inspiring spaces by the hour or day — from quiet corners to premium offices.</p>
        </Reveal>
        <Reveal delay={1} className="relative mt-10 rounded-card border border-gray-200 bg-white p-2.5 shadow-soft">
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center">
            <label className="flex min-w-0 items-center gap-3 rounded-control px-3 py-2.5 lg:border-r lg:border-gray-100"><I n="location" s={20} c="text-brand-accent flex-shrink-0" /><span className="min-w-0 flex-1"><span className="block text-[11px] font-medium tracking-wide text-gray-400">LOCATION</span><input aria-label="Workspace location" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Lagos, Nigeria" className="bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-500" /></span></label>
            <label className="flex items-center gap-3 rounded-control px-3 py-2.5 lg:border-r lg:border-gray-100"><I n="calendar" s={20} c="text-brand-accent flex-shrink-0" /><span><span className="block text-[11px] font-medium tracking-wide text-gray-400">BOOKING TYPE</span><select aria-label="Booking duration" value={bookingType} onChange={e => setBookingType(e.target.value)} className="-ml-1 bg-transparent text-sm font-semibold text-gray-800 outline-none"><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></span></label>
            <label className="flex items-center gap-3 rounded-control px-3 py-2.5"><I n="users" s={20} c="text-brand-accent flex-shrink-0" /><span className="min-w-0"><span className="block text-[11px] font-medium tracking-wide text-gray-400">FOR</span><select aria-label="Number of people" value={people} onChange={e => setPeople(e.target.value)} className="-ml-1 bg-transparent text-sm font-semibold text-gray-800 outline-none"><option value="1">1 person</option><option value="2">2 people</option><option value="3">3 people</option><option value="4">4 people</option><option value="5+">5+ people</option></select></span></label>
            <Btn v="primary" s="lg" className="min-h-[50px] rounded-md" onClick={() => onSearch(location, bookingType, people)}><I n="search" s={18} /> Search spaces</Btn>
          </div>
        </Reveal>
        <Reveal delay={2} className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-600"><span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft"><I n="trendUp" s={15} c="text-brand-accent" /></span>Instant booking</span><span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft"><I n="shield" s={15} c="text-brand-accent" /></span>Verified spaces</span><span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft"><I n="check" s={15} c="text-brand-accent" /></span>Flexible terms</span></Reveal>
      </div>
    </section>
  );
};

// ==================== WORKSPACE CARD ====================
const WorkspaceCard = ({ workspace, onBook, onToggleFav, isFav, onViewDetails }) => (
  <Card className="group" hover onClick={() => onViewDetails && onViewDetails(workspace)}>
    <div className="relative h-52 overflow-hidden">
      <img src={workspace.image} alt={workspace.name} className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700 ease-out" />
      {workspace.featured && <div className="absolute top-3 left-3 bg-brand-accent text-white text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full">Featured</div>}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><I n="star" s={12} c="text-amber-500" /> {workspace.rating}</div>
      {onToggleFav && (
        <button onClick={e => { e.stopPropagation(); onToggleFav(workspace.id); }} className={`absolute bottom-3 right-3 p-2 rounded-full backdrop-blur transition-all ${isFav ? "bg-red-500 text-white" : "bg-white/80 text-gray-400 hover:text-red-500"}`}>
          <I n="heart" s={16} />
        </button>
      )}
    </div>
    <div className="p-5">
      <h3 className="font-display font-semibold tracking-[-0.02em] text-gray-900 text-lg">{workspace.name}</h3>
      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><I n="location" s={14} /> {workspace.address}</p>
      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{workspace.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {workspace.amenities.slice(0, 4).map(a => <span key={a} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{a}</span>)}
        {workspace.amenities.length > 4 && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{workspace.amenities.length - 4}</span>}
      </div>
      <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-100">
        <div>
          <div className="text-xs text-gray-400">From</div>
          <div className="font-display text-xl font-bold tracking-tight text-[#0f172a]">₦{workspace.pricing.hourly.toLocaleString()}<span className="text-sm font-normal text-gray-400">/hr</span></div>
        </div>
        <div className="flex gap-2">
          <div className="text-right mr-2">
            <div className="text-xs text-gray-400">Daily</div>
            <div className="text-sm font-semibold">₦{workspace.pricing.daily.toLocaleString()}</div>
          </div>
          <Btn v="primary" s="sm" className="rounded-md" onClick={e => { e.stopPropagation(); onBook(workspace); }}>Book Now</Btn>
        </div>
      </div>
    </div>
  </Card>
);

// ==================== FEATURED SECTION ====================
const FeaturedSection = ({ workspaces, onBook, onToggleFav, favorites, onViewDetails }) => (
  <section className="py-20 sm:py-28 bg-white border-y border-gray-100">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <Reveal className="flex items-end justify-between mb-12">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-brand-accent uppercase">Curated selection</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.035em] text-gray-900">Featured workspaces</h2>
        </div>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.filter(w => w.featured).map((w, i) => (
          <Reveal key={w.id} delay={(i % 3) + 1}>
            <WorkspaceCard workspace={w} onBook={onBook} onToggleFav={onToggleFav} isFav={favorites.includes(w.id)} onViewDetails={onViewDetails} />
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

// ==================== HOW IT WORKS ====================
const HowItWorks = () => (
  <section className="py-20 sm:py-28">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <Reveal className="text-center mb-16">
        <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-brand-accent uppercase">The process</p>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.035em] text-gray-900">How WorkSpot works</h2>
        <p className="text-gray-500 mt-4 text-lg">Three simple steps to your perfect workspace</p>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {[{ icon: "search", title: "Discover", desc: "Browse hundreds of workspaces near you. Filter by price, amenities, and availability." },
          { icon: "calendar", title: "Book", desc: "Reserve by the hour, day, week, or month. Instant confirmation with flexible cancellation." },
          { icon: "building", title: "Work", desc: "Show up and start working. Access WiFi, amenities, and a productive environment." }].map((step, i) => (
          <Reveal key={i} delay={i + 1} className="text-center">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-5"><I n={step.icon} s={28} c="text-white" /></div>
            <div className="text-sm font-semibold text-brand-accent mb-2">Step {i + 1}</div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-[#0f172a] mb-2">{step.title}</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">{step.desc}</p>
          </Reveal>
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
    <section className="bg-[#FAFAF8] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pb-1">
        {[['all', 'All spaces'], ['WiFi', 'Wi-Fi'], ['Meeting Rooms', 'Meeting rooms'], ['24/7 Access', 'Open 24/7'], ['Parking', 'Parking']].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={filter === value ? { backgroundColor: '#171717', borderColor: '#171717' } : undefined}
            className={`ws-hover whitespace-nowrap rounded-md border px-4 py-2 text-sm transition-all duration-300 ${filter === value ? 'font-semibold text-white' : 'font-normal border-gray-200 bg-white text-gray-600 hover:border-gray-900/40'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-card border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-900">Filters</h2><button onClick={() => { setFilter('all'); setSearch(''); setSort('rating'); }} className="text-xs font-semibold text-brand">Clear all</button></div>
          <div className="mt-5 border-t border-gray-100 pt-5"><label className="text-xs font-bold uppercase tracking-wide text-gray-500">Search</label><div className="relative mt-2"><I n="search" s={16} c="absolute left-3 top-3 text-gray-400" /><input aria-label="Search workspaces" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search spaces" className="w-full rounded-control border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand" /></div></div>
          <div className="mt-5 border-t border-gray-100 pt-5"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Amenities</p><div className="mt-3 space-y-2.5">{['WiFi', 'Coffee', 'Meeting Rooms', 'Parking', '24/7 Access'].map(amenity => <label key={amenity} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"><input type="radio" name="amenity" checked={filter === amenity} onChange={() => setFilter(amenity)} className="h-4 w-4 accent-[#171717]" />{amenity}</label>)}<label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"><input type="radio" name="amenity" checked={filter === 'all'} onChange={() => setFilter('all')} className="h-4 w-4 accent-[#171717]" />Any amenity</label></div></div>
          <div className="mt-5 border-t border-gray-100 pt-5"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Booking</p><div className="mt-3 flex items-center gap-2 text-sm text-gray-600"><I n="check" s={16} c="text-brand" />Instant confirmation</div><div className="mt-3 flex items-center gap-2 text-sm text-gray-600"><I n="shield" s={16} c="text-brand" />Verified hosts</div></div>
        </aside>
        <div>
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900">Spaces that fit your day</h2><p className="mt-1 text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? 'workspace' : 'workspaces'} available to book</p></div><label className="flex items-center gap-2 text-sm text-gray-500">Sort by <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-button border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 outline-none focus:border-brand"><option value="rating">Recommended</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select></label></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((w, i) => <Reveal key={w.id} delay={(i % 3) + 1}><WorkspaceCard workspace={w} onBook={onBook} onToggleFav={onToggleFav} isFav={favorites.includes(w.id)} onViewDetails={onViewDetails} /></Reveal>)}
          </div>
        </div>
      </div>
      {filtered.length === 0 && <div className="py-16 text-center text-gray-400">No workspaces found matching your criteria.</div>}
      </div>
    </section>
  );
};

// ==================== USER DASHBOARD ====================
const UserDashboard = ({ bookings, workspaces, onBook, onViewDetails }) => {
  const stats = [
    { label: "Total Bookings", value: bookings.length, icon: "calendar", color: "gray" },
    { label: "Active Now", value: bookings.filter(b => b.status === "confirmed").length, icon: "check", color: "green" },
    { label: "Pending", value: bookings.filter(b => b.status === "pending").length, icon: "clock", color: "amber" },
    { label: "Total Spent", value: "₦" + bookings.reduce((a, b) => a + b.total, 0).toLocaleString(), icon: "dollar", color: "amber" }
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900 mb-6">My Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <I n={s.icon} s={20} c={`text-${s.color}-500`} />
              <Badge color={s.color}>{s.label}</Badge>
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-gray-900">{s.value}</div>
          </Card>
        ))}
      </div>
      <h3 className="text-lg font-bold text-[#0f172a] mb-4">Recent Bookings</h3>
      <div className="space-y-3">
        {bookings.map(b => (
          <Card key={b.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="briefcase" s={20} c="text-gray-400" /></div>
                <div>
                  <div className="font-semibold text-gray-900">{b.workspaceName}</div>
                  <div className="text-sm text-gray-500">{b.quantity} {b.type} • {b.date}</div>
                </div>
              </div>
              <div className="text-left sm:text-right">
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

// ==================== WITHDRAWAL MODAL ====================
const WithdrawalModal = ({ open, onClose, balance, onWithdraw }) => {
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [step, setStep] = useState(1);
  const [withdrawals, setWithdrawals] = useState([
    { id: 1, amount: 45000, date: "2026-07-20", status: "completed", bank: "GTBank", account: "****1234" },
    { id: 2, amount: 28000, date: "2026-07-15", status: "completed", bank: "Access Bank", account: "****5678" },
    { id: 3, amount: 15000, date: "2026-07-10", status: "pending", bank: "First Bank", account: "****9012" }
  ]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount > 0 && numAmount <= balance) {
      onWithdraw(numAmount);
      setWithdrawals([{ id: Date.now(), amount: numAmount, date: new Date().toISOString().split('T')[0], status: "pending", bank: bankName, account: "****" + accountNumber.slice(-4) }, ...withdrawals]);
      setStep(3);
    }
  };

  const BANKS = ["Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank", "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Keystone Bank", "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank", "SunTrust Bank", "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)", "Unity Bank", "Wema Bank", "Zenith Bank"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-card shadow-2xl max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
            <I n="dollar" s={20} /> Withdraw Earnings
          </h3>
          <button onClick={() => { onClose(); setStep(1); setAmount(""); setBankName(""); setAccountNumber(""); setAccountName(""); }} className="text-gray-400 hover:text-gray-600"><I n="close" s={20} /></button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-emerald-50 rounded-xl p-5 text-center">
                <div className="text-sm text-emerald-600 mb-1">Available Balance</div>
                <div className="text-3xl font-bold text-emerald-700">₦{balance.toLocaleString()}</div>
                <div className="text-xs text-emerald-500 mt-1">Minimum withdrawal: ₦5,000</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Amount (₦)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-lg">₦</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className="px-4 py-2.5 pl-8 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none text-lg font-semibold"
                    placeholder="0"
                    min="5000"
                    max={balance}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[10000, 25000, 50000, 100000].map(amt => (
                    <button key={amt} onClick={() => setAmount(amt)} className="px-3 py-1 text-xs bg-gray-100 rounded-full hover:bg-gray-200">₦{amt.toLocaleString()}</button>
                  ))}
                </div>
              </div>

              <Btn v="primary" s="lg" full onClick={() => setStep(2)} disabled={!amount || Number(amount) < 5000 || Number(amount) > balance}>
                Continue <I n="arrowRight" s={16} />
              </Btn>

              {/* Withdrawal History */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-medium text-sm mb-3">Recent Withdrawals</h4>
                <div className="space-y-2">
                  {withdrawals.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">₦{w.amount.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{w.bank} • {w.account}</div>
                      </div>
                      <div className="text-right">
                        <Badge color={w.status === "completed" ? "green" : "amber"}>{w.status}</Badge>
                        <div className="text-xs text-gray-400">{w.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Amount</span><span className="font-medium">₦{Number(amount).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm mt-1"><span className="text-gray-600">Fee</span><span className="font-medium">₦{Math.round(Number(amount) * 0.015).toLocaleString()} (1.5%)</span></div>
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between"><span className="font-semibold">You'll receive</span><span className="font-bold">₦{Math.round(Number(amount) * 0.985).toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" required>
                  <option value="">Select your bank</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
                <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="10-digit account number" required maxLength={10} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="As it appears on your bank account" required />
              </div>

              <div className="flex gap-3 pt-2">
                <Btn v="ghost" onClick={() => setStep(1)}>Back</Btn>
                <Btn v="primary" full>Confirm Withdrawal</Btn>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <I n="check" s={32} c="text-emerald-500" />
              </div>
              <h4 className="text-xl font-bold text-[#0f172a] mb-2">Withdrawal Initiated!</h4>
              <p className="text-gray-500 text-sm mb-1">₦{Number(amount).toLocaleString()} will be sent to your account.</p>
              <p className="text-gray-400 text-xs">Processing time: 1-2 business days</p>
              <Btn v="primary" className="mt-6" onClick={() => { onClose(); setStep(1); setAmount(""); setBankName(""); setAccountNumber(""); setAccountName(""); }}>Done</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== OWNER DASHBOARD ====================
const OwnerDashboard = ({ ownerId, workspaces, bookings, stats, onAddWorkspace, onWithdraw }) => {
  const myWorkspaces = workspaces.filter(w => w.ownerId === ownerId);
  // bookings from /bookings are already owner-scoped by the JWT.
  const myBookings = bookings;
  // Money/occupancy come from the server (single source of truth).
  const revenue = stats?.revenue ?? 0;
  const withdrawn = stats?.withdrawn ?? 0;
  const balance = stats?.balance ?? 0;
  const occupancy = stats?.occupancy ?? "—";  // already includes % sign from server
  const summaryStats = [
    { label: "My Workspaces", value: myWorkspaces.length, icon: "building", color: "gray" },
    { label: "Total Bookings", value: myBookings.length, icon: "calendar", color: "green" },
    { label: "Revenue", value: "₦" + revenue.toLocaleString(), icon: "dollar", color: "amber" },
    { label: "Occupancy", value: occupancy, icon: "trendUp", color: "amber" }
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-gray-900">Owner Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <Btn v="accent" s="sm" className="rounded-md" onClick={onWithdraw}><I n="dollar" s={16}/> Withdraw</Btn>
          <Btn v="primary" s="sm" className="rounded-md" onClick={onAddWorkspace}><I n="plus" s={16} /> Add Workspace</Btn>
        </div>
      </div>

      {/* Earnings Summary */}
      <Card className="p-6 mb-8 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center md:text-left">
            <div className="text-sm text-emerald-600 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-emerald-800">₦{revenue.toLocaleString()}</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-sm text-emerald-600 mb-1">Withdrawn</div>
            <div className="text-3xl font-bold text-emerald-800">₦{withdrawn.toLocaleString()}</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-sm text-emerald-600 mb-1">Available Balance</div>
            <div className="text-3xl font-bold text-emerald-800">₦{balance.toLocaleString()}</div>
            <button onClick={onWithdraw} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium mt-1">Withdraw now →</button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryStats.map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <I n={s.icon} s={20} c={`text-${s.color}-500`} />
              <Badge color={s.color}>{s.label}</Badge>
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-gray-900">{s.value}</div>
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
const OwnerWorkspaces = ({ ownerId, workspaces, onAddWorkspace, onEditAvailability }) => {
  const myWorkspaces = workspaces.filter(w => w.ownerId === ownerId);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900">My Workspaces</h2>
        <Btn v="primary" s="sm" className="rounded-md" onClick={onAddWorkspace}><I n="plus" s={16} /> Add Workspace</Btn>
      </div>
      <div className="space-y-4">
        {myWorkspaces.map(w => (
          <Card key={w.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <img src={w.image} alt={w.name} className="h-40 rounded-control object-cover sm:h-24 sm:w-24 sm:flex-shrink-0" />
              <div className="flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{w.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{w.address}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn v="secondary" s="sm" onClick={() => onEditAvailability(w)}><I n="edit" s={14} /> Availability</Btn>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {BILLING_TYPES.map(t => {
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
const OwnerBookings = ({ bookings }) => {
  // /bookings is already scoped to the owner's workspaces by the JWT.
  const myBookings = bookings;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900 mb-6">All Bookings</h2>
      <div className="space-y-3">
        {myBookings.length > 0 ? myBookings.map(b => (
          <Card key={b.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="user" s={20} c="text-gray-400" /></div>
                <div>
                  <div className="font-semibold text-gray-900">{b.userName}</div>
                  <div className="text-sm text-gray-500">{b.workspaceName} • {b.quantity} {b.type} • {b.date}</div>
                </div>
              </div>
              <div className="text-left sm:text-right">
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
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900 mb-6">My Favorites</h2>
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
    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900 mb-6">My Bookings</h2>
    <div className="space-y-3">
      {bookings.map(b => (
        <Card key={b.id} className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="briefcase" s={20} c="text-gray-400" /></div>
              <div>
                <div className="font-semibold text-gray-900">{b.workspaceName}</div>
                <div className="text-sm text-gray-500">{b.quantity} {b.type} • {b.date}</div>
              </div>
            </div>
            <div className="text-left sm:text-right">
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
  <footer className="bg-[#0f172a] text-white py-16" style={{ flexShrink: 0 }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <img src="assets/workspot-logo.svg" alt="" className="h-8 w-8" />
            <span className="font-display text-xl font-bold tracking-tight">WorkSpot</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">Find and book the perfect workspace near you. Hourly, daily, weekly, or monthly.</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-[0.18em] text-brand-accent uppercase mb-4">For Users</h4>
          <ul className="space-y-2.5 text-sm text-gray-400">
            <li><a href="#" className="link-sweep hover:text-white">Find a Space</a></li>
            <li><a href="#" className="link-sweep hover:text-white">How it Works</a></li>
            <li><a href="#" className="link-sweep hover:text-white">Pricing</a></li>
            <li><a href="#" className="link-sweep hover:text-white">Support</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-[0.18em] text-brand-accent uppercase mb-4">For Owners</h4>
          <ul className="space-y-2.5 text-sm text-gray-400">
            <li><a href="#" className="link-sweep hover:text-white">List Your Space</a></li>
            <li><a href="#" className="link-sweep hover:text-white">Owner Dashboard</a></li>
            <li><a href="#" className="link-sweep hover:text-white">Pricing Guide</a></li>
            <li><a href="#" className="link-sweep hover:text-white">Resources</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-[0.18em] text-brand-accent uppercase mb-4">Company</h4>
          <ul className="space-y-2.5 text-sm text-gray-400">
            <li><a href="#" className="link-sweep hover:text-white">About Us</a></li>
            <li><a href="#" className="link-sweep hover:text-white">Careers</a></li>
            <li><a href="#" className="link-sweep hover:text-white">Blog</a></li>
            <li><a href="#" className="link-sweep hover:text-white">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
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
  const [workspaces, setWorkspaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [ownerStats, setOwnerStats] = useState(null);
  const [adminData, setAdminData] = useState({ stats: null, users: [] });
  const [loading, setLoading] = useState(true);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ---- data loaders ----
  const loadWorkspaces = async () => {
    try { setWorkspaces(await api.listWorkspaces()); }
    catch (e) { showToast(e.message); }
  };
  const refreshBookings = async () => {
    try { setBookings(await api.listBookings()); } catch (e) { /* not fatal */ }
  };
  const refreshOwnerStats = async () => {
    try { setOwnerStats(await api.ownerStats()); } catch (e) { /* not fatal */ }
  };

  // Load the data a given user is entitled to (bookings, favorites, dashboards).
  const loadUserData = async (u) => {
    try {
      const [bk, favs] = await Promise.all([api.listBookings(), api.listFavorites()]);
      setBookings(bk);
      setFavorites(favs);
    } catch (e) { /* not fatal */ }
    if (u.role === "owner") await refreshOwnerStats();
    if (u.role === "superadmin") {
      try {
        const [stats, adminUsers] = await Promise.all([api.adminStats(), api.adminUsers()]);
        setAdminData({ stats, users: adminUsers });
      } catch (e) { /* not fatal */ }
    }
  };

  // On mount: load public workspaces and restore a session if a token exists.
  useEffect(() => {
    (async () => {
      await loadWorkspaces();
      if (api.getToken()) {
        try {
          const u = await api.me();
          setUser(u);
          await loadUserData(u);
        } catch (e) {
          api.clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  // Called by AuthModal after a successful login/register (token already set).
  const handleLogin = async (u) => {
    setUser(u);
    showToast(`Welcome, ${u.name}!`);
    if (u.role === "superadmin") setView("superadmin-dashboard");
    else if (u.role === "owner") setView("owner-dashboard");
    else setView("discover");
    await loadUserData(u);
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setBookings([]);
    setFavorites([]);
    setOwnerStats(null);
    setAdminData({ stats: null, users: [] });
    setView("landing");
    showToast("Signed out successfully");
  };

  const handleBook = (ws) => {
    if (!user) { setAuthOpen(true); return; }
    setBookingWorkspace(ws);
    setBookingOpen(true);
  };

  const handleConfirmBook = async (b) => {
    try {
      await api.createBooking({ workspaceId: b.workspaceId, type: b.type, quantity: b.quantity, date: b.date });
      showToast(`Booked ${b.workspaceName} for ${b.quantity} ${b.type}!`);
      // Refetch so availability and booking lists reflect server truth.
      await Promise.all([loadWorkspaces(), refreshBookings()]);
      if (user?.role === "owner") await refreshOwnerStats();
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleToggleFav = async (id) => {
    if (!user) { setAuthOpen(true); return; }
    const isFav = favorites.includes(id);
    try {
      if (isFav) { await api.removeFavorite(id); setFavorites(favorites.filter(f => f !== id)); showToast("Removed from favorites"); }
      else { await api.addFavorite(id); setFavorites([...favorites, id]); showToast("Added to favorites"); }
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleAddWorkspace = async (ws) => {
    try {
      await api.createWorkspace(ws);
      showToast("Workspace added successfully!");
      await loadWorkspaces();
      if (user?.role === "owner") await refreshOwnerStats();
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleSaveAvailability = async (id, avail) => {
    try {
      await api.updateAvailability(id, avail);
      showToast("Availability updated!");
      await loadWorkspaces();
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleWithdraw = async (payload) => {
    try {
      const res = await api.createWithdrawal(payload);
      showToast(`Withdrawal of ₦${payload.amount.toLocaleString()} initiated!`);
      await refreshOwnerStats();
      return res;
    } catch (e) {
      showToast(e.message);
      throw e;
    }
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
      case "landing": return <><Hero onSearch={() => setView("listings")} /><ListingsView workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} /><HowItWorks /></>;
      case "listings": return <ListingsView workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} />;
      case "how-it-works": return <HowItWorks />;
      case "discover": return <><Hero onSearch={() => setView("listings")} /><ListingsView workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} /></>;
      case "my-bookings": return <MyBookingsView bookings={bookings} />;
      case "favorites": return <FavoritesView workspaces={workspaces} favorites={favorites} onBook={handleBook} onToggleFav={handleToggleFav} onViewDetails={handleViewDetails} />;
      case "owner-dashboard": return <OwnerDashboard ownerId={user?.id} workspaces={workspaces} bookings={bookings} stats={ownerStats} onAddWorkspace={() => setAddWorkspaceOpen(true)} onWithdraw={() => setWithdrawalOpen(true)} />;
      case "owner-workspaces": return <OwnerWorkspaces ownerId={user?.id} workspaces={workspaces} onAddWorkspace={() => setAddWorkspaceOpen(true)} onEditAvailability={(w) => { setEditAvailWorkspace(w); setEditAvailOpen(true); }} />;
      case "owner-bookings": return <OwnerBookings bookings={bookings} />;
      case "workspace-details": return <WorkspaceDetails workspace={selectedWorkspace} onBack={handleBackFromDetails} onBook={handleBook} onToggleFav={handleToggleFav} isFav={favorites.includes(selectedWorkspace?.id)} />;
      case "superadmin-dashboard": return <SuperAdminDashboard workspaces={workspaces} bookings={bookings} stats={adminData.stats} users={adminData.users} onBack={() => setView("landing")} />;
      default: return <Hero onSearch={() => setView("listings")} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-gray-900" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomCursor />
      <Navbar user={user} onLogin={() => setAuthOpen(true)} onLogout={handleLogout} view={view} setView={setView} />
      <main style={{ flex: "1 0 auto" }}>{renderView()}</main>
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={handleLogin} />
      <BookingModal workspace={bookingWorkspace} open={bookingOpen} onClose={() => setBookingOpen(false)} onBook={handleConfirmBook} />
      <AddWorkspaceModal open={addWorkspaceOpen} onClose={() => setAddWorkspaceOpen(false)} onAdd={handleAddWorkspace} />
      <EditAvailabilityModal workspace={editAvailWorkspace} open={editAvailOpen} onClose={() => setEditAvailOpen(false)} onSave={handleSaveAvailability} />
      <WithdrawalModal open={withdrawalOpen} onClose={() => setWithdrawalOpen(false)} balance={ownerStats?.balance || 0} onWithdraw={handleWithdraw} />
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand text-white px-6 py-3 rounded-card shadow-lift">
          {toast}
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
