const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ==================== MOTION PRIMITIVES ====================
// True when the user prefers reduced motion; motion features no-op when set.
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// True on touch / coarse-pointer devices (custom cursor is disabled there).
const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;

// ==================== LOCATION HELPERS ====================
// Lazily inject the Google Maps JS SDK (Places library) once, so ordinary
// visitors never pull the billed script — only owners opening the add/edit
// forms do. Resolves with window.google; rejects if the key is missing or the
// script fails, letting callers fall back to plain address text (the backend
// geocodes on submit). Uses the classic places.Autocomplete widget — still
// supported; migrate to PlaceAutocompleteElement later if needed.
let _googleMapsPromise = null;
const loadGoogleMaps = () => {
  if (typeof window !== "undefined" && window.google && window.google.maps && window.google.maps.places && window.google.maps.places.Autocomplete) {
    return Promise.resolve(window.google);
  }
  if (_googleMapsPromise) return _googleMapsPromise;
  const key = (typeof window !== "undefined" && window.GOOGLE_MAPS_API_KEY) || "";
  if (!key || key.indexOf("YOUR_") === 0) {
    return Promise.reject(new Error("Google Maps key not configured"));
  }
  _googleMapsPromise = new Promise((resolve, reject) => {
    // True once the Places library is actually usable (not just window.google).
    const placesReady = () =>
      window.google && window.google.maps && window.google.maps.places && window.google.maps.places.Autocomplete;
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
    s.async = true;
    s.onload = () => {
      // With loading=async the Places library is frequently NOT populated at
      // onload — resolving here would make `new google.maps.places.Autocomplete`
      // throw for whichever caller runs first. Wait for it: prefer the sanctioned
      // importLibrary path, then poll as a fallback, before resolving.
      const settle = () => {
        if (placesReady()) { resolve(window.google); return; }
        let tries = 0;
        const iv = setInterval(() => {
          if (placesReady()) { clearInterval(iv); resolve(window.google); }
          else if (++tries > 60) { clearInterval(iv); _googleMapsPromise = null; reject(new Error("Google Maps Places did not initialize")); }
        }, 100);
      };
      if (window.google && window.google.maps && typeof window.google.maps.importLibrary === "function") {
        window.google.maps.importLibrary("places").then(settle, settle);
      } else {
        settle();
      }
    };
    s.onerror = () => { _googleMapsPromise = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(s);
  });
  return _googleMapsPromise;
};

// Google Maps directions deep link from stored coordinates (no backend call).
const directionsUrl = (w, origin) => {
  if (!w || w.latitude == null || w.longitude == null) return null;
  let url = `https://www.google.com/maps/dir/?api=1&destination=${w.latitude},${w.longitude}`;
  if (origin && origin.lat != null && origin.lng != null) url += `&origin=${origin.lat},${origin.lng}`;
  return url;
};

// Attach Google Places Autocomplete to an <input> ref while `active` is true.
// Fires onPlace({ address, latitude, longitude }) when the owner picks a
// suggestion. If the Maps key is missing or the script fails, the input stays a
// plain text field and the backend geocodes the typed address on submit.
const useAddressAutocomplete = (inputRef, active, onPlace) => {
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;
  useEffect(() => {
    if (!active || !inputRef.current) return;
    let ac = null, listener = null, cancelled = false;
    const el = inputRef.current;
    loadGoogleMaps().then((google) => {
      if (cancelled || !inputRef.current) return;
      ac = new google.maps.places.Autocomplete(el, {
        fields: ["formatted_address", "geometry", "name"],
      });
      listener = ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place || !place.geometry || !place.geometry.location) return;
        onPlaceRef.current({
          address: place.formatted_address || el.value,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });
      });
    }).catch((err) => {
      // Plain text field + backend/submit-time geocoding still work; log so a
      // silent Maps/Places failure is diagnosable instead of invisible.
      console.warn("[WorkSpot] Address autocomplete unavailable:", err && err.message ? err.message : err);
    });
    return () => {
      cancelled = true;
      if (listener && listener.remove) listener.remove();
      if (ac && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(ac);
      }
      // Drop any leftover autocomplete dropdown so it can't linger after close.
      document.querySelectorAll(".pac-container").forEach(el => el.remove());
    };
  }, [active]);
};

// Geocode a typed address to coordinates via the Maps JS Geocoder. This backend
// does NO server-side geocoding (it 503s without lat/lng), so when the owner
// types an address instead of picking a suggestion, we resolve coords here.
// Resolves { address, latitude, longitude }; rejects if Maps is unavailable or
// the address can't be matched.
const geocodeAddress = (address) =>
  loadGoogleMaps().then((google) => new Promise((resolve, reject) => {
    new google.maps.Geocoder().geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0] && results[0].geometry) {
        const loc = results[0].geometry.location;
        resolve({ address: results[0].formatted_address || address, latitude: loc.lat(), longitude: loc.lng() });
      } else {
        reject(new Error("Could not locate that address (" + status + ")"));
      }
    });
  }));

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
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      // Stop the loop once the ring has effectively caught up to the pointer.
      // A permanently-running rAF repaints every frame and, combined with the
      // modal's backdrop-filter, causes sub-pixel jitter on some GPUs.
      if (Math.abs(mx - rx) < 0.1 && Math.abs(my - ry) < 0.1) {
        rx = mx; ry = my;
        ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
        raf = 0;
        return;
      }
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
    navigation: <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
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
  const [showPassword, setShowPassword] = useState(false);

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

  // Keep a ref to the latest handler so the button can render once (not per
  // mode/role change) while its callback still sees current mode/role.
  const googleHandlerRef = useRef(handleGoogleLogin);
  googleHandlerRef.current = handleGoogleLogin;

  // Render the Google button once per open, after the target div mounts.
  // Depends only on `open` — re-rendering on mode/role caused a visible flicker.
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
      if (!target || target.childElementCount > 0) return;
      try {
        google.accounts.id.initialize({ client_id: clientId, callback: (resp) => googleHandlerRef.current(resp) });
        google.accounts.id.renderButton(target, {
          theme: "outline", size: "large", text: "continue_with",
          shape: "rectangular", logo_alignment: "center", width: 320,
        });
      } catch (err) {
        console.error("Google Identity Services initialization failed:", err);
        setGoogleError("Google Sign-In is not available");
      }
    }, 0);
    return () => clearTimeout(id);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-card shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
          <button onClick={() => setMode("login")} className={`flex-1 py-4 text-sm font-semibold tracking-tight ${mode === "login" ? "text-brand border-b-2 border-brand" : "text-gray-400"}`}>Sign In</button>
          <button onClick={() => setMode("signup")} className={`flex-1 py-4 text-sm font-semibold tracking-tight ${mode === "signup" ? "text-brand border-b-2 border-brand" : "text-gray-400"}`}>Sign Up</button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="John Doe" required />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="you@example.com" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full pl-4 pr-11 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" 
                  placeholder="••••••••" 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs font-medium focus:outline-none"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

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

// ==================== OWNER SIGNUP PAGE ====================
// Dedicated full-page signup for workspace owners (hosts). Seekers still use
// the AuthModal; this page is reached from the "List your space" nav CTA.
const OwnerSignupView = ({ onLogin, onCancel, onSwitchToSignin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.register(email, password, name || email.split("@")[0], "owner");
      api.setToken(res.token);
      onLogin(res.user);
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
    setLoading(true);
    try {
      const res = await api.loginWithGoogle(credential, "owner");
      api.setToken(res.token);
      onLogin(res.user);
    } catch (err) {
      setGoogleError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const googleHandlerRef = useRef(handleGoogleLogin);
  googleHandlerRef.current = handleGoogleLogin;

  // Render the Google button once the target div mounts.
  useEffect(() => {
    const clientId = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
    if (typeof google === 'undefined' || !google.accounts) { setGoogleError("Google Sign-In is not available"); return; }
    const id = setTimeout(() => {
      const target = document.getElementById("owner-google-button");
      if (!target || target.childElementCount > 0) return;
      try {
        google.accounts.id.initialize({ client_id: clientId, callback: (resp) => googleHandlerRef.current(resp) });
        google.accounts.id.renderButton(target, {
          theme: "outline", size: "large", text: "continue_with",
          shape: "rectangular", logo_alignment: "center", width: 320,
        });
      } catch (err) {
        console.error("Google Identity Services initialization failed:", err);
        setGoogleError("Google Sign-In is not available");
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const benefits = [
    { icon: "building", title: "List in minutes", text: "Publish your space with photos, pricing and availability in one simple form." },
    { icon: "calendar", title: "Manage bookings", text: "Track reservations and slot availability from a dedicated owner dashboard." },
    { icon: "creditCard", title: "Get paid", text: "Receive payouts for every booking, with withdrawals on your schedule." },
  ];

  return (
    <div className="min-h-screen bg-brand-soft">
      <div className="max-w-6xl mx-auto px-4 py-12 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: pitch */}
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-4">For workspace owners</span>
          <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-[-0.03em] leading-[1.05] text-brand">
            List your space.<br />Earn on your terms.
          </h1>
          <p className="mt-5 text-gray-600 text-lg max-w-md">
            Join WorkSpot as a host and turn your desks, offices and meeting rooms into income.
          </p>
          <div className="mt-8 space-y-5">
            {benefits.map(b => (
              <div key={b.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-control bg-white flex items-center justify-center shadow-sm shrink-0 rounded-md"><I n={b.icon} s={20} c="text-brand-accent" /></div>
                <div>
                  <div className="font-semibold text-brand">{b.title}</div>
                  <div className="text-sm text-gray-500">{b.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: signup card */}
        <div className="bg-white rounded-card shadow-2xl w-full max-w-md justify-self-center lg:justify-self-end p-7">
          <h2 className="font-display text-2xl font-bold tracking-tight text-brand">Create your host account</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">Already have one? <button type="button" onClick={onSwitchToSignin} className="text-brand-accent font-medium hover:underline">Sign in</button></p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="John Doe" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="you@example.com" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="••••••••" required /></div>
            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            {googleError && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{googleError}</div>}
            <Btn v="primary" s="lg" full disabled={loading}>{loading ? "Processing..." : "Create Host Account"}</Btn>
          </form>
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs uppercase tracking-[0.18em] text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div id="owner-google-button" className="flex justify-center min-h-[44px]" />
          <div className="mt-4 text-center"><button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">Back to home</button></div>
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
  const emptyForm = { name: "", address: "", description: "", website: "", images: [], latitude: null, longitude: null, pricing: { hourly: "", daily: "", weekly: "", monthly: "" }, amenities: [], availability: { hourly: { total: "", booked: 0 }, daily: { total: "", booked: 0 }, weekly: { total: "", booked: 0 }, monthly: { total: "", booked: 0 } } };
  const [form, setForm] = useState(emptyForm);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState("");
  const [addError, setAddError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const addressRef = useRef(null);

  // "Use my current location" — coords come straight from the browser (no Google
  // key needed); we then best-effort reverse-geocode for a readable address.
  const useMyLocation = () => {
    if (!navigator.geolocation) { setAddError("Your browser doesn't support location."); return; }
    setLocating(true); setAddError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude, longitude = pos.coords.longitude;
        loadGoogleMaps().then((google) => new Promise((resolve) => {
          new google.maps.Geocoder().geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            resolve(status === "OK" && results && results[0] ? results[0].formatted_address : "");
          });
        })).catch(() => "").then((address) => {
          setForm(prev => ({ ...prev, latitude, longitude, address: address || prev.address || `Pinned location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})` }));
          setLocating(false);
        });
      },
      () => { setLocating(false); setAddError("Couldn't get your location. Allow location access or type the address."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reset form when modal opens (bug fix: stale form data between opens)
  useEffect(() => { if (open) { setForm(emptyForm); setDropdownOpen(false); setImageError(""); setAddError(""); setSubmitting(false); } }, [open]);

  // Places Autocomplete on the address field → capture lat/lng (Feature 2).
  useAddressAutocomplete(addressRef, open, ({ address, latitude, longitude }) =>
    setForm(prev => ({ ...prev, address, latitude, longitude }))
  );

  if (!open) return null;

  const MAX_IMAGES = 6;
  const MAX_FILE_MB = 3;

  // Read chosen files into base64 data URLs so they travel in the JSON body
  // (the API client is JSON-only) and render directly as <img src>.
  const handleImageFiles = (fileList) => {
    setImageError("");
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = MAX_IMAGES - form.images.length;
    if (room <= 0) { setImageError(`You can add up to ${MAX_IMAGES} images.`); return; }
    const accepted = [];
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/")) { setImageError("Only image files are allowed."); continue; }
      if (file.size > MAX_FILE_MB * 1024 * 1024) { setImageError(`Each image must be under ${MAX_FILE_MB}MB.`); continue; }
      accepted.push(file);
    }
    if (files.length > room) setImageError(`Only ${MAX_IMAGES} images allowed — extra files were skipped.`);
    accepted.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setForm(prev => (prev.images.length >= MAX_IMAGES ? prev : { ...prev, images: [...prev.images, reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

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
        <form onSubmit={async e => {
          e.preventDefault();
          if (submitting) return;
          setAddError("");
          setSubmitting(true);

          // This backend requires coordinates (no server-side geocoding). If the
          // owner typed an address without picking a suggestion, resolve coords
          // client-side now. Block submission if we still can't get them.
          let lat = form.latitude, lng = form.longitude, addr = form.address;
          if (lat == null || lng == null) {
            try {
              const g = await geocodeAddress(form.address);
              lat = g.latitude; lng = g.longitude; addr = g.address;
              setForm(prev => ({ ...prev, address: g.address, latitude: g.latitude, longitude: g.longitude }));
            } catch (geoErr) {
              setSubmitting(false);
              setAddError("We couldn't pin that address on the map. Pick one of the suggestions as you type, or use “Use my current location”.");
              return;
            }
          }

          // owner_id is derived server-side from the JWT; ratings/reviews are derived on read.
          const payload = {
            name: form.name,
            address: addr,
            description: form.description,
            amenities: form.amenities,
            images: form.images,
            // Cards / booking modal read the singular `image`; use the first upload.
            ...(form.images.length ? { image: form.images[0] } : {}),
            latitude: lat,
            longitude: lng,
            pricing: Object.fromEntries(BILLING_TYPES.map(t => [t, Number(form.pricing[t]) || 0])),
            availability: Object.fromEntries(BILLING_TYPES.map(t => [t, { total: Number(form.availability[t].total) || 0 }])),
          };
          try {
            const ok = await onAdd(payload);
            if (ok === false) { setSubmitting(false); setAddError("Couldn't locate that address. Refine it or pick a suggestion, then try again."); return; }
            onClose();
          } catch (err) {
            setSubmitting(false);
            setAddError(err && err.message ? err.message : "Something went wrong. Please try again.");
          }
        }} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Workspace Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="e.g. The Hive Coworking" required /></div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Address *</label>
                <button type="button" onClick={useMyLocation} disabled={locating} className="ws-hover text-xs font-medium text-brand hover:text-brand-hover inline-flex items-center gap-1 disabled:opacity-50">
                  <I n="navigation" s={12} /> {locating ? "Locating…" : "Use my current location"}
                </button>
              </div>
              <input ref={addressRef} value={form.address} onChange={e => setForm({...form, address: e.target.value, latitude: null, longitude: null})} autoComplete="off" name="ws-address" onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none w-full" placeholder="Start typing, then pick a suggestion" required />
              {form.latitude != null && form.longitude != null
                ? <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><I n="check" s={12} /> Location pinned</p>
                : <p className="text-xs text-gray-400 mt-1">Pick a suggestion to pin the exact spot — we'll confirm it on the map when you save.</p>}
            </div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none h-20 resize-none" placeholder="Describe your workspace..." /></div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Photos <span className="text-gray-400 font-normal">(up to {MAX_IMAGES}, first is the cover)</span></label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {form.images.map((src, idx) => (
                  <div key={idx} className="relative aspect-[4/3] rounded-control overflow-hidden border border-gray-200 group">
                    <img src={src} alt={`Workspace photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && <span className="absolute top-1 left-1 bg-brand text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">Cover</span>}
                    <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"><I n="close" s={12} /></button>
                  </div>
                ))}
                {form.images.length < MAX_IMAGES && (
                  <label className="aspect-[4/3] rounded-control border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 cursor-pointer hover:border-brand hover:text-brand transition-colors">
                    <I n="image" s={22} />
                    <span className="text-xs font-medium">Add photo</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => { handleImageFiles(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
              {imageError && <p className="text-xs text-red-600 mt-2">{imageError}</p>}
            </div>
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
          {addError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{addError}</p>}
          <div className="pt-4 border-t border-gray-100 flex gap-3">
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
            <Btn v="primary" className="rounded-md" full disabled={submitting}>{submitting ? "Adding..." : "Add Workspace"}</Btn>
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

// ==================== EDIT LOCATION MODAL ====================
const EditLocationModal = ({ workspace, open, onClose, onSave }) => {
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const addressRef = useRef(null);

  useEffect(() => {
    if (open && workspace) {
      setAddress(workspace.address || "");
      setCoords({ latitude: workspace.latitude ?? null, longitude: workspace.longitude ?? null });
      setError("");
      setSaving(false);
    }
  }, [open, workspace]);

  // Autocomplete pins new coordinates when the owner picks a suggestion.
  useAddressAutocomplete(addressRef, open, ({ address: a, latitude, longitude }) => {
    setAddress(a);
    setCoords({ latitude, longitude });
  });

  if (!open || !workspace) return null;

  const handleSave = async () => {
    if (saving) return;
    setError("");
    setSaving(true);
    // This backend requires coordinates (no server-side geocoding). If the owner
    // typed an address without picking a suggestion, resolve coords client-side
    // now and block if we still can't.
    let lat = coords.latitude, lng = coords.longitude, addr = address;
    if (lat == null || lng == null) {
      try {
        const g = await geocodeAddress(address);
        lat = g.latitude; lng = g.longitude; addr = g.address;
        setAddress(g.address);
        setCoords({ latitude: g.latitude, longitude: g.longitude });
      } catch (geoErr) {
        setSaving(false);
        setError("We couldn't pin that address on the map. Pick one of the suggestions as you type.");
        return;
      }
    }
    const body = { address: addr, latitude: lat, longitude: lng };
    try {
      const ok = await onSave(workspace.id, body);
      if (ok === false) { setSaving(false); setError("Couldn't locate that address. Refine it or pick a suggestion, then try again."); return; }
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err && err.message ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-card shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold tracking-tight">Update Location</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><I n="close" s={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{workspace.name}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input ref={addressRef} value={address} onChange={e => { setAddress(e.target.value); setCoords({ latitude: null, longitude: null }); }} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#0f172a] outline-none" placeholder="Start typing, then pick a suggestion" />
        {coords.latitude != null && coords.longitude != null
          ? <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><I n="check" s={12} /> Location pinned from map</p>
          : <p className="text-xs text-gray-400 mt-1">Pick a suggestion to pin the exact spot, or we'll locate the typed address.</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4">{error}</p>}
        <div className="mt-6 flex gap-3">
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn v="primary" full disabled={saving || !address.trim()} onClick={handleSave}>{saving ? "Saving..." : "Save Location"}</Btn>
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

              {directionsUrl(workspace) && (
                <button onClick={() => window.open(directionsUrl(workspace), '_blank', 'noopener')} className="ws-hover mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-brand hover:text-brand">
                  <I n="navigation" s={16} /> Directions
                </button>
              )}

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
                <button onClick={() => setView("owner-signup")} className="hidden sm:inline-block link-sweep text-sm font-medium tracking-tight text-gray-500 hover:text-gray-900 mr-1">List your space</button>
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
              <button onClick={() => { setView("owner-signup"); setMobileOpen(false); }} className="block text-left px-3 py-2 text-sm font-medium rounded-lg text-brand-accent hover:bg-gray-50">List your space</button>
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
const WorkspaceCard = ({ workspace, onBook, onToggleFav, isFav, onViewDetails, origin }) => {
  const dirUrl = directionsUrl(workspace, origin);
  return (
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
      {workspace.distance != null && <p className="text-xs font-semibold text-brand-accent mt-1">{workspace.distance.toFixed(1)} km away</p>}
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
        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <div className="text-xs text-gray-400">Daily</div>
            <div className="text-sm font-semibold">₦{workspace.pricing.daily.toLocaleString()}</div>
          </div>
          {/* {dirUrl && <button onClick={e => { e.stopPropagation(); window.open(dirUrl, '_blank', 'noopener'); }} title="Directions" className="ws-hover flex h-9 items-center justify-center rounded-md border border-gray-200 px-2.5 text-gray-600 transition-all hover:border-brand hover:text-brand"><I n="navigation" s={16} /></button>} */}
          <Btn v="primary" s="sm" className="rounded-md" onClick={e => { e.stopPropagation(); onBook(workspace); }}>Book Now</Btn>
        </div>
      </div>
    </div>
  </Card>
  );
};

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

// ==================== NEWSLETTER ====================
const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(""); // "", "success", "error"
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    // Placeholder — wire to your backend newsletter endpoint when ready
    setTimeout(() => {
      setStatus("success");
      setMessage("You're subscribed! Check your inbox for the best workspaces.");
      setEmail("");
      setTimeout(() => { setStatus(""); setMessage(""); }, 4000);
    }, 800);
  };

  return (
    <section className="py-20 sm:py-28 bg-brand-soft">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-brand-accent uppercase">Stay Updated</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.035em] text-gray-900">Get the best workspaces</h2>
          <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto">Join thousands of professionals. Get curated workspace picks, exclusive deals, and productivity tips delivered weekly.</p>
        </Reveal>
        <Reveal delay={1} className="mt-10">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={status === "loading"}
              className="flex-1 px-5 py-3.5 rounded-control rounded-md border border-gray-200 focus:border-brand outline-none text-gray-900 placeholder-gray-400 disabled:opacity-50"
            />
            <Btn v="primary" s="lg" className="rounded-control rounded-md" disabled={status === "loading"}>
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </Btn>
          </form>
          {status === "success" && (
            <div className="mt-4 text-sm font-medium text-emerald-600 text-center">{message}</div>
          )}
          {status === "error" && (
            <div className="mt-4 text-sm font-medium text-red-600 text-center">{message}</div>
          )}
          <p className="text-xs text-gray-400 text-center mt-4">We respect your privacy. Unsubscribe anytime.</p>
        </Reveal>
      </div>
    </section>
  );
};

// ==================== LISTINGS VIEW ====================
const ListingsView = ({ workspaces, onBook, onToggleFav, favorites, onViewDetails }) => {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("rating");
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState(25); // km
  const [nearby, setNearby] = useState(null); // { results, coords: {lat,lng} } | null
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState("");

  const findNearby = () => {
    if (!navigator.geolocation) { setGeoNotice("Location isn't supported on this device."); return; }
    setGeoLoading(true);
    setGeoNotice("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          const results = await api.listWorkspaces({ lat: coords.lat, lng: coords.lng, radius: radius * 1000 });
          const list = Array.isArray(results) ? results : (results.workspaces || []);
          if (list.length === 0) {
            // Nothing in range — keep the full list visible rather than an empty grid.
            setNearby(null);
            setGeoNotice(`No spaces within ${radius} km of you yet. Showing all spaces — try a wider radius.`);
          } else {
            setNearby({ results: list, coords });
            setGeoNotice("");
            setSort("distance");
          }
        } catch (e) {
          setGeoNotice("Couldn't load nearby spaces. Showing all instead.");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setGeoNotice("Enable location to sort by distance.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const clearNearby = () => { setNearby(null); if (sort === "distance") setSort("rating"); };

  const filtered = useMemo(() => {
    let w = [...(nearby ? nearby.results : workspaces)];
    if (search) w = w.filter(x => x.name.toLowerCase().includes(search.toLowerCase()) || x.address.toLowerCase().includes(search.toLowerCase()));
    if (filter !== "all") w = w.filter(x => x.amenities.includes(filter));
    if (sort === "distance") w.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    if (sort === "rating") w.sort((a, b) => b.rating - a.rating);
    if (sort === "price-low") w.sort((a, b) => a.pricing.daily - b.pricing.daily);
    if (sort === "price-high") w.sort((a, b) => b.pricing.daily - a.pricing.daily);
    return w;
  }, [workspaces, nearby, filter, sort, search]);
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
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900">Spaces that fit your day</h2><p className="mt-1 text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? 'workspace' : 'workspaces'} available to book</p></div><div className="flex flex-wrap items-center gap-3"><button onClick={findNearby} disabled={geoLoading} className="ws-hover flex items-center gap-2 rounded-button border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-brand disabled:opacity-50"><I n="mapPin" s={16} />{geoLoading ? 'Locating...' : 'Near me'}</button>{!nearby && <label className="flex items-center gap-2 text-xs text-gray-500">within <select value={radius} onChange={e => setRadius(Number(e.target.value))} className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-brand"><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="100">100 km</option><option value="250">250 km</option></select></label>}<label className="flex items-center gap-2 text-sm text-gray-500">Sort by <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-button border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 outline-none focus:border-brand"><option value="rating">Recommended</option>{nearby && <option value="distance">Nearest First</option>}<option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select></label></div></div>
          {geoNotice && <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">{geoNotice}</div>}
          {nearby && <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3"><span className="text-sm font-medium text-emerald-800">Showing {filtered.length} {filtered.length === 1 ? 'space' : 'spaces'} near you</span><button onClick={clearNearby} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Clear</button></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((w, i) => <Reveal key={w.id} delay={(i % 3) + 1}><WorkspaceCard workspace={w} onBook={onBook} onToggleFav={onToggleFav} isFav={favorites.includes(w.id)} onViewDetails={onViewDetails} origin={nearby?.coords} /></Reveal>)}
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
const OwnerWorkspaces = ({ ownerId, workspaces, onAddWorkspace, onEditAvailability, onEditLocation }) => {
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
                    <Btn v="secondary" s="sm" onClick={() => onEditLocation(w)}><I n="mapPin" s={14} /> Location</Btn>
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
const OwnerBookings = ({ bookings, onViewBooking }) => {
  // /bookings is already scoped to the owner's workspaces by the JWT.
  const myBookings = bookings;
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scanOpen && inputRef.current) inputRef.current.focus();
  }, [scanOpen]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanCode.trim()) return;
    setScanning(true);
    setScanError("");
    setScanResult(null);
    try {
      const res = await api.validateBookingCode(scanCode.trim());
      setScanResult(res);
      setScanCode("");
    } catch (err) {
      setScanError(err.message || "Could not validate code.");
    } finally {
      setScanning(false);
    }
  };

  const statusColors = { valid: "green", pending: "amber", expired: "red" };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900">All Bookings</h2>
        <Btn v="secondary" s="sm" onClick={() => setScanOpen(!scanOpen)}><I n="search" s={16} />{scanOpen ? "Close Scanner" : "Scan Booking"}</Btn>
      </div>

      {scanOpen && (
        <div className="p-5 mb-6 rounded-card border border-gray-200/80" style={{ backgroundColor: "#F1F1EF" }}>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-gray-700 mb-4">Validate Booking Code</h3>
          <form onSubmit={handleScan} className="flex gap-3 mb-4">
            <input
              ref={inputRef}
              type="text"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              placeholder="Enter or scan booking code"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-control focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand"
              disabled={scanning}
            />
            <Btn v="primary" s="md" disabled={scanning || !scanCode.trim()}>{scanning ? "Checking..." : "Validate"}</Btn>
          </form>

          {scanError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <I n="flag" s={18} c="text-red-500" /><span>{scanError}</span>
            </div>
          )}

          {scanResult && (
            <div className={`p-4 rounded-lg border ${scanResult.status === "valid" ? "bg-emerald-50 border-emerald-200" : scanResult.status === "pending" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center justify-between mb-3">
                <Badge color={statusColors[scanResult.status] || "gray"}>{cap(scanResult.status)}</Badge>
                <button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-gray-600"><I n="close" s={16} /></button>
              </div>
              {scanResult.booking && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Workspace</span><span className="font-semibold text-gray-900">{scanResult.booking.workspaceName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Guest</span><span className="font-semibold text-gray-900">{scanResult.booking.userName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Date</span><span className="font-semibold text-gray-900">{scanResult.booking.date}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Type</span><span className="font-semibold text-gray-900">{scanResult.booking.quantity} {scanResult.booking.type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-semibold text-gray-900">₦{scanResult.booking.total.toLocaleString()}</span></div>
                  <div className="pt-3 border-t border-gray-200">
                    <Btn v="ghost" s="sm" full onClick={() => { onViewBooking && onViewBooking(scanResult.booking, scanResult.status); setScanResult(null); setScanOpen(false); }}>View Full Details</Btn>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {myBookings.length > 0 ? myBookings.map(b => (
          <Card key={b.id} className="p-4" hover onClick={() => onViewBooking && onViewBooking(b)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="user" s={20} c="text-gray-400" /></div>
                <div>
                  <div className="font-semibold text-gray-900">{b.userName}</div>
                  <div className="text-sm text-gray-500">{b.workspaceName} • {b.quantity} {b.type} • {b.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="text-left sm:text-right">
                  <div className="font-bold text-[#0f172a]">₦{b.total.toLocaleString()}</div>
                  <Badge color={b.status === "confirmed" ? "green" : "amber"}>{b.status}</Badge>
                </div>
                <I n="chevronRight" s={18} c="text-gray-300" />
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
const MyBookingsView = ({ bookings, onViewBooking }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900 mb-6">My Bookings</h2>
    <div className="space-y-3">
      {bookings.map(b => (
        <Card key={b.id} className="p-4" hover onClick={() => onViewBooking && onViewBooking(b)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><I n="briefcase" s={20} c="text-gray-400" /></div>
              <div>
                <div className="font-semibold text-gray-900">{b.workspaceName}</div>
                <div className="text-sm text-gray-500">{b.quantity} {b.type} • {b.date}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="text-left sm:text-right">
                <div className="font-bold text-[#0f172a]">₦{b.total.toLocaleString()}</div>
                <Badge color={b.status === "confirmed" ? "green" : "amber"}>{b.status}</Badge>
              </div>
              <I n="chevronRight" s={18} c="text-gray-300" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// ==================== BOOKING DETAILS PAGE ====================
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const naira = (n) => "₦" + Number(n || 0).toLocaleString();

const DetailRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-brand-soft" style={{ backgroundColor: "#F1F1EF" }}><I n={icon} s={16} c="text-brand" /></div>
    <div className="min-w-0">
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-900 break-words">{value}</div>
    </div>
  </div>
);

const BookingDetailsView = ({ bookingId, initialBooking, onBack, validation }) => {
  const [booking, setBooking] = useState(initialBooking || null);
  const [loading, setLoading] = useState(!initialBooking);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!bookingId) return;
    setLoading(true);
    api.getBooking(bookingId)
      .then(b => { if (!cancelled) { setBooking(b); setError(""); } })
      .catch(e => { if (!cancelled) setError(e.message || "Could not load this booking."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookingId]);

  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const statusMap = {
    confirmed: { color: "green", label: "Confirmed", note: "Your space is reserved." },
    pending: { color: "amber", label: "Pending", note: "Awaiting confirmation." },
    cancelled: { color: "red", label: "Cancelled", note: "This booking was cancelled." },
    completed: { color: "blue", label: "Completed", note: "This booking is complete." },
  };
  const st = booking ? (statusMap[booking.status] || { color: "gray", label: cap(booking.status || "Unknown"), note: "" }) : null;

  // Optional entry-eligibility status, passed in when arriving from the owner's
  // booking-code scanner. Distinct from booking.status (the lifecycle state).
  const validationMap = {
    valid: { icon: "check", title: "Valid for entry", note: "This code checks in successfully.", cls: "bg-emerald-50 border-emerald-200", iconC: "text-emerald-600", titleC: "text-emerald-800" },
    pending: { icon: "clock", title: "Not active yet", note: "This booking isn't valid for entry yet.", cls: "bg-amber-50 border-amber-200", iconC: "text-amber-600", titleC: "text-amber-800" },
    expired: { icon: "flag", title: "Expired — not valid for entry", note: "This booking's window has passed.", cls: "bg-red-50 border-red-200", iconC: "text-red-600", titleC: "text-red-800" },
  };
  const vd = validation ? (validationMap[validation] || { icon: "flag", title: cap(validation), note: "", cls: "bg-gray-50 border-gray-200", iconC: "text-gray-500", titleC: "text-gray-800" }) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={onBack} className="ws-hover inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand mb-6">
          <I n="arrowLeft" s={16} /> Back to bookings
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4"></div>
            <p className="text-sm">Loading booking…</p>
          </div>
        )}

        {!loading && error && (
          <Card className="p-8 text-center">
            <I n="flag" s={40} c="text-red-400 mb-3" />
            <h3 className="font-display text-lg font-bold text-gray-900 mb-1">Couldn't load booking</h3>
            <p className="text-sm text-gray-500 mb-5">{error}</p>
            <Btn v="secondary" s="sm" onClick={onBack}>Go back</Btn>
          </Card>
        )}

        {!loading && !error && booking && (
          <>
            {vd && (
              <Reveal className="mb-6">
                <div className={`rounded-card border p-4 flex items-start gap-3 ${vd.cls}`}>
                  <I n={vd.icon} s={22} c={vd.iconC} />
                  <div>
                    <div className={`font-semibold ${vd.titleC}`}>{vd.title}</div>
                    {vd.note && <div className="text-sm text-gray-600">{vd.note}</div>}
                    <div className="text-xs text-gray-400 mt-1">Entry check at scan time</div>
                  </div>
                </div>
              </Reveal>
            )}
            <Reveal className="mb-6">
              <Card className="overflow-hidden">
                <div className="px-6 py-7 text-white bg-brand" style={{ backgroundColor: "#171717" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/60 mb-2">Booking</p>
                      <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.03em]">{booking.workspaceName}</h1>
                      {booking.code && <p className="mt-3 font-mono text-base text-white/80 tracking-wide">{booking.code}</p>}
                    </div>
                    <Badge color={st.color}>{st.label}</Badge>
                  </div>
                  {st.note && (
                    <div className="mt-5 flex items-center gap-2 text-sm text-white/70">
                      <I n="check" s={16} c="text-emerald-400" /><span>{st.note}</span>
                    </div>
                  )}
                </div>
              </Card>
            </Reveal>

            <Reveal delay={1} className="mb-6">
              <Card className="p-6">
                <h2 className="font-display text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <DetailRow icon="calendar" label="Date" value={fmtDate(booking.date)} />
                  <DetailRow icon="clock" label="Booking type" value={cap(booking.type)} />
                  <DetailRow icon="briefcase" label="Quantity" value={`${booking.quantity} ${booking.type}${booking.quantity > 1 ? "s" : ""}`} />
                  <DetailRow icon="user" label="Booked by" value={booking.userName} />
                </div>
              </Card>
            </Reveal>

            <Reveal delay={2}>
              <Card className="p-6">
                <h2 className="font-display text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Payment</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{naira(booking.subtotal)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Service fee</span><span>{naira(booking.fee)}</span></div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total paid</span>
                    <span className="font-display text-xl font-bold text-gray-900">{naira(booking.total)}</span>
                  </div>
                </div>
              </Card>
            </Reveal>
          </>
        )}
      </div>
    </div>
  );
};

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
  const [editLocationWorkspace, setEditLocationWorkspace] = useState(null);
  const [editLocationOpen, setEditLocationOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingReturnView, setBookingReturnView] = useState("my-bookings");
  const [bookingValidation, setBookingValidation] = useState(null);
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
      return true;
    } catch (e) {
      showToast(e.message);
      return false;
    }
  };

  const handleUpdateLocation = async (id, body) => {
    try {
      await api.updateWorkspaceLocation(id, body);
      showToast("Location updated!");
      await loadWorkspaces();
      return true;
    } catch (e) {
      showToast(e.message);
      return false;
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

  const handleViewBooking = (booking, validation = null) => {
    setSelectedBooking(booking);
    setBookingValidation(validation);
    setBookingReturnView(view);
    setView("booking-details");
  };

  const handleBackFromBooking = () => {
    setSelectedBooking(null);
    setBookingValidation(null);
    setView(bookingReturnView || "my-bookings");
  };

  const renderView = () => {
    switch (view) {
      case "landing": return <><Hero onSearch={() => setView("listings")} /><ListingsView workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} /><HowItWorks /><Newsletter /></>;
      case "listings": return <ListingsView workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} />;
      case "how-it-works": return <HowItWorks />;
      case "owner-signup": return <OwnerSignupView onLogin={handleLogin} onCancel={() => setView("landing")} onSwitchToSignin={() => { setView("landing"); setAuthOpen(true); }} />;
      case "discover": return <><Hero onSearch={() => setView("listings")} /><ListingsView workspaces={workspaces} onBook={handleBook} onToggleFav={handleToggleFav} favorites={favorites} onViewDetails={handleViewDetails} /></>;
      case "my-bookings": return <MyBookingsView bookings={bookings} onViewBooking={handleViewBooking} />;
      case "favorites": return <FavoritesView workspaces={workspaces} favorites={favorites} onBook={handleBook} onToggleFav={handleToggleFav} onViewDetails={handleViewDetails} />;
      case "owner-dashboard": return <OwnerDashboard ownerId={user?.id} workspaces={workspaces} bookings={bookings} stats={ownerStats} onAddWorkspace={() => setAddWorkspaceOpen(true)} onWithdraw={() => setWithdrawalOpen(true)} />;
      case "owner-workspaces": return <OwnerWorkspaces ownerId={user?.id} workspaces={workspaces} onAddWorkspace={() => setAddWorkspaceOpen(true)} onEditAvailability={(w) => { setEditAvailWorkspace(w); setEditAvailOpen(true); }} onEditLocation={(w) => { setEditLocationWorkspace(w); setEditLocationOpen(true); }} />;
      case "owner-bookings": return <OwnerBookings bookings={bookings} onViewBooking={handleViewBooking} />;
      case "workspace-details": return <WorkspaceDetails workspace={selectedWorkspace} onBack={handleBackFromDetails} onBook={handleBook} onToggleFav={handleToggleFav} isFav={favorites.includes(selectedWorkspace?.id)} />;
      case "booking-details": return <BookingDetailsView bookingId={selectedBooking?.id} initialBooking={selectedBooking} validation={bookingValidation} onBack={handleBackFromBooking} />;
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
      <EditLocationModal workspace={editLocationWorkspace} open={editLocationOpen} onClose={() => setEditLocationOpen(false)} onSave={handleUpdateLocation} />
      <WithdrawalModal open={withdrawalOpen} onClose={() => setWithdrawalOpen(false)} balance={ownerStats?.balance || 0} onWithdraw={handleWithdraw} />
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand text-white px-6 py-3 rounded-card rounded-md shadow-lift">
          {toast}
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
