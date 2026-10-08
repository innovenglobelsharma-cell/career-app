import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ErrorBoundary } from "@/components/error-boundary";
import { apiRequest, apiRequestBlob, isUuid, openPlatformSocket } from "@/lib/platform-api";
import { decryptMessage, enableSecureMessaging, encryptMessage } from "@/lib/message-crypto";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link,
  Route,
  Switch,
  Router as WouterRouter,
  useLocation,
} from "wouter";
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  FileText,
  Filter,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Link2,
  ListChecks,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
  Zap,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { IconType } from "react-icons";
import {
  FaAddressBook,
  FaBell,
  FaBookOpen,
  FaBookmark,
  FaBriefcase,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaClipboardList,
  FaCog,
  FaCreditCard,
  FaCrown,
  FaEnvelope,
  FaExclamationTriangle,
  FaFlag,
  FaHeadset,
  FaHistory,
  FaListAlt,
  FaSearch,
  FaTachometerAlt,
  FaUserCircle,
  FaUserCog,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";

const queryClient = new QueryClient();

type Job = {
  id: string;
  company: string;
  role: string;
  location: string;
  mode: string;
  level: string;
  salary: string;
  fit: number;
  posted: string;
  description: string;
  logo: string;
  logoTone: string;
  tags: string[];
};
type Application = {
  id: string;
  role: string;
  company: string;
  stage: string;
  date: string;
  location: string;
  next?: string;
  logo: string;
};
type JobSeekerProfile = {
  headline?: string;
  location?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  contactVisibility?: "private" | "recruiters";
  strengths?: string[];
  educations?: Array<{ degree: string; school: string; period: string }>;
  experiences?: Array<{ role: string; company: string; period: string }>;
  certificates?: Array<{ name: string; issuer: string; year: string }>;
  resumeName?: string;
};
type MarketplacePosting = {
  id: string;
  title: string;
  category: string;
  company: string;
  location: string;
  mode: string;
  type: string;
  skills: string[];
  description: string;
  status: "Pending approval" | "Approved" | "Rejected";
  placement: "featured" | "normal";
  createdAt: string;
  updatedAt?: string;
};
type VerificationDocument = {
  id: string;
  documentType: "gst" | "pan" | "msme" | "other";
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: "pending" | "verified" | "rejected";
  reviewerNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};
const businessVerificationOptions: Array<{ value: VerificationDocument["documentType"]; label: string }> = [
  { value: "gst", label: "GST certificate" },
  { value: "pan", label: "PAN card" },
  { value: "msme", label: "MSME / Udyam certificate" },
  { value: "other", label: "Other supporting document" },
];
const isBusinessVerificationType = (value: string): value is VerificationDocument["documentType"] =>
  businessVerificationOptions.some((option) => option.value === value);
const companyIndustrySuggestions = [
  "Accounting", "Aerospace", "Aerospace & Defense", "Agriculture", "AgriTech",
  "AI & Machine Learning", "Airlines & Aviation", "Animation", "Apparel & Fashion",
  "Architecture & Planning", "Arts & Crafts", "Automotive", "Automotive Technology",
  "Banking", "Beauty & Cosmetics", "Biotechnology", "Broadcast Media",
  "Building Materials", "Business Consulting", "Business Process Outsourcing",
  "Capital Markets", "Chemicals", "Childcare", "Clean Energy", "Cloud Computing",
  "Commercial Real Estate", "Communications", "Computer & Network Security",
  "Computer Games", "Computer Hardware", "Computer Software", "Construction",
  "Consumer Electronics", "Consumer Goods", "Consumer Services", "Cybersecurity",
  "Data Analytics", "Data Centers", "Defense & Space", "Design", "E-commerce",
  "EdTech", "Education", "Electrical & Electronic Manufacturing", "Energy",
  "Energy & Utilities", "Engineering", "Environmental Services", "Events Services",
  "Facilities Services", "Fashion Technology", "Film & Television", "Finance",
  "Financial Technology (FinTech)", "Fine Art", "Food & Beverage", "Food Production",
  "Freight & Package Transportation", "Gaming & Esports", "Government Administration",
  "Government Relations", "Hardware", "Health, Wellness & Fitness", "Healthcare",
  "Higher Education", "Hospitality", "Human Resources", "Import & Export",
  "Industrial Automation", "Industrial Machinery", "Information Services",
  "Information Technology", "Information Technology & Services", "Insurance",
  "Internet & Web Services", "Investment Management", "IT Services",
  "Jewelry & Luxury Goods", "Law Enforcement", "Legal Services", "Leisure & Travel",
  "Libraries", "Logistics", "Logistics & Supply Chain", "Management Consulting",
  "Manufacturing", "Marine & Shipping", "Market Research", "Marketing",
  "Marketing & Advertising", "Media & Entertainment", "Medical Devices",
  "Medical Practice", "Mental Health Care", "Mining & Metals", "Mobile Applications",
  "Motion Pictures", "Museums & Institutions", "Music", "Nanotechnology",
  "Non-profit & NGOs", "Oil & Gas", "Online Media", "Outsourcing & Offshoring",
  "Packaging & Containers", "Paper & Forest Products", "Payments",
  "Pharmaceuticals", "Photography", "Plastics", "Political Organization",
  "Primary & Secondary Education", "Professional Training & Coaching",
  "Public Policy", "Public Relations", "Public Safety", "Publishing",
  "Railroad Manufacturing", "Real Estate", "Renewable Energy", "Research",
  "Restaurants", "Retail", "Robotics", "Security & Investigations",
  "Semiconductors", "Shipbuilding", "Smart Home & IoT", "Social Care",
  "Social Media", "Staffing & Recruiting", "Sports", "Technology",
  "Telecommunications", "Textiles", "Think Tanks", "Tobacco", "Translation",
  "Transportation", "Travel & Tourism", "Utilities", "Venture Capital",
  "Veterinary", "Warehousing", "Waste Management", "Wholesale", "Wine & Spirits",
  "Wireless", "Writing & Editing",
];
function CompanySuggestionInput({
  value,
  suggestions,
  onChange,
  readOnly,
  className,
  placeholder,
  label,
}: {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  readOnly: boolean;
  className: string;
  placeholder: string;
  label: string;
}) {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const matches = suggestions
    .filter((suggestion) => suggestion.toLowerCase().includes(value.trim().toLowerCase()))

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const choose = (suggestion: string) => {
    onChange(suggestion);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative mt-2">
      <input
        id={inputId}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => { if (!readOnly) setOpen(true); }}
        onKeyDown={(event) => {
          if (readOnly || !open || matches.length === 0) {
            if (event.key === "Escape") setOpen(false);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            choose(matches[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        readOnly={readOnly}
        placeholder={placeholder}
        className={className}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={`${inputId}-suggestions`}
        aria-activedescendant={activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
      />
      {!readOnly && open && matches.length > 0 && (
        <ul
          id={`${inputId}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#dbe4f2] bg-white p-1.5 text-[#172554] shadow-[0_16px_40px_rgba(15,42,92,0.18)] ring-1 ring-[#0b1f44]/[0.04]"
        >
          {matches.map((suggestion, index) => (
            <li
              id={`${inputId}-option-${index}`}
              key={suggestion}
              role="option"
              aria-selected={activeIndex === index}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(suggestion)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeIndex === index
                    ? "bg-[#eff6ff] text-[#1d4ed8]"
                    : "text-[#334155] hover:bg-[#f8fbff] hover:text-[#1d4ed8]"
                }`}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const jobCategorySuggestions = [
  "Accounting & Finance",
  "Administration & Office Support",
  "Advertising, Arts & Media",
  "Aerospace & Aviation",
  "Agriculture, Forestry & Fishing",
  "Architecture & Planning",
  "Banking & Financial Services",
  "Biotechnology & Life Sciences",
  "Business Analysis & Strategy",
  "Construction & Infrastructure",
  "Consulting & Professional Services",
  "Customer Service & Support",
  "Data Science & Analytics",
  "Design, UX & Creative",
  "Education & Training",
  "Engineering",
  "Environmental & Sustainability",
  "Executive & Leadership",
  "Healthcare & Medical",
  "Hospitality, Travel & Tourism",
  "Human Resources & Recruitment",
  "Information Technology",
  "Insurance & Risk",
  "Legal & Compliance",
  "Manufacturing & Production",
  "Marketing, Communications & PR",
  "Media & Publishing",
  "Non-profit & Social Services",
  "Product Management",
  "Project & Program Management",
  "Real Estate & Property",
  "Research & Development",
  "Retail & Consumer Products",
  "Sales & Business Development",
  "Science & Laboratory",
  "Security & Public Safety",
  "Supply Chain, Logistics & Procurement",
  "Telecommunications",
  "Trades & Services",
  "Transportation & Delivery",
  "Other",
];

type SuggestionPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

function useSuggestionPosition(
  inputRef: React.RefObject<HTMLInputElement | null>,
  open: boolean,
): SuggestionPosition | null {
  const [position, setPosition] = useState<SuggestionPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const gap = 6;
      const availableBelow = window.innerHeight - rect.bottom - 12;
      const placeBelow = availableBelow >= 160 || rect.top < 180;
      const maxHeight = Math.max(
        100,
        Math.min(256, placeBelow ? availableBelow : rect.top - 12),
      );
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: placeBelow ? rect.bottom + gap : Math.max(8, rect.top - maxHeight - gap),
        width: rect.width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [inputRef, open]);

  return position;
}

function SearchableOptionInput({
  value,
  onChange,
  options,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
  placeholder: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const position = useSuggestionPosition(inputRef, open);
  const matches = options.filter((option) =>
    option.toLowerCase().includes(value.trim().toLowerCase()),
  );
  const hasCustomValue =
    value.trim().length > 0 &&
    !options.some((option) => option.toLowerCase() === value.trim().toLowerCase());

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !inputRef.current?.contains(target) &&
        !suggestionsRef.current?.contains(target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <>
      <div className="relative mt-2">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
        />
        <input
          ref={inputRef}
          id={inputId}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            const optionCount = matches.length + Number(hasCustomValue);
            if (event.key === "ArrowDown" && optionCount > 0) {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, optionCount - 1));
            } else if (event.key === "ArrowUp" && optionCount > 0) {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && value.trim()) {
              event.preventDefault();
              choose(
                activeIndex >= 0 && activeIndex < matches.length
                  ? matches[activeIndex]
                  : value.trim(),
              );
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#dbe4f2] bg-white py-3 pl-10 pr-3 text-sm text-[#172554] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#bfd1ef] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${inputId}-options`}
        />
      </div>
      {open && position && createPortal(
        <div
          ref={suggestionsRef}
          style={{
            position: "fixed",
            left: position.left,
            top: position.top,
            width: position.width,
            zIndex: 10000,
          }}
          className="overflow-hidden rounded-xl border border-[#dbe4f2] bg-white p-1.5 text-[#172554] shadow-[0_16px_40px_rgba(15,42,92,0.24)]"
        >
          <ul
            id={`${inputId}-options`}
            role="listbox"
            style={{ maxHeight: position.maxHeight }}
            className="overflow-y-auto"
          >
            {matches.map((option, index) => (
              <li key={option} role="option" aria-selected={activeIndex === index}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeIndex === index
                      ? "bg-[#eff6ff] font-semibold text-[#1d4ed8]"
                      : "text-[#334155] hover:bg-[#f8fbff] hover:text-[#1d4ed8]"
                  }`}
                >
                  {option}
                </button>
              </li>
            ))}
            {hasCustomValue && (
              <li role="option" aria-selected={activeIndex === matches.length}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(matches.length)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(value.trim())}
                  className={`w-full rounded-lg border-t border-[#edf2f8] px-3 py-2.5 text-left text-sm ${
                    activeIndex === matches.length
                      ? "bg-[#eff6ff] font-semibold text-[#1d4ed8]"
                      : "text-[#475569] hover:bg-[#f8fbff]"
                  }`}
                >
                  Use “{value.trim()}”
                </button>
              </li>
            )}
            {matches.length === 0 && !hasCustomValue && (
              <li className="px-3 py-3 text-sm text-[#64748b]">
                No matching category. Type any category and use it.
              </li>
            )}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}

type PhotonFeature = {
  properties?: Record<string, unknown>;
};

function LocationSearchInput({
  value,
  onChange,
  label = "Location",
  placeholder = "Search any city, region, or country",
  className = "",
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const position = useSuggestionPosition(inputRef, open && !readOnly);

  useEffect(() => {
    const query = value.trim();
    if (readOnly || !open || query.length < 2) {
      setLocations([]);
      setLoading(false);
      setSearchError(false);
      return;
    }

    setLocations([]);
    setLoading(true);
    setSearchError(false);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(false);
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) {
          throw new Error(`Location search failed (${response.status})`);
        }
        const result = (await response.json()) as { features?: PhotonFeature[] };
        if (!Array.isArray(result.features)) {
          throw new Error("Location search returned an invalid response");
        }
        const suggestions = result.features
          .map(({ properties }) => {
            const fields = properties || {};
            const locality = [fields.name, fields.city, fields.town, fields.village, fields.municipality]
              .find((part) => typeof part === "string" && part.trim());
            return [
              locality,
              fields.state,
              fields.country,
            ]
              .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
              .filter((part, index, all) => all.indexOf(part) === index)
              .join(", ");
          })
          .filter((location, index, all) => location && all.indexOf(location) === index);
        setLocations(suggestions);
      } catch {
        if (controller.signal.aborted) return;
        setLocations([]);
        setSearchError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, readOnly, value]);

  const hasCustomValue =
    !readOnly &&
    value.trim().length > 0 &&
    !locations.some((location) => location.toLowerCase() === value.trim().toLowerCase());
  const choose = (location: string) => {
    onChange(location);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };
  const optionCount = locations.length + Number(hasCustomValue);

  useEffect(() => {
    if (!open || readOnly) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !inputRef.current?.contains(target) &&
        !suggestionsRef.current?.contains(target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open, readOnly]);

  return (
    <>
      <div className={`relative mt-2 ${className}`}>
        <MapPin
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
        />
        <input
          ref={inputRef}
          id={inputId}
          value={value}
          onChange={(event) => {
            if (readOnly) return;
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (!readOnly) setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (readOnly) return;
            if (event.key === "ArrowDown" && optionCount > 0) {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, optionCount - 1));
            } else if (event.key === "ArrowUp" && optionCount > 0) {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && value.trim()) {
              event.preventDefault();
              choose(
                activeIndex >= 0 && activeIndex < locations.length
                  ? locations[activeIndex]
                  : value.trim(),
              );
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full rounded-xl border border-[#dbe4f2] bg-white py-3 pl-10 pr-3 text-sm text-[#172554] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#bfd1ef] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe] read-only:bg-[#f8faff] read-only:text-[#64748b]"
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${inputId}-options`}
        />
      </div>
      {open && !readOnly && position && createPortal(
        <div
          ref={suggestionsRef}
          style={{
            position: "fixed",
            left: position.left,
            top: position.top,
            width: position.width,
            zIndex: 10000,
          }}
          className="overflow-hidden rounded-xl border border-[#dbe4f2] bg-white p-1.5 text-[#172554] shadow-[0_16px_40px_rgba(15,42,92,0.24)]"
        >
          <ul
            id={`${inputId}-options`}
            role="listbox"
            style={{ maxHeight: position.maxHeight - 30 }}
            className="overflow-y-auto"
          >
            {locations.map((location, index) => (
              <li key={location} role="option" aria-selected={activeIndex === index}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(location)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeIndex === index
                      ? "bg-[#eff6ff] font-semibold text-[#1d4ed8]"
                      : "text-[#334155] hover:bg-[#f8fbff] hover:text-[#1d4ed8]"
                  }`}
                >
                  <MapPin size={14} aria-hidden="true" className="mr-2 inline text-[#64748b]" />
                  {location}
                </button>
              </li>
            ))}
            {loading && (
              <li className="px-3 py-2.5 text-sm text-[#64748b]" role="status">
                Finding matching places…
              </li>
            )}
            {!loading && locations.length === 0 && value.trim().length >= 2 && (
              <li className="px-3 py-2.5 text-sm text-[#64748b]" role="status">
                {searchError
                  ? "Place suggestions are temporarily unavailable."
                  : "No matching places found."}
              </li>
            )}
            {!loading && value.trim().length < 2 && (
              <li className="px-3 py-2.5 text-sm text-[#64748b]">
                Type at least two characters to find places.
              </li>
            )}
            {hasCustomValue && (
              <li role="option" aria-selected={activeIndex === locations.length}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(locations.length)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(value.trim())}
                  className={`w-full rounded-lg border-t border-[#edf2f8] px-3 py-2.5 text-left text-sm ${
                    activeIndex === locations.length
                      ? "bg-[#eff6ff] font-semibold text-[#1d4ed8]"
                      : "text-[#475569] hover:bg-[#f8fbff]"
                  }`}
                >
                  Use “{value.trim()}”
                </button>
              </li>
            )}
          </ul>
          <p className="border-t border-[#edf2f8] px-3 pt-2 text-[10px] text-[#94a3b8]">
            Place suggestions © OpenStreetMap contributors
          </p>
        </div>,
        document.body,
      )}
    </>
  );
}
type AdminCompanyVerification = {
  company: Record<string, unknown> & { id: string; verificationStatus: string };
  recruiterName: string;
  recruiterEmail: string;
  documents: VerificationDocument[];
};
const marketplaceKey = "careerly-marketplace-postings";
const readMarketplacePostings = (): MarketplacePosting[] => {
  try {
    const stored = localStorage.getItem(marketplaceKey);
    const postings = stored ? (JSON.parse(stored) as Partial<MarketplacePosting>[]) : [];
    return postings.map((posting) => ({
      ...posting,
      category: typeof posting.category === "string" ? posting.category : "Other",
      skills: Array.isArray(posting.skills)
        ? posting.skills.filter((skill): skill is string => typeof skill === "string")
        : [],
      placement: posting.placement === "featured" ? "featured" : "normal",
    })) as MarketplacePosting[];
  } catch { return []; }
};
const postingStatusFromApi = (status: unknown): MarketplacePosting["status"] => {
  if (status === "active") return "Approved";
  if (status === "closed") return "Rejected";
  return "Pending approval";
};
const marketplacePostingFromApi = (job: Record<string, unknown>): MarketplacePosting => ({
  id: String(job.id),
  title: String(job.title || ""),
  category: String(job.category || "Other"),
  skills: Array.isArray(job.skills)
    ? job.skills.filter((skill): skill is string => typeof skill === "string")
    : [],
  company: String(job.company || ""),
  location: String(job.location || ""),
  mode: String(job.mode || ""),
  type: String(job.type || ""),
  description: String(job.description || ""),
  status: postingStatusFromApi(job.status),
  placement: job.placement === "featured" ? "featured" : "normal",
  createdAt: String(job.createdAt || new Date().toISOString()),
});
const marketplacePostingToJob = (posting: MarketplacePosting): Job => ({
  id: posting.id,
  company: posting.company,
  role: posting.title,
  location: posting.location,
  mode: posting.mode,
  level: "",
  salary: "",
  fit: 0,
  posted: new Date(posting.createdAt).toLocaleDateString(),
  description: posting.description,
  logo: posting.company.charAt(0).toUpperCase(),
  logoTone: "bg-[#2563eb] text-white",
  tags: [posting.category, ...posting.skills, posting.type].filter(Boolean),
});
const writeMarketplacePostings = (postings: MarketplacePosting[]) => {
  const previous = readMarketplacePostings();
  localStorage.setItem(marketplaceKey, JSON.stringify(postings));
  window.dispatchEvent(new CustomEvent("careerly:postings-updated"));
  const created = postings.filter((posting) => !previous.some((item) => item.id === posting.id));
  const changed = postings.filter((posting) => previous.some((item) => item.id === posting.id && JSON.stringify(item) !== JSON.stringify(posting)) && isUuid(posting.id));
  const removed = previous.filter((posting) => !postings.some((item) => item.id === posting.id) && isUuid(posting.id));
  for (const posting of created) {
    void apiRequest<{ job: Record<string, unknown> }>("/jobs", { method: "POST", body: JSON.stringify(posting) })
      .then(({ job }) => {
        // The UI creates a local ID first. Replace it with the database ID so
        // later edits, deletes, and applications all address the same job.
        const saved = marketplacePostingFromApi({ ...job, company: posting.company });
        const next = readMarketplacePostings().map((item) => item.id === posting.id ? saved : item);
        localStorage.setItem(marketplaceKey, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("careerly:postings-updated"));
        return syncDatabaseState();
      })
      .catch((error) => window.dispatchEvent(new CustomEvent("careerly:api-error", { detail: error.message })));
  }
  for (const posting of changed) {
    const status = posting.status === "Approved" ? "active" : posting.status === "Rejected" ? "closed" : "pending";
    void apiRequest(`/jobs/${posting.id}`, { method: "PATCH", body: JSON.stringify({ title: posting.title, category: posting.category, skills: posting.skills, status, placement: posting.placement }) }).then(syncDatabaseState).catch((error) => window.dispatchEvent(new CustomEvent("careerly:api-error", { detail: error.message })));
  }
  for (const posting of removed) {
    void apiRequest(`/jobs/${posting.id}`, { method: "DELETE" }).then(syncDatabaseState).catch((error) => window.dispatchEvent(new CustomEvent("careerly:api-error", { detail: error.message })));
  }
};

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  openedBy: string;
  openedByRole: "job_seeker" | "recruiter";
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In progress" | "Waiting for user" | "Escalated" | "Resolved";
  createdAt: string;
};
const supportKey = "careerly-support-tickets";
const readSupportTickets = (): SupportTicket[] => {
  try { return JSON.parse(localStorage.getItem(supportKey) || "[]"); } catch { return []; }
};
const writeSupportTickets = (tickets: SupportTicket[]) => {
  localStorage.setItem(supportKey, JSON.stringify(tickets));
  window.dispatchEvent(new CustomEvent("careerly:tickets-updated"));
};

type BillingRecord = {
  id: string;
  audience: "job_seeker" | "recruiter";
  plan: string;
  amount: number;
  interval: "monthly" | "yearly";
  paidAt: string;
  renewsAt: string;
  last4: string;
  status: "Paid";
};
const billingKey = "careerly-billing-records";
const readBillingRecords = (): BillingRecord[] => {
  try { return JSON.parse(localStorage.getItem(billingKey) || "[]"); } catch { return []; }
};
const addBillingRecord = (record: BillingRecord) =>
  localStorage.setItem(billingKey, JSON.stringify([record, ...readBillingRecords()]));

type MarketplaceApplication = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  applicant: { name?: string; email?: string; phone?: string; profile?: JobSeekerProfile; [key: string]: unknown };
  appliedAt: string;
  status: string;
};
const applicationsKey = "careerly-marketplace-applications";
const readMarketplaceApplications = (): MarketplaceApplication[] => {
  try { return JSON.parse(localStorage.getItem(applicationsKey) || "[]"); } catch { return []; }
};
const writeMarketplaceApplications = (applications: MarketplaceApplication[]) => {
  const previous = readMarketplaceApplications();
  localStorage.setItem(applicationsKey, JSON.stringify(applications));
  window.dispatchEvent(new CustomEvent("careerly:applications-updated"));
  const created = applications.filter((application) => !previous.some((item) => item.id === application.id));
  const changed = applications.filter((application) => previous.some((item) => item.id === application.id && item.status !== application.status) && isUuid(application.id));
  for (const application of created) {
    if (!isUuid(application.jobId)) continue;
    void apiRequest("/applications", { method: "POST", body: JSON.stringify({ jobId: application.jobId }) }).then(syncDatabaseState).catch((error) => window.dispatchEvent(new CustomEvent("careerly:api-error", { detail: error.message })));
  }
  const statusMap: Record<string, string> = { Applied: "applied", Review: "viewed", Shortlisted: "shortlisted", Interview: "interview", Selected: "selected", Rejected: "rejected", Withdrawn: "withdrawn" };
  for (const application of changed) {
    void apiRequest(`/applications/${application.id}`, { method: "PATCH", body: JSON.stringify({ status: statusMap[application.status] || application.status.toLowerCase() }) }).then(syncDatabaseState).catch((error) => window.dispatchEvent(new CustomEvent("careerly:api-error", { detail: error.message })));
  }
};

const applicationStatusFromApi = (status: unknown) => ({
  applied: "Applied",
  viewed: "Review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
}[String(status)] || "Applied");

type PlatformMessage = {
  id: string;
  conversationId: string;
  fromRole: "job_seeker" | "recruiter";
  fromName: string;
  fromEmail: string;
  toRole: "job_seeker" | "recruiter";
  toName: string;
  toEmail: string;
  company: string;
  body: string;
  createdAt: string;
  fromUserId?: string;
  toUserId?: string;
  integrityValid?: boolean;
  deliveryStatus?: "sending" | "sent" | "failed";
};
type InterviewRecord = {
  id: string;
  candidate: string;
  candidateEmail: string;
  round: string;
  date: string;
  time: string;
  duration: string;
  meetUrl: string;
};
const messagesKey = "careerly-platform-messages";
const readPlatformMessages = (): PlatformMessage[] => {
  try { return JSON.parse(localStorage.getItem(messagesKey) || "[]"); } catch { return []; }
};
const messageReadKey = (userId: string) => `careerly-read-message-ids:${userId}`;
const readMessageIds = (userId: string) => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(messageReadKey(userId)) || "[]")); } catch { return new Set<string>(); }
};
const markConversationRead = (userId: string | undefined, conversationId: string | undefined) => {
  if (!userId || !conversationId) return;
  const userEmail = normalizedEmail(readCurrentUser()?.email || "");
  const read = readMessageIds(userId);
  for (const message of readPlatformMessages()) {
    if (message.conversationId === conversationId && normalizedEmail(message.toEmail) === userEmail) read.add(message.id);
  }
  localStorage.setItem(messageReadKey(userId), JSON.stringify([...read]));
  window.dispatchEvent(new CustomEvent("careerly:messages-read"));
};
const writePlatformMessages = (messages: PlatformMessage[]) => {
  const previous = readPlatformMessages();
  localStorage.setItem(messagesKey, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent("careerly:messages-updated"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("careerly-platform-messages");
    channel.postMessage({ type: "messages-updated" });
    channel.close();
  }
  const created = messages.filter((message) => !previous.some((item) => item.id === message.id));
  for (const message of created) {
    const senderId = readCurrentUser()?.id;
    if (!senderId || !message.body.trim()) continue;
    updateMessageDelivery(message.id, "sending");
    void encryptMessage(senderId, { userId: message.toUserId, email: message.toEmail }, message.body)
      .then((body) => apiRequest<unknown>("/messages", { method: "POST", body: JSON.stringify({ toUserId: message.toUserId, toEmail: message.toEmail, body }) }))
      .then((event) => { updateMessageDelivery(message.id, "sent"); return applySocketMessage(event); })
      .catch(() => updateMessageDelivery(message.id, "failed"));
  }
};
const updateMessageDelivery = (id: string, deliveryStatus: NonNullable<PlatformMessage["deliveryStatus"]>) => {
  const updated = readPlatformMessages().map((message) => message.id === id ? { ...message, deliveryStatus } : message);
  localStorage.setItem(messagesKey, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("careerly:messages-updated"));
};
const conversationIdFor = (firstEmail: string, secondEmail: string) =>
  [firstEmail.toLowerCase(), secondEmail.toLowerCase()].sort().join("::");
type DemoRole = "job_seeker" | "recruiter" | "support" | "admin";
type LocalAccount = {
  id: string;
  name: string;
  email: string;
  role: "job_seeker" | "recruiter";
  company?: string;
  passwordHash: string;
  createdAt: string;
};
const localAccountsKey = "careerly-local-accounts";
const readLocalAccounts = (): LocalAccount[] => {
  try { return JSON.parse(localStorage.getItem(localAccountsKey) || "[]"); } catch { return []; }
};
const readCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem("careerly-current-user") || "null") as { id?: string; name?: string; email?: string; role?: DemoRole; company?: string; phoneNumber?: string } | null; } catch { return null; }
};

const syncMessages = async () => {
  const currentUser = readCurrentUser();
  const messagesResponse = await apiRequest<{ messages: Array<Record<string, any>> }>("/messages").catch(() => null);
  if (!messagesResponse) return;
  const currentUserId = currentUser?.id;
  const remote = await Promise.all(messagesResponse.messages.map(async (message) => {
    const fromEmail = String(message.from?.email || "");
    const toEmail = String(message.to?.email || "");
    return {
      id: String(message.id),
      // Server IDs are deliberately opaque; email-based IDs keep the UI's
      // existing local and remote messages in the same conversation.
      conversationId: conversationIdFor(fromEmail, toEmail),
      fromRole: message.from?.role === "recruiter" ? "recruiter" as const : "job_seeker" as const,
      fromName: String(message.from?.name || "User"),
      fromEmail,
      toRole: message.to?.role === "recruiter" ? "recruiter" as const : "job_seeker" as const,
      toName: String(message.to?.name || "User"),
      toEmail,
      fromUserId: String(message.fromUserId),
      toUserId: String(message.toUserId),
      company: "Careerly",
      body: currentUserId ? (await decryptMessage(currentUserId, String(message.fromUserId) === currentUserId ? message.to?.encryptionPublicKey : message.from?.encryptionPublicKey, String(message.body))) ?? "Secure message unavailable on this device." : "Secure message",
      createdAt: String(message.createdAt),
      integrityValid: message.integrityValid === true,
      deliveryStatus: "sent" as const,
    };
  }));
  // Retain only optimistic messages the API has not confirmed yet. This avoids
  // the bubble disappearing between Send and the Socket.IO acknowledgement.
  const pending = readPlatformMessages().filter((message) => !isUuid(message.id) && !remote.some((saved) =>
    saved.fromEmail === message.fromEmail && saved.toEmail === message.toEmail && saved.body === message.body,
  ));
  localStorage.setItem(messagesKey, JSON.stringify([...remote, ...pending].sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
  window.dispatchEvent(new CustomEvent("careerly:messages-updated"));
};

const applySocketMessage = async (event: unknown): Promise<boolean> => {
  const payload = event as { type?: string; message?: Record<string, any> };
  const message = payload.type === "message.created" ? payload.message : undefined;
  const currentUserId = readCurrentUser()?.id;
  if (!message || !currentUserId || !message.from || !message.to) return false;
  const fromEmail = String(message.from.email || "");
  const toEmail = String(message.to.email || "");
  const body = await decryptMessage(
    currentUserId,
    String(message.fromUserId) === currentUserId ? message.to.encryptionPublicKey : message.from.encryptionPublicKey,
    String(message.body || ""),
  );
  if (body === null) return false;
  const received: PlatformMessage = {
    id: String(message.id), conversationId: conversationIdFor(fromEmail, toEmail),
    fromRole: message.from.role === "recruiter" ? "recruiter" : "job_seeker", fromName: String(message.from.name || "User"), fromEmail,
    toRole: message.to.role === "recruiter" ? "recruiter" : "job_seeker", toName: String(message.to.name || "User"), toEmail,
    fromUserId: String(message.fromUserId), toUserId: String(message.toUserId), company: "Careerly", body,
    createdAt: String(message.createdAt), integrityValid: message.integrityValid === true, deliveryStatus: "sent",
  };
  const current = readPlatformMessages();
  if (current.some((item) => item.id === received.id)) return true;
  const withoutOptimisticCopy = current.filter((item) => !( !isUuid(item.id)
    && item.fromEmail === received.fromEmail && item.toEmail === received.toEmail && item.body === received.body));
  localStorage.setItem(messagesKey, JSON.stringify([...withoutOptimisticCopy, received].sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
  window.dispatchEvent(new CustomEvent("careerly:messages-updated"));
  return true;
};

const syncDatabaseState = async () => {
  const currentUser = readCurrentUser();
  if (currentUser?.role === "recruiter") {
    const { company } = await apiRequest<{ company: { verificationStatus?: string } }>("/companies/me");
    if (company.verificationStatus !== "verified") return false;
  }
  const jobsPath = currentUser?.role === "recruiter" || currentUser?.role === "admin" ? "/jobs/mine" : "/jobs";
  const jobsResponse = await apiRequest<{ jobs: Array<Record<string, unknown>> }>(jobsPath).catch(() => null);
  if (jobsResponse) {
    const remotePostings = jobsResponse.jobs.map(marketplacePostingFromApi);
    // Keep local demo/offline jobs (which have non-UUID IDs), but never let a
    // normal public-job refresh erase a recruiter's pending server-side job.
    const localOnly = readMarketplacePostings().filter((posting) => !isUuid(posting.id) && !remotePostings.some((remote) => remote.id === posting.id));
    const postings = [...remotePostings, ...localOnly];
    localStorage.setItem(marketplaceKey, JSON.stringify(postings));
    window.dispatchEvent(new CustomEvent("careerly:postings-updated"));
  }
  const applicationsResponse = await apiRequest<{ applications: Array<Record<string, unknown>> }>("/applications").catch(() => null);
  if (applicationsResponse) {
    const stored = applicationsResponse.applications.map((application) => ({
      id: String(application.id),
      jobId: String(application.jobId),
      jobTitle: String(application.jobTitle),
      company: String(application.company),
      applicant: {
        id: application.seekerId,
        name: application.applicantName,
        email: application.applicantEmail || "",
        phone: application.applicantPhone || "",
        profile: application.applicantProfile && typeof application.applicantProfile === "object"
          ? application.applicantProfile as JobSeekerProfile
          : undefined,
      },
      appliedAt: String(application.appliedAt),
      status: applicationStatusFromApi(application.status),
    }));
    localStorage.setItem(applicationsKey, JSON.stringify(stored));
    window.dispatchEvent(new CustomEvent("careerly:applications-updated"));
  }
  await syncMessages();
  return true;
};
const normalizedEmail = (value: string) => value.trim().toLowerCase();
const userDataKey = (key: string, email = readCurrentUser()?.email) =>
  `${key}:${normalizedEmail(email || "account")}`;
const persistJobSeekerIdentity = async (name: string, email: string, previousEmail: string, profile?: JobSeekerProfile) => {
  const nextName = name.trim();
  const nextEmail = normalizedEmail(email);
  const oldEmail = normalizedEmail(previousEmail);
  const accounts = readLocalAccounts();
  const existingAccount = accounts.find((account) => normalizedEmail(account.email) === oldEmail);
  const duplicate = accounts.find((account) => normalizedEmail(account.email) === nextEmail && account.id !== existingAccount?.id);
  if (duplicate) throw new Error("An account already uses that email address");
  await apiRequest(profile ? "/users/me/profile" : "/users/me", {
    method: "PATCH",
    body: JSON.stringify(profile ? { name: nextName, email: nextEmail, profile } : { name: nextName, email: nextEmail }),
  });
  const nextAccount: LocalAccount = existingAccount
    ? { ...existingAccount, name: nextName, email: nextEmail }
    : {
        id: `USR-${Date.now()}`,
        name: nextName,
        email: nextEmail,
        role: "job_seeker",
        passwordHash: await hashPassword("Demo@123"),
        createdAt: new Date().toISOString(),
      };
  localStorage.setItem(localAccountsKey, JSON.stringify(existingAccount
    ? accounts.map((account) => account.id === existingAccount.id ? nextAccount : account)
    : [nextAccount, ...accounts]));
  const current = readCurrentUser();
  localStorage.setItem("careerly-current-user", JSON.stringify({ ...current, name: nextName, email: nextEmail, role: "job_seeker" }));
  if (profile) {
    localStorage.setItem(userDataKey("careerly-seeker-profile", nextEmail), JSON.stringify({ ...profile, name: nextName, email: nextEmail }));
    if (oldEmail !== nextEmail) localStorage.removeItem(userDataKey("careerly-seeker-profile", oldEmail));
    window.dispatchEvent(new CustomEvent("careerly:profile-updated"));
  }
  const updatedApplications = readMarketplaceApplications().map((application) =>
    normalizedEmail(String(application.applicant.email || "")) === oldEmail
      ? { ...application, applicant: { ...application.applicant, name: nextName, email: nextEmail } }
      : application,
  );
  writeMarketplaceApplications(updatedApplications);
  const updatedMessages = readPlatformMessages().map((message) => {
    const fromMatches = normalizedEmail(message.fromEmail) === oldEmail;
    const toMatches = normalizedEmail(message.toEmail) === oldEmail;
    if (!fromMatches && !toMatches) return message;
    const fromEmail = fromMatches ? nextEmail : message.fromEmail;
    const toEmail = toMatches ? nextEmail : message.toEmail;
    return {
      ...message,
      fromEmail,
      fromName: fromMatches ? nextName : message.fromName,
      toEmail,
      toName: toMatches ? nextName : message.toName,
      conversationId: conversationIdFor(fromEmail, toEmail),
    };
  });
  writePlatformMessages(updatedMessages);
};
const hashPassword = async (password: string) => {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const jobs: Job[] = [];

const nav = [
  { href: "/job-seeker", label: "Overview", icon: FaTachometerAlt },
  { href: "/job-seeker/jobs", label: "Find jobs", icon: FaSearch },
  { href: "/job-seeker/applications", label: "Applications", icon: FaListAlt },
  { href: "/job-seeker/saved", label: "Saved jobs", icon: FaBookmark },
];
const moreNav = [
  { href: "/job-seeker/messages", label: "Messages", icon: FaEnvelope },
  { href: "/job-seeker/notifications", label: "Notifications", icon: FaBell },
  { href: "/job-seeker/subscription", label: "Subscription", icon: FaCrown },
  { href: "/job-seeker/support", label: "Support", icon: FaHeadset },
  { href: "/job-seeker/profile", label: "My profile", icon: FaUserCircle },
  { href: "/job-seeker/settings", label: "Settings", icon: FaCog },
];
const notificationUnreadKey = "careerly-notification-unread-count";
const readNotificationUnreadCount = () => Number(localStorage.getItem(notificationUnreadKey) || "0") || 0;
const writeNotificationUnreadCount = (count: number) => {
  localStorage.setItem(notificationUnreadKey, String(Math.max(0, count)));
  window.dispatchEvent(new CustomEvent("careerly:notifications-updated"));
};

function Logo() {
  return (
    <Link
      href="/job-seeker"
      className="flex items-center gap-2.5"
      data-testid="link-logo"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#2563eb] text-white">
        <Zap size={17} strokeWidth={3} />
      </span>
      <span className="font-display text-lg font-extrabold tracking-[-.04em] text-white">
        careerly
      </span>
    </Link>
  );
}

function Avatar({
  initials = "AM",
  small = false,
}: {
  initials?: string;
  small?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#e88558] font-display font-bold text-[#fff8ee] ${small ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-xs"}`}
    >
      {initials}
    </span>
  );
}

function Shell({
  children,
  toast,
  onMenu,
  savedCount,
  onLogout = () => {
    sessionStorage.removeItem("careerly-demo-session");
    sessionStorage.removeItem("careerly-demo-role");
    window.location.assign("/login");
  },
}: {
  children: ReactNode;
  toast: string | null;
  onMenu: () => void;
  savedCount: number;
  onLogout?: () => void;
}) {
  const [location] = useLocation();
  const currentUser = readCurrentUser();
  const [, setMessageRevision] = useState(0);
  const displayName = currentUser?.name?.trim() || currentUser?.email || "Account";
  const firstName = displayName.split(" ")[0];
  const roleLabel = currentUser?.role?.replace("_", " ") || "Member";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "A";
  const isActive = (href: string) =>
    href === "/job-seeker" ? location === href : location.startsWith(href);
  useEffect(() => {
    const refresh = () => setMessageRevision((value) => value + 1);
    window.addEventListener("careerly:messages-updated", refresh);
    window.addEventListener("careerly:messages-read", refresh);
    window.addEventListener("careerly:notifications-updated", refresh);
    return () => { window.removeEventListener("careerly:messages-updated", refresh); window.removeEventListener("careerly:messages-read", refresh); window.removeEventListener("careerly:notifications-updated", refresh); };
  }, []);
  const unreadMessages = (() => {
    const userId = currentUser?.id;
    const userEmail = normalizedEmail(currentUser?.email || "");
    if (!userId || !userEmail) return 0;
    const read = readMessageIds(userId);
    return readPlatformMessages().filter((message) => normalizedEmail(message.toEmail) === userEmail && !read.has(message.id)).length;
  })();
  const unreadNotifications = readNotificationUnreadCount();
  return (
    <div className="app-grain min-h-[100dvh] bg-[#f4f7fc]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col bg-[#0b1f44] px-4 py-5 text-[#dbeafe] lg:flex">
        <div className="px-3">
          <Logo />
        </div>
        <div className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#8d94a8]">
          Workspace
        </div>
        <nav className="mt-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-nav-${label.toLowerCase().replaceAll(" ", "-")}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive(href) ? "bg-[#2563eb] text-white shadow-[0_8px_18px_rgba(8,42,105,.3)]" : "text-[#c5d5f2] hover:bg-white/10 hover:text-white"}`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              {label === "Saved jobs" && savedCount > 0 && (
                <span className="ml-auto rounded-full bg-[#f97316] px-1.5 py-0.5 text-[10px] text-white">
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#8d94a8]">
          Your space
        </div>
        <nav className="mt-3 space-y-1">
          {moreNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-nav-${label.toLowerCase().replaceAll(" ", "-")}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive(href) ? "bg-white/10 text-[#93c5fd]" : "text-[#c5d5f2] hover:bg-white/10 hover:text-white"}`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              {label === "Messages" && unreadMessages > 0 && <span className="ml-auto min-w-5 rounded-full bg-[#f97316] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}
              {label === "Notifications" && unreadNotifications > 0 && <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f97316] px-1.5 text-[10px] font-bold text-white shadow-sm">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}
            </Link>
          ))}
        </nav>
        <div className="relative mt-auto rounded-2xl bg-[#303751] p-3">
          <div className="flex items-center gap-2.5">
            <Avatar small initials={initials} />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">
                {displayName}
              </p>
              <p className="truncate text-[11px] text-[#aeb4c4]">
                {roleLabel}
              </p>
            </div>
            <details className="ml-auto" data-account-dropdown>
              <summary className="cursor-pointer list-none text-[#aeb4c4] hover:text-[#f2c96d]">
                <MoreHorizontal size={17} />
              </summary>
              <div className="absolute bottom-14 right-0 z-50 w-36 rounded-xl bg-white p-1.5 shadow-xl">
                <Link
                  href="/job-seeker/profile"
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-[#525765] hover:bg-[#f1eadf]"
                >
                  Profile
                </Link>
                <button
                  onClick={onLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#a75b47] hover:bg-[#fff0e8]"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-[68px] items-center border-b border-[#dbe4f2] bg-white/90 px-4 backdrop-blur-md lg:ml-[236px] lg:px-9">
        <button
          onClick={onMenu}
          className="mr-3 rounded-lg p-2 text-[#596072] hover:bg-[#ebe2d3] lg:hidden"
          aria-label="Open navigation"
          data-testid="button-open-navigation"
        >
          <Menu size={21} />
        </button>
        <div className="hidden items-center gap-2 text-sm text-[#777c89] sm:flex">
          <span className="font-mono-custom text-[10px] uppercase tracking-[.14em] text-[#a19c93]">
            {new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(new Date())}
          </span>
          <span className="h-1 w-1 rounded-full bg-[#e88558]" />
          <span>Good morning, {firstName}</span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/job-seeker/notifications"
            className="relative rounded-xl p-2.5 text-[#686d7c] transition hover:bg-[#ebe2d3] hover:text-[#252b43]"
            data-testid="link-header-notifications"
          >
            <Bell size={19} strokeWidth={1.8} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e88558]" />
          </Link>
          <span className="mx-1 hidden h-6 w-px bg-[#e2d9ca] sm:block" />
          <details className="relative" data-account-dropdown>
            <summary
              className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-2 py-1 hover:bg-[#ebe2d3]"
              data-testid="menu-account"
            >
              <Avatar small initials={initials} />
              <span className="hidden text-sm font-semibold text-[#3e4352] md:block">
                {displayName}
              </span>
              <ChevronDown
                size={14}
                className="hidden text-[#96938e] sm:block"
              />
            </summary>
            <div className="absolute right-0 top-12 z-50 w-44 rounded-xl border border-[#e2d8c8] bg-[#fffaf1] p-1.5 shadow-lg">
              <Link
                href="/job-seeker/profile"
                className="block rounded-lg px-3 py-2 text-xs font-semibold text-[#525765] hover:bg-[#f1eadf]"
              >
                My profile
              </Link>
              <button
                onClick={onLogout}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#a75b47] hover:bg-[#fff0e8]"
                data-testid="button-logout"
              >
                Log out
              </button>
            </div>
          </details>
        </div>
      </header>
      <main className="min-h-[calc(100dvh-68px)] pb-24 lg:ml-[236px] lg:pb-10">
        <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
          {children}
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[68px] items-center justify-around border-t border-[#e8dece] bg-[#fbf7ef]/95 px-2 backdrop-blur-lg lg:hidden">
        {[nav[0], nav[1], nav[2], moreNav[2]].map(
          ({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-mobile-${label.toLowerCase().replaceAll(" ", "-")}`}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold ${isActive(href) ? "text-[#147d6d]" : "text-[#85858a]"}`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>
                {label
                  .replace("Find jobs", "Jobs")
                  .replace("Applications", "Apply")
                  .replace("Overview", "Home")
                  .replace("My profile", "Profile")}
              </span>
            </Link>
          ),
        )}
      </nav>
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#252b43] px-4 py-2.5 text-sm font-semibold text-[#fff8ee] shadow-xl lg:bottom-8"
          role="status"
          data-testid="status-toast"
        >
          <Check size={15} className="text-[#f2c96d]" />
          {toast}
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 font-mono-custom text-[10px] font-bold uppercase tracking-[.16em] text-[#147d6d]">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-xl font-extrabold tracking-[-.035em] text-[#252b43] sm:text-[22px]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#e8dece] bg-[#fbf7ef] shadow-[0_2px_10px_rgba(35,41,66,.035)] ${className}`}
    >
      {children}
    </section>
  );
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="none"
          stroke="#e7dfd2"
          strokeWidth="3.2"
        />
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="none"
          stroke="#147d6d"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={`${value * 1.068} 108`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono-custom text-[11px] font-bold text-[#252b43]">
        {value}%
      </span>
    </div>
  );
}

function JobMark({
  job,
  size = "md",
}: {
  job: Pick<Job, "logo" | "logoTone"> | Pick<Application, "logo">;
  size?: "sm" | "md" | "lg";
}) {
  const tone = "logoTone" in job ? job.logoTone : "bg-[#dce4de] text-[#147d6d]";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl font-display font-extrabold ${tone} ${size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 rounded-lg text-xs" : "h-11 w-11 text-base"}`}
    >
      {job.logo}
    </span>
  );
}

function MatchPill({ fit }: { fit: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e1f1e9] px-2 py-1 font-mono-custom text-[10px] font-bold text-[#147d6d]">
      <Sparkles size={11} />
      {fit}% fit
    </span>
  );
}

function JobCard({
  job,
  saved,
  onSave,
  compact = false,
}: {
  job: Job;
  saved: boolean;
  onSave: (job: Job) => void;
  compact?: boolean;
}) {
  return (
    <Card className={`lift group ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-3">
        <JobMark job={job} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-display font-extrabold tracking-[-.025em] text-[#252b43]">
                {job.role}
              </h3>
              <p className="mt-0.5 text-sm text-[#707483]">{job.company}</p>
            </div>
            <button
              onClick={() => onSave(job)}
              className={`rounded-lg p-2 transition ${saved ? "bg-[#fff0d0] text-[#b77624]" : "text-[#9b9b9a] hover:bg-[#f2eadc] hover:text-[#252b43]"}`}
              aria-label={
                saved ? `Remove ${job.role} from saved` : `Save ${job.role}`
              }
              data-testid={`button-save-job-${job.id}`}
            >
              {saved ? (
                <BookmarkCheck size={18} fill="currentColor" />
              ) : (
                <Bookmark size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#757987]">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} />
          {job.location}
        </span>
        <span className="h-1 w-1 rounded-full bg-[#c8c0b4]" />
        <span>{job.mode}</span>
        <span className="h-1 w-1 rounded-full bg-[#c8c0b4]" />
        <span>{job.level}</span>
      </div>
      {!compact && (
        <>
          <p className="mt-3 line-clamp-1 text-sm leading-6 text-[#696d79]">
            {job.description}
          </p>
          <div className="mt-4 flex items-end justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {job.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-[#f1eadf] px-2 py-1 text-[10px] font-semibold text-[#696d79]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-right">
              {job.fit > 0 && <MatchPill fit={job.fit} />}
              <p className="mt-1 font-mono-custom text-[9px] text-[#a3a09a]">
                {job.posted}
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function Dashboard({
  saved,
  applications,
  onSave,
}: {
  saved: string[];
  applications: Application[];
  onSave: (job: Job) => void;
}) {
  const firstName = readCurrentUser()?.name?.trim().split(/\s+/)[0] || "there";
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>(() =>
    readMarketplacePostings().filter((posting) => posting.status === "Approved").map(marketplacePostingToJob),
  );
  useEffect(() => {
    const syncJobs = () => setRecommendedJobs(
      readMarketplacePostings().filter((posting) => posting.status === "Approved").map(marketplacePostingToJob),
    );
    window.addEventListener("careerly:postings-updated", syncJobs);
    window.addEventListener("storage", syncJobs);
    return () => {
      window.removeEventListener("careerly:postings-updated", syncJobs);
      window.removeEventListener("storage", syncJobs);
    };
  }, []);
  const [recommendedPage, setRecommendedPage] = useState(1);
  const jobsPerPage = 2;
  const recommendedTotalPages = Math.max(1, Math.ceil(recommendedJobs.length / jobsPerPage));
  const visibleRecommendedJobs = recommendedJobs.slice(
    (recommendedPage - 1) * jobsPerPage,
    recommendedPage * jobsPerPage,
  );
  const activeApplicationCount = applications.filter(
    (application) => !["Selected", "Rejected", "Withdrawn"].includes(application.stage),
  ).length;
  const activity = applications.slice(0, 3);
  const profile = (() => {
    try { return JSON.parse(localStorage.getItem(userDataKey("careerly-seeker-profile")) || "{}"); }
    catch { return {}; }
  })();
  const profileFields = [
    profile.headline,
    profile.location,
    profile.phone,
    profile.resumeName && profile.resumeName !== "No resume uploaded",
    profile.experiences?.length,
    profile.educations?.length,
    profile.strengths?.length,
  ];
  const profileStrength = Math.round(profileFields.filter(Boolean).length / profileFields.length * 100);
  return (
    <div className="space-y-7">
      <div className="fade-up relative overflow-hidden rounded-2xl border border-[#bfdbfe] bg-gradient-to-r from-[#eff6ff] via-white to-[#f8fbff] p-6 shadow-sm sm:flex sm:items-end sm:justify-between sm:p-8">
        <div>
          <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#2563eb]">
            Your command center
          </p>
          <h1 className="mt-1 font-display text-[30px] font-extrabold tracking-[-.055em] text-[#172554] sm:text-[38px]">
            Keep the momentum, <span className="text-[#2563eb]">{firstName}.</span>
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-6 text-[#777982]">
            Track your applications, explore current openings, and keep your profile up to date.
          </p>
        </div>
        <Link
          href="/job-seeker/jobs"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-[0_5px_14px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
          data-testid="link-browse-recommendations"
        >
          <Search size={16} />
          Browse jobs
        </Link>
      </div>
      <div className="fade-up-2 grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
        <Card className="profile-strength-card relative overflow-hidden border-0 p-5 sm:p-6">
          <div className="profile-strength-orbit absolute -right-12 -top-16 h-44 w-44 rounded-full border-[24px]" />
          <div className="relative flex items-center gap-5">
            <div className="profile-strength-ring">
              <ProgressRing value={profileStrength} />
            </div>
            <div>
              <p className="profile-strength-eyebrow text-xs font-semibold">
                Profile strength
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold tracking-[-.04em] text-white">
                {profileStrength}% complete
              </p>
              <p className="profile-strength-copy mt-1 text-xs">
                Add your profile details to improve your visibility.
              </p>
            </div>
          </div>
          <Link
            href="/job-seeker/profile"
            className="profile-strength-link relative mt-5 inline-flex items-center gap-1 text-xs font-bold hover:underline"
            data-testid="link-complete-profile"
          >
            Complete your profile <ArrowUpRight size={13} />
          </Link>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#747885]">
              Active applications
            </p>
            <span className="rounded-lg bg-[#e1f1e9] p-2 text-[#147d6d]">
              <BriefcaseBusiness size={16} />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold tracking-[-.05em] text-[#252b43]">
            {activeApplicationCount}
          </p>
          <p className="mt-2 text-xs text-[#64748b]">Based on your applications</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#747885]">Latest opening</p>
            <span className="rounded-lg bg-[#fff0d0] p-2 text-[#b77624]">
              <Target size={16} />
            </span>
          </div>
          <p className="mt-3 font-display text-xl font-extrabold tracking-[-.04em] text-[#252b43]">
            {recommendedJobs[0]?.role || "No recommendations yet"}
          </p>
          {recommendedJobs[0] && <div className="mt-2 text-xs font-semibold text-[#2563eb]">{recommendedJobs[0].company}</div>}
        </Card>
      </div>
      <div className="grid gap-7 xl:grid-cols-[1.55fr_1fr]">
        <div className="fade-up-3 space-y-4">
          <SectionHeading
            eyebrow="Picked for your path"
            title="Recommended jobs"
            action={
              <Link
                href="/job-seeker/jobs"
                className="text-xs font-bold text-[#147d6d] hover:underline"
                data-testid="link-view-all-jobs"
              >
                View all <ArrowUpRight size={13} className="ml-1 inline" />
              </Link>
            }
          />
          {visibleRecommendedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={saved.includes(job.id)}
              onSave={onSave}
            />
          ))}
          {recommendedJobs.length === 0 && <Card className="p-6 text-sm text-[#64748b]">There are no approved job listings yet. Please check back later.</Card>}
          {recommendedJobs.length > jobsPerPage && <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5">
            <p className="text-[11px] font-medium text-[#64748b]">Page {recommendedPage} of {recommendedTotalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setRecommendedPage((page) => Math.max(1, page - 1))} disabled={recommendedPage === 1} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#2563eb] hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:text-[#94a3b8]">Previous</button>
              {Array.from({ length: recommendedTotalPages }, (_, index) => index + 1).map((page) => <button key={page} onClick={() => setRecommendedPage(page)} className={recommendedPage === page ? "h-7 w-7 rounded-lg bg-[#2563eb] text-[11px] font-bold text-white" : "h-7 w-7 rounded-lg text-[11px] font-bold text-[#64748b] hover:bg-[#eff6ff]"}>{page}</button>)}
              <button onClick={() => setRecommendedPage((page) => Math.min(recommendedTotalPages, page + 1))} disabled={recommendedPage === recommendedTotalPages} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#2563eb] hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:text-[#94a3b8]">Next</button>
            </div>
          </div>}
        </div>
        <div className="space-y-7">
          <Card className="p-5">
            <SectionHeading
              eyebrow="One good next step"
              title="Your next-best action"
            />
            <div className="rounded-xl bg-[#fff0d0] p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-[#f2c96d] p-2 text-[#594718]">
                  <Pencil size={15} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#4a3e20]">
                    Add your case study link
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#77683f]">
                    Recruiters spend 38 seconds on a profile. Give your
                    strongest work a front door.
                  </p>
                  <Link
                    href="/job-seeker/profile"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#9b681d] hover:underline"
                    data-testid="link-action-profile"
                  >
                    Update profile <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeading
              eyebrow="The last few days"
              title="Recent activity"
            />
            <div className="space-y-4">
              {activity.map((item, i) => (
                <div
                  key={item.id}
                  className="flex gap-3"
                  data-testid={`activity-item-${i}`}
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff] text-[#2563eb]"
                  >
                    <FileText size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-5 text-[#4c5160]">You applied to {item.role}</p>
                    <p className="mt-0.5 font-mono-custom text-[9px] uppercase tracking-[.08em] text-[#aaa69d]">
                      {item.date}
                    </p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-sm text-[#64748b]">Your recent activity will appear here.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LegacyJobsPage({
  saved,
  onSave,
  onToast,
  initialQuery = "",
}: {
  saved: string[];
  onSave: (job: Job) => void;
  onToast: (s: string) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState("All work types");
  const [level, setLevel] = useState("All levels");
  const [sort, setSort] = useState("Best match");
  const filtered = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (!query ||
            `${j.role} ${j.company} ${j.tags.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!location ||
            j.location.toLowerCase().includes(location.toLowerCase())) &&
          (remote === "All work types" || j.mode === remote) &&
          (level === "All levels" || j.level === level),
      ),
    [query, location, remote, level],
  );
  return (
    <div className="space-y-7">
      <div className="fade-up flex flex-col gap-2">
        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">
          Opportunity radar
        </p>
        <h1 className="font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">
          Find work worth doing.
        </h1>
        <p className="text-[15px] text-[#777982]">
          Search from roles calibrated to your craft, not just your keywords.
        </p>
      </div>
      <Card className="fade-up-2 p-3 sm:p-4">
        <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-[#e5dccd] bg-[#f8f2e7] px-3">
            <Search size={17} className="text-[#8b8e93]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Role, skill, or company"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#a2a099]"
              data-testid="input-job-keyword"
            />
          </label>
          <LocationSearchInput
            value={location}
            onChange={setLocation}
            label="Search jobs by location"
            placeholder="Search city, region, country, or remote"
            className="!mt-0"
          />
          <button
            onClick={() => onToast(`${filtered.length} roles found`)}
            className="rounded-xl bg-[#147d6d] px-5 py-3 text-sm font-bold text-[#fff9ee] transition hover:bg-[#116e61]"
            data-testid="button-search-jobs"
          >
            Search roles
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#eee5d8] pt-3">
          <select
            value={remote}
            onChange={(e) => setRemote(e.target.value)}
            className="rounded-lg bg-[#f1eadf] px-3 py-2 text-xs font-semibold text-[#5f6370] outline-none"
            data-testid="select-work-type"
          >
            <option>All work types</option>
            <option>Remote</option>
            <option>Hybrid</option>
            <option>On-site</option>
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-lg bg-[#f1eadf] px-3 py-2 text-xs font-semibold text-[#5f6370] outline-none"
            data-testid="select-level"
          >
            <option>All levels</option>
            <option>Senior</option>
            <option>Mid-senior</option>
            <option>Staff</option>
            <option>Lead</option>
          </select>
          <button
            onClick={() => {
              setQuery("");
              setLocation("");
              setRemote("All work types");
              setLevel("All levels");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#8d8c89] hover:bg-[#f1eadf] hover:text-[#3b4050]"
            data-testid="button-clear-filters"
          >
            <X size={13} />
            Clear filters
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs text-[#8d8c89]">
            <SlidersHorizontal size={14} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-transparent font-semibold text-[#5f6370] outline-none"
              data-testid="select-sort"
            >
              <option>Best match</option>
              <option>Newest first</option>
            </select>
          </label>
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#777982]">
          <strong className="text-[#252b43]">{filtered.length}</strong> roles
          that fit your search
        </p>
        <Link
          href="/job-seeker/saved"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147d6d]"
          data-testid="link-saved-from-jobs"
        >
          <Bookmark size={14} /> Saved jobs ({saved.length})
        </Link>
      </div>
      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={saved.includes(job.id)}
              onSave={onSave}
            />
          ))}
        </div>
      ) : (
        <Card className="flex min-h-[310px] flex-col items-center justify-center p-8 text-center">
          <span className="rounded-2xl bg-[#fff0d0] p-4 text-[#b77624]">
            <Filter size={24} />
          </span>
          <h2 className="mt-4 font-display text-xl font-extrabold text-[#252b43]">
            That search is a little too narrow
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#777982]">
            Try a broader title, a nearby location, or remove one of your
            filters. The right next move may be just outside this view.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setLocation("");
              setRemote("All work types");
              setLevel("All levels");
            }}
            className="mt-5 rounded-xl bg-[#147d6d] px-4 py-2.5 text-sm font-bold text-white"
            data-testid="button-reset-empty-search"
          >
            Reset search
          </button>
        </Card>
      )}
    </div>
  );
}

function JobsPage({
  saved,
  onSave,
  onToast,
  initialQuery = "",
}: {
  saved: string[];
  onSave: (job: Job) => void;
  onToast: (s: string) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("All");
  const [experience, setExperience] = useState("All experience");
  const [jobType, setJobType] = useState("All job types");
  const [freshers, setFreshers] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applied, setApplied] = useState<string[]>(() => {
    const email = readCurrentUser()?.email || "";
    return readMarketplaceApplications().filter((application) => String(application.applicant.email || "").toLowerCase() === email.toLowerCase()).map((application) => application.jobId);
  });
  const [marketplacePostings, setMarketplacePostings] = useState<MarketplacePosting[]>(readMarketplacePostings);
  useEffect(() => {
    const syncPostings = () => setMarketplacePostings(readMarketplacePostings());
    window.addEventListener("focus", syncPostings);
    window.addEventListener("storage", syncPostings);
    window.addEventListener("careerly:postings-updated", syncPostings);
    return () => {
      window.removeEventListener("focus", syncPostings);
      window.removeEventListener("storage", syncPostings);
      window.removeEventListener("careerly:postings-updated", syncPostings);
    };
  }, []);
  const approvedJobs = useMemo(() =>
    marketplacePostings
      .filter((job) => job.status === "Approved")
      .sort((a, b) => Number(b.placement === "featured") - Number(a.placement === "featured"))
      .map(marketplacePostingToJob), [marketplacePostings]);
  const visibleJobs = [...approvedJobs, ...jobs];
  const filtered = useMemo(
    () =>
      visibleJobs.filter((job) => {
        const text =
          `${job.role} ${job.company} ${job.tags.join(" ")}`.toLowerCase();
        return (
          (!query || text.includes(query.toLowerCase())) &&
          (!location ||
            job.location.toLowerCase().includes(location.toLowerCase())) &&
          (workMode === "All" || job.mode === workMode) &&
          (experience === "All experience" || job.level === experience) &&
          (jobType === "All job types" || jobType === "Full-time") &&
          (!freshers || job.level.toLowerCase().includes("mid"))
        );
      }),
    [visibleJobs, query, location, workMode, experience, jobType, freshers],
  );
  const apply = (job: Job) => {
    if (!applied.includes(job.id))
      setApplied((current) => [...current, job.id]);
    if (!applied.includes(job.id)) {
      const profile = localStorage.getItem(userDataKey("careerly-seeker-profile"));
      const applications = readMarketplaceApplications();
      const currentUser = readCurrentUser();
      writeMarketplaceApplications([...applications, {
        id: `application-${Date.now()}`, jobId: job.id, jobTitle: job.role, company: job.company,
        applicant: profile ? JSON.parse(profile) : { name: currentUser?.name, email: currentUser?.email, phone: currentUser?.phoneNumber },
        appliedAt: new Date().toISOString(),
        status: "Applied",
      }]);
    }
    onToast(
      applied.includes(job.id)
        ? "Application already submitted"
        : `Application submitted to ${job.company}`,
    );
  };

  if (selectedJob) {
    const related = visibleJobs.filter((job) => job.id !== selectedJob.id).slice(0, 4);
    return (
      <div className="space-y-5">
        <button
          onClick={() => setSelectedJob(null)}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#2563eb]"
        >
          ← Back to search results
        </button>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-5">
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <JobMark job={selectedJob} size="lg" />
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-extrabold tracking-[-.04em] text-[#172554] sm:text-3xl">
                    {selectedJob.role}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#64748b]">
                    <span className="font-semibold text-[#334155]">
                      {selectedJob.company}
                    </span>
                    <span>★ 4.2</span>
                    <span>· 326 reviews</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#52627f]">
                    <span className="inline-flex items-center gap-1.5">
                      <BriefcaseBusiness size={15} />
                      {selectedJob.level} level
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      ₹ {selectedJob.salary}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} />
                      {selectedJob.location}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-4 border-t border-[#edf2f8] pt-5 sm:flex-row sm:items-center">
                <div className="flex flex-wrap gap-4 text-xs text-[#64748b]">
                  <span>
                    Posted:{" "}
                    <b className="text-[#334155]">{selectedJob.posted}</b>
                  </span>
                  <span>
                    Openings: <b className="text-[#334155]">3</b>
                  </span>
                  <span>
                    Applicants: <b className="text-[#334155]">42</b>
                  </span>
                </div>
                <div className="flex gap-2 sm:ml-auto">
                  <button
                    onClick={() => onSave(selectedJob)}
                    className="rounded-full border border-[#2563eb] px-5 py-2.5 text-sm font-bold text-[#2563eb]"
                  >
                    {saved.includes(selectedJob.id) ? "Saved" : "Save"}
                  </button>
                  <button
                    onClick={() => apply(selectedJob)}
                    className="rounded-full bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200"
                  >
                    {applied.includes(selectedJob.id) ? "Applied" : "Apply now"}
                  </button>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm sm:p-7">
              <div className="rounded-xl bg-[#f4f7fc] p-5">
                <h2 className="font-display text-lg font-extrabold text-[#172554]">
                  Job highlights
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#52627f]">
                  <li>
                    {selectedJob.level} candidates with strong{" "}
                    {selectedJob.tags.slice(0, 2).join(" and ")} experience.
                  </li>
                  <li>
                    {selectedJob.description} Collaborate across product,
                    engineering, and research teams.
                  </li>
                </ul>
                <h3 className="mt-5 font-display font-extrabold text-[#172554]">
                  Job match score
                </h3>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                  <span className="text-[#16a34a]">● Skills matched</span>
                  <span className="text-[#16a34a]">● Location matched</span>
                  <span className="text-[#16a34a]">● Experience matched</span>
                  <span className="text-[#f59e0b]">● Early applicant</span>
                </div>
              </div>
              <div className="mt-7">
                <h2 className="font-display text-xl font-extrabold text-[#172554]">
                  Job description
                </h2>
                <p className="mt-4 text-sm font-bold text-[#334155]">
                  Roles and responsibilities
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#52627f]">
                  <li>
                    Own end-to-end discovery and delivery for high-impact
                    product initiatives.
                  </li>
                  <li>
                    Partner with cross-functional teams to translate customer
                    needs into clear solutions.
                  </li>
                  <li>
                    Create scalable systems, document decisions, and raise the
                    quality bar across the team.
                  </li>
                  <li>
                    Use research and product data to continuously improve the
                    customer experience.
                  </li>
                </ul>
                <p className="mt-6 text-sm font-bold text-[#334155]">
                  Job requirements
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#52627f]">
                  <li>
                    Relevant professional experience at the{" "}
                    {selectedJob.level.toLowerCase()} level.
                  </li>
                  <li>
                    Strong communication, problem-solving, and stakeholder
                    management skills.
                  </li>
                  <li>
                    Hands-on expertise with {selectedJob.tags.join(", ")}.
                  </li>
                </ul>
                <dl className="mt-7 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-bold text-[#172554]">Role</dt>
                    <dd className="mt-1 text-[#64748b]">{selectedJob.role}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[#172554]">
                      Employment type
                    </dt>
                    <dd className="mt-1 text-[#64748b]">
                      Full-time, permanent
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[#172554]">Industry</dt>
                    <dd className="mt-1 text-[#64748b]">
                      Technology & Product
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[#172554]">Work mode</dt>
                    <dd className="mt-1 text-[#64748b]">{selectedJob.mode}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[#172554]">Education</dt>
                    <dd className="mt-1 text-[#64748b]">
                      Graduation preferred
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[#172554]">Department</dt>
                    <dd className="mt-1 text-[#64748b]">Product & Design</dd>
                  </div>
                </dl>
                <div className="mt-7">
                  <h3 className="font-display font-extrabold text-[#172554]">
                    Key skills
                  </h3>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Skills marked with ★ are preferred key skills.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedJob.tags.map((tag, index) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#cbd5e1] px-3 py-1.5 text-xs font-semibold text-[#475569]"
                      >
                        {index < 2 ? "★ " : ""}
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-[#edf2f8] pt-5">
                  <div className="flex gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877f2] text-xs font-bold text-white">
                      f
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                      X
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a66c2] text-xs font-bold text-white">
                      in
                    </span>
                  </div>
                  <button
                    onClick={() => onToast("Job report submitted for review")}
                    className="text-xs font-bold text-[#2563eb]"
                  >
                    Report this job
                  </button>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="font-display text-lg font-extrabold text-[#172554]">
                About company
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <JobMark job={selectedJob} />
                <div>
                  <p className="text-sm font-bold text-[#334155]">
                    {selectedJob.company}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    Company profile
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#52627f]">
                Company profile information has not been provided.
              </p>
            </section>
            <section className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-5 sm:p-7">
              <div className="flex gap-3">
                <ShieldCheck className="shrink-0 text-[#ea580c]" size={22} />
                <div>
                  <h2 className="font-display font-extrabold text-[#9a3412]">
                    Beware of imposters
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-[#9a4b22]">
                    Careerly never promises a job or asks for payment in
                    exchange for an interview. Never share OTPs, passwords, or
                    banking information with recruiters.
                  </p>
                </div>
              </div>
            </section>
          </main>
          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-[#172554]">
                  Jobs you might like
                </h2>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-xs font-bold text-[#2563eb]"
                >
                  View all
                </button>
              </div>
              <div className="mt-3 divide-y divide-[#edf2f8]">
                {related.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedJob(job);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex w-full gap-3 py-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#172554]">
                        {job.role}
                      </p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        {job.company}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-[#64748b]">
                        <MapPin size={12} />
                        {job.location}
                      </p>
                    </div>
                    <JobMark job={job} size="sm" />
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
              <h2 className="font-display font-extrabold text-[#172554]">
                Salary insight
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#64748b]">
                Typical range for similar roles in{" "}
                {selectedJob.location.split(",")[0]}.
              </p>
              <p className="mt-4 font-display text-2xl font-extrabold text-[#172554]">
                {selectedJob.salary}
              </p>
              <button
                onClick={() => onToast("Salary insights opened")}
                className="mt-4 text-xs font-bold text-[#2563eb]"
              >
                See detailed insights →
              </button>
            </section>
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
              <h2 className="font-display font-extrabold text-[#172554]">
                Company benefits
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Health cover",
                  "Flexible hours",
                  "Learning budget",
                  "Hybrid work",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-lg bg-[#eff6ff] px-2 py-1.5 text-[10px] font-semibold text-[#1d4ed8]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#2563eb]">
          Discover opportunities
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.05em] text-[#172554] sm:text-4xl">
          Find your next opportunity
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">
          Search approved roles and compare how well each one fits your profile.
        </p>
      </div>
      <section className="rounded-2xl border border-[#dbe4f2] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f2] bg-[#f8faff] px-3">
            <Search size={17} className="text-[#64748b]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Job title, skill, or company"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
          </label>
          <LocationSearchInput
            value={location}
            onChange={setLocation}
            label="Search jobs by location"
            placeholder="Search city, region, country, or remote"
            className="!mt-0"
          />
          <button
            onClick={() => onToast(`${filtered.length} matching jobs found`)}
            className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white"
          >
            Search jobs
          </button>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-[#dbe4f2] bg-white p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-extrabold text-[#172554]">
              Filters
            </h2>
            <button
              onClick={() => {
                setWorkMode("All");
                setExperience("All experience");
                setJobType("All job types");
                setFreshers(false);
                setQuery("");
                setLocation("");
              }}
              className="text-[10px] font-bold text-[#2563eb]"
            >
              Clear all
            </button>
          </div>
          <div className="mt-5 space-y-5">
            <label className="block text-xs font-bold text-[#475569]">
              Work mode
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#dbe4f2] px-2 py-2.5 text-xs"
              >
                <option>All</option>
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-[#475569]">
              Experience
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#dbe4f2] px-2 py-2.5 text-xs"
              >
                <option>All experience</option>
                <option>Mid-senior</option>
                <option>Senior</option>
                <option>Staff</option>
                <option>Lead</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-[#475569]">
              Job type
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#dbe4f2] px-2 py-2.5 text-xs"
              >
                <option>All job types</option>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Internship</option>
                <option>Freelance</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
              <input
                checked={freshers}
                onChange={(e) => setFreshers(e.target.checked)}
                type="checkbox"
                className="accent-[#2563eb]"
              />
              Show fresher-friendly jobs
            </label>
          </div>
        </aside>
        <main>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#64748b]">
              <b className="text-[#172554]">{filtered.length}</b> jobs found
            </p>
            <select className="rounded-lg border border-[#dbe4f2] bg-white px-2 py-2 text-xs font-semibold">
              <option>Best match</option>
              <option>Newest first</option>
              <option>Salary high to low</option>
            </select>
          </div>
          {filtered.length ? (
            <div className="space-y-4">
              {filtered.map((job) => (
                <section
                  key={job.id}
                  className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#93c5fd] hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <JobMark job={job} />
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="font-display text-lg font-extrabold text-[#172554]">
                            {job.role}
                          </h2>
                          <p className="mt-1 text-sm font-semibold text-[#475569]">
                            {job.company}
                          </p>
                        </div>
                        <MatchPill fit={job.fit} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#64748b]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} />
                          {job.location}
                        </span>
                        <span>{job.mode}</span>
                        <span>{job.level}</span>
                        <span>{job.salary}</span>
                      </div>
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#64748b]">
                        {job.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg bg-[#eff6ff] px-2 py-1 text-[10px] font-semibold text-[#1d4ed8]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                    <button
                      onClick={() => onSave(job)}
                      className={`rounded-lg p-2 ${saved.includes(job.id) ? "bg-[#dbeafe] text-[#1d4ed8]" : "text-[#64748b] hover:bg-[#eff6ff]"}`}
                      aria-label="Save job"
                    >
                      {saved.includes(job.id) ? (
                        <BookmarkCheck size={19} />
                      ) : (
                        <Bookmark size={19} />
                      )}
                    </button>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-[#edf2f8] pt-4">
                    <span className="text-[10px] font-semibold text-[#94a3b8]">
                      Posted {job.posted}
                    </span>
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="text-xs font-bold text-[#2563eb]"
                    >
                      View full details →
                    </button>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="rounded-2xl border border-dashed border-[#bfd1ef] bg-white p-12 text-center">
              <Search className="mx-auto text-[#93c5fd]" />
              <h2 className="mt-4 font-display text-xl font-extrabold">
                No matching jobs
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Try removing a filter or searching with a broader title.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function ApplicationsPage({
  applications,
  onStage,
  onToast,
}: {
  applications: Application[];
  onStage: (id: string, stage: string) => void;
  onToast: (s: string) => void;
}) {
  const [filter, setFilter] = useState("All");
  const stages = [
    "All",
    "Applied",
    "Screening",
    "Interview",
    "Offer",
    "Not selected",
  ];
  const counts = Object.fromEntries(
    stages.map((s) => [
      s,
      s === "All"
        ? applications.length
        : applications.filter((a) => a.stage === s).length,
    ]),
  );
  const filtered =
    filter === "All"
      ? applications
      : applications.filter((a) => a.stage === filter);
  const tone = (stage: string) =>
    stage === "Offer"
      ? "bg-[#e1f1e9] text-[#147d6d]"
      : stage === "Interview"
        ? "bg-[#fff0d0] text-[#a37020]"
        : stage === "Not selected"
          ? "bg-[#f1e5df] text-[#a65b49]"
          : "bg-[#e9ebf1] text-[#5e6578]";
  return (
    <div className="space-y-7">
      <div className="fade-up flex items-end justify-between gap-4">
        <div>
          <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">
            Your search in motion
          </p>
          <h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">
            Applications
          </h1>
          <p className="mt-2 text-[15px] text-[#777982]">
            A clear view of every conversation and next step.
          </p>
        </div>
        <button
          onClick={() => onToast("Open Find jobs to start a new application")}
          className="hidden items-center gap-2 rounded-xl bg-[#147d6d] px-4 py-2.5 text-sm font-bold text-white sm:flex"
          data-testid="button-add-application"
        >
          <Plus size={16} />
          Add application
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-[#e3dacb] pb-px">
        {stages.map((stage) => (
          <button
            key={stage}
            onClick={() => setFilter(stage)}
            className={`shrink-0 border-b-2 px-1 pb-3 text-xs font-bold transition ${filter === stage ? "border-[#147d6d] text-[#147d6d]" : "border-transparent text-[#85878d] hover:text-[#3d4353]"}`}
            data-testid={`button-filter-${stage.toLowerCase().replace(" ", "-")}`}
          >
            {stage}{" "}
            <span
              className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] ${filter === stage ? "bg-[#e1f1e9]" : "bg-[#eee8de]"}`}
            >
              {counts[stage]}
            </span>
          </button>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 border-b border-[#eee5d8] bg-[#f8f2e7] px-5 py-3 font-mono-custom text-[9px] font-bold uppercase tracking-[.12em] text-[#949188] md:grid">
          <span>Role</span>
          <span>Stage</span>
          <span>Last updated</span>
          <span>Next step</span>
          <span />
        </div>
        {filtered.map((app, i) => (
          <div
            key={app.id}
            className={`grid gap-3 px-5 py-4 transition hover:bg-[#faf5eb] md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center ${i < filtered.length - 1 ? "border-b border-[#eee5d8]" : ""}`}
            data-testid={`application-row-${app.id}`}
          >
            <div className="flex items-center gap-3">
              <JobMark job={app} size="sm" />
              <div>
                <p className="font-display text-sm font-bold text-[#303548]">
                  {app.role}
                </p>
                <p className="text-xs text-[#888a91]">
                  {app.company} · {app.location}
                </p>
              </div>
            </div>
            <div>
              <select
                value={app.stage}
                onChange={(e) => onStage(app.id, e.target.value)}
                className={`rounded-full border-0 px-2.5 py-1.5 text-[10px] font-bold outline-none ${tone(app.stage)}`}
                data-testid={`select-stage-${app.id}`}
              >
                {stages.slice(1).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-[#7e8088]">
              <span className="md:hidden font-semibold text-[#a4a198]">
                Updated ·{" "}
              </span>
              {app.date}
            </div>
            <div className="text-xs text-[#626674]">
              {app.next || (
                <span className="text-[#aaa59d]">No action yet</span>
              )}
            </div>
            <button
              className="hidden rounded-lg p-2 text-[#9b9a96] hover:bg-[#eee8de] hover:text-[#252b43] md:block"
              aria-label={`More actions for ${app.role}`}
              data-testid={`button-more-application-${app.id}`}
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SavedPage({
  saved,
  onSave,
}: {
  saved: string[];
  onSave: (job: Job) => void;
}) {
  const [availableJobs, setAvailableJobs] = useState<Job[]>(() =>
    readMarketplacePostings().filter((posting) => posting.status === "Approved").map(marketplacePostingToJob),
  );
  useEffect(() => {
    const syncJobs = () => setAvailableJobs(
      readMarketplacePostings().filter((posting) => posting.status === "Approved").map(marketplacePostingToJob),
    );
    window.addEventListener("careerly:postings-updated", syncJobs);
    window.addEventListener("storage", syncJobs);
    return () => {
      window.removeEventListener("careerly:postings-updated", syncJobs);
      window.removeEventListener("storage", syncJobs);
    };
  }, []);
  const list = availableJobs.filter((job) => saved.includes(job.id));
  return (
    <div className="space-y-7">
      <div className="fade-up">
        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">
          Keep them close
        </p>
        <h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">
          Saved jobs
        </h1>
        <p className="mt-2 text-[15px] text-[#777982]">
          Roles you want to come back to, without the mental tab overload.
        </p>
      </div>
      {list.length ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {list.map((job) => (
              <JobCard key={job.id} job={job} saved onSave={onSave} />
            ))}
          </div>
          <div className="rounded-2xl border border-dashed border-[#ddcdb6] bg-[#f4ecdd] p-5 text-center">
            <p className="text-sm font-semibold text-[#6f6a60]">
              A short list is a strong list.
            </p>
            <p className="mt-1 text-xs text-[#908979]">
              You have {list.length} roles worth a closer look. Pick one to
              research today.
            </p>
          </div>
        </>
      ) : (
        <Card className="flex min-h-[380px] flex-col items-center justify-center p-8 text-center">
          <span className="rounded-2xl bg-[#e1f1e9] p-4 text-[#147d6d]">
            <Bookmark size={25} />
          </span>
          <h2 className="mt-4 font-display text-xl font-extrabold text-[#252b43]">
            Your shortlist starts here
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#777982]">
            Save a role that sparks something. We’ll keep it here while you do
            your research.
          </p>
          <Link
            href="/job-seeker/jobs"
            className="mt-5 rounded-xl bg-[#147d6d] px-4 py-2.5 text-sm font-bold text-white"
            data-testid="link-find-first-job"
          >
            Explore roles
          </Link>
        </Card>
      )}
    </div>
  );
}

function LegacyProfilePage({ onToast }: { onToast: (s: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Arjun Mehta");
  const [headline, setHeadline] = useState(
    "Product designer turning complex systems into clear, useful tools.",
  );
  const [location, setLocation] = useState("Brooklyn, NY");
  const [available, setAvailable] = useState(true);
  return (
    <div className="space-y-7">
      <div className="fade-up flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">
            Your public signal
          </p>
          <h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">
            My profile
          </h1>
          <p className="mt-2 text-[15px] text-[#777982]">
            The clearest version of your work, in one place.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(!editing);
            if (editing) onToast("Profile changes saved");
          }}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#147d6d] px-4 py-2.5 text-sm font-bold text-white"
          data-testid="button-edit-profile"
        >
          {editing ? <Check size={16} /> : <Pencil size={15} />}
          {editing ? "Save changes" : "Edit profile"}
        </button>
      </div>
      <div className="grid gap-7 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <div className="h-24 bg-[#252b43] relative">
            <div className="absolute -bottom-10 left-6 flex h-20 w-20 items-center justify-center rounded-[22px] border-4 border-[#fbf7ef] bg-[#e88558] font-display text-xl font-extrabold text-white">
              AM
            </div>
          </div>
          <div className="p-6 pt-14">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div className="space-y-3">
                {editing ? (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                    className="w-full rounded-lg border border-[#d9cdbb] bg-[#f8f2e7] px-3 py-2 font-display text-xl font-extrabold text-[#252b43] outline-none focus:border-[#147d6d]"
                    data-testid="input-profile-name"
                  />
                ) : (
                  <h2
                    className="font-display text-2xl font-extrabold tracking-[-.04em] text-[#252b43]"
                    data-testid="text-profile-name"
                  >
                    {name}
                  </h2>
                )}
                {editing ? (
                  <textarea
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    rows={2}
                    maxLength={160}
                    placeholder="e.g. Frontend engineer focused on accessible products"
                    className="w-full rounded-lg border border-[#d9cdbb] bg-[#f8f2e7] px-3 py-2 text-sm text-[#626675] outline-none focus:border-[#147d6d]"
                    data-testid="input-profile-headline"
                  />
                ) : (
                  <p className="max-w-lg text-sm leading-6 text-[#676b78]">
                    {headline}
                  </p>
                )}
              </div>
              <div className="flex h-fit items-center gap-2 rounded-full bg-[#e1f1e9] px-3 py-1.5 text-xs font-bold text-[#147d6d]">
                <span
                  className={`h-2 w-2 rounded-full ${available ? "bg-[#31a77c]" : "bg-[#a5a29c]"}`}
                />
                {available ? "Open to opportunities" : "Not looking right now"}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#85868a]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} />
                {editing ? (
                  <LocationSearchInput
                    value={location}
                    onChange={setLocation}
                    label="Profile location"
                    placeholder="Search city or region"
                    className="!mt-0 min-w-[220px]"
                  />
                ) : (
                  location
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseBusiness size={14} />6 years experience
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Link2 size={14} />
                arjunmehta.design
              </span>
            </div>
            <div className="mt-7 border-t border-[#eee5d8] pt-6">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[#99958d]">
                Core strengths
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Product design",
                  "User research",
                  "Design systems",
                  "Prototyping",
                  "Facilitation",
                  "Figma",
                ].map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg bg-[#f1eadf] px-3 py-1.5 text-xs font-semibold text-[#5e6370]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-extrabold text-[#252b43]">
                  Profile strength
                </p>
                <p className="mt-1 text-xs text-[#888a91]">
                  Good foundation. A few details will help.
                </p>
              </div>
              <ProgressRing value={78} />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#ece4d7]">
              <div className="h-full w-[78%] rounded-full bg-[#147d6d]" />
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Portfolio link", true],
                ["Resume", true],
                ["Work preferences", true],
                ["About your approach", false],
              ].map(([label, done]) => (
                <div
                  key={label as string}
                  className="flex items-center justify-between"
                >
                  <span className="text-[#626675]">{label as string}</span>
                  {done ? (
                    <Check size={16} className="text-[#147d6d]" />
                  ) : (
                    <button
                      className="text-xs font-bold text-[#e17a58] hover:underline"
                      onClick={() => setEditing(true)}
                      data-testid={`button-add-${(label as string).toLowerCase().replaceAll(" ", "-")}`}
                    >
                      Add now
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-[#fae6dc] p-2.5 text-[#d06145]">
                <FileText size={18} />
              </span>
              <div>
                <p className="font-display font-extrabold text-[#252b43]">
                  Resume.pdf
                </p>
                <p className="text-xs text-[#85868a]">
                  Uploaded May 29 · 1.4 MB
                </p>
              </div>
              <button
                className="ml-auto rounded-lg p-2 text-[#878985] hover:bg-[#f1eadf]"
                aria-label="Resume options"
                data-testid="button-resume-options"
              >
                <MoreHorizontal size={17} />
              </button>
            </div>
            <button
              onClick={() => onToast("Resume upload is ready")}
              className="mt-4 w-full rounded-lg border border-dashed border-[#cfc2af] py-2 text-xs font-bold text-[#147d6d] hover:bg-[#f7f0e5]"
              data-testid="button-update-resume"
            >
              Update resume
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ onToast }: { onToast: (s: string) => void }) {
  const currentUser = readCurrentUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(() => currentUser?.name || "");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [email, setEmail] = useState(() => currentUser?.email || "");
  const [phone, setPhone] = useState(() => currentUser?.phoneNumber || "");
  const [resumeName, setResumeName] = useState("No resume uploaded");
  const [resumeStatus, setResumeStatus] = useState(
    "Add your details to complete your profile.",
  );
  const [resumeParsing, setResumeParsing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(Boolean(currentUser?.id && isUuid(currentUser.id)));
  const [profileLoadError, setProfileLoadError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [contactVisibility, setContactVisibility] = useState<"private" | "recruiters">("private");
  const [strengthInput, setStrengthInput] = useState("");
  const [experiences, setExperiences] = useState<Array<{ role: string; company: string; period: string }>>([]);
  const [educations, setEducations] = useState<Array<{ degree: string; school: string; period: string }>>([]);
  const [certificates, setCertificates] = useState<Array<{ name: string; issuer: string; year: string }>>([]);
  useEffect(() => {
    let mounted = true;
    const storageKey = userDataKey("careerly-seeker-profile", currentUser?.email);
    const applyProfile = (profile: Partial<JobSeekerProfile>) => {
      if (profile.headline) setHeadline(profile.headline);
      if (profile.location) setLocation(profile.location);
      if (profile.addressLine) setAddressLine(profile.addressLine);
      if (profile.city) setCity(profile.city);
      if (profile.state) setState(profile.state);
      if (profile.pincode) setPincode(profile.pincode);
      if (profile.phone) setPhone(profile.phone);
      if (profile.contactVisibility) setContactVisibility(profile.contactVisibility);
      if (Array.isArray(profile.strengths)) setStrengths(profile.strengths);
      if (Array.isArray(profile.educations)) setEducations(profile.educations);
      if (Array.isArray(profile.experiences)) setExperiences(profile.experiences);
      if (Array.isArray(profile.certificates)) setCertificates(profile.certificates);
      if (profile.resumeName) setResumeName(profile.resumeName);
    };
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try { applyProfile(JSON.parse(cached) as Partial<JobSeekerProfile>); }
      catch { setProfileLoadError("Saved profile data could not be read. Save your profile to replace it."); }
    }
    if (!currentUser?.id || !isUuid(currentUser.id)) {
      setProfileLoading(false);
      return () => { mounted = false; };
    }
    apiRequest<{ profile: JobSeekerProfile }>("/users/me/profile")
      .then(({ profile }) => {
        if (!mounted) return;
        applyProfile(profile);
        localStorage.setItem(storageKey, JSON.stringify(profile));
        setProfileLoadError("");
        setProfileLoading(false);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setProfileLoadError(`Could not load the latest server profile: ${error instanceof Error ? error.message : "Request failed"}`);
        setProfileLoading(false);
      });
    return () => { mounted = false; };
  }, []);
  const addStrength = () => {
    const value = strengthInput.trim();
    if (value && !strengths.includes(value)) {
      setStrengths([...strengths, value]);
      setStrengthInput("");
    }
  };
  const addExperience = () =>
    setExperiences([
      ...experiences,
      { role: "New role", company: "Company name", period: "Start — Present" },
    ]);
  const addEducation = () =>
    setEducations([
      ...educations,
      {
        degree: "Degree or qualification",
        school: "Institution name",
        period: "Start — End",
      },
    ]);
  const addCertificate = () =>
    setCertificates([
      ...certificates,
      {
        name: "New certificate",
        issuer: "Issuing organization",
        year: String(new Date().getFullYear()),
      },
    ]);
  const parseResume = async (file: File) => {
    setResumeName(file.name);
    setResumeParsing(true);
    setResumeStatus("Reading resume and identifying profile sections...");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let text = "";
      if (extension === "pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const pdf = await pdfjsLib.getDocument({
          data: await file.arrayBuffer(),
        }).promise;
        const pages = await Promise.all(
          Array.from({ length: pdf.numPages }, async (_, index) => {
            const page = await pdf.getPage(index + 1);
            const content = await page.getTextContent();
            // PDF text is positioned rather than stored as paragraphs. Grouping
            // items by their Y coordinate preserves the résumé's visible lines.
            const textItems = content.items
              .filter((item) => "str" in item && item.str.trim())
              .map((item) => ({
                text: "str" in item ? item.str.trim() : "",
                // A small bucket accounts for tiny baseline differences within
                // one visual row, common in two-column résumé templates.
                y: "transform" in item ? Math.round(item.transform[5] / 3) * 3 : 0,
                x: "transform" in item ? item.transform[4] : 0,
              }));
            const rows = new Map<number, { text: string; x: number }[]>();
            textItems.forEach(({ text: itemText, x, y }) => {
              const row = rows.get(y) ?? [];
              row.push({ text: itemText, x });
              rows.set(y, row);
            });
            return [...rows.entries()]
              .sort(([firstY], [secondY]) => secondY - firstY)
              .map(([, row]) =>
                row
                  .sort((first, second) => first.x - second.x)
                  .map((item) => item.text)
                  .join(" "),
              )
              .join("\n");
          }),
        );
        text = pages.join("\n");
      } else if (extension === "docx") {
        const { default: mammoth } = await import("mammoth");
        const result = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        });
        text = result.value;
      } else {
        text = await file.text();
      }
      const normalized = text.replace(/\r/g, "");
      const lines = normalized
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (!normalized.trim()) {
        throw new Error("No selectable text was found in this resume");
      }
      let extractedCount = 0;
      const foundEmail = normalized.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
      )?.[0];
      const foundPhone = normalized
        .match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d[\d\s.-]{7,}\d/g)
        ?.find((value) => value.replace(/\D/g, "").length >= 10);
      const firstLine = lines.find((line) =>
        /^[A-Za-z][A-Za-z .'-]{2,60}$/.test(line),
      );
      if (firstLine) {
        setName(firstLine);
        extractedCount++;
      }
      if (foundEmail) {
        setEmail(foundEmail);
        extractedCount++;
      }
      if (foundPhone) {
        setPhone(foundPhone);
        extractedCount++;
      }
      const addressLine = lines.find(
        (line) =>
          line.length < 110 &&
          /\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|suite|apt\.?|floor|building|district|city|state|[1-9]\d{5})\b/i.test(
            line,
          ),
      );
      if (addressLine) {
        setAddressLine(addressLine);
        setLocation(addressLine);
        const indianPin = addressLine.match(/\b[1-9]\d{5}\b/)?.[0];
        if (indianPin) setPincode(indianPin);
        extractedCount++;
      }
      const allSectionHeadings = /^(?:work\s+experience|experience|employment|professional\s+experience|education|academic(?:\s+background)?|qualifications?|skills|technical\s+skills|core\s+competencies|projects?|certifications?)/i;
      const section = (heading: RegExp) => {
        const index = lines.findIndex((line) => heading.test(line));
        if (index < 0) return [];
        const inlineContent = lines[index].replace(heading, "").trim();
        const result = inlineContent ? [inlineContent] : [];
        for (const line of lines.slice(index + 1)) {
          if (allSectionHeadings.test(line)) break;
          result.push(line);
          if (result.length === 60) break;
        }
        return result;
      };
      const dateRange = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}\s*[â€“â€”–—-]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}|present)/i;
      const cleanResumeLine = (line: string) =>
        line.replace(/^[â€¢•\-–—\s]+/, "").replace(/\s+/g, " ").trim();
      const isBullet = (line: string) => /^[â€¢•\-]/.test(line.trim());
      const experienceLines = section(/^(?:work\s+)?experience|^employment|^professional\s+experience/i);
      const parsedExperiences = experienceLines
        .map((line, index) => ({ line: cleanResumeLine(line), index }))
        .filter(({ line }) => !isBullet(line) && dateRange.test(line))
        .map(({ line, index }) => {
          const range = line.match(dateRange)?.[0] ?? "Dates";
          const role = cleanResumeLine(line.replace(dateRange, "")) || "Role";
          const companyLine = experienceLines
            .slice(index + 1)
            .map(cleanResumeLine)
            .find((candidate) => candidate && !isBullet(candidate) && !dateRange.test(candidate));
          return {
            role,
            company: companyLine || "Company",
            period: range.replace(/â€“|â€”/g, "—"),
          };
        });
      if (parsedExperiences.length) {
        setExperiences(parsedExperiences);
        extractedCount++;
      }
      const educationLines = section(/^education|^academic|^qualifications?/i);
      const degreeLine = educationLines
        .map(cleanResumeLine)
        .find((line) => /\b(?:bachelor|master|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|bca|mca|diploma|ph\.?d)\b/i.test(line));
      const educationPeriod = educationLines
        .map(cleanResumeLine)
        .find((line) => dateRange.test(line))
        ?.match(dateRange)?.[0];
      const schoolLine = educationLines
        .map(cleanResumeLine)
        .find((line) =>
          !isBullet(line) &&
          !line.includes(degreeLine ?? "") &&
          !dateRange.test(line),
        );
      if (degreeLine || schoolLine) {
        setEducations([
          {
            degree: degreeLine?.replace(dateRange, "").trim() || "Qualification",
            school: schoolLine || "Institution",
            period: educationPeriod?.replace(/â€“|â€”/g, "—") || "Dates",
          },
        ]);
        extractedCount++;
      }
      const skillLines = section(/^skills|^technical\s+skills|^core\s+competencies/i)
        .join(",")
        .split(/[,|•]/)
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 1 && skill.length < 40)
        .slice(0, 10);
      if (skillLines.length) {
        setStrengths(skillLines);
        extractedCount++;
      }
      setEditing(true);
      setResumeStatus(
        extractedCount
          ? `${extractedCount} profile section${extractedCount === 1 ? "" : "s"} extracted. Review and edit the fields, then save your profile.`
          : "No profile details could be confidently identified. Please complete the editable fields manually.",
      );
      onToast(
        extractedCount
          ? "Resume parsed and profile fields updated"
          : "Resume needs manual profile details",
      );
    } catch (error) {
      console.error(error);
      setResumeStatus(
        "The resume was uploaded, but some text could not be extracted. Add or correct the details manually below.",
      );
      setEditing(true);
      onToast("Resume uploaded — manual review needed");
    } finally {
      setResumeParsing(false);
    }
  };
  const profileData: JobSeekerProfile = {
    headline,
    location: location || city,
    addressLine,
    city,
    state,
    pincode,
    phone: currentUser?.phoneNumber || phone,
    contactVisibility,
    strengths,
    educations,
    experiences,
    certificates,
    resumeName,
  };
  const profileChecklist = [
    ["Professional headline", Boolean(headline.trim())],
    ["Location", Boolean(city.trim() || location.trim())],
    ["Skills", strengths.length > 0],
    ["Experience", experiences.length > 0],
    ["Education", educations.length > 0],
    ["Resume", Boolean(resumeName && resumeName !== "No resume uploaded")],
    ["Certifications", certificates.length > 0],
  ] as const;
  const profileStrength = Math.round(
    (profileChecklist.filter(([, complete]) => complete).length / profileChecklist.length) * 100,
  );
  const saveProfile = async () => {
    const normalizedEmailAddress = email.trim().toLowerCase();
    if (name.trim().length < 2 || name.trim().length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmailAddress)) {
      onToast("Enter a valid name and email address");
      return;
    }
    if (pincode && !/^[1-9]\d{5}$/.test(pincode)) {
      onToast("Enter a valid 6-digit PIN code");
      return;
    }
    if (currentUser?.phoneNumber && phone.replace(/\D/g, "").slice(-10) !== currentUser.phoneNumber) {
      onToast("Your profile phone number must match your verified account phone");
      return;
    }
    setSavingProfile(true);
    try {
      if (currentUser?.id && isUuid(currentUser.id)) {
        await persistJobSeekerIdentity(name, normalizedEmailAddress, currentUser.email || email, profileData);
      } else {
        localStorage.setItem("careerly-current-user", JSON.stringify({ ...currentUser, name: name.trim(), email: normalizedEmailAddress }));
        localStorage.setItem(localAccountsKey, JSON.stringify(readLocalAccounts().map((account) =>
          normalizedEmail(account.email) === normalizedEmail(currentUser?.email || email)
            ? { ...account, name: name.trim(), email: normalizedEmailAddress }
            : account,
        )));
        localStorage.setItem(userDataKey("careerly-seeker-profile", normalizedEmailAddress), JSON.stringify(profileData));
        window.dispatchEvent(new CustomEvent("careerly:profile-updated"));
      }
      setProfileLoadError("");
      setEditing(false);
      onToast(currentUser?.id && isUuid(currentUser.id)
        ? "Profile saved to your account"
        : "Profile saved on this device; sign in to sync across devices");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Profile could not be saved");
    } finally {
      setSavingProfile(false);
    }
  };
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">
            Your public signal
          </p>
          <h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">
            My profile
          </h1>
          <p className="mt-2 text-[15px] text-[#777982]">
            Keep your story current and your strongest work visible.
          </p>
        </div>
        <button
          onClick={() => editing ? void saveProfile() : setEditing(true)}
          disabled={savingProfile || profileLoading}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#147d6d] px-4 py-2.5 text-sm font-bold text-white"
          data-testid="button-edit-profile"
        >
          {editing ? savingProfile ? null : <Check size={16} /> : <Pencil size={15} />}
          {editing ? savingProfile ? "Saving…" : "Save changes" : "Edit profile"}
        </button>
      </div>
      {profileLoading && <Card className="p-4 text-sm text-[#475569]">Loading your saved profile…</Card>}
      {profileLoadError && <div role="alert" className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm text-[#9a3412]">{profileLoadError}</div>}
      {!profileLoading && <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="font-display font-extrabold text-[#172554]">Profile checklist</p>
            <p className="mt-1 text-xs text-[#64748b]">Complete these sections to help recruiters understand your experience.</p>
          </div>
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1d4ed8]">{profileChecklist.filter(([, complete]) => complete).length} of {profileChecklist.length} complete · {profileStrength}%</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {profileChecklist.map(([label, complete]) => <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${complete ? "bg-[#eff6ff] text-[#1d4ed8]" : "bg-[#f8fafc] text-[#64748b]"}`}><span aria-hidden="true">{complete ? "✓" : "○"}</span>{label}</div>)}
        </div>
      </Card>}
      <div className="grid gap-7 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <div className="h-24 bg-[#252b43]" />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <Avatar initials={name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()} />
              <div className="min-w-0 flex-1">
                {editing ? (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-[#d9cdbb] bg-[#f8f2e7] px-3 py-2 font-display text-xl font-extrabold outline-none"
                  />
                ) : (
                  <h2 className="font-display text-2xl font-extrabold">
                    {name}
                  </h2>
                )}
                {editing ? (
                  <textarea
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-[#d9cdbb] bg-[#f8f2e7] px-3 py-2 text-sm outline-none"
                  />
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[#676b78]">
                    {headline}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1.5 text-xs text-[#85868a]">
                  <MapPin size={14} />
                  {editing ? (
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <label className="sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#99958d]">Address line</span>
                        <input
                          value={addressLine}
                          onChange={(e) => setAddressLine(e.target.value)}
                          placeholder="House/flat no., building, street"
                          className="mt-1 w-full border-b bg-transparent outline-none"
                        />
                      </label>
                      <label>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#99958d]">City / district</span>
                        <LocationSearchInput
                          value={city}
                          onChange={(value) => { setCity(value); setLocation(value); }}
                          label="Profile city or district"
                          placeholder="Search city or district"
                          className="!mt-1"
                        />
                      </label>
                      <label>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#99958d]">State</span>
                        <input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="State"
                          className="mt-1 w-full border-b bg-transparent outline-none"
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#99958d]">PIN code</span>
                        <input
                          inputMode="numeric"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="6-digit PIN code"
                          className="mt-1 w-full border-b bg-transparent outline-none"
                        />
                      </label>
                    </div>
                  ) : (
                    [addressLine, city, state, pincode].filter(Boolean).join(", ") || location
                  )}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {editing ? (
                    <label className="text-[10px] font-bold uppercase tracking-wide text-[#99958d]">
                      Email
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        className="mt-1 w-full rounded-lg border border-[#d9cdbb] bg-[#f8f2e7] px-3 py-2 text-xs normal-case outline-none"
                      />
                    </label>
                  ) : (
                    <p className="text-xs text-[#676b78]">
                      <Mail size={13} className="mr-1.5 inline" />
                      {email}
                    </p>
                  )}
                  {editing ? (
                    <label className="text-[10px] font-bold uppercase tracking-wide text-[#99958d]">
                      Phone
                      <input
                        value={phone}
                        readOnly
                        aria-describedby="verified-phone-help"
                        className="mt-1 w-full rounded-lg border border-[#d9cdbb] bg-[#f8f2e7] px-3 py-2 text-xs normal-case outline-none"
                      />
                      <span id="verified-phone-help" className="mt-1 block text-[10px] font-medium normal-case text-[#64748b]">Your verified phone is managed in account security.</span>
                    </label>
                  ) : (
                    <p className="text-xs text-[#676b78]">
                      <CircleUserRound size={13} className="mr-1.5 inline" />
                      {phone}
                    </p>
                  )}
                </div>
                {editing && (
                  <label className="mt-3 block max-w-sm text-[10px] font-bold uppercase tracking-wide text-[#99958d]">
                    Contact details visible to
                    <select
                      value={contactVisibility}
                      onChange={(event) => setContactVisibility(event.target.value as "private" | "recruiters")}
                      className="mt-1 w-full rounded-lg border border-[#d9cdbb] bg-white px-3 py-2 text-xs normal-case text-[#334155] outline-none focus:border-[#2563eb]"
                    >
                      <option value="private">Only me (recommended)</option>
                      <option value="recruiters">Recruiters for jobs I apply to</option>
                    </select>
                    <span className="mt-1 block font-medium normal-case text-[#64748b]">Recruiters only receive your contact details when you choose to share them.</span>
                  </label>
                )}
              </div>
            </div>
            <section className="mt-7 border-t border-[#eee5d8] pt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[.12em] text-[#99958d]">
                  Education
                </p>
                {editing && (
                  <button
                    onClick={addEducation}
                    className="text-xs font-bold text-[#147d6d]"
                  >
                    + Add education
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {educations.map((item, index) => (
                  <div key={index} className="rounded-xl bg-[#f8f2e7] p-3">
                    {editing ? (
                      <div className="relative grid gap-2 pr-8 sm:grid-cols-3">
                        {(["degree", "school", "period"] as const).map(
                          (field) => (
                            <input
                              key={field}
                              value={item[field]}
                              onChange={(event) =>
                                setEducations(
                                  educations.map((entry, entryIndex) =>
                                    entryIndex === index
                                      ? {
                                          ...entry,
                                          [field]: event.target.value,
                                        }
                                      : entry,
                                  ),
                                )
                              }
                              placeholder={field}
                              className="rounded-md border border-[#ded3c3] bg-white px-2 py-1.5 text-xs outline-none"
                            />
                          ),
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEducations(educations.filter((_, itemIndex) => itemIndex !== index))
                          }
                          aria-label={`Remove education ${index + 1}`}
                          title="Remove education"
                          className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#a26d5d] transition hover:bg-[#f2ddd8] hover:text-[#8d4030]"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-[#3e4352]">
                          {item.degree}
                        </p>
                        <p className="mt-1 text-xs text-[#777982]">
                          {item.school} · {item.period}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="mt-7 border-t border-[#eee5d8] pt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[.12em] text-[#99958d]">
                  Core strengths
                </p>
                {editing && (
                  <button
                    onClick={addStrength}
                    className="text-xs font-bold text-[#147d6d]"
                  >
                    + Add strength
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {strengths.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 rounded-lg bg-[#f1eadf] px-3 py-1.5 text-xs font-semibold text-[#5e6370]"
                  >
                    {skill}
                    {editing && (
                      <button
                        onClick={() =>
                          setStrengths(
                            strengths.filter((item) => item !== skill),
                          )
                        }
                        aria-label={`Remove ${skill}`}
                        className="ml-1 text-[#a26d5d] hover:text-[#8d4030]"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {editing && (
                <input
                  value={strengthInput}
                  onChange={(e) => setStrengthInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStrength();
                    }
                  }}
                  placeholder="Type a strength and press Enter"
                  className="mt-3 w-full rounded-lg border border-dashed border-[#cfc2af] bg-[#f8f2e7] px-3 py-2 text-xs outline-none"
                />
              )}
            </section>
            <section className="mt-7 border-t border-[#eee5d8] pt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[.12em] text-[#99958d]">
                  Experience
                </p>
                {editing && (
                  <button
                    onClick={addExperience}
                    className="text-xs font-bold text-[#147d6d]"
                  >
                    + Add experience
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {experiences.map((item, index) => (
                  <div key={index} className="rounded-xl bg-[#f8f2e7] p-3">
                    {editing ? (
                      <div className="relative grid gap-2 pr-8 sm:grid-cols-3">
                        {(["role", "company", "period"] as const).map(
                          (field) => (
                            <input
                              key={field}
                              value={item[field]}
                              onChange={(e) =>
                                setExperiences(
                                  experiences.map((entry, i) =>
                                    i === index
                                      ? { ...entry, [field]: e.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              className="rounded-md border border-[#ded3c3] bg-white px-2 py-1.5 text-xs outline-none"
                            />
                          ),
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setExperiences(experiences.filter((_, itemIndex) => itemIndex !== index))
                          }
                          aria-label={`Remove experience ${index + 1}`}
                          title="Remove experience"
                          className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#a26d5d] transition hover:bg-[#f2ddd8] hover:text-[#8d4030]"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-[#3e4352]">
                          {item.role}
                        </p>
                        <p className="mt-1 text-xs text-[#777982]">
                          {item.company} · {item.period}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="mt-7 border-t border-[#eee5d8] pt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[.12em] text-[#99958d]">
                  Certificates
                </p>
                {editing && (
                  <button
                    onClick={addCertificate}
                    className="text-xs font-bold text-[#147d6d]"
                  >
                    + Add certificate
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {certificates.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[#e5dacb] p-3"
                  >
                    {editing ? (
                      <div className="relative space-y-2 pr-8">
                        {(["name", "issuer", "year"] as const).map((field) => (
                          <input
                            key={field}
                            value={item[field]}
                            onChange={(e) =>
                              setCertificates(
                                certificates.map((entry, i) =>
                                  i === index
                                    ? { ...entry, [field]: e.target.value }
                                    : entry,
                                ),
                              )
                            }
                            className="w-full rounded-md border border-[#ded3c3] bg-[#fffdf8] px-2 py-1.5 text-xs outline-none"
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setCertificates(certificates.filter((_, itemIndex) => itemIndex !== index))
                          }
                          aria-label={`Remove certificate ${index + 1}`}
                          title="Remove certificate"
                          className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#a26d5d] transition hover:bg-[#f2ddd8] hover:text-[#8d4030]"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-[#3e4352]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-[#777982]">
                          {item.issuer} · {item.year}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="font-display text-lg font-extrabold">
              Profile strength
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ece4d7]">
              <div className="h-full w-[86%] rounded-full bg-[#147d6d]" />
            </div>
            <p className="mt-3 text-xs text-[#777982]">
              Add a portfolio link to make your profile stand out.
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[#e1f1e9] p-2.5 text-[#147d6d]">
                <FileText size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display font-extrabold">
                  {resumeName}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#777982]">
                  {resumeStatus}
                </p>
              </div>
            </div>
            <label
              className={`mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfc2af] px-3 py-3 text-xs font-bold text-[#147d6d] hover:bg-[#f7f0e5] ${resumeParsing ? "pointer-events-none opacity-60" : ""}`}
            >
              <FileText size={15} />
              {resumeParsing
                ? "Extracting details..."
                : "Upload or replace resume"}
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void parseResume(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="mt-2 text-center text-[10px] text-[#99958d]">
              PDF, DOCX or text · parsed privately in your browser
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LegacyMessagesPage({ onToast }: { onToast: (s: string) => void }) {
  const [active, setActive] = useState("maya");
  const [draft, setDraft] = useState("");
  const threads = [
    {
      id: "maya",
      name: "Maya Chen",
      company: "Figma",
      initials: "MC",
      message: "Your portfolio review is confirmed for next Tuesday.",
      time: "10:42 AM",
      unread: true,
    },
    {
      id: "samir",
      name: "Samir Patel",
      company: "Linear",
      initials: "SP",
      message: "Would love to learn more about your systems work.",
      time: "Yesterday",
      unread: false,
    },
    {
      id: "jordan",
      name: "Jordan Kim",
      company: "Notion",
      initials: "JK",
      message: "Thanks again for making the time, Arjun.",
      time: "May 27",
      unread: false,
    },
  ];
  const current = threads.find((t) => t.id === active) || threads[0];
  return (
    <div className="space-y-7">
      <div className="fade-up">
        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">
          Keep conversations warm
        </p>
        <h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">
          Messages
        </h1>
        <p className="mt-2 text-[15px] text-[#777982]">
          A focused place for the people behind the roles.
        </p>
      </div>
      <Card className="fade-up-2 flex min-h-[580px] overflow-hidden">
        <div className="w-full border-r border-[#eee5d8] md:w-[300px]">
          <div className="flex items-center justify-between border-b border-[#eee5d8] px-4 py-4">
            <p className="font-display font-extrabold text-[#252b43]">
              Conversations
            </p>
            <button
              onClick={() => onToast("All caught up")}
              className="text-[#9b9a96] hover:text-[#147d6d]"
              data-testid="button-message-options"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div>
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setActive(thread.id)}
                className={`flex w-full gap-3 border-b border-[#f0e8dc] px-4 py-4 text-left transition ${active === thread.id ? "bg-[#f4ecdd]" : "hover:bg-[#faf5eb]"}`}
                data-testid={`button-thread-${thread.id}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9e9e0] text-[11px] font-bold text-[#147d6d]">
                  {thread.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-[#313648]">
                      {thread.name}
                    </span>
                    <span className="font-mono-custom text-[9px] text-[#aaa69d]">
                      {thread.time}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-[#868994]">
                    {thread.company}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#686c78]">
                    {thread.message}
                  </span>
                </span>
                {thread.unread && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#e88558]" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden flex-1 flex-col md:flex">
          <div className="flex items-center gap-3 border-b border-[#eee5d8] px-6 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d9e9e0] text-[11px] font-bold text-[#147d6d]">
              {current.initials}
            </span>
            <div>
              <p className="font-display text-sm font-extrabold text-[#303548]">
                {current.name}
              </p>
              <p className="text-xs text-[#858891]">
                {current.company} · Recruiter
              </p>
            </div>
            <button
              className="ml-auto rounded-lg p-2 text-[#95958f] hover:bg-[#f1eadf]"
              data-testid="button-thread-details"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-4 bg-[#faf6ee] px-6 py-6">
            <p className="text-center font-mono-custom text-[9px] uppercase tracking-[.13em] text-[#aaa59a]">
              Today
            </p>
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-[#e8eee8] px-4 py-3 text-sm leading-6 text-[#4f5b58]">
              {current.message}
              <p className="mt-1 text-[10px] text-[#8e9893]">{current.time}</p>
            </div>
            <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-[#147d6d] px-4 py-3 text-sm leading-6 text-white">
              Thanks, Maya — I’m looking forward to it. I’ll bring a few
              questions about the team’s design practice.
              <p className="mt-1 text-right text-[10px] text-[#b8ded1]">
                10:48 AM
              </p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) {
                onToast("Message sent");
                setDraft("");
              }
            }}
            className="flex gap-2 border-t border-[#eee5d8] p-4"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a thoughtful reply…"
              className="flex-1 rounded-xl bg-[#f4ecdf] px-4 py-3 text-sm outline-none placeholder:text-[#9a9994]"
              data-testid="input-message-draft"
            />
            <button
              className="rounded-xl bg-[#147d6d] px-4 text-sm font-bold text-white"
              data-testid="button-send-message"
            >
              Send
            </button>
          </form>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center md:hidden">
          <MessageCircle size={30} className="text-[#147d6d]" />
          <p className="mt-3 text-sm font-semibold text-[#4d5260]">
            Select a conversation
          </p>
          <p className="mt-1 text-xs text-[#92908b]">
            Open Messages on a wider screen to read and reply.
          </p>
        </div>
      </Card>
    </div>
  );
}

function MessagesPage({ onToast }: { onToast: (s: string) => void }) {
  const currentUser = readCurrentUser() || { name: "Account", email: "", role: "job_seeker" as DemoRole };
  const userEmail = currentUser.email || "";
  const [messages, setMessages] = useState<PlatformMessage[]>(readPlatformMessages);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [threadPage, setThreadPage] = useState(1);
  useEffect(() => {
    const sync = () => setMessages(readPlatformMessages());
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("careerly-platform-messages") : null;
    if (channel) channel.onmessage = sync;
    window.addEventListener("storage", sync);
    window.addEventListener("careerly:messages-updated", sync);
    return () => { channel?.close(); window.removeEventListener("storage", sync); window.removeEventListener("careerly:messages-updated", sync); };
  }, []);
  const relevant = messages.filter((message) => normalizedEmail(message.fromEmail) === normalizedEmail(userEmail) || normalizedEmail(message.toEmail) === normalizedEmail(userEmail));
  const conversationIds = Array.from(new Set(relevant.map((message) => message.conversationId)));
  const threads = conversationIds.map((id) => {
    const items = relevant.filter((message) => message.conversationId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const last = items.at(-1);
    const peerEmail = id.split("::").find((email) => email !== userEmail.toLowerCase()) || "";
    const peerMessage = items.find((message) => message.fromEmail === peerEmail || message.toEmail === peerEmail);
    return { id, name: peerMessage ? (peerMessage.fromEmail === userEmail ? peerMessage.toName : peerMessage.fromName) : "Recruiter", email: peerEmail, company: peerMessage?.company || "", last: last?.body || "", time: last ? new Date(last.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "New", items };
  }).sort((first, second) => (second.items.at(-1)?.createdAt || "").localeCompare(first.items.at(-1)?.createdAt || ""));
  const current = threads.find((thread) => thread.id === active) || threads[0];
  const threadsPerPage = 6;
  const totalThreadPages = Math.max(1, Math.ceil(threads.length / threadsPerPage));
  const visibleThreads = threads.slice((threadPage - 1) * threadsPerPage, threadPage * threadsPerPage);
  useEffect(() => {
    if (!active && threads[0]) setActive(threads[0].id);
    else if (active && !threads.some((thread) => thread.id === active) && threads[0]) setActive(threads[0].id);
  }, [active, threads]);
  useEffect(() => { markConversationRead(currentUser.id, current?.id); }, [current?.id, current?.items.length, currentUser.id]);
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() || !current) return;
    setActive(current.id);
    const message: PlatformMessage = { id: `MSG-${Date.now()}`, conversationId: current.id, fromRole: "job_seeker", fromName: currentUser.name || "Job seeker", fromEmail: userEmail, toRole: "recruiter", toName: current.name, toEmail: current.email, company: current.company, body: draft.trim(), createdAt: new Date().toISOString() };
    const next = [...readPlatformMessages(), message];
    writePlatformMessages(next);
    setMessages(next);
    setDraft("");
    onToast("Message sent");
  };
  if (!current) {
    return <div className="space-y-7"><div><p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#2563eb]">Direct conversations</p><h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#172554]">Messages</h1></div><Card className="p-8 text-center text-sm text-[#64748b]">You have no conversations yet.</Card></div>;
  }
  return (
    <div className="space-y-7">
      <div><p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#2563eb]">Direct conversations</p><h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#172554]">Messages</h1><p className="mt-2 text-sm text-[#64748b]">Messages update across candidate and recruiter workspaces.</p></div>
      <section className="grid min-h-[620px] overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white shadow-sm md:h-[680px] md:min-h-0 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-[#dbe4f2] md:border-b-0 md:border-r">
          <div className="border-b border-[#edf2f8] p-4"><p className="font-display font-extrabold text-[#172554]">Conversations</p><p className="mt-1 text-xs text-[#64748b]">{threads.length} conversation{threads.length === 1 ? "" : "s"}</p></div>
          <div className="max-h-64 flex-1 overflow-y-auto overscroll-contain md:max-h-none">
            {visibleThreads.map((thread) => {
              const selected = thread.id === current.id;
              const initials = thread.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
              return <button key={thread.id} onClick={() => setActive(thread.id)} className={selected ? "flex w-full gap-3 border-b border-[#edf2f8] bg-[#eff6ff] p-4 text-left" : "flex w-full gap-3 border-b border-[#edf2f8] p-4 text-left transition hover:bg-[#f8faff]"}><span className={selected ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-extrabold text-white" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-xs font-extrabold text-[#1d4ed8]"}>{initials}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-[#172554]">{thread.name}</span><span className="shrink-0 text-[9px] text-[#94a3b8]">{thread.time}</span></span><span className="mt-0.5 block truncate text-[11px] text-[#64748b]">{thread.company}</span><span className="mt-2 block truncate text-xs text-[#64748b]">{thread.last}</span></span></button>;
            })}
          </div>
          <div className="flex items-center justify-between border-t border-[#edf2f8] px-3 py-2.5"><button onClick={() => setThreadPage((page) => Math.max(1, page - 1))} disabled={threadPage === 1} className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#2563eb] disabled:text-[#94a3b8]">Previous</button><span className="text-[10px] font-semibold text-[#64748b]">Page {threadPage} of {totalThreadPages}</span><button onClick={() => setThreadPage((page) => Math.min(totalThreadPages, page + 1))} disabled={threadPage === totalThreadPages} className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#2563eb] disabled:text-[#94a3b8]">Next</button></div>
        </aside>
        <div className="flex min-h-[500px] min-w-0 flex-col md:min-h-0">
          <header className="flex shrink-0 items-center gap-3 border-b border-[#edf2f8] bg-white px-5 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbeafe] text-xs font-extrabold text-[#1d4ed8]">{current.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-display font-extrabold text-[#172554]">{current.name}</p><p className="truncate text-xs text-[#64748b]">{current.company} · Recruiter</p></div></header>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-scroll overscroll-contain bg-[#f8faff] p-5">{current.items.length === 0 ? <p className="m-auto text-center text-sm text-[#64748b]">No messages yet. Introduce yourself to start the conversation.</p> : current.items.map((message) => { const mine = normalizedEmail(message.fromEmail) === normalizedEmail(userEmail); return <div key={message.id} className={mine ? "ml-auto max-w-[78%] rounded-2xl rounded-br-sm bg-[#2563eb] px-4 py-3 text-sm text-white shadow-sm" : "max-w-[78%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-[#334155] shadow-sm"}><p className="break-words leading-6">{message.body}</p><p className={mine ? "mt-1 text-[10px] text-[#bfdbfe]" : "mt-1 text-[10px] text-[#94a3b8]"}>{new Date(message.createdAt).toLocaleString()}</p></div>; })}</div>
          <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-[#edf2f8] bg-white p-4 shadow-[0_-8px_20px_rgba(15,23,42,0.03)]"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Reply to recruiter…" className="min-w-0 flex-1 rounded-xl border border-[#dbe4f2] px-4 py-3 text-sm outline-none focus:border-[#2563eb]" /><button className="rounded-xl bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8]">Send</button></form>
        </div>
      </section>
    </div>
  );
  return <div className="space-y-7"><div><p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">Direct conversations</p><h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">Messages</h1><p className="mt-2 text-sm text-[#777982]">Messages update across candidate and recruiter workspaces.</p></div><Card className="flex min-h-[600px] overflow-hidden"><aside className="w-[280px] shrink-0 border-r border-[#eee5d8]"><p className="border-b border-[#eee5d8] p-4 font-display font-extrabold">Conversations</p>{threads.map((thread) => <button key={thread.id} onClick={() => setActive(thread.id)} className={`block w-full border-b border-[#f0e8dc] p-4 text-left ${active === thread.id ? "bg-[#f4ecdd]" : "hover:bg-[#faf5eb]"}`}><p className="text-sm font-bold">{thread.name}</p><p className="mt-0.5 text-xs text-[#868994]">{thread.company}</p><p className="mt-2 truncate text-xs text-[#686c78]">{thread.last}</p></button>)}</aside><section className="flex min-w-0 flex-1 flex-col"><header className="border-b border-[#eee5d8] p-4"><p className="font-display font-extrabold">{current.name}</p><p className="text-xs text-[#858891]">{current.company} · Recruiter</p></header><div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto bg-[#faf6ee] p-5">{current.items.length === 0 ? <p className="m-auto text-center text-sm text-[#858891]">No messages yet. Introduce yourself to start the conversation.</p> : current.items.map((message) => { const mine = message.fromEmail === userEmail; return <div key={message.id} className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${mine ? "ml-auto rounded-br-sm bg-[#147d6d] text-white" : "rounded-bl-sm bg-[#e8eee8] text-[#4f5b58]"}`}><p>{message.body}</p><p className={`mt-1 text-[10px] ${mine ? "text-[#b8ded1]" : "text-[#8e9893]"}`}>{new Date(message.createdAt).toLocaleString()}</p></div>; })}</div><form onSubmit={send} className="flex gap-2 border-t border-[#eee5d8] p-4"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" className="min-w-0 flex-1 rounded-xl bg-[#f4ecdf] px-4 py-3 text-sm outline-none" /><button className="rounded-xl bg-[#147d6d] px-5 text-sm font-bold text-white">Send</button></form></section></Card></div>;
}

function NotificationsPage({ onRead }: { onRead: (id: string) => void }) {
  const [items, setItems] = useState<Array<{ id: string; title: string; text: string; time: string; icon: typeof CalendarDays; unread: boolean; tone: string }>>([]);
  const read = (id: string) => {
    setItems((prev) => {
      const wasUnread = prev.find((item) => item.id === id)?.unread;
      if (wasUnread) writeNotificationUnreadCount(readNotificationUnreadCount() - 1);
      return prev.map((item) => (item.id === id ? { ...item, unread: false } : item));
    });
    onRead(id);
  };
  return (
    <div className="space-y-7">
      <div className="fade-up flex items-end justify-between gap-3">
        <div>
          <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">
            Stay in the loop
          </p>
          <h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">
            Notifications
          </h1>
          <p className="mt-2 text-[15px] text-[#777982]">
            The small signals that deserve your attention.
          </p>
        </div>
        <button
          onClick={() =>
            setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
          }
          className="text-xs font-bold text-[#147d6d] hover:underline"
          data-testid="button-mark-all-read"
        >
          Mark all as read
        </button>
      </div>
      <Card className="fade-up-2 overflow-hidden">
        {items.length === 0 && <p className="p-6 text-sm text-[#64748b]">You have no notifications.</p>}
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => read(item.id)}
              className={`flex w-full gap-4 px-5 py-5 text-left transition hover:bg-[#faf5eb] ${i < items.length - 1 ? "border-b border-[#eee5d8]" : ""} ${item.unread ? "bg-[#fffaf0]" : ""}`}
              data-testid={`button-notification-${item.id}`}
            >
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-extrabold text-[#303548]">
                    {item.title}
                  </span>
                  {item.unread && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#e88558]" />
                  )}
                </span>
                <span className="mt-1 block text-sm leading-5 text-[#717581]">
                  {item.text}
                </span>
                <span className="mt-2 block font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#aaa59b]">
                  {item.time}
                </span>
              </span>
              {item.unread ? (
                <span className="mt-1 text-[10px] font-bold text-[#147d6d]">
                  New
                </span>
              ) : (
                <Check size={15} className="mt-1 text-[#c7c4bd]" />
              )}
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function SettingsPage({ onToast }: { onToast: (s: string) => void }) {
  const currentUser = readCurrentUser();
  const [accountName, setAccountName] = useState(() => currentUser?.name || "");
  const [accountEmail, setAccountEmail] = useState(() => currentUser?.email || "");
  const [settings, setSettings] = useState({
    email: true,
    weekly: true,
    messages: true,
    opportunities: false,
    profile: true,
  });
  const toggle = (key: keyof typeof settings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  const rows = [
    {
      key: "email" as const,
      title: "Email updates",
      text: "Get important updates about your applications.",
    },
    {
      key: "weekly" as const,
      title: "Weekly momentum note",
      text: "A short Monday summary of your search and next steps.",
    },
    {
      key: "messages" as const,
      title: "Recruiter messages",
      text: "Know when someone replies to a conversation.",
    },
    {
      key: "opportunities" as const,
      title: "New opportunity alerts",
      text: "Get notified when a high-fit role appears.",
    },
  ];
  return (
    <div className="space-y-7">
      <div className="fade-up">
        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.17em] text-[#147d6d]">
          Make it yours
        </p>
        <h1 className="mt-1 font-display text-[32px] font-extrabold tracking-[-.055em] text-[#252b43]">
          Settings
        </h1>
        <p className="mt-2 text-[15px] text-[#777982]">
          Quiet when you need focus. Useful when timing matters.
        </p>
      </div>
      <div className="grid gap-7 xl:grid-cols-[1.25fr_1fr]">
        <Card className="fade-up-2 p-6">
          <SectionHeading eyebrow="Notifications" title="What reaches you" />{" "}
          <div className="space-y-1">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-5 border-b border-[#eee5d8] py-4 last:border-0"
              >
                <div>
                  <p className="text-sm font-bold text-[#3e4352]">
                    {row.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#85868e]">
                    {row.text}
                  </p>
                </div>
                <button
                  onClick={() => toggle(row.key)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings[row.key] ? "bg-[#147d6d]" : "bg-[#d8d2c8]"}`}
                  aria-label={`Toggle ${row.title}`}
                  data-testid={`switch-${row.key}`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${settings[row.key] ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-6">
            <SectionHeading eyebrow="Account" title="Your details" />
            <div className="space-y-4">
              <label className="block text-xs font-bold text-[#6d707b]">
                Full name
                <input value={accountName} onChange={(event) => setAccountName(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 py-3 text-sm text-[#525765] outline-none focus:border-[#147d6d]" />
              </label>
              <label className="block text-xs font-bold text-[#6d707b]">
                Email address
                <input
                  value={accountEmail}
                  onChange={(event) => setAccountEmail(event.target.value)}
                  type="email"
                  className="mt-2 w-full rounded-xl border border-[#e2d8c8] bg-white px-3 py-3 text-sm text-[#525765] outline-none focus:border-[#147d6d]"
                  data-testid="input-account-email"
                />
              </label>
              <button
                onClick={async () => { if (accountName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(accountEmail)) { onToast("Enter a valid name and email"); return; } const previousEmail = currentUser?.email || accountEmail; const nextEmail = normalizedEmail(accountEmail); const profile = (() => { try { return JSON.parse(localStorage.getItem(userDataKey("careerly-seeker-profile", previousEmail)) || "{}"); } catch { return {}; } })(); try { await persistJobSeekerIdentity(accountName, nextEmail, previousEmail); } catch (error) { onToast(error instanceof Error ? error.message : "Email could not be updated"); return; } localStorage.setItem(userDataKey("careerly-seeker-profile", nextEmail), JSON.stringify({ ...profile, name: accountName.trim(), email: nextEmail })); onToast("Account details saved. Refreshing identity…"); window.setTimeout(() => window.location.reload(), 500); }}
                className="rounded-xl border border-[#c7d8d0] px-4 py-2.5 text-xs font-bold text-[#147d6d] hover:bg-[#e1f1e9]"
                data-testid="button-save-account"
              >
                Save account details
              </button>
            </div>
          </Card>
          <Card className="border-[#efd6c9] bg-[#fff6ef] p-6">
            <p className="font-display font-extrabold text-[#8e4938]">
              Looking for a pause?
            </p>
            <p className="mt-1 text-xs leading-5 text-[#956b60]">
              Hide your profile from new recommendations without deleting your
              progress.
            </p>
            <button
              onClick={() =>
                onToast("Your profile is still visible to recruiters")
              }
              className="mt-4 rounded-xl border border-[#e9bba9] px-3 py-2 text-xs font-bold text-[#a75b47] hover:bg-[#fae6dc]"
              data-testid="button-pause-profile"
            >
              Pause discoverability
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (role: DemoRole) => void }) {
  const [screen, setScreen] = useState<"login" | "login-otp" | "register" | "register-otp" | "profile">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginPhone, setLoginPhone] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [signup, setSignup] = useState({ role: "job_seeker" as "job_seeker" | "recruiter", name: "", company: "", email: "", password: "", confirmPassword: "" });
  const [profileRole, setProfileRole] = useState<DemoRole>("job_seeker");
  const [profileDraft, setProfileDraft] = useState({ fullName: "", email: "", location: "", headline: "", skills: "", bio: "" });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (screen !== "login-otp" && screen !== "register-otp") return;
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, screen]);

  const normalizePhone = (value: string) => value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(0, 10);

  const maskedPhone = (value: string) => {
    const digits = normalizePhone(value);
    if (digits.length !== 10) return value || "+91";
    return `+91 ${digits.slice(0, 5).replace(/\d/g, "X")} ${digits.slice(5).replace(/\d/g, "X")}`;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const phoneNumber = normalizePhone(loginPhone);
    if (!email.trim() || !password || phoneNumber.length !== 10) {
      setNotice("Enter your email, password, and a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await apiRequest("/auth/login/otp/send", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password, phoneNumber }) });
      setOtp("");
      setCountdown(30);
      setScreen("login-otp");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to send the verification code.");
    } finally {
      setBusy(false);
    }
  };

  const createProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const signupEmail = signup.email.trim().toLowerCase();
    const demoEmails = ["arjun.mehta@careerly.demo", "maya.chen@careerly.demo", "support@careerly.demo", "admin@careerly.demo"];
    const phoneNumber = normalizePhone(registerPhone);
    if (signup.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(signupEmail)) { setNotice("Enter your full name and a valid email address."); return; }
    if (signup.role === "recruiter" && signup.company.trim().length < 2) { setNotice("Enter your company name."); return; }
    if (signup.password.length < 8) { setNotice("Password must contain at least 8 characters."); return; }
    if (signup.password !== signup.confirmPassword) { setNotice("Passwords do not match."); return; }
    if (demoEmails.includes(signupEmail)) { setNotice("An account with this email already exists."); return; }
    if (phoneNumber.length !== 10) { setNotice("Enter a valid 10-digit mobile number."); return; }
    setBusy(true);
    setNotice("");
    try {
      await apiRequest("/auth/register/otp/send", { method: "POST", body: JSON.stringify({ phoneNumber }) });
      setOtp("");
      setCountdown(30);
      setScreen("register-otp");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to send the verification code.");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setNotice("Enter the 6-digit verification code.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      if (screen === "login-otp") {
        const response = await apiRequest<{ user: { id: string; name: string; email: string; role: DemoRole; company?: string } }>("/auth/login/otp/verify", {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase(), password, phoneNumber: normalizePhone(loginPhone), otp }),
        });
        localStorage.setItem("careerly-current-user", JSON.stringify(response.user));
        await syncDatabaseState();
        if (remember) {
          sessionStorage.setItem("careerly-demo-session", "true");
          sessionStorage.setItem("careerly-demo-role", response.user.role);
        }
        onLogin(response.user.role);
        return;
      }

      const signupEmail = signup.email.trim().toLowerCase();
      const response = await apiRequest<{ user: { id: string; name: string; email: string; role: "job_seeker" | "recruiter" } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: signup.name.trim(),
          email: signupEmail,
          password: signup.password,
          role: signup.role,
          company: signup.company.trim(),
          phoneNumber: normalizePhone(registerPhone),
          otp,
        }),
      });
      const user = { ...response.user, company: signup.role === "recruiter" ? signup.company.trim() : undefined };
      localStorage.setItem("careerly-current-user", JSON.stringify(user));
      localStorage.setItem(localAccountsKey, JSON.stringify([{ id: user.id, name: user.name, email: user.email, role: user.role, company: user.company, passwordHash: "", createdAt: new Date().toISOString() }, ...readLocalAccounts().filter((account) => normalizedEmail(account.email) !== normalizedEmail(user.email))]));
      if (user.role === "job_seeker") localStorage.setItem(userDataKey("careerly-seeker-profile", user.email), JSON.stringify({ name: user.name, email: user.email, strengths: [], experiences: [], educations: [], certificates: [] }));
      else localStorage.setItem(userDataKey("careerly-company-profile", user.email), JSON.stringify({ companyName: user.company, companyEmail: user.email }));
      await enableSecureMessaging(user.id);
      await syncDatabaseState();
      sessionStorage.setItem("careerly-demo-session", "true");
      sessionStorage.setItem("careerly-demo-role", user.role);
      onLogin(user.role);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The code could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0 || busy) return;
    setBusy(true);
    setNotice("");
    const registerMode = screen === "register-otp";
    const phoneNumber = normalizePhone(registerMode ? registerPhone : loginPhone);
    const path = registerMode ? "/auth/register/otp/resend" : "/auth/login/otp/resend";
    const body = registerMode
      ? { phoneNumber }
      : { email: email.trim().toLowerCase(), password, phoneNumber };
    try {
      await apiRequest(path, { method: "POST", body: JSON.stringify(body) });
      setOtp("");
      setCountdown(30);
      setNotice("A new verification code has been sent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to resend the verification code.");
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setResetBusy(true); setResetNotice("");
    try { await apiRequest("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }) }); setResetStep("verify"); setResetNotice("Check your inbox for the 6-digit code."); }
    catch { setResetNotice("We could not send the code. Please try again shortly."); }
    finally { setResetBusy(false); }
  };

  const verifyPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resetPassword.length < 8 || resetPassword !== resetConfirm) { setResetNotice("Use matching passwords with at least 8 characters."); return; }
    setResetBusy(true); setResetNotice("");
    try { await apiRequest("/auth/password-reset/verify", { method: "POST", body: JSON.stringify({ email: resetEmail.trim().toLowerCase(), code: resetCode, password: resetPassword }) }); setPassword(resetPassword); setEmail(resetEmail.trim().toLowerCase()); setResetOpen(false); setNotice("Password updated. Sign in with your new password."); }
    catch (error) { setResetNotice(error instanceof Error ? error.message : "The code could not be verified."); }
    finally { setResetBusy(false); }
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("Please complete phone verification through Create your profile.");
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4efe9] p-4 text-[#1e2435] sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] border border-[#e7dcc6] bg-white/75 shadow-[0_30px_80px_rgba(29,32,60,0.10)] backdrop-blur-sm ring-1 ring-white/80">
        <div className="grid lg:min-h-[min(760px,calc(100dvh-4rem))] lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative overflow-hidden border-b border-[#eee1d0] bg-[radial-gradient(circle_at_top_left,_rgba(19,125,109,0.12),_rgba(255,255,255,0.94)_36%,_rgba(250,247,242,1)_100%)] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="relative z-10 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#147d6d] text-white shadow-[0_12px_24px_rgba(20,125,109,0.22)]">
                <Zap size={18} strokeWidth={3} />
              </span>
              <span className="font-display text-[28px] font-extrabold tracking-[-0.06em]">careerly</span>
            </div>

            <div className="relative z-10 mt-12 max-w-sm">
              <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#147d6d]">Secure access</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.02] tracking-[-.065em] text-[#1d2438] xl:text-[54px]">
                Access your
                <span className="block text-[#147d6d]">workspace</span>
              </h1>
              <p className="mt-5 text-sm leading-7 text-[#71778a]">
                A calmer, more modern way to verify your identity and move straight into the work that matters.
              </p>
            </div>

            <div className="relative z-10 mt-10 space-y-3">
              {[
                ["Verified sign-in", "Fast, secure access with a mobile code."],
                ["Professional onboarding", "Set up your profile without friction."],
                ["Built for real work", "Designed for candidates, hiring teams, and managers."],
              ].map(([title, text]) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl border border-[#eadfce] bg-white/60 p-3 shadow-[0_10px_30px_rgba(36,42,60,0.04)]">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f5f1] text-[#147d6d]">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#2d3449]">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#7a7f8d]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
            <div className="grid w-full max-w-[480px] overflow-hidden">
              <div
                className={`col-start-1 row-start-1 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  screen === "login" || screen === "login-otp"
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-[10%] opacity-0 pointer-events-none"
                }`}
              >
                {screen === "login" ? (
                  <div className="rounded-[28px] border border-[#eee4d8] bg-[#fffaf6] p-5 shadow-[0_16px_45px_rgba(23,29,48,0.06)] sm:p-7">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#147d6d]">Welcome back</p>
                        <h2 className="mt-2 font-display text-[32px] font-extrabold tracking-[-.06em] text-[#1f2639]">Sign in to your account</h2>
                      </div>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9f5f1] text-[#147d6d]">
                        <ShieldCheck size={20} />
                      </span>
                    </div>

                    <form className="mt-7 space-y-5" onSubmit={submit}>
                      <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                        Email address
                        <input
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          type="email"
                          autoComplete="email"
                          className="mt-2 h-[52px] w-full rounded-2xl border border-[#e2d7c7] bg-white px-4 text-sm text-[#2a2d39] outline-none transition focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10"
                          placeholder="you@example.com"
                          data-testid="input-login-email"
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                        Password
                        <span className="relative mt-2 block">
                          <input
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            className="h-[52px] w-full rounded-2xl border border-[#e2d7c7] bg-white px-4 pr-12 text-sm text-[#2a2d39] outline-none transition focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10"
                            data-testid="input-login-password"
                          />
                          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#147d6d]" aria-label="Show or hide password">
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </span>
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                        Phone Number
                        <div className="mt-2 flex items-center overflow-hidden rounded-2xl border border-[#e2d7c7] bg-white transition focus-within:border-[#147d6d] focus-within:ring-4 focus-within:ring-[#147d6d]/10">
                          <span className="flex h-[52px] items-center border-r border-[#ecdfd1] bg-[#f8f3ee] px-4 text-sm font-semibold text-[#2a2d39]">
                            +91
                          </span>
                          <input
                            value={loginPhone}
                            onChange={(event) => setLoginPhone(event.target.value.replace(/\D/g, "").slice(-10))}
                            inputMode="numeric"
                            autoComplete="tel-national"
                            placeholder="Enter mobile number"
                            className="h-[52px] w-full bg-transparent px-4 text-sm text-[#2a2d39] outline-none placeholder:text-[#969ca7]"
                            data-testid="input-login-phone"
                          />
                        </div>
                      </label>

                      <div className="flex items-center justify-between gap-3 text-xs text-[#6c707a]">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" className="accent-[#147d6d]" />
                          Keep me signed in
                        </label>
                        <button type="button" onClick={() => { setResetEmail(email); setResetStep("request"); setResetCode(""); setResetPassword(""); setResetConfirm(""); setResetNotice(""); setResetOpen(true); }} className="font-bold text-[#147d6d] hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#147d6d] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(20,125,109,0.2)] transition hover:-translate-y-0.5 hover:bg-[#116c62] disabled:cursor-not-allowed disabled:opacity-70"
                        data-testid="button-login"
                      >
                        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
                        Continue to phone verification
                      </button>

                      <p className="text-center text-xs text-[#70798a]">We&apos;ll send a verification code to {loginPhone ? maskedPhone(loginPhone) : "your phone"} after your credentials are checked.</p>
                    </form>
                    <p className="mt-6 text-center text-sm text-[#70798a]">
                      New to careerly?{' '}
                      <button
                        type="button"
                        onClick={() => { setNotice(""); setScreen("register"); }}
                        className="font-bold text-[#147d6d]"
                        data-testid="button-create-profile"
                      >
                        Create your profile
                      </button>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-[#eee4d8] bg-[#fffaf6] p-5 shadow-[0_16px_45px_rgba(23,29,48,0.06)] sm:p-7">
                    <div className="space-y-5">
                      <div>
                        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#147d6d]">Verify your phone</p>
                        <h2 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.06em] text-[#1f2639]">We sent a 6-digit verification code to {maskedPhone(loginPhone)}</h2>
                      </div>
                      <button type="button" onClick={() => { setScreen("login"); setNotice(""); }} className="text-left text-xs font-bold text-[#147d6d] hover:underline">Use different phone or credentials</button>

                      <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="justify-center">
                        <InputOTPGroup className="gap-2">
                          {Array.from({ length: 6 }, (_, index) => (
                            <InputOTPSlot key={index} index={index} className="h-12 w-10 rounded-xl border border-[#e1d6c7] bg-[#fffdfb] text-lg font-bold text-[#202638] sm:h-14 sm:w-12" />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>

                      <button
                        type="button"
                        onClick={() => void verifyOtp()}
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#147d6d] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(20,125,109,0.2)] transition hover:-translate-y-0.5 hover:bg-[#116c62] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
                        Verify & Continue
                      </button>

                      <div className="text-center text-sm text-[#69727e]">
                        <span>Didn&apos;t receive the code?</span>{' '}
                        <button
                          type="button"
                          onClick={resendOtp}
                          disabled={countdown > 0 || busy}
                          className="ml-1 font-bold text-[#147d6d] disabled:cursor-not-allowed disabled:text-[#9ca3af]"
                        >
                          Resend OTP
                        </button>
                        {countdown > 0 ? <span className="ml-2 text-xs font-medium text-[#7f8694]">{countdown}s</span> : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`col-start-1 row-start-1 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  screen === "register" || screen === "register-otp" || screen === "profile"
                    ? "translate-x-0 opacity-100"
                    : "translate-x-[10%] opacity-0 pointer-events-none"
                }`}
              >
                {screen === "register" ? (
                  <div className="rounded-[28px] border border-[#eee4d8] bg-[#fffaf6] p-5 shadow-[0_16px_45px_rgba(23,29,48,0.06)] sm:p-7">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#147d6d]">Create your profile</p>
                        <h2 className="mt-2 font-display text-[34px] font-extrabold tracking-[-.06em] text-[#1f2639]">Create your profile</h2>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#70798a]">Let&apos;s get you started with your phone number.</p>

                    <form className="mt-7 space-y-4" onSubmit={createProfile}>
                      <div className="grid grid-cols-2 gap-2">
                        {(["job_seeker", "recruiter"] as const).map((role) => (
                          <button key={role} type="button" onClick={() => setSignup((current) => ({ ...current, role }))} className={`rounded-xl border p-3 text-left text-xs font-bold transition ${signup.role === role ? "border-[#147d6d] bg-[#eaf7f2] text-[#147d6d]" : "border-[#ded3c3] bg-white text-[#535968]"}`}>
                            {role === "job_seeker" ? "Find a job" : "Hire talent"}
                          </button>
                        ))}
                      </div>
                      <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                        Full name
                        <input value={signup.name} onChange={(event) => setSignup((current) => ({ ...current, name: event.target.value }))} autoComplete="name" placeholder="Your full name" className="mt-2 h-[48px] w-full rounded-2xl border border-[#e2d7c7] bg-white px-4 text-sm outline-none focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10" />
                      </label>
                      {signup.role === "recruiter" ? (
                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                          Company name
                          <input value={signup.company} onChange={(event) => setSignup((current) => ({ ...current, company: event.target.value }))} autoComplete="organization" placeholder="Your company" className="mt-2 h-[48px] w-full rounded-2xl border border-[#e2d7c7] bg-white px-4 text-sm outline-none focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10" />
                        </label>
                      ) : null}
                      <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                        Email address
                        <input value={signup.email} onChange={(event) => setSignup((current) => ({ ...current, email: event.target.value }))} type="email" autoComplete="email" placeholder="you@example.com" className="mt-2 h-[48px] w-full rounded-2xl border border-[#e2d7c7] bg-white px-4 text-sm outline-none focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10" />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                          Password
                          <input value={signup.password} onChange={(event) => setSignup((current) => ({ ...current, password: event.target.value }))} type="password" autoComplete="new-password" placeholder="At least 8 characters" className="mt-2 h-[48px] w-full rounded-2xl border border-[#e2d7c7] bg-white px-3 text-sm outline-none focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10" />
                        </label>
                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                          Confirm password
                          <input value={signup.confirmPassword} onChange={(event) => setSignup((current) => ({ ...current, confirmPassword: event.target.value }))} type="password" autoComplete="new-password" placeholder="Repeat password" className="mt-2 h-[48px] w-full rounded-2xl border border-[#e2d7c7] bg-white px-3 text-sm outline-none focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10" />
                        </label>
                      </div>
                      <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                        Phone Number
                        <div className="mt-2 flex items-center overflow-hidden rounded-2xl border border-[#e2d7c7] bg-white transition focus-within:border-[#147d6d] focus-within:ring-4 focus-within:ring-[#147d6d]/10">
                          <span className="flex h-[52px] items-center border-r border-[#ecdfd1] bg-[#f8f3ee] px-4 text-sm font-semibold text-[#2a2d39]">
                            +91
                          </span>
                          <input
                            value={registerPhone}
                            onChange={(event) => setRegisterPhone(event.target.value.replace(/\D/g, "").slice(-10))}
                            inputMode="numeric"
                            autoComplete="tel-national"
                            placeholder="Enter mobile number"
                            className="h-[52px] w-full bg-transparent px-4 text-sm text-[#2a2d39] outline-none placeholder:text-[#969ca7]"
                          />
                        </div>
                      </label>

                      <button
                        type="submit"
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#147d6d] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(20,125,109,0.2)] transition hover:-translate-y-0.5 hover:bg-[#116c62] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
                        Continue to phone verification
                      </button>

                      <p className="text-center text-sm text-[#70798a]">
                        Already have an account?{' '}
                        <button type="button" onClick={() => { setScreen("login"); setNotice(""); }} className="font-bold text-[#147d6d]">Sign in</button>
                      </p>
                    </form>
                  </div>
                ) : screen === "register-otp" ? (
                  <div className="rounded-[28px] border border-[#eee4d8] bg-[#fffaf6] p-5 shadow-[0_16px_45px_rgba(23,29,48,0.06)] sm:p-7">
                    <div className="space-y-5">
                      <div>
                        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#147d6d]">Verify your phone</p>
                        <h2 className="mt-2 font-display text-[26px] font-extrabold tracking-[-.06em] text-[#1f2639]">We sent a verification code to {maskedPhone(registerPhone)}</h2>
                      </div>
                      <button type="button" onClick={() => { setScreen("register"); setNotice(""); }} className="text-left text-xs font-bold text-[#147d6d] hover:underline">Change registration details</button>

                      <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="justify-center">
                        <InputOTPGroup className="gap-2">
                          {Array.from({ length: 6 }, (_, index) => (
                            <InputOTPSlot key={index} index={index} className="h-12 w-10 rounded-xl border border-[#e1d6c7] bg-[#fffdfb] text-lg font-bold text-[#202638] sm:h-14 sm:w-12" />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>

                      <button
                        type="button"
                        onClick={() => void verifyOtp()}
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#147d6d] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(20,125,109,0.2)] transition hover:-translate-y-0.5 hover:bg-[#116c62] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
                        Verify & Continue
                      </button>

                      <div className="text-center text-sm text-[#69727e]">
                        <span>Didn&apos;t receive the code?</span>{' '}
                        <button
                          type="button"
                          onClick={resendOtp}
                          disabled={countdown > 0 || busy}
                          className="ml-1 font-bold text-[#147d6d] disabled:cursor-not-allowed disabled:text-[#9ca3af]"
                        >
                          Resend OTP
                        </button>
                        {countdown > 0 ? <span className="ml-2 text-xs font-medium text-[#7f8694]">{countdown}s</span> : null}
                      </div>
                    </div>
                  </div>
                ) : screen === "profile" ? (
                  <div className="rounded-[28px] border border-[#eee4d8] bg-[#fffaf6] p-5 shadow-[0_16px_45px_rgba(23,29,48,0.06)] sm:p-7">
                    <div className="mb-6 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#147d6d]">Almost there</p>
                        <h2 className="mt-2 font-display text-[30px] font-extrabold tracking-[-.06em] text-[#1f2639]">Tell us about yourself</h2>
                      </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleProfileSubmit}>
                      <div className="flex items-center gap-3 rounded-2xl border border-[#e7ddd0] bg-[#f8f3ee] p-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dfeee7] text-[#147d6d]">
                          <CircleUserRound size={28} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#66707d]">Profile Photo</p>
                          <button type="button" className="mt-1 text-sm font-semibold text-[#147d6d]">Upload photo</button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d] sm:col-span-2">
                          Full Name
                          <input
                            value={profileDraft.fullName}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, fullName: event.target.value }))}
                            placeholder="Your full name"
                            className="mt-2 h-[48px] w-full rounded-2xl border border-[#e1d5c7] bg-white px-3 text-sm text-[#2a2d39] outline-none transition focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d] sm:col-span-2">
                          Email Address
                          <input
                            type="email"
                            value={profileDraft.email}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
                            placeholder="you@example.com"
                            className="mt-2 h-[48px] w-full rounded-2xl border border-[#e1d5c7] bg-white px-3 text-sm text-[#2a2d39] outline-none transition focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                          Location
                          <LocationSearchInput
                            value={profileDraft.location}
                            onChange={(location) => setProfileDraft((current) => ({ ...current, location }))}
                            label="Profile location"
                            placeholder="Search city or region"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d]">
                          Role
                          <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-[#e1d5c7] bg-white p-1">
                            {(["job_seeker", "recruiter"] as const).map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setProfileRole(role)}
                                className={`rounded-xl px-2 py-2 text-xs font-bold uppercase tracking-[.12em] transition ${profileRole === role ? "bg-[#147d6d] text-white shadow-[0_8px_16px_rgba(20,125,109,0.18)]" : "text-[#66707d]"}`}
                              >
                                {role === "job_seeker" ? "Candidate" : "Recruiter"}
                              </button>
                            ))}
                          </div>
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d] sm:col-span-2">
                          Professional headline
                          <input
                            value={profileDraft.headline}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, headline: event.target.value }))}
                            placeholder="Product designer � UX strategist"
                            className="mt-2 h-[48px] w-full rounded-2xl border border-[#e1d5c7] bg-white px-3 text-sm text-[#2a2d39] outline-none transition focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d] sm:col-span-2">
                          Skills
                          <input
                            value={profileDraft.skills}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, skills: event.target.value }))}
                            placeholder="UX design, product strategy, research"
                            className="mt-2 h-[48px] w-full rounded-2xl border border-[#e1d5c7] bg-white px-3 text-sm text-[#2a2d39] outline-none transition focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-[.12em] text-[#636d7d] sm:col-span-2">
                          About you
                          <textarea
                            rows={4}
                            value={profileDraft.bio}
                            onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}
                            placeholder="Tell recruiters and teams what you do best."
                            className="mt-2 w-full rounded-2xl border border-[#e1d5c7] bg-white px-3 py-3 text-sm text-[#2a2d39] outline-none transition focus:border-[#147d6d] focus:ring-4 focus:ring-[#147d6d]/10"
                          />
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#147d6d] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(20,125,109,0.2)] transition hover:-translate-y-0.5 hover:bg-[#116c62]"
                      >
                        Continue to dashboard
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>

              {notice ? (
                <div className="mt-4 rounded-2xl border border-[#f0dfaf] bg-[#fff8de] px-3 py-2.5 text-xs font-medium text-[#7b5d21]">
                  {notice}
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
      {resetOpen ? (
        createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#171b2e]/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !resetBusy && setResetOpen(false)}>
          <form onSubmit={resetStep === "request" ? requestPasswordReset : verifyPasswordReset} className="w-full max-w-md rounded-[26px] border border-[#e6dccd] bg-[#fffaf1] p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.16em] text-[#147d6d]">Account recovery</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">{resetStep === "request" ? "Reset your password" : "Enter your verification code"}</h2>
                <p className="mt-2 text-sm text-[#6c707a]">{resetStep === "request" ? "We’ll email a one-time code to your verified address." : `We sent a 6-digit code to ${resetEmail}.`}</p>
              </div>
              <button type="button" disabled={resetBusy} onClick={() => setResetOpen(false)} className="rounded-xl p-2 text-[#777c87] hover:bg-[#f1eadf]" aria-label="Close password reset"><X size={19} /></button>
            </div>
            {resetStep === "request" ? (
              <label className="mt-6 block text-xs font-bold text-[#5e6370]">
                Email address
                <input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-[#dfd4c4] bg-white px-3 py-3 text-sm outline-none focus:border-[#147d6d]" placeholder="you@example.com" />
              </label>
            ) : (
              <div className="mt-6 space-y-4">
                <label className="block text-xs font-bold text-[#5e6370]">
                  Verification code
                  <input value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required className="mt-2 w-full rounded-xl border border-[#dfd4c4] bg-white px-3 py-3 text-center font-mono text-xl tracking-[.45em] outline-none focus:border-[#147d6d]" placeholder="000000" />
                </label>
                <label className="block text-xs font-bold text-[#5e6370]">
                  New password
                  <input value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} type="password" autoComplete="new-password" required className="mt-2 w-full rounded-xl border border-[#dfd4c4] bg-white px-3 py-3 text-sm outline-none focus:border-[#147d6d]" />
                </label>
                <label className="block text-xs font-bold text-[#5e6370]">
                  Confirm password
                  <input value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} type="password" autoComplete="new-password" required className="mt-2 w-full rounded-xl border border-[#dfd4c4] bg-white px-3 py-3 text-sm outline-none focus:border-[#147d6d]" />
                </label>
              </div>
            )}
            {resetNotice ? <p className="mt-4 rounded-xl bg-[#fff0d0] px-3 py-2.5 text-xs text-[#87611f]" role="status">{resetNotice}</p> : null}
            <button disabled={resetBusy} className="mt-6 w-full rounded-xl bg-[#147d6d] py-3 text-sm font-bold text-white disabled:opacity-60">
              {resetBusy ? "Please wait…" : resetStep === "request" ? "Email verification code" : "Update password"}
            </button>
            {resetStep === "verify" ? <button type="button" disabled={resetBusy} onClick={() => setResetStep("request")} className="mt-3 w-full text-xs font-bold text-[#147d6d]">Use a different email</button> : null}
          </form>
        </div>,
        document.body,
        )
      ) : null}
    </div>
  );
}

function LegacySubscriptionPage({ onToast }: { onToast: (message: string) => void }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [activePlan, setActivePlan] = useState(
    () => sessionStorage.getItem("careerly-plan") ?? "Free",
  );
  const plans = [
    {
      name: "Free",
      price: "₹0",
      text: "For getting your job search started.",
      features: [
        "Search all approved jobs",
        "5 applications per month",
        "Basic profile visibility",
      ],
      featured: false,
    },
    {
      name: "Career Plus",
      price: billing === "yearly" ? "₹399" : "₹599",
      text: "For serious job seekers who want better matches.",
      features: [
        "Unlimited applications",
        "AI-powered match ranking",
        "Priority profile visibility",
        "Advanced salary insights",
      ],
      featured: true,
    },
    {
      name: "Career Pro",
      price: billing === "yearly" ? "₹799" : "₹999",
      text: "For maximum visibility and guided progress.",
      features: [
        "Everything in Career Plus",
        "Featured candidate badge",
        "Recruiter profile insights",
        "Monthly profile review",
      ],
      featured: false,
    },
  ];
  const choose = (name: string) => {
    setActivePlan(name);
    sessionStorage.setItem("careerly-plan", name);
    onToast(`${name} plan activated for this demo`);
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#2563eb]">
            Careerly membership
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.055em] text-[#172554] sm:text-4xl">
            More relevant jobs. More visibility.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748b]">
            Premium matching prioritizes opportunities using your skills,
            experience, location, preferences, and recruiter activity.
          </p>
        </div>
        <div className="inline-flex w-fit rounded-xl border border-[#dbe4f2] bg-white p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${billing === "monthly" ? "bg-[#172554] text-white" : "text-[#64748b]"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${billing === "yearly" ? "bg-[#172554] text-white" : "text-[#64748b]"}`}
          >
            Yearly · save 30%
          </button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <section
            key={plan.name}
            className={`relative rounded-2xl border bg-white p-6 shadow-sm ${plan.featured ? "border-[#2563eb] ring-4 ring-[#dbeafe]" : "border-[#dbe4f2]"}`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-5 rounded-full bg-[#2563eb] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Best value
              </span>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-extrabold text-[#172554]">
                  {plan.name}
                </h2>
                <p className="mt-2 min-h-10 text-xs leading-5 text-[#64748b]">
                  {plan.text}
                </p>
              </div>
              {activePlan === plan.name && (
                <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-[10px] font-bold text-[#15803d]">
                  Active
                </span>
              )}
            </div>
            <p className="mt-6 font-display text-4xl font-extrabold text-[#172554]">
              {plan.price}
              <span className="text-xs font-medium text-[#64748b]">
                {" "}
                / month
              </span>
            </p>
            <div className="my-6 h-px bg-[#edf2f8]" />
            <ul className="space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-[#475569]">
                  <CheckCircle2 size={17} className="shrink-0 text-[#2563eb]" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => choose(plan.name)}
              disabled={activePlan === plan.name}
              className={`mt-7 w-full rounded-xl py-3 text-sm font-bold ${activePlan === plan.name ? "cursor-default bg-[#eef2f7] text-[#94a3b8]" : plan.featured ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]" : "border border-[#bfd1ef] text-[#2563eb] hover:bg-[#eff6ff]"}`}
            >
              {activePlan === plan.name
                ? "Current plan"
                : `Choose ${plan.name}`}
            </button>
          </section>
        ))}
      </div>
      <section className="rounded-2xl border border-[#dbe4f2] bg-white p-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-display text-lg font-extrabold text-[#172554]">
              How matching improves
            </p>
            <p className="mt-2 text-xs leading-5 text-[#64748b]">
              Your plan changes ranking and visibility, never the fairness of
              application review.
            </p>
          </div>
          {[
            ["2.4×", "More relevant recommendations"],
            ["3×", "More recruiter profile views"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-[#eff6ff] p-4">
              <p className="font-display text-2xl font-extrabold text-[#2563eb]">
                {value}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#52627f]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SubscriptionPage({
  onToast,
  audience = "job_seeker",
}: {
  onToast: (message: string) => void;
  audience?: "job_seeker" | "recruiter";
}) {
  const signedInRole = readCurrentUser()?.role || (sessionStorage.getItem("careerly-demo-role") as DemoRole | null);
  const roleAllowed = signedInRole === audience;
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const planKey = `careerly-plan-${audience}`;
  const [activePlan, setActivePlan] = useState(() => localStorage.getItem(planKey) ?? "Free");
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [billingRecords, setBillingRecords] = useState(() =>
    readBillingRecords().filter((record) => record.audience === audience),
  );
  const plans = audience === "recruiter"
    ? [
        { name: "Free", monthly: 0, yearly: 0, text: "For trying the hiring workspace.", features: ["1 active job", "25 candidate views", "Standard support"], featured: false },
        { name: "Hiring Plus", monthly: 1499, yearly: 1199, text: "For teams hiring consistently.", features: ["10 active jobs", "Unlimited candidate views", "Featured job eligibility", "Priority support"], featured: true },
        { name: "Hiring Pro", monthly: 2999, yearly: 2399, text: "For growing recruiting teams.", features: ["Unlimited active jobs", "5 recruiter seats", "Advanced hiring analytics", "Dedicated support"], featured: false },
      ]
    : [
        { name: "Free", monthly: 0, yearly: 0, text: "For getting your job search started.", features: ["Search all approved jobs", "5 applications per month", "Basic profile visibility"], featured: false },
        { name: "Career Plus", monthly: 599, yearly: 399, text: "For serious job seekers who want better matches.", features: ["Unlimited applications", "AI-powered match ranking", "Priority profile visibility", "Advanced salary insights"], featured: true },
        { name: "Career Pro", monthly: 999, yearly: 799, text: "For maximum visibility and guided progress.", features: ["Everything in Career Plus", "Featured candidate badge", "Recruiter profile insights", "Monthly profile review"], featured: false },
      ];
  const selectedPlan = plans.find((plan) => plan.name === checkoutPlan);
  const currentRecord = billingRecords.find((record) => record.plan === activePlan);
  const choose = (name: string) => {
    if (!roleAllowed) { onToast(`This plan is only available to ${audience === "recruiter" ? "recruiters" : "job seekers"}.`); return; }
    if (name === "Free") {
      localStorage.setItem(planKey, name);
      setActivePlan(name);
      onToast("Subscription changed to Free");
      return;
    }
    setCheckoutPlan(name);
  };
  const completePayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roleAllowed) { onToast("Your signed-in role cannot purchase this plan"); return; }
    if (!selectedPlan || cardholder.trim().length < 2 || cardNumber.replace(/\D/g, "").length < 12 || !/^\d{2}\/\d{2}$/.test(expiry) || cvv.length < 3) {
      onToast("Enter valid payment details to continue");
      return;
    }
    const now = new Date();
    const renews = new Date(now);
    if (billing === "yearly") renews.setFullYear(renews.getFullYear() + 1);
    else renews.setMonth(renews.getMonth() + 1);
    const record: BillingRecord = {
      id: `PAY-${Date.now().toString().slice(-8)}`,
      audience,
      plan: selectedPlan.name,
      amount: (billing === "yearly" ? selectedPlan.yearly * 12 : selectedPlan.monthly),
      interval: billing,
      paidAt: now.toISOString(),
      renewsAt: renews.toISOString(),
      last4: cardNumber.replace(/\D/g, "").slice(-4),
      status: "Paid",
    };
    addBillingRecord(record);
    localStorage.setItem(planKey, selectedPlan.name);
    localStorage.setItem(`${planKey}-auto-renew`, String(autoRenew));
    setBillingRecords((records) => [record, ...records]);
    setActivePlan(selectedPlan.name);
    setCheckoutPlan(null);
    setCardholder(""); setCardNumber(""); setExpiry(""); setCvv("");
    onToast(`Payment successful. ${selectedPlan.name} is now active.`);
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#2563eb]">{audience === "recruiter" ? "Recruiter billing" : "Careerly membership"}</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.055em] text-[#172554]">Choose the plan that fits your goals.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748b]">Upgrade, pay, and track renewals from one place. You can move back to the free plan at any time.</p></div>
        <div className="inline-flex w-fit rounded-xl border border-[#dbe4f2] bg-white p-1"><button onClick={() => setBilling("monthly")} className={`rounded-lg px-3 py-2 text-xs font-bold ${billing === "monthly" ? "bg-[#172554] text-white" : "text-[#64748b]"}`}>Monthly</button><button onClick={() => setBilling("yearly")} className={`rounded-lg px-3 py-2 text-xs font-bold ${billing === "yearly" ? "bg-[#172554] text-white" : "text-[#64748b]"}`}>Yearly · save 20%+</button></div>
      </div>
      {activePlan !== "Free" && currentRecord && <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-wider text-[#15803d]">Active subscription</p><p className="mt-1 font-display text-xl font-extrabold text-[#172554]">{activePlan}</p><p className="mt-1 text-xs text-[#64748b]">Next payment {new Date(currentRecord.renewsAt).toLocaleDateString()} · card ending {currentRecord.last4}</p></div><span className="w-fit rounded-full bg-[#dcfce7] px-3 py-1.5 text-xs font-bold text-[#15803d]">Paid on time</span></section>}
      <div className="grid gap-5 lg:grid-cols-3">{plans.map((plan) => { const price = billing === "yearly" ? plan.yearly : plan.monthly; return <section key={plan.name} className={`relative rounded-2xl border bg-white p-6 shadow-sm ${plan.featured ? "border-[#2563eb] ring-4 ring-[#dbeafe]" : "border-[#dbe4f2]"}`}>{plan.featured && <span className="absolute -top-3 left-5 rounded-full bg-[#2563eb] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Best value</span>}<div className="flex items-start justify-between"><div><h2 className="font-display text-xl font-extrabold text-[#172554]">{plan.name}</h2><p className="mt-2 min-h-10 text-xs leading-5 text-[#64748b]">{plan.text}</p></div>{activePlan === plan.name && <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-[10px] font-bold text-[#15803d]">Active</span>}</div><p className="mt-6 font-display text-4xl font-extrabold text-[#172554]">₹{price.toLocaleString("en-IN")}<span className="text-xs font-medium text-[#64748b]"> / month</span></p>{billing === "yearly" && price > 0 && <p className="mt-1 text-[11px] text-[#64748b]">₹{(price * 12).toLocaleString("en-IN")} billed yearly</p>}<div className="my-6 h-px bg-[#edf2f8]" /><ul className="space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-[#475569]"><CheckCircle2 size={17} className="shrink-0 text-[#2563eb]" />{feature}</li>)}</ul><button onClick={() => choose(plan.name)} disabled={activePlan === plan.name} className={`mt-7 w-full rounded-xl py-3 text-sm font-bold ${activePlan === plan.name ? "cursor-default bg-[#eef2f7] text-[#94a3b8]" : plan.featured ? "bg-[#2563eb] text-white" : "border border-[#bfd1ef] text-[#2563eb]"}`}>{activePlan === plan.name ? "Current plan" : plan.name === "Free" ? "Switch to Free" : `Choose ${plan.name}`}</button></section>; })}</div>
      <section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white"><div className="border-b border-[#edf2f8] p-5"><h2 className="font-display text-lg font-extrabold text-[#172554]">Payment history</h2></div>{billingRecords.length === 0 ? <p className="p-5 text-sm text-[#64748b]">No payments yet.</p> : billingRecords.slice(0, 5).map((record) => <div key={record.id} className="flex flex-col gap-2 border-b border-[#edf2f8] px-5 py-4 last:border-0 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm font-bold">{record.plan}</p><p className="text-xs text-[#64748b]">{record.id} · {new Date(record.paidAt).toLocaleDateString()}</p></div><p className="text-sm font-bold">₹{record.amount.toLocaleString("en-IN")}</p><span className="w-fit rounded-full bg-[#dcfce7] px-2 py-1 text-[10px] font-bold text-[#15803d]">{record.status}</span></div>)}</section>
      {checkoutPlan && selectedPlan && createPortal(<div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071a3d]/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setCheckoutPlan(null)}><form onSubmit={completePayment} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">Secure checkout</p><h2 className="mt-1 font-display text-2xl font-extrabold">Activate {selectedPlan.name}</h2><p className="mt-1 text-sm text-[#64748b]">Pay ₹{(billing === "yearly" ? selectedPlan.yearly * 12 : selectedPlan.monthly).toLocaleString("en-IN")} now</p></div><button type="button" onClick={() => setCheckoutPlan(null)} className="rounded-lg p-2 text-[#64748b]"><X size={18} /></button></div><div className="mt-6 space-y-4"><label className="block text-xs font-bold text-[#52627f]">Name on card<input value={cardholder} onChange={(event) => setCardholder(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm" autoComplete="cc-name" /></label><label className="block text-xs font-bold text-[#52627f]">Card number<input value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/[^\d ]/g, "").slice(0, 19))} placeholder="4242 4242 4242 4242" className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm" inputMode="numeric" autoComplete="cc-number" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-[#52627f]">Expiry<input value={expiry} onChange={(event) => setExpiry(event.target.value.slice(0, 5))} placeholder="MM/YY" className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm" /></label><label className="block text-xs font-bold text-[#52627f]">CVV<input value={cvv} onChange={(event) => setCvv(event.target.value.replace(/\D/g, "").slice(0, 4))} type="password" placeholder="123" className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm" inputMode="numeric" /></label></div><label className="flex items-center gap-2 text-xs text-[#52627f]"><input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} className="accent-[#2563eb]" />Automatically renew before the due date</label></div><button className="mt-6 w-full rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white">Pay and activate</button><p className="mt-3 text-center text-[10px] text-[#94a3b8]">Demo checkout: payment details are validated locally; full card details are never stored.</p></form></div>, document.body)}
    </div>
  );
}

function TeamDashboard({
  role,
  onLogout,
}: {
  role: Exclude<DemoRole, "job_seeker">;
  onLogout: () => void;
}) {
  const content =
    role === "admin"
      ? {
          label: "Super admin",
          title: "Platform command center",
          text: "Review marketplace health, recruiter verification, reports, and support escalations.",
          metrics: [
            ["Job seekers", "12,482"],
            ["Active jobs", "1,247"],
            ["Open tickets", "38"],
          ],
        }
      : role === "support"
        ? {
            label: "Support team",
            title: "Make every request feel handled.",
            text: "Prioritize customer questions, keep owners clear, and resolve issues with context.",
            metrics: [
              ["Open tickets", "38"],
              ["In progress", "16"],
              ["Resolved today", "24"],
            ],
          }
        : {
            label: "Recruiter workspace",
            title: "Build a stronger candidate pipeline.",
            text: "Manage your roles, applications, and recommended talent from one focused workspace.",
            metrics: [
              ["Active jobs", "4"],
              ["New applicants", "28"],
              ["Shortlisted", "11"],
            ],
          };
  return (
    <div className="min-h-[100dvh] bg-[#f5f8fd] p-5 text-[#172554] sm:p-9">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1d4ed8] text-white">
            <Zap size={18} />
          </span>
          <span className="font-display text-xl font-extrabold">careerly</span>
        </div>
        <button
          onClick={onLogout}
          className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold text-[#9f3f32] hover:bg-[#fff1ef]"
        >
          Log out
        </button>
      </header>
      <main className="mx-auto max-w-6xl py-14">
        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#2563eb]">
          {content.label}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-.055em] sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748b]">
          {content.text}
        </p>
        <div className="mt-9 grid gap-4 sm:grid-cols-3">
          {content.metrics.map(([label, value]) => (
            <section
              key={label}
              className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-bold text-[#64748b]">{label}</p>
              <p className="mt-3 font-display text-3xl font-extrabold text-[#172554]">
                {value}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#16a34a]">
                Updated just now
              </p>
            </section>
          ))}
        </div>
        <section className="mt-7 rounded-2xl border border-[#dbe4f2] bg-white p-6">
          <p className="font-display text-xl font-extrabold">
            Today’s priority
          </p>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            {role === "admin"
              ? "Review 6 recruiter verification requests and 3 escalated tickets."
              : role === "support"
                ? "Resolve 8 high-priority tickets that are waiting for an update."
                : "Follow up with 8 qualified candidates matched to your active roles."}
          </p>
          <button className="mt-5 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">
            Open workspace
          </button>
        </section>
      </main>
    </div>
  );
}

function LegacyRecruiterPanel({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<"dashboard" | "subscription">(
    "dashboard",
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const notify = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2400);
  };
  const items = [
    ["dashboard", "Dashboard", FaTachometerAlt],
    ["jobs", "My Jobs", FaBriefcase],
    ["candidates", "Candidates", FaUsers],
    ["interviews", "Interviews", FaCalendarAlt],
    ["messages", "Messages", FaEnvelope],
    ["company", "Company Profile", FaBuilding],
    ["subscription", "Subscription", FaCrown],
    ["support", "Support", FaHeadset],
  ] as const;
  return (
    <div className="app-grain min-h-[100dvh] bg-[#f4f7fc] text-[#172554]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col bg-[#0b1f44] p-4 text-[#dbeafe] lg:flex">
        <div className="flex items-center gap-2 px-3 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb] text-white">
            <Zap size={18} />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-white">
              careerly
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#93c5fd]">
              Recruiter
            </p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {items.map(([id, label, Icon], index) => (
            <button
              key={id}
              onClick={() =>
                id === "subscription"
                  ? setSection("subscription")
                  : setSection("dashboard")
              }
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${(section === "subscription" ? id === "subscription" : index === 0) ? "bg-[#2563eb] font-bold text-white" : "text-[#c5d5f2] hover:bg-white/10 hover:text-white"}`}
            >
              <span className="flex h-5 w-5 items-center justify-center text-[14px]">
                <Icon aria-hidden="true" />
              </span>
              {label}
              {id === "subscription" && (
                <span className="ml-auto rounded-full bg-[#f59e0b] px-2 py-0.5 text-[9px] font-bold text-white">
                  PRO
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/10 p-3">
          <div className="flex items-center gap-2">
            <Avatar small />
            <div>
              <p className="text-xs font-bold text-white">Maya Chen</p>
              <p className="text-[11px] text-[#a8c2ec]">Figma · Recruiter</p>
            </div>
            <button
              onClick={onLogout}
              className="ml-auto text-xs font-bold text-[#fca5a5]"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>
      <main className="lg:ml-[236px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center border-b border-[#dbe4f2] bg-white/90 px-5 backdrop-blur lg:px-8">
          <button className="rounded-lg border border-[#dbe4f2] p-2 lg:hidden">
            <Menu size={18} />
          </button>
          <div className="relative ml-4 hidden max-w-md flex-1 md:block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              placeholder="Search candidates, skills, or jobs..."
              className="w-full rounded-xl border border-[#dbe4f2] bg-[#f8faff] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Bell size={19} className="text-[#52627f]" />
            <Avatar small />
            <span className="hidden text-sm font-bold sm:inline">
              Maya Chen
            </span>
          </div>
        </header>
        <div className="mx-auto max-w-[1450px] p-5 sm:p-8">
          {section === "subscription" ? (
            <SubscriptionPage onToast={notify} />
          ) : (
            <div className="space-y-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#2563eb]">
                    Hiring command center
                  </p>
                  <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-.055em]">
                    Good morning, Maya.
                  </h1>
                  <p className="mt-2 text-sm text-[#64748b]">
                    Your pipeline is healthy. Eight strong matches are ready for
                    review.
                  </p>
                </div>
                <button
                  onClick={() => notify("Job posting form is ready")}
                  className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Plus size={16} className="mr-2 inline" />
                  Post a job
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Active jobs", "4", "+1 this week"],
                  ["New applicants", "28", "+14%"],
                  ["Shortlisted", "11", "39% ratio"],
                  ["Interviews", "7", "This week"],
                ].map(([label, value, detail]) => (
                  <button
                    key={label}
                    className="rounded-2xl border border-[#dbe4f2] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#93c5fd]"
                  >
                    <p className="text-xs font-bold text-[#64748b]">{label}</p>
                    <p className="mt-3 font-display text-3xl font-extrabold">
                      {value}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[#2563eb]">
                      {detail}
                    </p>
                  </button>
                ))}
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
                <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg font-extrabold">
                        Recommended candidates
                      </p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        Ranked against your active Product Designer role.
                      </p>
                    </div>
                    <button
                      onClick={() => notify("Candidate search opened")}
                      className="text-xs font-bold text-[#2563eb]"
                    >
                      View all
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ["Anika Sharma", "Product Designer · Bengaluru", "94%"],
                      ["Rohit Kumar", "UX Designer · Remote", "90%"],
                      ["Neha Patel", "Senior Product Designer · Pune", "87%"],
                    ].map(([name, detail, score]) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 rounded-xl border border-[#edf2f8] p-3 hover:bg-[#f8faff]"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbeafe] text-xs font-bold text-[#1d4ed8]">
                          {name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </span>
                        <div>
                          <p className="text-sm font-bold">{name}</p>
                          <p className="text-xs text-[#64748b]">{detail}</p>
                        </div>
                        <span className="ml-auto rounded-full bg-[#dcfce7] px-2 py-1 text-[10px] font-bold text-[#15803d]">
                          {score} match
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rounded-2xl border border-[#2563eb] bg-gradient-to-br from-[#172554] to-[#1d4ed8] p-6 text-white">
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold">
                    CAREERLY HIRE PRO
                  </span>
                  <h2 className="mt-5 font-display text-2xl font-extrabold">
                    Find better-fit talent, faster.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#bfdbfe]">
                    Unlock advanced matching, unlimited candidate search, and
                    hiring insights.
                  </p>
                  <button
                    onClick={() => setSection("subscription")}
                    className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-bold text-[#1d4ed8]"
                  >
                    Compare plans
                  </button>
                </section>
              </div>
              <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
                <p className="font-display text-lg font-extrabold">
                  Active job performance
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="text-[10px] uppercase tracking-wider text-[#64748b]">
                      <tr>
                        {[
                          "Role",
                          "Views",
                          "Applications",
                          "Shortlisted",
                          "Match quality",
                          "Action",
                        ].map((item) => (
                          <th
                            key={item}
                            className="border-b border-[#edf2f8] px-3 py-3"
                          >
                            {item}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Senior Product Designer", "1,284", "84", "18", "92%"],
                        ["UX Researcher", "742", "41", "9", "88%"],
                      ].map((row) => (
                        <tr key={row[0]} className="text-sm">
                          <td className="px-3 py-4 font-bold">{row[0]}</td>
                          {row.slice(1).map((value) => (
                            <td
                              key={value}
                              className="px-3 py-4 text-[#64748b]"
                            >
                              {value}
                            </td>
                          ))}
                          <td className="px-3 py-4">
                            <button className="text-xs font-bold text-[#2563eb]">
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#172554] px-4 py-2.5 text-sm font-bold text-white shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

type RecruiterTab =
  | "dashboard"
  | "jobs"
  | "candidates"
  | "interviews"
  | "company"
  | "messages"
  | "subscription"
  | "support";

function RecruiterPanel({ onLogout }: { onLogout: () => void }) {
  const currentRecruiter = readCurrentUser() || { name: "Account", email: "" };
  const [tab, setTab] = useState<RecruiterTab>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savingCompanyProfile, setSavingCompanyProfile] = useState(false);
  const [companyProfileLoading, setCompanyProfileLoading] = useState(Boolean(currentRecruiter.id && isUuid(currentRecruiter.id)));
  const [companyProfileError, setCompanyProfileError] = useState("");
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyName, setCompanyName] = useState(() => {
    const currentUser = readCurrentUser();
    if (currentUser?.company) return currentUser.company;
    try { return JSON.parse(localStorage.getItem(userDataKey("careerly-company-profile", currentRecruiter.email)) || "{}").companyName || ""; } catch { return ""; }
  });
  const belongsToCurrentRecruiter = (posting: MarketplacePosting) => {
    const company = posting.company.trim().toLowerCase();
    return company === companyName.trim().toLowerCase()
      || Boolean(currentRecruiter.company && company === currentRecruiter.company.trim().toLowerCase());
  };
  const [ticketSubject, setTicketSubject] = useState("");
  const [jobStatuses, setJobStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(readMarketplacePostings().filter(belongsToCurrentRecruiter).map((posting) => [posting.id, posting.status === "Approved" ? "Active" : posting.status === "Rejected" ? "Closed" : "Pending"])),
  );
  const [recruiterJobs, setRecruiterJobs] = useState<Array<{ id: string; title: string; category?: string; location: string; mode: string; type: string; skills?: string[]; views: number; applications: number; match: string }>>([]);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobMenu, setJobMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [postedJobs, setPostedJobs] = useState<
    Array<{
      id: string;
      title: string;
      category?: string;
      location: string;
      type: string;
      mode: string;
      views?: number;
      applications?: number;
      match?: string;
      skills?: string[];
    }>
  >(() => readMarketplacePostings().filter(belongsToCurrentRecruiter).map((posting) => ({ id: posting.id, title: posting.title, category: posting.category, location: posting.location, type: posting.type, mode: posting.mode, skills: posting.skills, views: 0, applications: readMarketplaceApplications().filter((application) => application.jobId === posting.id).length, match: posting.placement === "featured" ? "Featured" : "Not ranked" })));
  const [jobSkillInput, setJobSkillInput] = useState("");
  const [jobDraft, setJobDraft] = useState({
    title: "",
    category: "Design, UX & Creative",
    location: "",
    type: "Full-time",
    mode: "Hybrid",
    experience: "",
    salary: "",
    skills: [] as string[],
    description: "",
  });
  const savedCompany = (() => { try { return JSON.parse(localStorage.getItem(userDataKey("careerly-company-profile", currentRecruiter.email)) || "{}"); } catch { return {}; } })();
  const [companyWebsite, setCompanyWebsite] = useState(() => savedCompany.companyWebsite || "");
  const [companySize, setCompanySize] = useState(() => savedCompany.companySize || "");
  const [companyAbout, setCompanyAbout] = useState(() => savedCompany.companyAbout || "");
  const [companyIndustry, setCompanyIndustry] = useState(() => savedCompany.companyIndustry || "");
  const [companyLocation, setCompanyLocation] = useState(() => savedCompany.companyLocation || "");
  const [companyFounded, setCompanyFounded] = useState(() => savedCompany.companyFounded || "");
  const [companyEmail, setCompanyEmail] = useState(() => savedCompany.companyEmail || currentRecruiter.email || "");
  const [companyPhone, setCompanyPhone] = useState(() => savedCompany.companyPhone || "");
  const [companyGst, setCompanyGst] = useState(() => savedCompany.companyGst || "");
  const [companyPan, setCompanyPan] = useState(() => savedCompany.companyPan || "");
  const [companyMsme, setCompanyMsme] = useState(() => savedCompany.companyMsme || "");
  const [companyLogoUrl, setCompanyLogoUrl] = useState(() => savedCompany.companyLogoUrl || "");
  const [companyCoverUrl, setCompanyCoverUrl] = useState(() => savedCompany.companyCoverUrl || "");
  const [companyVerificationStatus, setCompanyVerificationStatus] = useState<"incomplete" | "pending" | "verified" | "rejected">("incomplete");
  const [verificationDocuments, setVerificationDocuments] = useState<VerificationDocument[]>([]);
  const [selectedVerificationDocumentType, setSelectedVerificationDocumentType] = useState<VerificationDocument["documentType"] | "">("");
  const [verificationDocumentError, setVerificationDocumentError] = useState("");
  const [uploadingDocumentType, setUploadingDocumentType] = useState<string | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [showPublicCompanyPreview, setShowPublicCompanyPreview] = useState(false);
  const [marketplaceApplicants, setMarketplaceApplicants] = useState<MarketplaceApplication[]>(readMarketplaceApplications);
  const [platformMessages, setPlatformMessages] = useState<PlatformMessage[]>(readPlatformMessages);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [activeRecruiterConversation, setActiveRecruiterConversation] = useState("");
  const [seenRecruiterMessageIds, setSeenRecruiterMessageIds] = useState<string[]>([]);
  const [conversationPage, setConversationPage] = useState(1);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const interviewsKey = userDataKey("careerly-interviews", currentRecruiter.email);
  const [interviews, setInterviews] = useState<InterviewRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(interviewsKey) || "[]"); }
    catch { return []; }
  });
  const [interviewDraft, setInterviewDraft] = useState({
    candidate: "",
    round: "",
    date: "",
    time: "",
    duration: "45",
    meetUrl: "",
    candidateEmail: "",
  });
  const notify = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2400);
  };
  const closeMenus = () => {
    document
      .querySelectorAll<HTMLDetailsElement>("details[open]")
      .forEach((menu) => menu.removeAttribute("open"));
    setJobMenu(null);
  };
  const addJobSkill = () => {
    const skill = jobSkillInput.trim().replace(/,+$/, "").trim();
    if (!skill) return;
    setJobDraft((current) =>
      current.skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())
        ? current
        : { ...current, skills: [...current.skills, skill] },
    );
    setJobSkillInput("");
  };
  const go = (next: RecruiterTab) => {
    setTab(next);
    setMobileMenu(false);
    closeMenus();
  };
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target as Element).closest("[data-account-dropdown]"))
        closeMenus();
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);
  useEffect(() => {
    if (!jobMenu) return;
    const closeOnViewportChange = () => setJobMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setJobMenu(null);
    };
    window.addEventListener("scroll", closeOnViewportChange, true);
    window.addEventListener("resize", closeOnViewportChange);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("scroll", closeOnViewportChange, true);
      window.removeEventListener("resize", closeOnViewportChange);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [jobMenu]);
  useEffect(() => {
    const syncApplications = () => setMarketplaceApplicants(readMarketplaceApplications());
    const syncMessages = () => setPlatformMessages(readPlatformMessages());
    const messagesChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("careerly-platform-messages") : null;
    if (messagesChannel) messagesChannel.onmessage = syncMessages;
    const syncJobs = () => { const postings = readMarketplacePostings().filter(belongsToCurrentRecruiter); setPostedJobs(postings.map((posting) => ({ id: posting.id, title: posting.title, category: posting.category, location: posting.location, type: posting.type, mode: posting.mode, skills: posting.skills, views: 0, applications: readMarketplaceApplications().filter((application) => application.jobId === posting.id).length, match: posting.placement === "featured" ? "Featured" : "Not ranked" }))); setJobStatuses((current) => ({ ...current, ...Object.fromEntries(postings.map((posting) => [posting.id, posting.status === "Approved" ? "Active" : posting.status === "Rejected" ? "Closed" : "Pending"])) })); };
    window.addEventListener("careerly:applications-updated", syncApplications);
    window.addEventListener("careerly:messages-updated", syncMessages);
    window.addEventListener("careerly:postings-updated", syncJobs);
    window.addEventListener("storage", syncApplications);
    window.addEventListener("storage", syncMessages);
    return () => {
      messagesChannel?.close();
      window.removeEventListener("careerly:applications-updated", syncApplications);
      window.removeEventListener("careerly:messages-updated", syncMessages);
      window.removeEventListener("careerly:postings-updated", syncJobs);
      window.removeEventListener("storage", syncApplications);
      window.removeEventListener("storage", syncMessages);
    };
  }, [companyName]);
  useEffect(() => {
    if (!currentRecruiter.id || !isUuid(currentRecruiter.id)) {
      setCompanyProfileLoading(false);
      return;
    }
    let mounted = true;
    apiRequest<{ company: Record<string, unknown> | null }>("/companies/me")
      .then(({ company }) => {
        if (!mounted) return;
        if (!company) throw new Error("No company profile is linked to this recruiter account");
        const profile = {
          companyName: String(company.name || ""),
          companyWebsite: String(company.website || ""),
          companySize: String(company.size || ""),
          companyAbout: String(company.description || ""),
          companyIndustry: String(company.industry || "") === "Not specified" ? "" : String(company.industry || ""),
          companyLocation: String(company.city || "") === "Not specified" ? "" : String(company.city || ""),
          companyFounded: String(company.founded || ""),
          companyEmail: String(company.contactEmail || currentRecruiter.email || ""),
          companyPhone: String(company.phone || ""),
          companyGst: String(company.gstNumber || ""),
          companyPan: String(company.panNumber || ""),
          companyMsme: String(company.msmeNumber || ""),
          companyLogoUrl: String(company.logoUrl || ""),
          companyCoverUrl: String(company.coverUrl || ""),
        };
        setCompanyName(profile.companyName);
        setCompanyWebsite(profile.companyWebsite);
        setCompanySize(profile.companySize);
        setCompanyAbout(profile.companyAbout);
        setCompanyIndustry(profile.companyIndustry);
        setCompanyLocation(profile.companyLocation);
        setCompanyFounded(profile.companyFounded);
        setCompanyEmail(profile.companyEmail);
        setCompanyPhone(profile.companyPhone);
        setCompanyGst(profile.companyGst);
        setCompanyPan(profile.companyPan);
        setCompanyMsme(profile.companyMsme);
        setCompanyLogoUrl(profile.companyLogoUrl);
        setCompanyCoverUrl(profile.companyCoverUrl);
        setCompanyVerificationStatus(
          company.verificationStatus === "verified" || company.verificationStatus === "pending" || company.verificationStatus === "rejected"
            ? company.verificationStatus
            : "incomplete",
        );
        localStorage.setItem(userDataKey("careerly-company-profile", currentRecruiter.email), JSON.stringify(profile));
        void apiRequest<{ documents: VerificationDocument[] }>("/companies/me/verification-documents")
          .then(({ documents }) => {
            if (!mounted) return;
            setVerificationDocuments(documents);
            if (documents.length > 0) {
              setSelectedVerificationDocumentType((current) => current || documents[0].documentType);
            }
          })
          .catch((error: unknown) => {
            if (mounted) setVerificationDocumentError(error instanceof Error ? error.message : "Could not load verification documents");
          });
        setCompanyProfileError("");
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setCompanyProfileError(`Could not load the latest company profile: ${error instanceof Error ? error.message : "Request failed"}`);
      })
      .finally(() => { if (mounted) setCompanyProfileLoading(false); });
    return () => { mounted = false; };
  }, []);
  const unreadCandidateMessageIds = platformMessages
    .filter((message) =>
      normalizedEmail(message.toEmail) === normalizedEmail(currentRecruiter.email || companyEmail) &&
      message.fromRole === "job_seeker" &&
      !seenRecruiterMessageIds.includes(message.id),
    )
    .map((message) => message.id);
  const unreadCandidateMessageCount = unreadCandidateMessageIds.length;
  useEffect(() => {
    if (tab !== "messages" || unreadCandidateMessageIds.length === 0) return;
    setSeenRecruiterMessageIds((seen) => Array.from(new Set([...seen, ...unreadCandidateMessageIds])));
  }, [tab, unreadCandidateMessageIds.join("|")]);
  useEffect(() => {
    if (jobStatuses.newJob === "Draft") {
      setShowJobForm(true);
      setJobStatuses((current) => {
        const { newJob: _ignored, ...rest } = current;
        return rest;
      });
    }
  }, [jobStatuses.newJob]);
  const navItems: Array<[RecruiterTab, string, IconType]> = [
    ["dashboard", "Dashboard", FaTachometerAlt],
    ["jobs", "My Jobs", FaBriefcase],
    ["candidates", "Candidates", FaUsers],
    ["interviews", "Interviews", FaCalendarAlt],
    ["messages", "Messages", FaEnvelope],
    ["company", "Company Profile", FaBuilding],
    ["subscription", "Subscription", FaCrown],
    ["support", "Support", FaHeadset],
  ];
  const PanelTitle = ({
    eyebrow,
    title,
    text,
    action,
  }: {
    eyebrow: string;
    title: string;
    text: string;
    action?: ReactNode;
  }) => (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#2563eb]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.05em] text-[#172554] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">{text}</p>
      </div>
      {action}
    </div>
  );
  const ActionButton = ({
    children,
    onClick,
    disabled = false,
  }: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-60"
    >
      {children}
    </button>
  );

  const currentCompanyApplications = marketplaceApplicants.filter(
    (application) => application.company.trim().toLowerCase() === companyName.trim().toLowerCase(),
  );
  const recentCompanyApplications = [...currentCompanyApplications].sort(
    (first, second) => second.appliedAt.localeCompare(first.appliedAt),
  );
  const activeJobCount = [...recruiterJobs, ...postedJobs].filter(
    (job) => jobStatuses[job.id] === "Active",
  ).length;
  const newApplicantCount = currentCompanyApplications.filter(
    (application) => (application.status || "Applied") === "Applied",
  ).length;
  const shortlistedCandidateCount = currentCompanyApplications.filter(
    (application) => application.status === "Shortlisted",
  ).length;
  const companyProfileFields = [
    companyName.trim(),
    companyIndustry.trim(),
    companyWebsite.trim(),
    companyAbout.trim(),
    companyEmail.trim(),
    companyPhone.trim(),
  ];
  const companyProfileComplete = companyProfileFields.every(Boolean);
  const selectedVerificationDocument = verificationDocuments.find(
    (document) => document.documentType === selectedVerificationDocumentType,
  );
  const selectedVerificationIdentifier = selectedVerificationDocumentType === "gst"
    ? companyGst
    : selectedVerificationDocumentType === "pan"
      ? companyPan
      : selectedVerificationDocumentType === "msme"
        ? companyMsme
        : "";
  const selectedVerificationDocumentLabel = businessVerificationOptions.find(
    (option) => option.value === selectedVerificationDocumentType,
  )?.label;
  const companyProfileStrength = Math.round(
    (companyProfileFields.filter(Boolean).length / companyProfileFields.length) * 100,
  );
  const dashboardStats: Array<[string, string, RecruiterTab]> = [
    ["Active jobs", String(activeJobCount), "jobs"],
    ["New applicants", String(newApplicantCount), "candidates"],
    ["Shortlisted", String(shortlistedCandidateCount), "candidates"],
    ["Interviews", String(interviews.length), "interviews"],
  ];

  const dashboard = (
    <div className="space-y-7">
      <PanelTitle
        eyebrow="Hiring command center"
        title={`Good morning, ${currentRecruiter.name?.trim().split(/\s+/)[0] || "there"}.`}
        text={`${newApplicantCount} new applicant${newApplicantCount === 1 ? "" : "s"} and ${shortlistedCandidateCount} shortlisted candidate${shortlistedCandidateCount === 1 ? "" : "s"} are ready for review.`}
        action={
          <ActionButton onClick={() => go("jobs")}>
            <Plus size={16} className="mr-2 inline" />
            Post a job
          </ActionButton>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map(([label, value, target]) => (
          <button
            key={label}
            onClick={() => go(target as RecruiterTab)}
            className="rounded-2xl border border-[#dbe4f2] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#93c5fd]"
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold text-[#64748b]">{label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                {label === "Active jobs" ? <BriefcaseBusiness size={18} /> : label === "New applicants" ? <UsersRound size={18} /> : label === "Shortlisted" ? <CheckCircle2 size={18} /> : <CalendarDays size={18} />}
              </span>
            </div>
            <p className="mt-4 font-display text-3xl font-extrabold">{value}</p>
            <p className="mt-2 text-xs font-semibold text-[#2563eb]">
              Open details →
            </p>
          </button>
        ))}
      </div>
      <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-extrabold">Quick actions</p>
            <p className="mt-1 text-xs text-[#64748b]">Keep your hiring workflow moving.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#eff6ff] px-2.5 py-1 text-[10px] font-bold text-[#1d4ed8]"><CheckCircle2 size={13} /> {companyProfileComplete ? "Profile complete" : "Complete company profile"}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Post a job", "Create a new role", Plus, "jobs"],
            ["Review applicants", `${newApplicantCount} candidate${newApplicantCount === 1 ? "" : "s"} waiting`, UsersRound, "candidates"],
            ["Schedule interview", `${interviews.length} upcoming interview${interviews.length === 1 ? "" : "s"}`, CalendarDays, "interviews"],
            ["Update company", "Refresh public profile", Building2, "company"],
          ].map((item) => {
            const [title, detail, Icon, target] = item as [string, string, typeof Plus, RecruiterTab];
            const ActionIcon = Icon;
            return <button key={title} onClick={() => go(target as RecruiterTab)} className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] p-3.5 text-left transition hover:border-[#93c5fd] hover:bg-[#f8fbff]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#2563eb]"><ActionIcon size={18} /></span><span className="min-w-0"><span className="block text-sm font-bold text-[#172554]">{title}</span><span className="mt-0.5 block truncate text-[11px] text-[#64748b]">{detail}</span></span></button>;
          })}
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-extrabold">
                Recent applicants
              </p>
              <p className="mt-1 text-xs text-[#64748b]">
                Most recent applications submitted to your company.
              </p>
            </div>
            <button
              onClick={() => go("candidates")}
              className="text-xs font-bold text-[#2563eb]"
            >
              View all
            </button>
          </div>
          {recentCompanyApplications.slice(0, 3).map((application) => (
            <button
              key={application.id}
              onClick={() => go("candidates")}
              className="mt-3 flex w-full items-center rounded-xl border border-[#edf2f8] p-3 text-left hover:bg-[#f8faff]"
            >
              <Avatar
                initials={String(application.applicant.name || "Candidate")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
                small
              />
              <span className="ml-3 min-w-0"><span className="block truncate text-sm font-bold">{String(application.applicant.name || "Applicant")}</span><span className="block truncate text-xs text-[#64748b]">{application.jobTitle}</span></span>
              <span className="ml-auto rounded-full bg-[#eff6ff] px-2 py-1 text-[10px] font-bold text-[#1d4ed8]">{application.status}</span>
            </button>
          ))}
          {recentCompanyApplications.length === 0 && <p className="mt-4 text-sm text-[#64748b]">Applicants will appear here after a job is posted and applications arrive.</p>}
        </section>
        <section className="rounded-2xl bg-gradient-to-br from-[#172554] to-[#1d4ed8] p-6 text-white">
          <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold">
            HIRE PRO
          </span>
          <h2 className="mt-5 font-display text-2xl font-extrabold">
            Better-fit talent, faster.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#bfdbfe]">
            Unlock advanced ranking and unlimited candidate search.
          </p>
          <button
            onClick={() => go("subscription")}
            className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-bold text-[#1d4ed8]"
          >
            Compare plans
          </button>
        </section>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><p className="font-display text-lg font-extrabold">Hiring activity</p><p className="mt-1 text-xs text-[#64748b]">Recent applications for your company.</p></div><UsersRound size={17} className="text-[#64748b]" /></div>
          <div className="mt-4 space-y-3">{recentCompanyApplications.slice(0, 5).map((application) => <div key={application.id} className="flex items-center justify-between gap-3 border-b border-[#edf2f8] pb-3 text-sm"><span className="truncate font-semibold">{String(application.applicant.name || "Applicant")} · {application.jobTitle}</span><span className="shrink-0 text-xs text-[#64748b]">{application.status}</span></div>)}{recentCompanyApplications.length === 0 && <p className="text-sm text-[#64748b]">No applications to show yet.</p>}</div>
        </section>
        <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><p className="font-display text-lg font-extrabold">Recent activity</p><p className="mt-1 text-xs text-[#64748b]">Latest updates in your workspace.</p></div><Bell size={17} className="text-[#64748b]" /></div>
          <div className="mt-4 space-y-4">{recentCompanyApplications.slice(0, 3).map((application) => <div key={application.id} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]"><UsersRound size={15} /></span><span><span className="block text-xs font-bold">{String(application.applicant.name || "Applicant")} applied</span><span className="block text-[11px] text-[#64748b]">{application.jobTitle} · {application.status}</span></span></div>)}{recentCompanyApplications.length === 0 && <p className="text-sm text-[#64748b]">Your recent activity will appear here.</p>}</div>
        </section>
      </div>
    </div>
  );

  const jobsPanel = (
    <div className="space-y-7">
      <PanelTitle
        eyebrow="Job management"
        title="Your posted jobs"
        text="Create roles, control visibility, and track performance."
        action={
          <ActionButton
            onClick={() => {
              setEditingJobId(null);
              setJobDraft({
                title: "",
                category: "Design, UX & Creative",
                location: "",
                type: "Full-time",
                mode: "Hybrid",
                experience: "",
                salary: "",
                skills: [],
                description: "",
              });
              setJobSkillInput("");
              setShowJobForm(true);
            }}
          >
            <Plus size={16} className="mr-2 inline" />
            Create job
          </ActionButton>
        }
      />
      <section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f8faff] text-[10px] uppercase tracking-wider text-[#64748b]">
              <tr>
                {[
                  "Job",
                  "Status",
                  "Views",
                  "Applications",
                  "Match quality",
                  "Actions",
                ].map((item) => (
                  <th key={item} className="px-5 py-3">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...recruiterJobs, ...postedJobs].map(
                ({
                  id,
                  title,
                  location,
                  mode,
                skills = [],
                views = 0,
                applications = 0,
                match = "Not ranked",
              }) => (
                <tr key={id} className="border-t border-[#edf2f8] transition-colors hover:bg-[#f8fbff]">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold">{title}</p>
                      <p className="text-xs text-[#64748b]">
                        {location} · {mode}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={jobStatuses[id] || "Pending"}
                        onChange={(e) => {
                          setJobStatuses((current) => ({
                            ...current,
                            [id]: e.target.value,
                          }));
                          notify(`${title} status updated`);
                        }}
                        className="rounded-lg border border-[#dbe4f2] px-2 py-1.5 text-xs"
                      >
                        <option>Pending</option>
                        <option>Active</option>
                        <option>Paused</option>
                        <option>Closed</option>
                        <option>Draft</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#334155]">
                      {views.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#64748b]">
                      {applications}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-[#15803d]">
                      {match}
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative" data-account-dropdown>
                        <button
                          type="button"
                          aria-expanded={jobMenu?.id === id}
                          onClick={(event) => {
                            if (jobMenu?.id === id) {
                              setJobMenu(null);
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            const menuHeight = 220;
                            const menuWidth = 192;
                            setJobMenu({
                              id,
                              top: rect.bottom + menuHeight + 8 <= window.innerHeight
                                ? rect.bottom + 6
                                : Math.max(8, rect.top - menuHeight - 6),
                              left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#bfd1ef] px-2.5 py-1.5 text-xs font-bold text-[#2563eb] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] focus:outline-none focus:ring-4 focus:ring-[#dbeafe]"
                        >
                          Manage <ChevronDown size={13} />
                        </button>
                        {jobMenu?.id === id && createPortal(
                        <div
                          data-account-dropdown
                          style={{ position: "fixed", top: jobMenu.top, left: jobMenu.left, width: 192, zIndex: 12000 }}
                          className="rounded-xl border border-[#dbe4f2] bg-white p-1.5 text-[#172554] shadow-[0_16px_40px_rgba(15,42,92,0.22)]"
                        >
                          <button
                            type="button"
                            onClick={() => { setJobMenu(null); go("candidates"); }}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#eff6ff]"
                          >
                            View applicants
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setJobDraft((current) => ({
                                ...current,
                                title,
                                location,
                                skills,
                                description: `Update the responsibilities and requirements for ${title}.`,
                              }));
                              setJobSkillInput("");
                              setEditingJobId(id);
                              setShowJobForm(true);
                              setJobMenu(null);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#eff6ff]"
                          >
                            Edit job
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setJobDraft((current) => ({
                                ...current,
                                title: `${title} (Copy)`,
                                location,
                                skills,
                                description: `Responsibilities and requirements for ${title}.`,
                              }));
                              setJobSkillInput("");
                              setEditingJobId(null);
                              setShowJobForm(true);
                              setJobMenu(null);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#eff6ff]"
                          >
                            Duplicate job
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus =
                                jobStatuses[id] === "Paused"
                                  ? "Active"
                                  : "Paused";
                              setJobStatuses((current) => ({
                                ...current,
                                [id]: nextStatus,
                              }));
                              notify(`${title} ${nextStatus.toLowerCase()}`);
                              setJobMenu(null);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#eff6ff]"
                          >
                            {jobStatuses[id] === "Paused"
                              ? "Resume job"
                              : "Pause job"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRecruiterJobs((current) =>
                                current.filter((job) => job.id !== id),
                              );
                              setPostedJobs((current) =>
                                current.filter((job) => job.id !== id),
                              );
                              writeMarketplacePostings(readMarketplacePostings().filter((posting) => posting.id !== id));
                              setJobStatuses((current) => {
                                const next = { ...current };
                                delete next[id];
                                return next;
                              });
                              notify(`${title} deleted`);
                              setJobMenu(null);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#b45345] hover:bg-[#fff1ef]"
                          >
                            Delete job
                          </button>
                        </div>,
                        document.body,
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const candidatesPanel = (
    <div className="space-y-7">
      <PanelTitle
        eyebrow="Candidate pipeline"
        title="Candidates"
        text="Review matches and move applicants through your hiring stages."
        action={
          <ActionButton onClick={() => notify("Candidate search opened")}>
            Search talent
          </ActionButton>
        }
      />
      {marketplaceApplicants.filter((application) => application.company === companyName).map((application) => {
        const applicant = application.applicant;
        const experiences = applicant.profile?.experiences || [];
        const applicantSkills = applicant.profile?.strengths || [];
        return (
          <section key={application.id} className="rounded-2xl border border-[#93c5fd] bg-[#f8fbff] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start"><Avatar initials={String(applicant.name || "A").split(" ").map((part) => part[0]).join("")} /><div className="min-w-0 flex-1"><p className="font-display text-lg font-extrabold">{String(applicant.name || "Applicant")}</p><p className="mt-1 text-sm text-[#475569]">Applied for {application.jobTitle}</p>{applicant.email || applicant.phone ? <p className="mt-2 text-xs text-[#64748b]">{[applicant.email, applicant.phone].filter(Boolean).join(" · ")}</p> : <p className="mt-2 text-xs text-[#64748b]">Contact details are private for this applicant.</p>}{applicant.profile?.headline ? <p className="mt-3 text-sm text-[#475569]">{applicant.profile.headline}</p> : null}{experiences.length > 0 ? <p className="mt-3 text-xs font-semibold text-[#2563eb]">Latest experience: {experiences[0].role} at {experiences[0].company}</p> : null}{applicantSkills.length > 0 ? <div className="mt-3 flex flex-wrap gap-1.5">{applicantSkills.slice(0, 8).map((skill) => <span key={skill} className="rounded-full bg-[#eff6ff] px-2 py-1 text-[10px] font-semibold text-[#1d4ed8]">{skill}</span>)}</div> : null}</div><span className="w-fit rounded-full bg-[#dbeafe] px-2.5 py-1 text-[10px] font-bold text-[#1d4ed8]">{application.status || "Applied"}</span></div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#dbeafe] pt-4"><select value={application.status || "Applied"} onChange={(event) => { const next = readMarketplaceApplications().map((item) => item.id === application.id ? { ...item, status: event.target.value } : item); writeMarketplaceApplications(next); setMarketplaceApplicants(next); notify(`${String(applicant.name || "Applicant")} moved to ${event.target.value}`); }} className="rounded-lg border border-[#bfdbfe] bg-white px-3 py-2 text-xs"><option>Applied</option><option>Review</option><option>Shortlisted</option><option>Interview</option><option>Selected</option><option>Rejected</option></select><button onClick={() => { const email = String(applicant.email || ""); if (!email) { notify("Candidate email is unavailable"); return; } const body = `Hi ${String(applicant.name || "there")}, thank you for applying for ${application.jobTitle}.`; const message: PlatformMessage = { id: `MSG-${Date.now()}`, conversationId: conversationIdFor(currentRecruiter.email || companyEmail, email), fromRole: "recruiter", fromName: currentRecruiter.name || companyName, fromEmail: currentRecruiter.email || companyEmail, toRole: "job_seeker", toName: String(applicant.name || "Candidate"), toEmail: email, company: companyName, body, createdAt: new Date().toISOString() }; const next = [...readPlatformMessages(), message]; writePlatformMessages(next); setPlatformMessages(next); go("messages"); }} className="rounded-lg border border-[#93c5fd] bg-white px-3 py-2 text-xs font-bold text-[#2563eb]">Message</button><button onClick={() => { setInterviewDraft((current) => ({ ...current, candidate: String(applicant.name || "Candidate"), candidateEmail: String(applicant.email || "") })); setShowInterviewForm(true); }} className="rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-bold text-white">Schedule interview</button></div>
          </section>
        );
      })}
      {currentCompanyApplications.length === 0 && <Card className="p-6 text-sm text-[#64748b]">Candidates appear here when someone applies to one of your jobs.</Card>}
    </div>
  );

  const interviewsPanel = (
    <div className="space-y-7">
      <PanelTitle
        eyebrow="Interview planning"
        title="Interviews"
        text="Plan candidate conversations with a shared calendar and Google Meet."
        action={
          <ActionButton onClick={() => setShowInterviewForm(true)}>
            <Plus size={16} className="mr-2 inline" />
            Schedule interview
          </ActionButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-extrabold">
                {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date())}
              </p>
              <p className="mt-1 text-xs text-[#64748b]">Interview calendar</p>
            </div>
            <CalendarDays size={20} className="text-[#2563eb]" />
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[10px]">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span
                key={`${day}-${index}`}
                className="py-1 font-bold text-[#94a3b8]"
              >
                {day}
              </span>
            ))}
            {Array.from({ length: 2 }).map((_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: 30 }).map((_, index) => {
              const day = index + 1;
              const hasInterview = interviews.some(
                (item) => Number(item.date.slice(-2)) === day,
              );
              return (
                <button
                  key={day}
                  onClick={() => {
                    setInterviewDraft((current) => ({
                      ...current,
                      date: `2026-09-${String(day).padStart(2, "0")}`,
                    }));
                    setShowInterviewForm(true);
                  }}
                  className={`flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition ${hasInterview ? "bg-[#2563eb] text-white shadow-sm" : day === 15 ? "border border-[#93c5fd] bg-[#eff6ff] text-[#1d4ed8]" : "text-[#475569] hover:bg-[#eff6ff]"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#eff6ff] p-3 text-xs text-[#1d4ed8]">
            <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
            {interviews.length} scheduled interviews
          </div>
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          {interviews.map((interview) => (
            <section
              key={interview.id}
              className="rounded-2xl border border-[#dbe4f2] bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <CalendarDays className="text-[#2563eb]" size={22} />
                <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-[10px] font-bold text-[#15803d]">
                  Google Meet
                </span>
              </div>
              <p className="mt-4 font-display text-lg font-extrabold">
                {interview.candidate}
              </p>
              <p className="mt-1 text-sm text-[#64748b]">{interview.round}</p>
              <p className="mt-4 rounded-lg bg-[#eff6ff] px-3 py-2 text-xs font-bold text-[#1d4ed8]">
                {new Date(
                  `${interview.date}T${interview.time}`,
                ).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {interview.time} · {interview.duration} min
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  href={interview.meetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-lg bg-[#2563eb] py-2 text-center text-xs font-bold text-white"
                >
                  Join Meet
                </a>
                <button
                  onClick={() => {
                    setInterviewDraft({
                      candidate: interview.candidate,
                      candidateEmail: interview.candidateEmail || "",
                      round: interview.round,
                      date: interview.date,
                      time: interview.time,
                      duration: interview.duration,
                      meetUrl: interview.meetUrl,
                    });
                    setShowInterviewForm(true);
                  }}
                  className="flex-1 rounded-lg border border-[#dbe4f2] py-2 text-xs font-bold"
                >
                  Reschedule
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );

  const companyFieldClass =
    "mt-2 w-full rounded-xl border border-[#dbe4f2] bg-[#f8faff] px-3 py-3 text-sm text-[#334155] outline-none transition read-only:cursor-default read-only:text-[#64748b] focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#dbeafe] disabled:cursor-default disabled:opacity-100";
  const companyPanel = (
    <div className="space-y-7">
      <PanelTitle
        eyebrow="Employer brand"
        title={companyName ? "Company profile" : "Create company profile"}
        text="This verified information appears on every published job."
        action={
          <ActionButton
            onClick={() => {
              if (editingCompany && !companyName.trim()) {
                notify("Company name is required");
                return;
              }
              setEditingCompany(!editingCompany);
              if (editingCompany) notify("Company profile saved");
            }}
          >
            {editingCompany
              ? "Save profile"
              : companyName
                ? "Edit profile"
                : "Create profile"}
          </ActionButton>
        }
      />
      <section className="rounded-2xl border border-[#dbe4f2] bg-white p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#dbe4f2] bg-[#eff6ff] font-display text-2xl font-extrabold text-[#1d4ed8]">
            {companyName.charAt(0) || "+"}
            {companyLogoUrl && <img src={companyLogoUrl} alt={`${companyName || "Company"} logo`} className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
          </div>
          <div className="min-w-0 flex-1">
            {editingCompany ? (
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name"
                required
                maxLength={160}
                className="w-full rounded-xl border border-[#dbe4f2] px-3 py-2.5 font-display text-xl font-extrabold outline-none focus:border-[#2563eb]"
              />
            ) : (
              <h2 className="font-display text-2xl font-extrabold">
                {companyName || "Add your company"}
              </h2>
            )}
            <p className="mt-1 text-sm text-[#64748b]">
              {companyIndustry || "Industry/domain not set"} · {companyWebsite || "Website not set"}
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1d4ed8]">
            {companyProfileComplete ? "Profile complete" : "Profile incomplete"}
          </span>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="text-xs font-bold text-[#52627f]">
            Website
            <input
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              readOnly={!editingCompany}
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] bg-[#f8faff] px-3 py-3 text-sm outline-none read-only:text-[#64748b] focus:border-[#2563eb]"
            />
          </label>
          <label className="text-xs font-bold text-[#52627f]">
            Company size
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              disabled={!editingCompany}
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] bg-[#f8faff] px-3 py-3 text-sm outline-none disabled:opacity-100"
            >
              <option>1–10 employees</option>
              <option>11–50 employees</option>
              <option>51–200 employees</option>
              <option>201–1,000 employees</option>
              <option>1,000–5,000 employees</option>
              <option>5,000+ employees</option>
            </select>
          </label>
          <label className="text-xs font-bold text-[#52627f] sm:col-span-2">
            About
            <textarea
              value={companyAbout}
              onChange={(e) => setCompanyAbout(e.target.value)}
              readOnly={!editingCompany}
              rows={5}
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] bg-[#f8faff] px-3 py-3 text-sm outline-none read-only:text-[#64748b] focus:border-[#2563eb]"
            />
          </label>
        </div>
        {!editingCompany && (
          <div className="mt-6 grid gap-3 border-t border-[#edf2f8] pt-5 sm:grid-cols-3">
            {[
                ["Profile strength", `${companyProfileStrength}%`],
                ["Active jobs", String(activeJobCount)],
                ["Applications received", String(currentCompanyApplications.length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#f8faff] p-3">
                <p className="text-[10px] font-bold uppercase text-[#94a3b8]">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-[#334155]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const recruiterMessagesPanel = (() => {
    const recruiterEmail = currentRecruiter.email || companyEmail;
    const relevant = platformMessages.filter((message) => normalizedEmail(message.fromEmail) === normalizedEmail(recruiterEmail) || normalizedEmail(message.toEmail) === normalizedEmail(recruiterEmail));
    const conversations = Array.from(new Set(relevant.map((message) => message.conversationId))).map((conversationId) => {
      const allItems = relevant
        .filter((message) => message.conversationId === conversationId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const uniqueItems = allItems.filter((message, index, messages) =>
        messages.findIndex((candidate) => candidate.body === message.body && candidate.fromEmail === message.fromEmail) === index,
      );
      const sample = allItems[0];
      const sentByRecruiter = normalizedEmail(sample.fromEmail) === normalizedEmail(recruiterEmail);
      const peerName = sentByRecruiter ? sample.toName : sample.fromName;
      const peerEmail = sentByRecruiter ? sample.toEmail : sample.fromEmail;
      return {
        id: conversationId,
        peerName,
        peerEmail,
        items: uniqueItems,
        last: uniqueItems.at(-1),
      };
    }).sort((a, b) => (b.last?.createdAt || "").localeCompare(a.last?.createdAt || ""));
    const activeConversation = conversations.find((conversation) => conversation.id === activeRecruiterConversation) || conversations[0];
    const conversationsPerPage = 6;
    const totalConversationPages = Math.max(1, Math.ceil(conversations.length / conversationsPerPage));
    const visibleConversations = conversations.slice((conversationPage - 1) * conversationsPerPage, conversationPage * conversationsPerPage);
    const sendReply = (conversationId: string, peerName: string, peerEmail: string) => {
      const body = (messageDrafts[conversationId] || "").trim();
      if (!body) return;
      setActiveRecruiterConversation(conversationId);
      const message: PlatformMessage = { id: `MSG-${Date.now()}`, conversationId, fromRole: "recruiter", fromName: currentRecruiter.name || companyName, fromEmail: recruiterEmail, toRole: "job_seeker", toName: peerName, toEmail: peerEmail, company: companyName, body, createdAt: new Date().toISOString() };
      const next = [...readPlatformMessages(), message];
      writePlatformMessages(next); setPlatformMessages(next); setMessageDrafts((drafts) => ({ ...drafts, [conversationId]: "" })); notify("Message sent");
    };
    return (
      <div className="space-y-7">
        <PanelTitle
          eyebrow="Candidate communication"
          title="Messages"
          text="Reply to candidates and keep interview communication in one place."
          action={<span className="inline-flex items-center gap-2 rounded-full bg-[#dcfce7] px-3 py-1.5 text-[11px] font-bold text-[#15803d]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#22c55e]" />Live</span>}
        />
        {!activeConversation ? (
          <section className="rounded-2xl border border-[#dbe4f2] bg-white p-10 text-center">
            <MessageCircle className="mx-auto text-[#2563eb]" />
            <p className="mt-3 font-bold">No conversations yet</p>
            <p className="mt-1 text-sm text-[#64748b]">Open Candidates and select Message to start a conversation.</p>
          </section>
        ) : (
          <section className="grid min-h-[620px] overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white shadow-sm md:h-[680px] md:min-h-0 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
            <aside className="flex min-h-0 flex-col border-b border-[#dbe4f2] md:border-b-0 md:border-r">
              <div className="border-b border-[#edf2f8] p-4">
                <p className="font-display font-extrabold">Conversations</p>
                <p className="mt-1 text-xs text-[#64748b]">{conversations.length} candidate{conversations.length === 1 ? "" : "s"}</p>
              </div>
              <div className="max-h-64 flex-1 overflow-y-auto overscroll-contain lg:max-h-none">
                {visibleConversations.map((conversation) => {
                  const selected = conversation.id === activeConversation.id;
                  const initials = conversation.peerName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveRecruiterConversation(conversation.id)}
                      className={`flex w-full gap-3 border-b border-[#edf2f8] p-4 text-left transition ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f8faff]"}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${selected ? "bg-[#2563eb] text-white" : "bg-[#dbeafe] text-[#1d4ed8]"}`}>{initials}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-[#172554]">{conversation.peerName}</span>
                          <span className="shrink-0 text-[9px] text-[#94a3b8]">{conversation.last ? new Date(conversation.last.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[#64748b]">{conversation.peerEmail}</span>
                        <span className="mt-2 block truncate text-xs text-[#64748b]">{conversation.last?.body}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-[#edf2f8] px-3 py-2.5">
                <button onClick={() => setConversationPage((page) => Math.max(1, page - 1))} disabled={conversationPage === 1} className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#2563eb] hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:text-[#94a3b8]">Previous</button>
                <span className="text-[10px] font-semibold text-[#64748b]">Page {conversationPage} of {totalConversationPages}</span>
                <button onClick={() => setConversationPage((page) => Math.min(totalConversationPages, page + 1))} disabled={conversationPage === totalConversationPages} className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#2563eb] hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:text-[#94a3b8]">Next</button>
              </div>
            </aside>
            <div className="flex min-h-[500px] min-w-0 flex-col md:min-h-0">
              <header className="flex shrink-0 items-center gap-3 border-b border-[#edf2f8] bg-white px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbeafe] text-xs font-extrabold text-[#1d4ed8]">{activeConversation.peerName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="truncate font-display font-extrabold">{activeConversation.peerName}</p>
                  <p className="truncate text-xs text-[#64748b]">{activeConversation.peerEmail}</p>
                </div>
              </header>
              <div aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-scroll overscroll-contain bg-[#f8faff] p-5">
                {activeConversation.items.map((message) => {
                  const mine = normalizedEmail(message.fromEmail) === normalizedEmail(recruiterEmail);
                  return (
                    <div key={message.id} className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? "ml-auto rounded-br-sm bg-[#2563eb] text-white" : "rounded-bl-sm bg-white text-[#334155]"}`}>
                      <p className="break-words leading-6">{message.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? "text-[#bfdbfe]" : "text-[#94a3b8]"}`}>{new Date(message.createdAt).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={(event) => { event.preventDefault(); sendReply(activeConversation.id, activeConversation.peerName, activeConversation.peerEmail); }} className="flex shrink-0 gap-2 border-t border-[#edf2f8] bg-white p-4 shadow-[0_-8px_20px_rgba(15,23,42,0.03)]">
                <input
                  value={messageDrafts[activeConversation.id] || ""}
                  onChange={(event) => setMessageDrafts((drafts) => ({ ...drafts, [activeConversation.id]: event.target.value }))}
                  placeholder="Reply to candidate…"
                  aria-label={`Reply to ${activeConversation.peerName}`}
                  className="min-w-0 flex-1 rounded-xl border border-[#dbe4f2] px-4 py-3 text-sm outline-none focus:border-[#2563eb]"
                />
                <button className="rounded-xl bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8]">Send</button>
              </form>
            </div>
          </section>
        )}
      </div>
    );
  })();

  const supportPanel = (
    <div className="space-y-7">
      <PanelTitle
        eyebrow="Recruiter support"
        title="Support center"
        text="Create and track requests from the Careerly support team."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!ticketSubject.trim()) return;
            const ticket: SupportTicket = {
              id: `TK-${Date.now().toString().slice(-6)}`,
              subject: ticketSubject.trim(),
              category: "Recruiter support",
              openedBy: companyName,
              openedByRole: "recruiter",
              priority: "Medium",
              status: "Open",
              createdAt: new Date().toISOString(),
            };
            writeSupportTickets([ticket, ...readSupportTickets()]);
            notify("Support ticket created");
            setTicketSubject("");
          }}
          className="rounded-2xl border border-[#dbe4f2] bg-white p-6"
        >
          <p className="font-display text-lg font-extrabold">Create a ticket</p>
          <label className="mt-5 block text-xs font-bold text-[#52627f]">
            Subject
            <input
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="Tell us what you need help with"
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>
          <label className="mt-4 block text-xs font-bold text-[#52627f]">
            Category
            <select className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm">
              <option>Job posting issue</option>
              <option>Verification</option>
              <option>Payment / subscription</option>
              <option>Technical issue</option>
            </select>
          </label>
          <button className="mt-5 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">
            Submit ticket
          </button>
        </form>
        <section className="rounded-2xl border border-[#dbe4f2] bg-white p-6">
          <p className="font-display text-lg font-extrabold">Recent tickets</p>
          {[
            ["TK-2081", "Verification document query", "In progress"],
            ["TK-2014", "Job approval delay", "Resolved"],
          ].map(([id, subject, status]) => (
            <button
              key={id}
              onClick={() => notify(`Opening ${id}`)}
              className="mt-4 block w-full rounded-xl border border-[#edf2f8] p-3 text-left hover:bg-[#f8faff]"
            >
              <span className="text-[10px] font-bold text-[#2563eb]">{id}</span>
              <p className="mt-1 text-sm font-bold">{subject}</p>
              <p className="mt-1 text-xs text-[#64748b]">{status}</p>
            </button>
          ))}
        </section>
      </div>
    </div>
  );

  const newJobList = postedJobs.length > 0 && (
    <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
      <p className="font-display text-lg font-extrabold">Recently created</p>
      <div className="mt-4 space-y-3">
        {postedJobs.map((job) => (
          <div
            key={job.id}
            className="flex flex-col justify-between gap-3 rounded-xl border border-[#edf2f8] p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-sm font-bold">{job.title}</p>
              <p className="mt-1 text-xs text-[#64748b]">
                {job.location} · {job.mode} · {job.type}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-fit rounded-full bg-[#fef3c7] px-2 py-1 text-[10px] font-bold text-[#a16207]">
                {jobStatuses[job.id] || "Pending approval"}
              </span>
              <details className="relative" data-account-dropdown>
                <summary
                  className="cursor-pointer list-none rounded-lg border border-[#dbe4f2] p-1.5 text-[#52627f] hover:bg-[#eff6ff]"
                  aria-label={`Manage ${job.title}`}
                >
                  <MoreHorizontal size={16} />
                </summary>
                <div className="absolute bottom-9 right-0 z-40 w-40 rounded-xl border border-[#dbe4f2] bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setJobDraft((current) => ({
                        ...current,
                        title: job.title,
                        category: job.category || "Other",
                        location: job.location,
                        skills: job.skills || [],
                        type: job.type,
                        mode: job.mode,
                        description: `Responsibilities and requirements for ${job.title}.`,
                      }));
                      setJobSkillInput("");
                      setEditingJobId(job.id);
                      setShowJobForm(true);
                      closeMenus();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#eff6ff]"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPostedJobs((current) =>
                        current.filter((item) => item.id !== job.id),
                      );
                      writeMarketplacePostings(readMarketplacePostings().filter((posting) => posting.id !== job.id));
                      notify(`${job.title} removed`);
                      closeMenus();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#b45345] hover:bg-[#fff1ef]"
                  >
                    Remove draft
                  </button>
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
  const jobFormModal = showJobForm && createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#071a3d]/65 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setShowJobForm(false);
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !jobDraft.title.trim() ||
            !jobDraft.location.trim() ||
            !jobDraft.description.trim()
          ) {
            notify("Job title, location, and description are required");
            return;
          }
          const id = editingJobId ?? `job-${Date.now()}`;
          const skills = Array.from(
            new Map(
              [...jobDraft.skills, jobSkillInput]
                .map((skill) => skill.trim().replace(/,+$/, "").trim())
                .filter(Boolean)
                .map((skill) => [skill.toLowerCase(), skill] as const),
            ).values(),
          );
          const changes = {
            title: jobDraft.title,
            category: jobDraft.category,
            location: jobDraft.location,
            type: jobDraft.type,
            mode: jobDraft.mode,
            skills,
          };
          if (editingJobId) {
            setRecruiterJobs((current) =>
              current.map((job) =>
                job.id === editingJobId ? { ...job, ...changes } : job,
              ),
            );
            setPostedJobs((current) =>
              current.map((job) =>
                job.id === editingJobId ? { ...job, ...changes } : job,
              ),
            );
            writeMarketplacePostings(readMarketplacePostings().map((posting) => posting.id === editingJobId ? { ...posting, ...changes, description: jobDraft.description, updatedAt: new Date().toISOString() } : posting));
          } else {
            const marketplacePosting: MarketplacePosting = {
              id,
              title: jobDraft.title,
              category: jobDraft.category,
              company: companyName,
              location: jobDraft.location,
              mode: jobDraft.mode,
              type: jobDraft.type,
              skills,
              description: jobDraft.description,
              status: "Pending approval",
              placement: "normal",
              createdAt: new Date().toISOString(),
            };
            writeMarketplacePostings([marketplacePosting, ...readMarketplacePostings()]);
            setPostedJobs((current) => [
              {
                id,
                ...changes,
                skills,
                views: 0,
                applications: 0,
                match: "Not ranked",
              },
              ...current,
            ]);
            setJobStatuses((current) => ({ ...current, [id]: "Pending" }));
          }
          setJobDraft({
            title: "",
            category: "Design, UX & Creative",
            location: "",
            type: "Full-time",
            mode: "Hybrid",
            experience: "",
            salary: "",
            skills: [],
            description: "",
          });
          setJobSkillInput("");
          setShowJobForm(false);
          setEditingJobId(null);
          notify(
            editingJobId
              ? "Job updated successfully"
              : "Job submitted for admin approval",
          );
        }}
        className="job-dialog-enter flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white text-[#172554] shadow-[0_28px_80px_rgba(7,26,61,0.3)]"
      >
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-[#e2e8f0] bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">
              New opportunity
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">
              {editingJobId ? "Edit job" : "Create a job"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowJobForm(false)}
            className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9]"
            aria-label="Close job form"
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7">
          <label className="text-xs font-bold text-[#475569] sm:col-span-2">
            Job title *
            <input
              value={jobDraft.title}
              onChange={(e) =>
                setJobDraft((current) => ({
                  ...current,
                  title: e.target.value,
                }))
              }
              placeholder="e.g. Senior Product Designer"
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Category
            <SearchableOptionInput
              value={jobDraft.category}
              onChange={(category) =>
                setJobDraft((current) => ({
                  ...current,
                  category,
                }))
              }
              options={jobCategorySuggestions}
              label="Job category"
              placeholder="Search or enter any category"
            />
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Location *
            <LocationSearchInput
              value={jobDraft.location}
              onChange={(location) =>
                setJobDraft((current) => ({
                  ...current,
                  location,
                }))
              }
            />
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Employment type
            <Select
              value={jobDraft.type}
              onValueChange={(type) =>
                setJobDraft((current) => ({ ...current, type }))
              }
            >
              <SelectTrigger className="mt-2 h-12 rounded-xl border-[#dbe4f2] bg-white px-3 text-sm shadow-sm hover:border-[#bfd1ef] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]">
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                {["Full-time", "Part-time", "Contract", "Temporary", "Internship", "Freelance", "Apprenticeship"].map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Work mode
            <Select
              value={jobDraft.mode}
              onValueChange={(mode) =>
                setJobDraft((current) => ({ ...current, mode }))
              }
            >
              <SelectTrigger className="mt-2 h-12 rounded-xl border-[#dbe4f2] bg-white px-3 text-sm shadow-sm hover:border-[#bfd1ef] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]">
                <SelectValue placeholder="Select work mode" />
              </SelectTrigger>
              <SelectContent>
                {["On-site", "Hybrid", "Remote", "Field-based"].map((mode) => (
                  <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Experience range
            <input
              value={jobDraft.experience}
              onChange={(e) =>
                setJobDraft((current) => ({
                  ...current,
                  experience: e.target.value,
                }))
              }
              placeholder="3–5 years"
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Salary range
            <input
              value={jobDraft.salary}
              onChange={(e) =>
                setJobDraft((current) => ({
                  ...current,
                  salary: e.target.value,
                }))
              }
              placeholder="₹18L – ₹28L"
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>
          <div className="text-xs font-bold text-[#475569] sm:col-span-2">
            <label htmlFor="job-required-skills">Required skills</label>
            <div className="mt-2 rounded-xl border border-[#dbe4f2] bg-white p-3 shadow-sm transition focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-[#dbeafe]">
              <div className="flex flex-wrap gap-2">
                {jobDraft.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1.5 text-xs font-semibold text-[#1d4ed8]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() =>
                        setJobDraft((current) => ({
                          ...current,
                          skills: current.skills.filter((item) => item !== skill),
                        }))
                      }
                      aria-label={`Remove ${skill}`}
                      className="rounded-full p-0.5 text-[#64748b] transition hover:bg-white hover:text-[#b45345]"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className={`flex items-center gap-2 ${jobDraft.skills.length ? "mt-2" : ""}`}>
                <input
                  id="job-required-skills"
                  value={jobSkillInput}
                  onChange={(event) => setJobSkillInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addJobSkill();
                    }
                  }}
                  placeholder="Type a skill and press Enter (e.g. Figma)"
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-normal text-[#172554] outline-none placeholder:text-[#94a3b8]"
                />
                <button
                  type="button"
                  onClick={addJobSkill}
                  disabled={!jobSkillInput.trim()}
                  className="shrink-0 rounded-lg bg-[#eff6ff] px-3 py-2 text-xs font-bold text-[#1d4ed8] transition hover:bg-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add skill
                </button>
              </div>
            </div>
            <p className="mt-1.5 font-normal text-[#64748b]">
              Add multiple skills. They are saved only when you submit the job.
            </p>
          </div>
          <label className="text-xs font-bold text-[#475569] sm:col-span-2">
            Job description *
            <textarea
              value={jobDraft.description}
              onChange={(e) =>
                setJobDraft((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              rows={5}
              placeholder="Describe the role, responsibilities, and what success looks like..."
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </label>
        </div>
        <div className="z-10 flex shrink-0 flex-col-reverse gap-2 border-t border-[#e2e8f0] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-7">
          <button
            type="button"
            onClick={() => setShowJobForm(false)}
            className="rounded-xl border border-[#cbd5e1] px-4 py-2.5 text-sm font-bold text-[#475569]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!jobDraft.title.trim()) {
                notify("Add a job title before saving the draft");
                return;
              }
              const id = `draft-${Date.now()}`;
              setPostedJobs((current) => [
                {
                  id,
                  title: jobDraft.title,
                  location: jobDraft.location || "Location not set",
                  type: jobDraft.type,
                  mode: jobDraft.mode,
                },
                ...current,
              ]);
              setJobStatuses((current) => ({ ...current, [id]: "Draft" }));
              setShowJobForm(false);
              notify("Job saved as draft");
            }}
            className="rounded-xl border border-[#93c5fd] px-4 py-2.5 text-sm font-bold text-[#2563eb]"
          >
            Save draft
          </button>
          <button className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">
            {editingJobId ? "Save changes" : "Submit for approval"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
  const interviewFormModal = showInterviewForm && createPortal(
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-[#071a3d]/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowInterviewForm(false);
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (sendingInvitation) return;
          if (
            !interviewDraft.candidate ||
            !interviewDraft.candidateEmail ||
            !interviewDraft.date ||
            !interviewDraft.time ||
            !interviewDraft.meetUrl
          ) {
            notify("Candidate, email, date, time, and Google Meet link are required");
            return;
          }
          if (!/^https:\/\/meet\.google\.com\//i.test(interviewDraft.meetUrl)) {
            notify("Enter a valid Google Meet link");
            return;
          }
          const interview = { id: `int-${Date.now()}`, ...interviewDraft };
          setInterviews((current) => {
            const next = [
            interview,
            ...current.filter(
              (item) =>
                !(
                  item.candidate === interviewDraft.candidate &&
                  item.round === interviewDraft.round
                ),
            )];
            localStorage.setItem(interviewsKey, JSON.stringify(next));
            return next;
          });
          const recruiterEmail = currentRecruiter.email || companyEmail;
          const messageBody = `Your ${interviewDraft.round} interview is scheduled for ${interviewDraft.date} at ${interviewDraft.time}. Join: ${interviewDraft.meetUrl}`;
          const message: PlatformMessage = { id: `MSG-${Date.now()}`, conversationId: conversationIdFor(recruiterEmail, interviewDraft.candidateEmail), fromRole: "recruiter", fromName: currentRecruiter.name || companyName, fromEmail: recruiterEmail, toRole: "job_seeker", toName: interviewDraft.candidate, toEmail: interviewDraft.candidateEmail, company: companyName, body: messageBody, createdAt: new Date().toISOString() };
          const savedMessages = readPlatformMessages();
          const duplicateMessage = savedMessages.some((existing) =>
            existing.conversationId === message.conversationId
            && existing.fromEmail === message.fromEmail
            && existing.body === message.body,
          );
          if (!duplicateMessage) {
            const nextMessages = [...savedMessages, message];
            writePlatformMessages(nextMessages);
            setPlatformMessages(nextMessages);
          }
          setSendingInvitation(true);
          try {
            await apiRequest<{ sent: boolean }>("/email/interview-invitation", { method: "POST", body: JSON.stringify({ candidateName: interviewDraft.candidate, candidateEmail: interviewDraft.candidateEmail, recruiterName: currentRecruiter.name || companyName, recruiterEmail, companyName, interviewType: interviewDraft.round, date: interviewDraft.date, time: interviewDraft.time, duration: Number(interviewDraft.duration), meetingLink: interviewDraft.meetUrl, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata" }) });
            setShowInterviewForm(false);
            notify("Interview scheduled and invitation sent");
          } catch (error) {
            notify(`Interview saved, but email was not sent: ${error instanceof Error ? error.message : "SMTP error"}`);
          } finally {
            setSendingInvitation(false);
          }
        }}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/50 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#dbeafe] bg-gradient-to-br from-[#eff6ff] via-white to-[#f0fdf4] px-5 py-5 sm:px-6">
          <div>
            <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">
              Candidate invitation
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">
              Schedule an interview
            </h2>
            <p className="mt-1 text-xs text-[#64748b]">
              A polished email and an in-app update will be sent after scheduling.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInterviewForm(false)}
            className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9]"
            aria-label="Close interview scheduler"
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className="text-xs font-bold text-[#475569]">
            Candidate
            <select
              value={interviewDraft.candidate}
              onChange={(event) =>
                setInterviewDraft((current) => { const application = marketplaceApplicants.find((item) => String(item.applicant.name) === event.target.value && item.company === companyName); return { ...current, candidate: event.target.value, candidateEmail: String(application?.applicant.email || "") }; })
              }
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] bg-white px-3 py-3 text-sm"
            >
              <option value="">Select a candidate</option>
              {marketplaceApplicants.filter((application) => application.company === companyName).map((application) => <option key={application.id}>{String(application.applicant.name || "Candidate")}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Candidate email
            <input type="email" value={interviewDraft.candidateEmail} onChange={(event) => setInterviewDraft((current) => ({ ...current, candidateEmail: event.target.value }))} placeholder="candidate@example.com" className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm" />
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Interview round
            <select
              value={interviewDraft.round}
              onChange={(event) =>
                setInterviewDraft((current) => ({
                  ...current,
                  round: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] bg-white px-3 py-3 text-sm"
            >
              <option>Portfolio review</option>
              <option>Recruiter screen</option>
              <option>Hiring manager round</option>
              <option>Technical interview</option>
              <option>Culture interview</option>
            </select>
          </label>
          <label className="text-xs font-bold text-[#475569]">
            Date
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={interviewDraft.date}
              onChange={(event) =>
                setInterviewDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-[#475569]">
              Time
              <input
                type="time"
                value={interviewDraft.time}
                onChange={(event) =>
                  setInterviewDraft((current) => ({
                    ...current,
                    time: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-[#475569]">
              Duration
              <select
                value={interviewDraft.duration}
                onChange={(event) =>
                  setInterviewDraft((current) => ({
                    ...current,
                    duration: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-2 py-3 text-sm"
              >
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-bold text-[#475569] sm:col-span-2">
            Google Meet link
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={interviewDraft.meetUrl}
                onChange={(event) =>
                  setInterviewDraft((current) => ({
                    ...current,
                    meetUrl: event.target.value,
                  }))
                }
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="min-w-0 flex-1 rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm outline-none focus:border-[#2563eb]"
              />
              <a
                href="https://meet.google.com/new"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[#93c5fd] px-4 py-3 text-center text-xs font-bold text-[#2563eb] hover:bg-[#eff6ff]"
              >
                Create Meet link
              </a>
            </div>
            <span className="mt-2 block text-[10px] font-medium text-[#64748b]">
              Create the room in Google Meet, then paste its link here.
            </span>
          </label>
        </div>
        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[#dbeafe] bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => setShowInterviewForm(false)}
            className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-bold text-[#475569] sm:w-auto"
          >
            Cancel
          </button>
          <button disabled={sendingInvitation} className="w-full rounded-xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2563eb]/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
            {sendingInvitation ? "Sending invitation…" : "Schedule & send email"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
  const requestCompanyVerification = async (): Promise<boolean> => {
    if (!selectedVerificationDocumentType) {
      notify("Select the business document type you want to verify");
      return false;
    }
    if (selectedVerificationDocumentType !== "other" && !selectedVerificationIdentifier.trim()) {
      notify(`Enter the ${selectedVerificationDocumentType.toUpperCase()} number before submitting its verification document`);
      setEditingCompany(true);
      return false;
    }
    if (!companyProfileComplete) {
      notify("Complete the required company and contact details before submission");
      setEditingCompany(true);
      return false;
    }
    if (!verificationDocuments.some((document) => document.documentType === selectedVerificationDocumentType)) {
      notify(`Upload your ${businessVerificationOptions.find((option) => option.value === selectedVerificationDocumentType)?.label || "selected"} before submission`);
      return false;
    }
    setSubmittingVerification(true);
    setVerificationDocumentError("");
    try {
      const { verificationStatus } = await apiRequest<{ verificationStatus: "pending" }>(
        "/companies/me/verification/submit",
        {
          method: "POST",
          body: JSON.stringify({ documentType: selectedVerificationDocumentType }),
        },
      );
      setCompanyVerificationStatus(verificationStatus);
      setVerificationDocuments((documents) => documents.filter(
        (document) => document.documentType === selectedVerificationDocumentType,
      ));
      notify("Company profile saved and verification submitted for admin review");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit company verification";
      setVerificationDocumentError(message);
      notify(message);
      return false;
    } finally {
      setSubmittingVerification(false);
    }
  };
  const saveCompanyProfile = async (): Promise<boolean> => {
    if (!companyName.trim() || !companyIndustry.trim() || !companyWebsite.trim() || !companyAbout.trim()) {
      notify("Company name, industry/domain, website, and description are required");
      return false;
    }
    if (companyName.trim().length < 2 || companyIndustry.trim().length < 2 || companyAbout.trim().length < 20 || companyAbout.length > 5000) {
      notify("Company name and industry need at least 2 characters; description needs 20-5,000 characters");
      return false;
    }
    let websiteUrl: URL;
    try {
      websiteUrl = new URL(companyWebsite.trim());
    } catch {
      notify("Enter a valid company website URL");
      return false;
    }
    if (!["http:", "https:"].includes(websiteUrl.protocol) || !websiteUrl.hostname.includes(".")) {
      notify("Enter a valid company website URL");
      return false;
    }
    for (const imageValue of [companyLogoUrl, companyCoverUrl]) {
      if (!imageValue.trim()) continue;
      try {
        const imageUrl = new URL(imageValue.trim());
        if (!["http:", "https:"].includes(imageUrl.protocol) || !imageUrl.hostname.includes(".")) throw new Error();
      } catch {
        notify("Enter a valid HTTP or HTTPS URL for each company image");
        return false;
      }
    }
    if (companyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim())) {
      notify("Enter a valid company contact email");
      return false;
    }
    if (companyGst.trim() && !/^[0-9A-Z]{15}$/.test(companyGst.trim().toUpperCase())) {
      notify("Enter a valid 15-character GSTIN");
      return false;
    }
    if (companyPan.trim() && !/^[A-Z]{5}\d{4}[A-Z]$/.test(companyPan.trim().toUpperCase())) {
      notify("Enter a valid 10-character PAN number");
      return false;
    }
    if (companyMsme.trim() && !/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(companyMsme.trim().toUpperCase())) {
      notify("Enter a valid Udyam registration number");
      return false;
    }
    setSavingCompanyProfile(true);
    try {
      const payload = {
        name: companyName.trim(),
        website: companyWebsite.trim(),
        size: companySize,
        description: companyAbout.trim(),
        industry: companyIndustry.trim(),
        city: companyLocation.trim(),
        founded: companyFounded.trim(),
        contactEmail: companyEmail.trim(),
        phone: companyPhone.trim(),
        gstNumber: companyGst.trim().toUpperCase(),
        panNumber: companyPan.trim().toUpperCase(),
        msmeNumber: companyMsme.trim().toUpperCase(),
        logoUrl: companyLogoUrl.trim(),
        coverUrl: companyCoverUrl.trim(),
      };
      let savedVerificationStatus = companyVerificationStatus;
      if (currentRecruiter.id && isUuid(currentRecruiter.id)) {
        const { company, verificationReset } = await apiRequest<{
          company: Record<string, unknown>;
          verificationReset: boolean;
        }>("/companies/me", {
          method: "PATCH",
          body: JSON.stringify({ company: payload }),
        });
        const nextStatus = company.verificationStatus;
        savedVerificationStatus = verificationReset
          ? "incomplete"
          : nextStatus === "verified" || nextStatus === "pending" || nextStatus === "rejected"
            ? nextStatus
            : "incomplete";
        setCompanyVerificationStatus(savedVerificationStatus);
        if (verificationReset) {
          setVerificationDocuments((documents) => documents.map((document) => ({
            ...document,
            status: "pending",
            reviewerNote: null,
            reviewedAt: null,
          })));
        }
      }
      localStorage.setItem(userDataKey("careerly-company-profile", currentRecruiter.email), JSON.stringify({
        companyName: payload.name,
        companyWebsite: payload.website,
        companySize: payload.size,
        companyAbout: payload.description,
        companyIndustry: payload.industry,
        companyLocation: payload.city,
        companyFounded: payload.founded,
        companyEmail: payload.contactEmail,
        companyPhone: payload.phone,
        companyGst: payload.gstNumber,
        companyPan: payload.panNumber,
        companyMsme: payload.msmeNumber,
        companyLogoUrl: payload.logoUrl,
        companyCoverUrl: payload.coverUrl,
      }));
      localStorage.setItem("careerly-current-user", JSON.stringify({ ...currentRecruiter, company: payload.name }));
      localStorage.setItem(localAccountsKey, JSON.stringify(readLocalAccounts().map((account) => account.email === currentRecruiter.email ? { ...account, company: payload.name } : account)));
      setCompanyProfileError("");
      setEditingCompany(false);
      const canAutoSubmitVerification = Boolean(
        currentRecruiter.id &&
        isUuid(currentRecruiter.id) &&
        selectedVerificationDocumentType &&
        verificationDocuments.some((document) => document.documentType === selectedVerificationDocumentType) &&
        ["incomplete", "rejected"].includes(savedVerificationStatus),
      );
      if (canAutoSubmitVerification) {
        await requestCompanyVerification();
        return true;
      }
      notify(currentRecruiter.id && isUuid(currentRecruiter.id)
        ? "Company profile saved to your account"
        : "Company profile saved on this device; sign in to sync across devices");
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Company profile could not be saved");
      return false;
    } finally {
      setSavingCompanyProfile(false);
    }
  };
  const uploadVerificationDocument = async (documentType: VerificationDocument["documentType"], file?: File) => {
    if (!file) return;
    const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      setVerificationDocumentError("Use a PDF, JPEG, PNG, or WebP file.");
      return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setVerificationDocumentError("Each document must be non-empty and 5 MB or smaller.");
      return;
    }
    setUploadingDocumentType(documentType);
    setVerificationDocumentError("");
    try {
      const { document } = await apiRequest<{ document: VerificationDocument }>(
        `/companies/me/verification-documents/${documentType}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "X-File-Name": encodeURIComponent(file.name),
          },
          body: await file.arrayBuffer(),
        },
      );
      setVerificationDocuments((current) => [
        ...current.filter((item) => item.documentType !== documentType),
        document,
      ]);
      setCompanyVerificationStatus("incomplete");
      notify(`${file.name} uploaded and waiting for review`);
    } catch (error) {
      setVerificationDocumentError(error instanceof Error ? error.message : "Document upload failed");
    } finally {
      setUploadingDocumentType(null);
    }
  };
  const submitCompanyVerification = async () => {
    if (editingCompany) {
      await saveCompanyProfile();
      return;
    }
    await requestCompanyVerification();
  };
  const professionalCompanyPanel = (
    <div className="space-y-7">
      <PanelTitle
        eyebrow="Employer brand"
        title="Company profile"
        text="Set up the company information candidates need to understand your organization."
        action={
          <div className="flex gap-2">
            {editingCompany && (
              <button
                onClick={() => setEditingCompany(false)}
                className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-bold text-[#475569]"
              >
                Cancel
              </button>
            )}
            <ActionButton
              disabled={savingCompanyProfile || submittingVerification}
              onClick={() => editingCompany ? void saveCompanyProfile() : setEditingCompany(true)}
            >
              {editingCompany
                ? savingCompanyProfile
                  ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{submittingVerification ? "Submitting verification…" : "Saving profile…"}</span>
                  : selectedVerificationDocument && ["incomplete", "rejected"].includes(companyVerificationStatus)
                    ? "Save & submit verification"
                    : "Save profile"
                : "Edit profile"}
            </ActionButton>
          </div>
        }
      />
      {companyProfileLoading && <section className="rounded-xl border border-[#dbe4f2] bg-white p-4 text-sm text-[#475569]">Loading your saved company profile…</section>}
      {companyProfileError && <div role="alert" className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm text-[#9a3412]">{companyProfileError}</div>}
      <section className="relative overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="relative h-36 overflow-hidden bg-gradient-to-r from-[#071a3d] via-[#123d82] to-[#2563eb]">
          {companyCoverUrl && (
            <img
              src={companyCoverUrl}
              alt="Company cover"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.08)_100%)]" />
          <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[34px] border-white/10" />
          <div className="absolute bottom-5 left-6 hidden text-[10px] font-bold uppercase tracking-[0.16em] text-white/65 sm:block">
            Company profile
          </div>
          <div className="absolute bottom-5 right-6 hidden items-center gap-2 rounded-full border border-white/15 bg-[#0f2f67]/75 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur sm:flex">
            <ShieldCheck size={15} />
            {companyVerificationStatus === "verified" ? "Verified company" : companyVerificationStatus === "pending" ? "Under review" : "Verification required"}
          </div>
        </div>
        <div className="relative px-5 pb-6 pt-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative -mt-14 flex h-24 w-24 shrink-0 items-center justify-center self-start overflow-hidden rounded-2xl border-4 border-white bg-[#111827] font-display text-3xl font-extrabold text-white shadow-[0_8px_20px_rgba(15,23,42,0.2)] sm:self-auto">
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt={`${companyName} logo`}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                companyName.charAt(0) || "C"
              )}
            </div>
            <div className="relative z-10 min-w-0 flex-1">
              {editingCompany ? (
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  className="w-full max-w-lg rounded-xl border border-[#dbe4f2] bg-white px-3 py-2.5 font-display text-2xl font-extrabold outline-none focus:border-[#2563eb]"
                />
              ) : (
                <h2 className="font-display text-2xl font-extrabold tracking-[-.03em] text-[#172554] sm:text-3xl">
                  {companyName}
                </h2>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-y-2 text-xs text-[#64748b]">
                <span className="inline-flex items-center gap-1.5 pr-4 sm:border-r sm:border-[#e2e8f0]">
                  <Building2 size={14} />
                  {companyIndustry}
                </span>
                <span className="inline-flex items-center gap-1.5 pr-4 sm:border-r sm:border-[#e2e8f0] sm:pl-4">
                  <MapPin size={14} />
                  {companyLocation}
                </span>
                <span className="inline-flex items-center gap-1.5 sm:pl-4">
                  <UsersRound size={14} />
                  {companySize}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowPublicCompanyPreview(true)}
              className="w-fit shrink-0 rounded-xl border border-[#bfd1ef] bg-white px-3.5 py-2.5 text-xs font-bold text-[#1d4ed8] shadow-sm transition-colors hover:bg-[#eff6ff]"
            >
              Preview public page
            </button>
          </div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dbe4f2] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-extrabold text-[#172554]">
                  Company details
                </h3>
                <p className="mt-1 text-xs text-[#64748b]">
                  Core information candidates use to evaluate your company.
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${companyProfileComplete ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fff7ed] text-[#c2410c]"}`}>
                {companyProfileComplete ? "Complete" : "Incomplete"}
              </span>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#52627f]">
                Industry / domain
                <CompanySuggestionInput
                  value={companyIndustry}
                  onChange={setCompanyIndustry}
                  readOnly={!editingCompany}
                  suggestions={companyIndustrySuggestions}
                  label="Industry or domain"
                  placeholder={editingCompany ? "Start typing to search industries" : "Not set"}
                  className={`${companyFieldClass} mt-0`}
                />
              </label>
              <label className="text-xs font-bold text-[#52627f]">
                Company size
                <Select value={companySize} onValueChange={setCompanySize} disabled={!editingCompany}>
                  <SelectTrigger className={`${companyFieldClass} flex h-[46px] items-center justify-between shadow-sm`}>
                    <SelectValue placeholder="Choose your team size" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#dbe4f2] bg-white shadow-xl">
                    <SelectItem value="1–10 employees" className="py-2.5">1–10 employees</SelectItem>
                    <SelectItem value="11–50 employees" className="py-2.5">11–50 employees</SelectItem>
                    <SelectItem value="51–200 employees" className="py-2.5">51–200 employees</SelectItem>
                    <SelectItem value="201–1,000 employees" className="py-2.5">201–1,000 employees</SelectItem>
                    <SelectItem value="1,000–5,000 employees" className="py-2.5">1,000–5,000 employees</SelectItem>
                    <SelectItem value="5,000+ employees" className="py-2.5">5,000+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="text-xs font-bold text-[#52627f]">
                Founded
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={!editingCompany}
                      className={`${companyFieldClass} flex items-center justify-between text-left disabled:cursor-default`}
                    >
                      <span className={companyFounded ? "text-[#334155]" : "text-[#94a3b8]"}>
                        {companyFounded || "Select founding year"}
                      </span>
                      <CalendarDays size={17} className="shrink-0 text-[#2563eb]" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" sideOffset={8} className="w-auto rounded-2xl border-[#dbe4f2] bg-white p-3 shadow-[0_16px_40px_rgba(15,42,92,0.18)]">
                    <Calendar
                      mode="single"
                      selected={companyFounded ? new Date(Number(companyFounded), 0, 1) : undefined}
                      onSelect={(date) => setCompanyFounded(date ? String(date.getFullYear()) : "")}
                      captionLayout="dropdown"
                      startMonth={new Date(1800, 0)}
                      endMonth={new Date()}
                      disabled={{ after: new Date() }}
                      className="rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </label>
              <label className="text-xs font-bold text-[#52627f]">
                Headquarters
                <LocationSearchInput
                  value={companyLocation}
                  onChange={setCompanyLocation}
                  readOnly={!editingCompany}
                  label="Company headquarters"
                  placeholder={editingCompany ? "Search city or headquarters location" : "Not set"}
                />
              </label>
              <label className="text-xs font-bold text-[#52627f] sm:col-span-2">
                Company website
                <input
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  readOnly={!editingCompany}
                  type="url"
                  required
                  maxLength={255}
                  placeholder={editingCompany ? "https://example.com" : "Not set"}
                  className={companyFieldClass}
                />
              </label>
              <label className="text-xs font-bold text-[#52627f]">
                Company logo URL
                <input
                  value={companyLogoUrl}
                  onChange={(e) => setCompanyLogoUrl(e.target.value)}
                  readOnly={!editingCompany}
                  type="url"
                  maxLength={2048}
                  placeholder={editingCompany ? "https://example.com/logo.png" : "Not set"}
                  className={companyFieldClass}
                />
              </label>
              <label className="text-xs font-bold text-[#52627f]">
                Cover image URL
                <input
                  value={companyCoverUrl}
                  onChange={(e) => setCompanyCoverUrl(e.target.value)}
                  readOnly={!editingCompany}
                  type="url"
                  maxLength={2048}
                  placeholder={editingCompany ? "https://example.com/cover.jpg" : "Not set"}
                  className={companyFieldClass}
                />
                <span className="mt-1 block text-[10px] font-medium text-[#64748b]">Use an image URL from a trusted host. Direct file uploads require persistent file storage.</span>
              </label>
              <label className="text-xs font-bold text-[#52627f] sm:col-span-2">
                Business verification type
                <Select
                  value={selectedVerificationDocumentType}
                  onValueChange={(value) => {
                    if (isBusinessVerificationType(value)) {
                      setSelectedVerificationDocumentType(value);
                      setEditingCompany(true);
                    }
                  }}
                  disabled={companyVerificationStatus === "pending"}
                >
                  <SelectTrigger className={`${companyFieldClass} flex h-[46px] items-center justify-between shadow-sm`}>
                    <SelectValue placeholder="Select one document type to verify" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#dbe4f2] bg-white shadow-xl">
                    {businessVerificationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="py-2.5">{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="mt-1.5 block text-[11px] font-normal leading-5 text-[#64748b]">
                  Choose one document type. Its matching identifier and upload fields will appear below.
                </span>
              </label>
              {selectedVerificationDocumentType === "gst" && (
                <label className="text-xs font-bold text-[#52627f]">
                  GSTIN
                  <input
                    value={companyGst}
                    onChange={(event) => setCompanyGst(event.target.value.toUpperCase())}
                    readOnly={!editingCompany}
                    maxLength={15}
                    required
                    placeholder={editingCompany ? "15-character GSTIN" : "Not set"}
                    className={companyFieldClass}
                  />
                </label>
              )}
              {selectedVerificationDocumentType === "pan" && (
                <label className="text-xs font-bold text-[#52627f]">
                  PAN number
                  <input
                    value={companyPan}
                    onChange={(event) => setCompanyPan(event.target.value.toUpperCase())}
                    readOnly={!editingCompany}
                    maxLength={10}
                    required
                    placeholder={editingCompany ? "ABCDE1234F" : "Not set"}
                    className={companyFieldClass}
                  />
                </label>
              )}
              {selectedVerificationDocumentType === "msme" && (
                <label className="text-xs font-bold text-[#52627f]">
                  MSME / Udyam registration
                  <input
                    value={companyMsme}
                    onChange={(event) => setCompanyMsme(event.target.value.toUpperCase())}
                    readOnly={!editingCompany}
                    maxLength={19}
                    required
                    placeholder={editingCompany ? "UDYAM-XX-00-0000000" : "Not set"}
                    className={companyFieldClass}
                  />
                </label>
              )}
              {selectedVerificationDocumentType === "other" && (
                <p className="text-xs leading-5 text-[#64748b] sm:col-span-2">
                  No registration number is needed for this option. Upload the supporting document in the verification section below.
                </p>
              )}
              <label className="text-xs font-bold text-[#52627f] sm:col-span-2">
                About the company
                <textarea
                  value={companyAbout}
                  onChange={(e) => setCompanyAbout(e.target.value)}
                  readOnly={!editingCompany}
                  rows={6}
                  maxLength={5000}
                  required
                  className={companyFieldClass}
                />
                <span className="mt-1 block text-right text-[10px] font-medium text-[#94a3b8]">
                  {companyAbout.length}/5000 · at least 20 characters required
                </span>
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-[#dbe4f2] bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="font-display text-lg font-extrabold text-[#172554]">Business verification documents</h3>
                <p className="mt-1 text-xs leading-5 text-[#64748b]">Upload the document type selected in Company details. One approved document is enough. PDF, JPEG, PNG, or WebP · max 5 MB.</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${companyVerificationStatus === "verified" ? "bg-[#dcfce7] text-[#15803d]" : companyVerificationStatus === "pending" ? "bg-[#fef3c7] text-[#a16207]" : companyVerificationStatus === "rejected" ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#eff6ff] text-[#1d4ed8]"}`}>
                {companyVerificationStatus === "verified" ? "Verified" : companyVerificationStatus === "pending" ? "In review" : companyVerificationStatus === "rejected" ? "Needs updates" : "Not submitted"}
              </span>
            </div>
            {verificationDocumentError && <p role="alert" className="mt-4 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm text-[#9a3412]">{verificationDocumentError}</p>}
            {selectedVerificationDocumentType ? (
              <div className="mt-4 max-w-xl">
                <div className="rounded-xl border border-[#e2e8f0] p-4">
                  <div className="flex items-start gap-3">
                    <FileText size={18} className="mt-0.5 shrink-0 text-[#2563eb]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#334155]">
                        {businessVerificationOptions.find((option) => option.value === selectedVerificationDocumentType)?.label}
                      </p>
                      {selectedVerificationDocument ? (
                        <>
                          <p className="mt-1 truncate text-xs text-[#64748b]" title={selectedVerificationDocument.fileName}>
                            {selectedVerificationDocument.fileName} · {(selectedVerificationDocument.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className={`mt-2 text-xs font-bold ${selectedVerificationDocument.status === "verified" ? "text-[#15803d]" : selectedVerificationDocument.status === "rejected" ? "text-[#b91c1c]" : "text-[#a16207]"}`}>
                            {selectedVerificationDocument.status === "verified" ? "Verified by admin" : selectedVerificationDocument.status === "rejected" ? "Rejected · upload a corrected file" : "Uploaded · awaiting admin review"}
                          </p>
                          {selectedVerificationDocument.reviewerNote && <p className="mt-1 text-xs text-[#64748b]">{selectedVerificationDocument.reviewerNote}</p>}
                        </>
                      ) : <p className="mt-1 text-xs text-[#94a3b8]">No file uploaded</p>}
                    </div>
                    <label className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#bfd1ef] px-2.5 py-2 text-xs font-bold text-[#2563eb] ${uploadingDocumentType === selectedVerificationDocumentType || companyVerificationStatus === "pending" ? "cursor-not-allowed opacity-50" : ""}`}>
                      <Upload size={13} />
                      {uploadingDocumentType === selectedVerificationDocumentType ? "Uploading…" : selectedVerificationDocument ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={uploadingDocumentType !== null || companyVerificationStatus === "pending"}
                        onChange={(event) => {
                          void uploadVerificationDocument(selectedVerificationDocumentType, event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex max-w-xl items-center gap-3 rounded-xl border border-dashed border-[#bfd1ef] bg-[#f8fbff] p-4 text-sm text-[#64748b]">
                <FileText size={18} className="shrink-0 text-[#2563eb]" />
                Select a business verification type in Company details above to add its upload field.
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3 border-t border-[#edf2f8] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#64748b]">
                {companyVerificationStatus === "pending"
                  ? "Your submission is being reviewed. Company tools unlock after admin approval."
                  : companyVerificationStatus === "verified"
                    ? "Your business has been verified. Recruiter workspace access is enabled."
                    : "The recruiter workspace remains locked until your profile and selected document are approved."}
              </p>
              {companyVerificationStatus !== "verified" && companyVerificationStatus !== "pending" && (
                <button
                  type="button"
                  disabled={savingCompanyProfile || submittingVerification || uploadingDocumentType !== null}
                  onClick={() => void submitCompanyVerification()}
                  className="shrink-0 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingCompanyProfile || submittingVerification
                    ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{submittingVerification ? "Submitting…" : "Saving profile…"}</span>
                    : "Submit for verification"}
                </button>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-[#dbe4f2] bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-extrabold text-[#172554]">
              Recruiting contact
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              Used for verification and important hiring notifications.
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#52627f]">
                Recruiting email
                <input
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  readOnly={!editingCompany}
                  type="email"
                  className={companyFieldClass}
                />
              </label>
              <label className="text-xs font-bold text-[#52627f]">
                Phone number
                <input
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  readOnly={!editingCompany}
                  className={companyFieldClass}
                />
              </label>
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-[#172554]">
                Profile strength
              </h3>
              <span className="font-display text-xl font-extrabold text-[#2563eb]">
                {companyProfileStrength}%
              </span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e2e8f0]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#60a5fa] transition-all" style={{ width: `${companyProfileStrength}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#64748b]">
              {companyProfileComplete
                ? "Your required company profile information is complete."
                : "Add the company name, industry/domain, website, and description to complete your profile."}
            </p>
            <button
              onClick={() => setEditingCompany(true)}
              className="mt-4 text-xs font-bold text-[#2563eb]"
            >
              Edit company profile →
            </button>
          </section>
          <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-[#dcfce7] p-2 text-[#15803d]">
                <ShieldCheck size={19} />
              </span>
              <div>
                <h3 className="font-display font-extrabold text-[#172554]">
                  Company verification
                </h3>
                <p className="text-[10px] font-bold text-[#64748b]">
                  {companyVerificationStatus === "verified" ? "VERIFIED" : companyVerificationStatus === "pending" ? "IN REVIEW" : companyVerificationStatus === "rejected" ? "ACTION REQUIRED" : "NOT VERIFIED"}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  {selectedVerificationDocumentType
                    ? selectedVerificationDocumentType === "other"
                      ? "Selected document type"
                      : `${selectedVerificationDocumentType.toUpperCase()} number`
                    : "Selected verification"}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#334155]">
                  {selectedVerificationDocumentType
                    ? selectedVerificationDocumentType === "other"
                      ? selectedVerificationDocumentLabel
                      : selectedVerificationIdentifier || "Number not provided"
                    : "No verification type selected"}
                </p>
              </div>
              {selectedVerificationDocument && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                    Uploaded document
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-[#334155]" title={selectedVerificationDocument.fileName}>
                    {selectedVerificationDocument.fileName}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${
                    selectedVerificationDocument.status === "verified"
                      ? "text-[#15803d]"
                      : selectedVerificationDocument.status === "rejected"
                        ? "text-[#b91c1c]"
                        : companyVerificationStatus === "pending"
                          ? "text-[#a16207]"
                          : "text-[#64748b]"
                  }`}>
                    {selectedVerificationDocument.status === "verified"
                      ? "Verified by admin"
                      : selectedVerificationDocument.status === "rejected"
                        ? "Rejected · upload a corrected document"
                        : companyVerificationStatus === "pending"
                          ? "Submitted · awaiting admin review"
                          : "Uploaded · ready to submit"}
                  </p>
                </div>
              )}
              <p className="text-xs leading-5 text-[#64748b]">
                {selectedVerificationDocument
                  ? `${selectedVerificationDocumentLabel || "Selected document"} is the only document selected for verification. `
                  : selectedVerificationDocumentType
                    ? `No ${selectedVerificationDocumentLabel || "selected verification"} document has been uploaded yet. `
                    : "No verification document selected yet. "}
                {companyVerificationStatus === "verified" ? "Your company is approved." : companyVerificationStatus === "pending" ? "An administrator is reviewing your submission." : companyVerificationStatus === "rejected" ? "Update the requested details or documents and resubmit." : "Complete your profile and submit the selected document for review."}
              </p>
            </div>
          </section>
          <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5 shadow-sm">
            <h3 className="font-display font-extrabold text-[#172554]">
              Company activity
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Active jobs", String(activeJobCount)],
                ["Applications", String(currentCompanyApplications.length)],
                ["Interviews", String(interviews.length)],
                ["Profile complete", `${companyProfileStrength}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f8faff] p-3">
                  <p className="font-display text-lg font-extrabold text-[#172554]">
                    {value}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-[#64748b]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
  const contentBody =
    tab === "dashboard" ? (
      dashboard
    ) : tab === "jobs" ? (
      <div className="space-y-6">
        {jobsPanel}
        {newJobList}
      </div>
    ) : tab === "candidates" ? (
      candidatesPanel
    ) : tab === "interviews" ? (
      interviewsPanel
    ) : tab === "messages" ? (
      recruiterMessagesPanel
    ) : tab === "company" ? (
      professionalCompanyPanel
    ) : tab === "subscription" ? (
      <SubscriptionPage onToast={notify} audience="recruiter" />
    ) : (
      supportPanel
    );
  const content = (
    <>
      {contentBody}
      {jobFormModal}
      {interviewFormModal}
    </>
  );
  const sidebar = (
    <>
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb] text-white">
          <Zap size={18} />
        </span>
        <div>
          <p className="font-display text-lg font-extrabold text-white">
            careerly
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#93c5fd]">
            Recruiter
          </p>
        </div>
      </div>
      <nav className="mt-8 space-y-1">
        {navItems.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => go(id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${tab === id ? "bg-[#2563eb] font-bold text-white shadow-lg shadow-blue-950/30" : "text-[#c5d5f2] hover:bg-white/10 hover:text-white"}`}
          >
            <span className="flex h-5 w-5 items-center justify-center text-[14px]">
              <Icon aria-hidden="true" />
            </span>
            {label}
            {id === "messages" && unreadCandidateMessageCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-bold text-white shadow-sm">
                {unreadCandidateMessageCount > 9 ? "9+" : unreadCandidateMessageCount}
              </span>
            )}
            {id === "subscription" && (
              <span className="ml-auto rounded-full bg-[#f59e0b] px-2 py-0.5 text-[9px] font-bold text-white">
                PRO
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
  if (companyProfileLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f7fc] p-5 text-sm font-semibold text-[#475569]">
        Loading your company verification status…
      </div>
    );
  }
  if (companyVerificationStatus !== "verified") {
    return (
      <div className="app-grain min-h-[100dvh] bg-[#f4f7fc] px-4 py-6 text-[#172554] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 flex items-center justify-between rounded-2xl border border-[#dbe4f2] bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white"><Zap size={18} /></span>
              <div><p className="font-display text-lg font-extrabold">careerly</p><p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Business verification required</p></div>
            </div>
            <button onClick={onLogout} className="rounded-lg border border-[#dbe4f2] px-3 py-2 text-xs font-bold text-[#475569] hover:bg-[#f8faff]">Log out</button>
          </header>
          <div className="mb-6 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-[#2563eb]" />
              <div>
                <h1 className="font-display text-xl font-extrabold text-[#172554]">
                  {companyVerificationStatus === "pending" ? "Your company verification is in review" : companyVerificationStatus === "rejected" ? "Update your verification details" : "Complete company verification to continue"}
                </h1>
                <p className="mt-1 text-sm leading-6 text-[#475569]">
                  {companyVerificationStatus === "pending"
                    ? "Your profile and documents have been submitted. Recruiter tools will unlock as soon as an administrator approves the company."
                    : "Complete your business profile and upload any one business verification document. An administrator will review it before recruiter tools become available."}
                </p>
              </div>
            </div>
          </div>
          {professionalCompanyPanel}
        </div>
        {toastMessage && (
          <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[80] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-[#172554] px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="app-grain min-h-[100dvh] bg-[#f4f7fc] text-[#172554]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col bg-[#0b1f44] p-4 lg:flex">
        {sidebar}
        <div className="relative mt-auto rounded-2xl bg-white/10 p-3">
          <div className="flex items-center gap-2">
            <Avatar small />
            <div>
              <p className="text-xs font-bold text-white">{currentRecruiter.name || "Recruiter"}</p>
              <p className="text-[11px] text-[#a8c2ec]">{companyName} · Recruiter</p>
            </div>
            <details className="ml-auto" data-account-dropdown>
              <summary className="cursor-pointer list-none text-[#bfdbfe]">
                <MoreHorizontal size={18} />
              </summary>
              <div className="absolute bottom-14 right-0 w-44 rounded-xl border border-[#dbe4f2] bg-white p-1.5 shadow-xl">
                <button
                  onClick={() => go("company")}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#475569] hover:bg-[#eff6ff]"
                >
                  Company profile
                </button>
                <button
                  onClick={() => go("subscription")}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#475569] hover:bg-[#eff6ff]"
                >
                  Manage subscription
                </button>
                <button
                  onClick={onLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#b45345] hover:bg-[#fff1ef]"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <div className="fixed inset-0 z-50 bg-[#0b1f44] p-4 lg:hidden">
          <div className="flex justify-end">
            <button
              onClick={() => setMobileMenu(false)}
              className="rounded-lg p-2 text-white"
            >
              <X />
            </button>
          </div>
          {sidebar}
        </div>
      )}
      <main className="lg:ml-[236px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center border-b border-[#dbe4f2] bg-white/90 px-5 backdrop-blur lg:px-8">
          <button
            onClick={() => setMobileMenu(true)}
            className="rounded-lg border border-[#dbe4f2] p-2 lg:hidden"
          >
            <Menu size={18} />
          </button>
          <div className="relative ml-4 hidden max-w-md flex-1 md:block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              placeholder="Search candidates, skills, or jobs..."
              className="w-full rounded-xl border border-[#dbe4f2] bg-[#f8faff] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => notify("No new recruiter notifications")}
              className="relative rounded-xl p-2 text-[#52627f] hover:bg-[#eff6ff]"
            >
              <Bell size={19} />
            </button>
            <details className="relative" data-account-dropdown>
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 hover:bg-[#eff6ff]">
                <Avatar small />
                <span className="hidden text-sm font-bold sm:inline">
                  {currentRecruiter.name || "Recruiter"}
                </span>
                <ChevronDown size={14} />
              </summary>
              <div className="absolute right-0 top-12 w-48 rounded-xl border border-[#dbe4f2] bg-white p-1.5 shadow-xl">
                <button
                  onClick={() => go("company")}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#eff6ff]"
                >
                  Company profile
                </button>
                <button
                  onClick={() => go("subscription")}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#eff6ff]"
                >
                  Manage subscription
                </button>
                <button
                  onClick={onLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#b45345] hover:bg-[#fff1ef]"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </header>
        <div key={tab} className="recruiter-page-enter mx-auto max-w-[1450px] p-5 sm:p-8">{content}</div>
      </main>
      {showPublicCompanyPreview && (
        createPortal(
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#0f172a]/65 p-3 backdrop-blur-md sm:p-6">
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_32px_90px_rgba(7,26,61,0.32)]">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#2563eb]">Candidate experience</p>
                <h2 className="font-display text-lg font-extrabold text-[#172554]">Company profile preview</h2>
              </div>
              <button onClick={() => setShowPublicCompanyPreview(false)} aria-label="Close public company preview" className="rounded-lg p-2 text-[#64748b] hover:bg-[#eff6ff]"><X size={20} /></button>
            </div>
            <div className="bg-[#f7f9fc] p-3 sm:p-7">
              <section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white shadow-sm">
                <div className="relative h-36 overflow-hidden bg-gradient-to-r from-[#071a3d] via-[#123d82] to-[#2563eb] sm:h-48">
                  {companyCoverUrl && <img src={companyCoverUrl} alt={`${companyName} cover`} className="absolute inset-0 h-full w-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#071a3d]/45 to-transparent" />
                  <div className="absolute bottom-4 left-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-white backdrop-blur-sm sm:left-8">
                    <Building2 size={13} aria-hidden="true" />
                    Company profile
                  </div>
                </div>
                <div className="px-5 pb-6 sm:px-8 sm:pb-8">
                  <div className="-mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#102347] font-display text-2xl font-extrabold text-white shadow-[0_12px_28px_rgba(7,26,61,0.22)] sm:h-24 sm:w-24">
                      {companyLogoUrl ? <img src={companyLogoUrl} alt={`${companyName} logo`} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : companyName.charAt(0) || "C"}
                    </div>
                    <div className="min-w-0 flex-1 pb-1 pt-3 sm:pb-2 sm:pt-12">
                      <h3 className="break-words font-display text-2xl font-extrabold leading-tight tracking-tight text-[#172554] sm:text-3xl">{companyName}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#64748b] sm:text-sm">
                        {companyIndustry && <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 font-semibold text-[#1d4ed8]">{companyIndustry}</span>}
                        {companyLocation && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden="true" />{companyLocation}</span>}
                        {companySize && <span className="rounded-full border border-[#e2e8f0] px-2.5 py-1">{companySize} employees</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-5 border-t border-[#e2e8f0] pt-6 sm:grid-cols-[minmax(0,1fr)_280px] sm:gap-8">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">About the company</p>
                      <h4 className="mt-1 font-display text-xl font-extrabold text-[#172554]">{companyName}</h4>
                      <p className="mt-3 min-h-24 whitespace-pre-wrap break-words text-sm leading-7 text-[#52627f]">{companyAbout || "Company information will appear here once it has been added to the profile."}</p>
                    </div>
                    <aside className="rounded-2xl border border-[#e5ebf4] bg-[#f8faff] p-5">
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-[#64748b]">Company snapshot</p>
                      <dl className="mt-4 space-y-4 text-sm">
                        {companyFounded && <div><dt className="text-xs text-[#64748b]">Founded</dt><dd className="mt-1 font-semibold text-[#172554]">{companyFounded}</dd></div>}
                        {companySize && <div><dt className="text-xs text-[#64748b]">Company size</dt><dd className="mt-1 font-semibold text-[#172554]">{companySize} employees</dd></div>}
                        {companyLocation && <div><dt className="text-xs text-[#64748b]">Headquarters</dt><dd className="mt-1 font-semibold text-[#172554]">{companyLocation}</dd></div>}
                      </dl>
                      {companyWebsite && <a href={companyWebsite} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8]"><span>Visit company website</span><ArrowUpRight size={15} aria-hidden="true" /></a>}
                    </aside>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>,
        document.body,
        )
      )}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#172554] px-4 py-2.5 text-sm font-bold text-white shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

function AdminJobsPage({ notify }: { notify: (message: string) => void }) {
  const [postings, setPostings] = useState<MarketplacePosting[]>(readMarketplacePostings);
  const [search, setSearch] = useState("");
  const updatePosting = (id: string, changes: Partial<MarketplacePosting>, message: string) => {
    const next = postings.map((posting) => posting.id === id ? { ...posting, ...changes, updatedAt: new Date().toISOString() } : posting);
    setPostings(next);
    writeMarketplacePostings(next);
    notify(message);
  };
  const filtered = postings.filter((posting) => `${posting.title} ${posting.company} ${posting.location}`.toLowerCase().includes(search.toLowerCase()));
  const counts = {
    pending: postings.filter((posting) => posting.status === "Pending approval").length,
    active: postings.filter((posting) => posting.status === "Approved").length,
    featured: postings.filter((posting) => posting.status === "Approved" && posting.placement === "featured").length,
  };
  return <div className="space-y-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Marketplace control</p><h1 className="mt-2 font-display text-3xl font-extrabold">Job Management</h1><p className="mt-2 text-sm text-[#64748b]">Approve recruiter jobs, control publication, and move any approved job between featured and normal placement.</p></div><div className="grid gap-4 sm:grid-cols-3">{[["Pending approval", counts.pending], ["Published", counts.active], ["Featured", counts.featured]].map(([label, value]) => <section key={label} className="rounded-2xl border border-[#dbe4f2] bg-white p-5"><p className="text-xs font-bold text-[#64748b]">{label}</p><p className="mt-2 font-display text-3xl font-extrabold text-[#172554]">{value}</p></section>)}</div><section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white"><div className="relative border-b border-[#edf2f8] p-4"><Search size={15} className="absolute left-7 top-1/2 -translate-y-1/2 text-[#94a3b8]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs, companies, or locations..." className="w-full rounded-xl border border-[#dbe4f2] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2563eb]" /></div>{filtered.length === 0 ? <div className="p-10 text-center"><BriefcaseBusiness className="mx-auto text-[#94a3b8]" /><p className="mt-3 text-sm font-bold">No recruiter jobs found</p><p className="mt-1 text-xs text-[#64748b]">Jobs submitted by recruiters will appear here.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-[#f8faff] text-[10px] uppercase tracking-wider text-[#64748b]"><tr>{["Job", "Company", "Status", "Placement", "Submitted", "Actions"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody>{filtered.map((posting) => <tr key={posting.id} className="border-t border-[#edf2f8]"><td className="px-5 py-4"><p className="text-sm font-bold">{posting.title}</p><p className="text-xs text-[#64748b]">{posting.location} · {posting.type}</p></td><td className="px-5 py-4 text-sm">{posting.company}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${posting.status === "Approved" ? "bg-[#dcfce7] text-[#15803d]" : posting.status === "Rejected" ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#fef3c7] text-[#a16207]"}`}>{posting.status}</span></td><td className="px-5 py-4"><select disabled={posting.status !== "Approved"} value={posting.placement} onChange={(event) => updatePosting(posting.id, { placement: event.target.value as "featured" | "normal" }, `${posting.title} moved to ${event.target.value} jobs`)} className="rounded-lg border border-[#dbe4f2] px-2 py-1.5 text-xs disabled:bg-[#f1f5f9]"><option value="normal">Normal</option><option value="featured">Featured</option></select></td><td className="px-5 py-4 text-xs text-[#64748b]">{new Date(posting.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><div className="flex gap-2">{posting.status !== "Approved" && <button onClick={() => updatePosting(posting.id, { status: "Approved", placement: "normal" }, `${posting.title} approved as a normal job`)} className="rounded-lg bg-[#16a34a] px-2.5 py-1.5 text-xs font-bold text-white">Approve</button>}{posting.status === "Approved" && <button onClick={() => updatePosting(posting.id, { status: "Rejected", placement: "normal" }, `${posting.title} unpublished`)} className="rounded-lg border border-[#fecaca] px-2.5 py-1.5 text-xs font-bold text-[#b91c1c]">Unpublish</button>}{posting.status === "Pending approval" && <button onClick={() => updatePosting(posting.id, { status: "Rejected", placement: "normal" }, `${posting.title} rejected`)} className="rounded-lg border border-[#fecaca] px-2.5 py-1.5 text-xs font-bold text-[#b91c1c]">Reject</button>}</div></td></tr>)}</tbody></table></div>}</section></div>;
}

function BillingAdminPage() {
  const records = readBillingRecords();
  const revenue = records.reduce((total, record) => total + record.amount, 0);
  return <div className="space-y-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Revenue operations</p><h1 className="mt-2 font-display text-3xl font-extrabold">Plans & Payments</h1><p className="mt-2 text-sm text-[#64748b]">Monitor seeker and recruiter subscriptions, successful payments, and upcoming renewals.</p></div><div className="grid gap-4 sm:grid-cols-3">{[["Collected", `₹${revenue.toLocaleString("en-IN")}`], ["Successful payments", records.length], ["Active paid plans", new Set(records.map((record) => `${record.audience}:${record.plan}`)).size]].map(([label, value]) => <section key={label} className="rounded-2xl border border-[#dbe4f2] bg-white p-5"><p className="text-xs font-bold text-[#64748b]">{label}</p><p className="mt-2 font-display text-3xl font-extrabold text-[#172554]">{value}</p></section>)}</div><section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white">{records.length === 0 ? <p className="p-8 text-center text-sm text-[#64748b]">No subscription payments yet.</p> : records.map((record) => <div key={record.id} className="flex flex-col gap-3 border-b border-[#edf2f8] p-5 last:border-0 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm font-bold">{record.plan} · {record.audience === "recruiter" ? "Recruiter" : "Job seeker"}</p><p className="mt-1 text-xs text-[#64748b]">{record.id} · renews {new Date(record.renewsAt).toLocaleDateString()} · •••• {record.last4}</p></div><p className="font-bold">₹{record.amount.toLocaleString("en-IN")}</p><span className="w-fit rounded-full bg-[#dcfce7] px-2 py-1 text-[10px] font-bold text-[#15803d]">Paid</span></div>)}</section></div>;
}

function SupportQueuePage({ page, notify }: { page: string; notify: (message: string) => void }) {
  const [tickets, setTickets] = useState<SupportTicket[]>(readSupportTickets);
  const [ticketPage, setTicketPage] = useState(1);
  const visible = tickets.filter((ticket) => page !== "Escalated Tickets" || ticket.status === "Escalated");
  const ticketsPerPage = 5;
  const totalTicketPages = Math.max(1, Math.ceil(visible.length / ticketsPerPage));
  const pagedTickets = visible.slice((ticketPage - 1) * ticketsPerPage, ticketPage * ticketsPerPage);
  const updatePageTicket = (id: string, status: SupportTicket["status"]) => {
    const next = tickets.map((ticket) => ticket.id === id ? { ...ticket, status } : ticket);
    setTickets(next);
    writeSupportTickets(next);
    notify(id + " moved to " + status);
  };
  return (
    <div className="space-y-6">
      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Customer support</p><h1 className="mt-2 font-display text-3xl font-extrabold">{page}</h1><p className="mt-2 text-sm text-[#64748b]">Review customer requests and keep every ticket moving.</p></div>
      <section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white">
        {pagedTickets.length === 0 ? <p className="p-8 text-center text-sm text-[#64748b]">No tickets in this queue.</p> : pagedTickets.map((ticket) => <div key={ticket.id} className="flex flex-col gap-3 border-b border-[#edf2f8] p-5 last:border-0 lg:flex-row lg:items-center"><div className="flex-1"><p className="text-[10px] font-bold text-[#2563eb]">{ticket.id} · {ticket.category}</p><p className="mt-1 text-sm font-bold">{ticket.subject}</p><p className="mt-1 text-xs text-[#64748b]">{ticket.openedBy} · {ticket.openedByRole.replace("_", " ")} · {ticket.priority}</p></div><select value={ticket.status} onChange={(event) => updatePageTicket(ticket.id, event.target.value as SupportTicket["status"])} className="rounded-xl border border-[#dbe4f2] px-3 py-2 text-xs"><option>Open</option><option>In progress</option><option>Waiting for user</option><option>Escalated</option><option>Resolved</option></select><button onClick={() => notify("Reply composer opened for " + ticket.id)} className="rounded-xl bg-[#2563eb] px-3 py-2 text-xs font-bold text-white">Reply</button></div>)}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#edf2f8] px-5 py-3 sm:flex-row"><p className="text-xs text-[#64748b]">Showing {visible.length ? (ticketPage - 1) * ticketsPerPage + 1 : 0}–{Math.min(ticketPage * ticketsPerPage, visible.length)} of {visible.length} tickets</p><div className="flex gap-1"><button onClick={() => setTicketPage((value) => Math.max(1, value - 1))} disabled={ticketPage === 1} className="rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold text-[#2563eb] disabled:text-[#94a3b8]">Previous</button>{Array.from({ length: totalTicketPages }, (_, index) => index + 1).map((value) => <button key={value} onClick={() => setTicketPage(value)} className={ticketPage === value ? "h-8 w-8 rounded-lg bg-[#2563eb] text-xs font-bold text-white" : "h-8 w-8 rounded-lg text-xs font-bold text-[#64748b] hover:bg-[#eff6ff]"}>{value}</button>)}<button onClick={() => setTicketPage((value) => Math.min(totalTicketPages, value + 1))} disabled={ticketPage === totalTicketPages} className="rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold text-[#2563eb] disabled:text-[#94a3b8]">Next</button></div></div>
      </section>
    </div>
  );
  const update = (id: string, status: SupportTicket["status"]) => { const next = tickets.map((ticket) => ticket.id === id ? { ...ticket, status } : ticket); setTickets(next); writeSupportTickets(next); notify(`${id} moved to ${status}`); };
  return <div className="space-y-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Customer support</p><h1 className="mt-2 font-display text-3xl font-extrabold">{page}</h1><p className="mt-2 text-sm text-[#64748b]">Review requests from job seekers and recruiters and keep every ticket moving.</p></div><section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white">{visible.length === 0 ? <p className="p-8 text-center text-sm text-[#64748b]">No tickets in this queue.</p> : visible.map((ticket) => <div key={ticket.id} className="flex flex-col gap-3 border-b border-[#edf2f8] p-5 last:border-0 lg:flex-row lg:items-center"><div className="flex-1"><p className="text-[10px] font-bold text-[#2563eb]">{ticket.id} · {ticket.category}</p><p className="mt-1 text-sm font-bold">{ticket.subject}</p><p className="mt-1 text-xs text-[#64748b]">{ticket.openedBy} · {ticket.openedByRole.replace("_", " ")} · {ticket.priority}</p></div><select value={ticket.status} onChange={(event) => update(ticket.id, event.target.value as SupportTicket["status"])} className="rounded-xl border border-[#dbe4f2] px-3 py-2 text-xs"><option>Open</option><option>In progress</option><option>Waiting for user</option><option>Escalated</option><option>Resolved</option></select><button onClick={() => notify(`Reply composer opened for ${ticket.id}`)} className="rounded-xl bg-[#2563eb] px-3 py-2 text-xs font-bold text-white">Reply</button></div>)}</section></div>;
}

function AdminCompanyVerificationPage({ notify }: { notify: (message: string) => void }) {
  const [companies, setCompanies] = useState<AdminCompanyVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [preview, setPreview] = useState<{ fileName: string; mimeType: string; url: string } | null>(null);
  const refresh = async () => {
    setLoading(true);
    try {
      const response = await apiRequest<{ companies: AdminCompanyVerification[] }>("/admin/company-verifications");
      setCompanies(response.companies);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load company verification requests");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const reviewDocument = async (companyId: string, document: VerificationDocument, status: "verified" | "rejected") => {
    setBusyId(document.id);
    try {
      await apiRequest(`/admin/company-verifications/${companyId}/documents/${document.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewerNote: reviewerNotes[document.id] || "" }),
      });
      notify(`${document.fileName} marked ${status}`);
      await refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Document review failed");
    } finally {
      setBusyId("");
    }
  };
  const approveCompany = async (companyId: string, companyName: string) => {
    setBusyId(companyId);
    try {
      await apiRequest(`/admin/company-verifications/${companyId}/approve`, { method: "POST" });
      notify(`${companyName} verified; recruiter access enabled`);
      await refresh();
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Company approval failed");
    } finally {
      setBusyId("");
    }
  };
  const openDocument = async (document: VerificationDocument) => {
    setBusyId(document.id);
    try {
      const blob = await apiRequestBlob(`/admin/company-verifications/${document.id}/file`);
      const url = URL.createObjectURL(blob);
      setPreview({ fileName: document.fileName, mimeType: document.mimeType, url });
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Document preview failed");
    } finally {
      setBusyId("");
    }
  };
  const sortedCompanies = [...companies].sort((a, b) =>
    Number(a.company.verificationStatus !== "pending") - Number(b.company.verificationStatus !== "pending"),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Business verification</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Recruiters &amp; Companies</h1>
        <p className="mt-2 text-sm text-[#64748b]">Review company information and submitted registration documents before enabling recruiter tools.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm text-[#9a3412]">{error}</div>}
      {loading ? (
        <section className="rounded-2xl border border-[#dbe4f2] bg-white p-8 text-center text-sm text-[#64748b]">Loading company verification records…</section>
      ) : sortedCompanies.length === 0 ? (
        <section className="rounded-2xl border border-[#dbe4f2] bg-white p-8 text-center">
          <Building2 className="mx-auto text-[#94a3b8]" />
          <p className="mt-3 text-sm font-bold text-[#334155]">No company records yet</p>
          <p className="mt-1 text-sm text-[#64748b]">New recruiter registrations will appear here.</p>
        </section>
      ) : sortedCompanies.map(({ company, recruiterName, recruiterEmail, documents }) => {
        const companyName = String(company.name || "Company");
        const hasVerifiedDocument = documents.some((document) => document.status === "verified");
        return (
          <section key={company.id} className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-[#edf2f8] p-5 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-extrabold text-[#172554]">{companyName}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${company.verificationStatus === "verified" ? "bg-[#dcfce7] text-[#15803d]" : company.verificationStatus === "pending" ? "bg-[#fef3c7] text-[#a16207]" : company.verificationStatus === "rejected" ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#eff6ff] text-[#1d4ed8]"}`}>
                    {String(company.verificationStatus).toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#64748b]">Recruiter: {recruiterName} · {recruiterEmail}</p>
                <p className="mt-1 text-xs text-[#64748b]">{String(company.industry || "Industry not set")} · {String(company.city || "Location not set")} · {String(company.website || "Website not set")}</p>
                <p className="mt-1 text-xs text-[#64748b]">GSTIN: {String(company.gstNumber || "Not provided")} · PAN: {String(company.panNumber || "Not provided")} · MSME: {String(company.msmeNumber || "Not provided")}</p>
              </div>
              {company.verificationStatus === "pending" && (
                <button
                  disabled={!hasVerifiedDocument || busyId === company.id}
                  onClick={() => void approveCompany(String(company.id), companyName)}
                  className="shrink-0 rounded-xl bg-[#15803d] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === company.id ? "Approving…" : hasVerifiedDocument ? "Verify company" : "Verify one document first"}
                </button>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-display text-base font-extrabold text-[#172554]">Submitted documents</h3>
              {documents.length === 0 ? (
                <p className="mt-3 rounded-xl bg-[#f8faff] p-4 text-sm text-[#64748b]">No business documents uploaded yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {documents.map((document) => (
                    <div key={document.id} className="rounded-xl border border-[#e2e8f0] p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="flex min-w-0 items-start gap-3">
                          <FileText size={19} className="mt-0.5 shrink-0 text-[#2563eb]" />
                          <div className="min-w-0">
                            <p className="break-all text-sm font-bold text-[#334155]">{document.fileName}</p>
                            <p className="mt-1 text-xs text-[#64748b]">{document.documentType.toUpperCase()} · {document.mimeType} · {(document.fileSize / 1024 / 1024).toFixed(2)} MB · uploaded {new Date(document.submittedAt).toLocaleString()}</p>
                            <p className={`mt-1 text-xs font-bold ${document.status === "verified" ? "text-[#15803d]" : document.status === "rejected" ? "text-[#b91c1c]" : "text-[#a16207]"}`}>Document {document.status}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button disabled={busyId === document.id} onClick={() => void openDocument(document)} className="inline-flex items-center gap-1 rounded-lg border border-[#bfd1ef] px-3 py-2 text-xs font-bold text-[#2563eb] disabled:opacity-50">
                            <Eye size={14} /> {busyId === document.id ? "Loading…" : "View document"}
                          </button>
                          {company.verificationStatus === "pending" && document.status !== "verified" && (
                            <button disabled={busyId === document.id} onClick={() => void reviewDocument(String(company.id), document, "verified")} className="rounded-lg bg-[#15803d] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Mark verified</button>
                          )}
                          {company.verificationStatus === "pending" && document.status !== "rejected" && (
                            <button disabled={busyId === document.id} onClick={() => void reviewDocument(String(company.id), document, "rejected")} className="rounded-lg border border-[#fecaca] px-3 py-2 text-xs font-bold text-[#b91c1c] disabled:opacity-50">Reject</button>
                          )}
                        </div>
                      </div>
                      {company.verificationStatus === "pending" && document.status !== "verified" && (
                        <label className="mt-3 block text-xs font-semibold text-[#64748b]">
                          Review note (optional)
                          <input
                            value={reviewerNotes[document.id] || ""}
                            onChange={(event) => setReviewerNotes((current) => ({ ...current, [document.id]: event.target.value }))}
                            maxLength={1000}
                            placeholder="Explain any action the recruiter should take"
                            className="mt-1.5 w-full rounded-lg border border-[#dbe4f2] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                          />
                        </label>
                      )}
                      {document.reviewerNote && <p className="mt-2 text-xs text-[#64748b]">Previous note: {document.reviewerNote}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
      {preview && (
        createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Document preview: ${preview.fileName}`} onClick={() => setPreview(null)}>
          <section className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] px-5 py-4">
              <div className="min-w-0"><h2 className="truncate font-display text-lg font-extrabold text-[#172554]">{preview.fileName}</h2><p className="text-xs text-[#64748b]">Private company verification document</p></div>
              <button onClick={() => setPreview(null)} aria-label="Close document preview" className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9]"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 bg-[#e2e8f0] p-2 sm:p-4">
              {preview.mimeType.startsWith("image/") ? (
                <img src={preview.url} alt={preview.fileName} className="h-full w-full rounded-lg bg-white object-contain" />
              ) : (
                <iframe title={preview.fileName} src={preview.url} sandbox="" className="h-full w-full rounded-lg bg-white" />
              )}
            </div>
          </section>
        </div>,
        document.body,
        )
      )}
    </div>
  );
}

function RoleWorkspacePage({ role, page, notify }: { role: "admin" | "support"; page: string; notify: (message: string) => void }) {
  const admin = role === "admin";
  if (admin && page === "Users") return <AdminUsersPage notify={notify} />;
  if (admin && page === "Job Management") return <AdminJobsPage notify={notify} />;
  if (admin && page === "Recruiters & Companies") return <AdminCompanyVerificationPage notify={notify} />;
  if (admin && page === "Plans & Payments") return <BillingAdminPage />;
  if ((admin && page === "Support & Escalations") || (!admin && ["My Tickets", "All Tickets", "Escalated Tickets"].includes(page))) return <SupportQueuePage page={page} notify={notify} />;
  return <RoleWorkspacePageCore role={role} page={page} notify={notify} />;
}

function AdminUsersPage({ notify }: { notify: (message: string) => void }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const accounts = readLocalAccounts();
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(accounts.length / perPage));
  const visibleAccounts = accounts.slice((page - 1) * perPage, page * perPage);
  void revision;
  return (
    <div className="space-y-6">
      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Platform management</p><h1 className="mt-2 font-display text-3xl font-extrabold">Users</h1><p className="mt-2 text-sm text-[#64748b]">Review every registered job seeker and recruiter account.</p></div>
      <section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white">
        <div className="flex items-center justify-between border-b border-[#edf2f8] px-5 py-4"><p className="text-sm font-bold">{accounts.length} registered account{accounts.length === 1 ? "" : "s"}</p><button onClick={() => notify("User export prepared")} className="rounded-lg border border-[#bfd1ef] px-3 py-2 text-xs font-bold text-[#2563eb]">Export CSV</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#f8faff] text-[10px] uppercase tracking-wider text-[#64748b]"><tr>{["ID", "User", "Email", "Role", "Joined", "Status"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody>{visibleAccounts.map((account) => <tr key={account.id} className="border-t border-[#edf2f8]"><td className="px-5 py-4 text-xs font-bold text-[#2563eb]">{account.id}</td><td className="px-5 py-4 text-sm font-bold">{account.name}</td><td className="px-5 py-4 text-sm text-[#64748b]">{account.email}</td><td className="px-5 py-4"><span className="rounded-full bg-[#eff6ff] px-2 py-1 text-[10px] font-bold text-[#1d4ed8]">{account.role === "recruiter" ? "Recruiter" : "Job seeker"}</span></td><td className="px-5 py-4 text-xs text-[#64748b]">{new Date(account.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><span className="rounded-full bg-[#dcfce7] px-2 py-1 text-[10px] font-bold text-[#15803d]">Active</span></td></tr>)}</tbody></table></div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#edf2f8] px-5 py-3 sm:flex-row"><p className="text-xs text-[#64748b]">Showing {accounts.length ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, accounts.length)} of {accounts.length}</p><div className="flex items-center gap-1"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold text-[#2563eb] disabled:text-[#94a3b8]">Previous</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => <button key={value} onClick={() => setPage(value)} className={page === value ? "h-8 w-8 rounded-lg bg-[#2563eb] text-xs font-bold text-white" : "h-8 w-8 rounded-lg text-xs font-bold text-[#64748b] hover:bg-[#eff6ff]"}>{value}</button>)}<button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-lg border border-[#dbe4f2] px-3 py-1.5 text-xs font-bold text-[#2563eb] disabled:text-[#94a3b8]">Next</button></div></div>
      </section>
    </div>
  );
}

function RoleWorkspacePageCore({ role, page, notify }: { role: "admin" | "support"; page: string; notify: (message: string) => void }) {
  const admin = role === "admin";
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState({ email: true, urgent: true, approvals: false, maintenance: false });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [recordDraft, setRecordDraft] = useState({ name: "", owner: "", status: "Active" });
  const [createdRecords, setCreatedRecords] = useState<string[][]>(() => {
    try { return JSON.parse(localStorage.getItem(`careerly-admin-records-${page}`) || "[]"); } catch { return []; }
  });
  const title = page;
  const description = admin ? "Manage platform records, moderation, access, and operational controls." : "Work support queues, customer records, knowledge, and agent preferences.";
  const supportTickets = readSupportTickets().map((ticket) => [ticket.id, ticket.subject, ticket.openedBy, `${ticket.priority} · ${ticket.status}`]);
  const localRecruiters = readLocalAccounts().filter((account) => account.role === "recruiter");
  const adminRows: Record<string, string[][]> = {
    "Users": readLocalAccounts().map((account) => [account.id, account.name, account.role === "recruiter" ? "Recruiter" : "Job seeker", "Active"]),
    "Recruiters & Companies": localRecruiters.map((account) => [account.id, account.company || "Company profile not set", account.name, "Browser account"]),
    "Job Management": readMarketplacePostings().map((posting) => [posting.id, posting.title, posting.company, posting.status]),
    "Applications": readMarketplaceApplications().map((application) => [application.id, application.applicant.name || "Applicant", application.jobTitle, application.status || "Applied"]),
    "Support & Escalations": supportTickets,
    "Reports & Abuse": [],
  };
  const rows = admin
    ? (adminRows[page] ?? [])
    : page === "Escalated Tickets"
      ? supportTickets.filter((ticket) => ticket[3].includes("Escalated"))
      : page === "My Tickets"
        ? []
        : supportTickets;
  const filteredRows = rows.filter((row) => row.some((value) => value.toLowerCase().includes(search.toLowerCase())));
  const manageableAdminPages = ["Users", "Recruiters & Companies", "Job Management", "Applications", "Support & Escalations", "Reports & Abuse"];
  if (admin && page === "Analytics") return <AdminAnalyticsPage />;
  if (admin && manageableAdminPages.includes(page)) {
    const allRows = [...createdRecords, ...filteredRows];
    const createRecord = (event: FormEvent) => {
      event.preventDefault();
      if (!recordDraft.name.trim() || !recordDraft.owner.trim()) { notify("Complete the name and owner fields"); return; }
      const prefix = page === "Users" ? "USR" : page === "Recruiters & Companies" ? "CMP" : page === "Job Management" ? "JB" : page === "Applications" ? "APP" : page === "Reports & Abuse" ? "RP" : "TK";
      const record = [`${prefix}-${Date.now().toString().slice(-5)}`, recordDraft.name.trim(), recordDraft.owner.trim(), recordDraft.status];
      const next = [record, ...createdRecords];
      setCreatedRecords(next);
      localStorage.setItem(`careerly-admin-records-${page}`, JSON.stringify(next));
      setRecordDraft({ name: "", owner: "", status: "Active" });
      setShowCreateForm(false);
      notify(`${page.slice(0, -1)} record created`);
    };
    return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Platform management</p><h1 className="mt-2 font-display text-3xl font-extrabold">{page}</h1><p className="mt-2 text-sm text-[#64748b]">Create, review, and update platform records.</p></div><button onClick={() => setShowCreateForm((current) => !current)} className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">{showCreateForm ? "Cancel" : "+ Create record"}</button></div>{showCreateForm && <form onSubmit={createRecord} className="grid gap-3 rounded-2xl border border-[#bfdbfe] bg-[#f8fbff] p-5 sm:grid-cols-3"><input value={recordDraft.name} onChange={(event) => setRecordDraft((current) => ({...current, name: event.target.value}))} placeholder={page === "Users" ? "Full name" : "Record name / title"} className="rounded-xl border border-[#dbe4f2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]" /><input value={recordDraft.owner} onChange={(event) => setRecordDraft((current) => ({...current, owner: event.target.value}))} placeholder={page === "Users" ? "Role" : "Owner / company"} className="rounded-xl border border-[#dbe4f2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]" /><div className="flex gap-2"><select value={recordDraft.status} onChange={(event) => setRecordDraft((current) => ({...current, status: event.target.value}))} className="min-w-0 flex-1 rounded-xl border border-[#dbe4f2] bg-white px-3 py-2.5 text-sm"><option>Active</option><option>Pending</option><option>Review</option><option>Approved</option></select><button className="rounded-xl bg-[#172554] px-4 text-sm font-bold text-white">Create</button></div></form>}<section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white"><div className="relative border-b border-[#edf2f8] p-4"><Search size={15} className="absolute left-7 top-1/2 -translate-y-1/2 text-[#94a3b8]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${page.toLowerCase()}...`} className="w-full rounded-xl border border-[#dbe4f2] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2563eb]" /></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#f8faff] text-[10px] uppercase tracking-wider text-[#64748b]"><tr>{["ID", "Name / subject", "Owner / role", "Status", "Actions"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody>{allRows.map((row) => <tr key={row[0]} className="border-t border-[#edf2f8]"><td className="px-5 py-4 text-xs font-bold text-[#2563eb]">{row[0]}</td><td className="px-5 py-4 text-sm font-bold">{row[1]}</td><td className="px-5 py-4 text-sm text-[#64748b]">{row[2]}</td><td className="px-5 py-4"><select value={statuses[row[0]] ?? row[3]} onChange={(event) => { setStatuses((current) => ({...current, [row[0]]: event.target.value})); notify(`${row[0]} status updated`); }} className="rounded-lg border border-[#dbe4f2] px-2 py-1.5 text-xs"><option>Active</option><option>Pending</option><option>Review</option><option>Approved</option><option>Suspended</option><option>Resolved</option></select></td><td className="px-5 py-4"><button onClick={() => notify(`Opening ${row[0]} record`)} className="rounded-lg border border-[#bfd1ef] px-2.5 py-1.5 text-xs font-bold text-[#2563eb]">Open</button></td></tr>)}</tbody></table></div></section></div>;
  }
  if (page === "Analytics" || page === "Performance") return <div className="space-y-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Reporting</p><h1 className="mt-2 font-display text-3xl font-extrabold">{title}</h1><p className="mt-2 text-sm text-[#64748b]">{description}</p></div><section className="rounded-2xl border border-[#dbe4f2] bg-white p-8 text-center"><FaChartLine className="mx-auto text-[#94a3b8]" /><p className="mt-3 text-sm font-bold text-[#334155]">Analytics are not available yet</p><p className="mt-1 text-sm text-[#64748b]">This workspace does not have a reporting data source connected.</p></section></div>;
  if (page === "Knowledge Base") return <div className="space-y-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Support resources</p><h1 className="mt-2 font-display text-3xl font-extrabold">Knowledge Base</h1></div><section className="rounded-2xl border border-[#dbe4f2] bg-white p-8 text-center"><FileText className="mx-auto text-[#94a3b8]" /><p className="mt-3 text-sm font-bold text-[#334155]">No published articles</p><p className="mt-1 text-sm text-[#64748b]">Knowledge-base publishing is not connected yet.</p></section></div>;
  if (page.includes("Settings") || page === "Notifications") return <div className="space-y-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Preferences</p><h1 className="mt-2 font-display text-3xl font-extrabold">{title}</h1><p className="mt-2 text-sm text-[#64748b]">{description}</p></div><section className="max-w-3xl rounded-2xl border border-[#dbe4f2] bg-white p-6">{Object.entries(settings).map(([key,value]) => <div key={key} className="flex items-center justify-between border-b border-[#edf2f8] py-4 last:border-0"><div><p className="text-sm font-bold capitalize">{key.replaceAll("_", " ")} notifications</p><p className="mt-1 text-xs text-[#64748b]">Control alerts and operational updates for this workspace.</p></div><button onClick={() => setSettings((current) => ({...current,[key]:!value}))} className={`relative h-6 w-11 rounded-full ${value ? "bg-[#2563eb]" : "bg-[#cbd5e1]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${value ? "translate-x-6" : "translate-x-1"}`} /></button></div>)}<button onClick={() => notify("Preferences saved")} className="mt-5 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">Save preferences</button></section></div>;
  if (page === "Audit Logs") return <div className="space-y-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Security trail</p><h1 className="mt-2 font-display text-3xl font-extrabold">Audit Logs</h1></div><section className="rounded-2xl border border-[#dbe4f2] bg-white p-8 text-center"><ShieldCheck className="mx-auto text-[#94a3b8]" /><p className="mt-3 text-sm font-bold text-[#334155]">No audit events recorded</p><p className="mt-1 text-sm text-[#64748b]">Audit logging is not connected to this workspace yet.</p></section></div>;
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">{admin ? "Platform management" : "Customer support"}</p><h1 className="mt-2 font-display text-3xl font-extrabold">{title}</h1><p className="mt-2 text-sm text-[#64748b]">{description}</p></div><button onClick={() => notify(admin ? "New record workflow opened" : "New support ticket opened")} className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">+ Create new</button></div><section className="overflow-hidden rounded-2xl border border-[#dbe4f2] bg-white"><div className="flex flex-col gap-3 border-b border-[#edf2f8] p-4 sm:flex-row sm:items-center"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${page.toLowerCase()}...`} className="w-full rounded-xl border border-[#dbe4f2] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2563eb]" /></div><button onClick={() => notify("CSV export prepared")} className="rounded-xl border border-[#bfd1ef] px-3 py-2.5 text-xs font-bold text-[#2563eb]">Export CSV</button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f8faff] text-[10px] uppercase tracking-wider text-[#64748b]"><tr>{["ID","Subject / name","Owner / type","Priority / status","Workflow","Action"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody>{filteredRows.map((row) => <tr key={row[0]} className="border-t border-[#edf2f8]"><td className="px-5 py-4 text-xs font-bold text-[#2563eb]">{row[0]}</td><td className="px-5 py-4 text-sm font-bold">{row[1]}</td><td className="px-5 py-4 text-sm text-[#64748b]">{row[2]}</td><td className="px-5 py-4"><span className="rounded-full bg-[#fff7ed] px-2 py-1 text-[10px] font-bold text-[#c2410c]">{row[3]}</span></td><td className="px-5 py-4"><select value={statuses[row[0]] ?? row[3]} onChange={(event) => { setStatuses((current) => ({...current,[row[0]]:event.target.value})); notify(`${row[0]} moved to ${event.target.value}`); }} className="rounded-lg border border-[#dbe4f2] px-2 py-1.5 text-xs"><option>Open</option><option>In progress</option><option>Waiting for user</option><option>Approved</option><option>Escalated</option><option>Resolved</option><option>Suspended</option></select></td><td className="px-5 py-4"><button onClick={() => notify(`Opening ${row[0]}`)} className="rounded-lg border border-[#bfd1ef] px-2.5 py-1.5 text-xs font-bold text-[#2563eb]">Open</button></td></tr>)}</tbody></table></div></section></div>;
}

function AdminAnalyticsPage() {
  const accounts = readLocalAccounts();
  const postings = readMarketplacePostings();
  const applications = readMarketplaceApplications();
  const tickets = readSupportTickets();
  const payments = readBillingRecords();
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activity = [
    ...accounts.map((record) => ({ date: record.createdAt, kind: "user" })),
    ...postings.map((record) => ({ date: record.createdAt, kind: "job" })),
    ...applications.map((record) => ({ date: record.appliedAt, kind: "application" })),
    ...tickets.map((record) => ({ date: record.createdAt, kind: "ticket" })),
    ...payments.map((record) => ({ date: record.paidAt, kind: "payment" })),
  ].flatMap((event) => {
    const date = new Date(event.date);
    return Number.isNaN(date.getTime()) || date < periodStart || date > now
      ? []
      : [{ ...event, date }];
  });
  const bucketCount = 12;
  const bucketDuration = (now.getTime() - periodStart.getTime()) / bucketCount;
  const activityBuckets = Array.from({ length: bucketCount }, () => 0);
  for (const event of activity) {
    const index = Math.min(bucketCount - 1, Math.floor((event.date.getTime() - periodStart.getTime()) / bucketDuration));
    activityBuckets[index] += 1;
  }
  const maxActivity = Math.max(...activityBuckets);
  const recentUsers = accounts.filter((account) => {
    const createdAt = new Date(account.createdAt);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= periodStart && createdAt <= now;
  }).length;
  const metrics = [
    { label: "New users", value: recentUsers, detail: "Last 30 days" },
    { label: "Published jobs", value: postings.filter((posting) => posting.status === "Approved").length, detail: "Currently active" },
    { label: "Recorded payments", value: payments.length, detail: "Payment records" },
    { label: "Resolved tickets", value: tickets.filter((ticket) => ticket.status === "Resolved").length, detail: "Support records" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Live reporting</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Analytics</h1>
        <p className="mt-2 text-sm text-[#64748b]">Platform activity based on records available in this browser.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail }) => (
          <section key={label} className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
            <p className="text-xs font-bold text-[#64748b]">{label}</p>
            <p className="mt-3 font-display text-3xl font-extrabold text-[#172554]">{value.toLocaleString()}</p>
            <span className="mt-3 inline-block rounded-lg bg-[#eff6ff] px-2 py-1 text-[10px] font-bold text-[#2563eb]">{detail}</span>
          </section>
        ))}
      </div>
      <section className="rounded-2xl border border-[#dbe4f2] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-extrabold">30-day activity</p>
            <p className="mt-1 text-xs text-[#64748b]">Users, jobs, applications, support tickets, and payments</p>
          </div>
          <span className="rounded-lg bg-[#eff6ff] px-2 py-1 text-[10px] font-bold text-[#2563eb]">{activity.length.toLocaleString()} recorded events</span>
        </div>
        {maxActivity > 0 ? (
          <div className="mt-6 flex h-56 items-end gap-2 border-b border-[#e2e8f0]">
            {activityBuckets.map((count, index) => (
              <div key={index} className="group flex h-full flex-1 flex-col justify-end">
                <div
                  title={`${count} event${count === 1 ? "" : "s"}`}
                  style={{ height: `${count ? Math.max(8, (count / maxActivity) * 100) : 0}%` }}
                  className="rounded-t-md bg-gradient-to-t from-[#2563eb] to-[#93c5fd] transition group-hover:from-[#1d4ed8]"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl bg-[#f8faff] p-6 text-center text-sm text-[#64748b]">No activity has been recorded in this browser during the last 30 days.</p>
        )}
        <p className="mt-3 text-[11px] text-[#94a3b8]">Reporting uses locally available records; centralized platform analytics are not connected.</p>
      </section>
    </div>
  );
}

function RoleDashboard({
  role,
  onLogout,
}: {
  role: Exclude<DemoRole, "job_seeker">;
  onLogout: () => void;
}) {
  const admin = role === "admin";
  const support = role === "support";
  const [activePage, setActivePage] = useState("Dashboard");
  const [pendingPostings, setPendingPostings] = useState<MarketplacePosting[]>(() =>
    readMarketplacePostings().filter((posting) => posting.status === "Pending approval"),
  );
  const [, refreshDashboard] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => {
      setPendingPostings(readMarketplacePostings().filter((posting) => posting.status === "Pending approval"));
      refreshDashboard((revision) => revision + 1);
    };
    window.addEventListener("careerly:postings-updated", refresh);
    window.addEventListener("careerly:applications-updated", refresh);
    window.addEventListener("careerly:support-tickets-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("careerly:postings-updated", refresh);
      window.removeEventListener("careerly:applications-updated", refresh);
      window.removeEventListener("careerly:support-tickets-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const notify = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2400);
  };
  const title = admin
    ? "Platform overview"
    : support
      ? "Support operations"
      : "Recruiter workspace";
  const navItems = admin
    ? [
        "Dashboard",
        "Users",
        "Recruiters & Companies",
        "Job Management",
        "Applications",
        "Plans & Payments",
        "Support & Escalations",
        "Reports & Abuse",
        "Analytics",
        "Audit Logs",
        "Platform Settings",
      ]
    : support
      ? [
          "Dashboard",
          "My Tickets",
          "All Tickets",
          "Escalated Tickets",
          "Knowledge Base",
          "User Directory",
          "Performance",
          "Notifications",
          "Profile & Settings",
        ]
      : [
          "Dashboard",
          "My Jobs",
          "Candidates",
          "Interviews",
          "Company Profile",
          "Subscription",
          "Support",
        ];
  const navIcons: Record<string, IconType> = {
    Dashboard: FaTachometerAlt,
    Users: FaUsers,
    "Recruiters & Companies": FaBuilding,
    "Job Management": FaBriefcase,
    Applications: FaClipboardList,
    "Plans & Payments": FaCreditCard,
    "Support & Escalations": FaExclamationTriangle,
    "Reports & Abuse": FaFlag,
    Analytics: FaChartLine,
    "Audit Logs": FaHistory,
    "Platform Settings": FaCog,
    "My Tickets": FaClipboardList,
    "All Tickets": FaListAlt,
    "Escalated Tickets": FaExclamationTriangle,
    "Knowledge Base": FaBookOpen,
    "User Directory": FaAddressBook,
    Performance: FaChartLine,
    Notifications: FaBell,
    "Profile & Settings": FaUserCog,
  };
  const platformPostings = readMarketplacePostings();
  const platformTickets = readSupportTickets();
  const platformApplications = readMarketplaceApplications();
  const currentUser = readCurrentUser() || { name: "Account", email: "" };
  const recruiterProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem(userDataKey("careerly-company-profile", currentUser.email)) || "{}");
    } catch {
      return {};
    }
  })();
  const recruiterPostings = platformPostings.filter((posting) =>
    recruiterProfile.companyName
      ? posting.company.toLowerCase() === String(recruiterProfile.companyName).toLowerCase()
      : false,
  );
  const recruiterJobIds = new Set(recruiterPostings.map((posting) => posting.id));
  const recruiterApplications = platformApplications.filter((application) =>
    recruiterJobIds.has(application.jobId),
  );
  const formatDashboardDate = (date: string) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "Date unavailable" : parsed.toLocaleDateString();
  };
  const metrics = admin
    ? [
        ["Known accounts", String(readLocalAccounts().length), "This browser"],
        ["Active jobs", String(platformPostings.filter((posting) => posting.status === "Approved").length), "Published roles"],
        ["Pending approvals", String(pendingPostings.length), pendingPostings.length ? "Needs review" : "All caught up"],
        ["Open tickets", String(platformTickets.filter((ticket) => ticket.status !== "Resolved").length), "Support queue"],
      ]
    : support
      ? [
          ["Open tickets", String(platformTickets.filter((ticket) => ticket.status !== "Resolved").length), "In your queue"],
          ["Escalated tickets", String(platformTickets.filter((ticket) => ticket.status === "Escalated").length), "Needs attention"],
          ["High priority", String(platformTickets.filter((ticket) => ticket.priority === "High" || ticket.priority === "Urgent").length), "Act now"],
          ["Resolved", String(platformTickets.filter((ticket) => ticket.status === "Resolved").length), "Completed tickets"],
        ]
      : [
          ["Active jobs", String(recruiterPostings.filter((posting) => posting.status === "Approved").length), "Published roles"],
          ["New candidates", String(recruiterApplications.filter((application) => (application.status || "Applied") === "Applied").length), "Applied to your jobs"],
          ["Interviews", String(recruiterApplications.filter((application) => application.status === "Interview").length), "Your job postings"],
          ["Pending jobs", String(recruiterPostings.filter((posting) => posting.status === "Pending approval").length), "Awaiting review"],
        ];
  const queue = admin
    ? pendingPostings.slice(0, 5).map((posting) => [
        posting.id,
        posting.title,
        posting.company,
        posting.status,
        formatDashboardDate(posting.createdAt),
      ])
    : support
      ? platformTickets
          .filter((ticket) => ticket.status !== "Resolved")
          .sort((a, b) => (a.priority === "Urgent" ? -1 : 0) - (b.priority === "Urgent" ? -1 : 0))
          .slice(0, 5)
          .map((ticket) => [
            ticket.id,
            ticket.subject,
            ticket.openedBy,
            ticket.priority,
            ticket.status,
          ])
      : recruiterApplications.slice(0, 5).map((application) => [
          application.id,
          application.applicant.name || "Applicant",
          application.jobTitle,
          application.status || "Applied",
          formatDashboardDate(application.appliedAt),
        ]);
  const queueHeading = admin
    ? "Job approval queue"
    : support
      ? "Priority queue"
      : "Recommended candidates";
  const workflowBreakdown: Array<[string, number]> = admin
    ? [
        ["Pending approval", platformPostings.filter((posting) => posting.status === "Pending approval").length],
        ["Published", platformPostings.filter((posting) => posting.status === "Approved").length],
        ["Rejected", platformPostings.filter((posting) => posting.status === "Rejected").length],
      ]
    : support
      ? (["Open", "In progress", "Waiting for user", "Escalated", "Resolved"] as const).map((status) => [
          status,
          platformTickets.filter((ticket) => ticket.status === status).length,
        ] as [string, number])
      : (["Applied", "Review", "Shortlisted", "Interview", "Selected", "Rejected"] as const).map((status) => [
          status,
          recruiterApplications.filter((application) => application.status === status).length,
        ] as [string, number]);
  const workflowTotal = workflowBreakdown.reduce((total, [, count]) => total + count, 0);
  return (
    <div className="app-grain min-h-[100dvh] bg-[#f4f7fc] text-[#172554]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0b1f44] p-4 text-[#dbeafe] lg:flex">
        <div className="flex items-center gap-2 px-3 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb] text-white">
            <Zap size={18} />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-white">
              careerly
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#93c5fd]">
              {admin ? "Admin console" : support ? "Support desk" : "Recruiter"}
            </p>
          </div>
        </div>
        <nav className="mt-7 space-y-1">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => { setActivePage(item); setMobileMenu(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${activePage === item ? "bg-[#2563eb] font-bold text-white shadow-lg shadow-blue-950/30" : "text-[#c5d5f2] hover:bg-white/10 hover:text-white"}`}
            >
              <span className="flex h-5 w-5 items-center justify-center text-[14px]">
                {(() => { const Icon = navIcons[item] || FaTachometerAlt; return <Icon aria-hidden="true" />; })()}
              </span>
              {item}
              {item.includes("Escalated") && platformTickets.some((ticket) => ticket.status === "Escalated") && (
                <span className="ml-auto rounded-full bg-[#f97316] px-1.5 py-0.5 text-[10px] text-white">
                  {platformTickets.filter((ticket) => ticket.status === "Escalated").length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/10 p-3">
          <div className="flex items-center gap-2">
            <Avatar small />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-[#a8c2ec]">
                {admin ? "Admin" : support ? "Support" : "Recruiter"}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="ml-auto text-xs font-bold text-[#fca5a5]"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>
      {mobileMenu && <div className="fixed inset-0 z-50 bg-[#0b1f44] p-4 text-[#dbeafe] lg:hidden"><div className="flex items-center justify-between px-2"><p className="font-display text-lg font-extrabold text-white">careerly · {admin ? "Admin" : "Support"}</p><button onClick={() => setMobileMenu(false)} className="rounded-lg p-2 text-white"><X size={20} /></button></div><nav className="mt-6 space-y-1">{navItems.map((item) => { const Icon = navIcons[item] || FaTachometerAlt; return <button key={item} onClick={() => { setActivePage(item); setMobileMenu(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${activePage === item ? "bg-[#2563eb] font-bold text-white" : "text-[#c5d5f2] hover:bg-white/10"}`}><span className="flex h-5 w-5 items-center justify-center text-[14px]"><Icon aria-hidden="true" /></span>{item}</button>; })}</nav><button onClick={onLogout} className="absolute bottom-6 left-4 right-4 rounded-xl border border-[#fca5a5]/40 py-3 text-sm font-bold text-[#fca5a5]">Log out</button></div>}
      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 flex h-[74px] items-center gap-4 border-b border-[#dbe4f2] bg-white/90 px-5 backdrop-blur lg:px-8">
          <button onClick={() => setMobileMenu(true)} className="rounded-lg border border-[#dbe4f2] p-2 lg:hidden">
            <Menu size={18} />
          </button>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              placeholder={
                admin
                  ? "Search users, jobs, recruiters..."
                  : support
                    ? "Search ticket ID, customer, or subject..."
                    : "Search candidates or jobs..."
              }
              className="w-full rounded-xl border border-[#dbe4f2] bg-[#f8faff] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2563eb]"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={() => setActivePage(support ? "Notifications" : "Audit Logs")} className="relative rounded-xl p-2 text-[#52627f] hover:bg-[#eff6ff]">
              <Bell size={19} />
            </button>
            <div className="hidden h-7 w-px bg-[#dbe4f2] sm:block" />
            <details className="relative" data-account-dropdown>
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 hover:bg-[#eff6ff]">
                <Avatar small />
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-[#64748b]">
                    {admin ? "Admin" : support ? "Support" : "Recruiter"}
                  </p>
                </div>
                <ChevronDown size={14} className="text-[#64748b]" />
              </summary>
              <div className="absolute right-0 top-12 z-50 w-44 rounded-xl border border-[#dbe4f2] bg-white p-1.5 shadow-xl">
                <button onClick={() => setActivePage(support ? "Profile & Settings" : "Platform Settings")} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#475569] hover:bg-[#eff6ff]">
                  Profile & settings
                </button>
                <button
                  onClick={onLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-[#b45345] hover:bg-[#fff1ef]"
                  data-testid="button-role-logout"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
          {activePage === "Dashboard" ? <>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono-custom text-[10px] font-bold uppercase tracking-[.18em] text-[#2563eb]">
                {admin
                  ? "Complete platform visibility"
                  : support
                    ? "Customer care command center"
                    : "Hiring command center"}
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[#64748b]">
                Here’s what needs your attention today.
              </p>
            </div>
            <div className="flex gap-2">
              <select className="rounded-xl border border-[#dbe4f2] bg-white px-3 py-2 text-xs font-semibold">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Last 90 days</option>
              </select>
              <button onClick={() => notify("CSV export prepared")} className="rounded-xl bg-[#2563eb] px-3 py-2 text-xs font-bold text-white">
                Export CSV
              </button>
            </div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, detail]) => (
              <button
                key={label}
                className="rounded-2xl border border-[#dbe4f2] bg-white p-5 text-left shadow-[0_4px_16px_rgba(15,42,92,.04)] transition hover:-translate-y-0.5 hover:border-[#93c5fd]"
              >
                <p className="text-xs font-bold text-[#64748b]">{label}</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="font-display text-3xl font-extrabold">
                    {value}
                  </p>
                  <span className="rounded-lg bg-[#eff6ff] px-2 py-1 text-[10px] font-bold text-[#2563eb]">
                    {detail}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
              <p className="font-display text-lg font-extrabold">
                {admin ? "Job status" : support ? "Ticket status" : "Application status"}
              </p>
              <p className="mt-1 text-xs text-[#64748b]">Current records available in this workspace</p>
              {workflowTotal ? (
                <div className="mt-5 space-y-4">
                  {workflowBreakdown.map(([label, count]) => (
                    <div key={label}>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="font-semibold text-[#475569]">{label}</span>
                        <span className="text-[#64748b]">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#eff6ff]">
                        <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${Math.max(4, (count / workflowTotal) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-xl bg-[#f8faff] p-4 text-sm text-[#64748b]">
                  No {admin ? "job" : support ? "ticket" : "application"} records are available yet.
                </p>
              )}
            </section>
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
              <p className="font-display text-lg font-extrabold">
                {admin ? "Platform health" : support ? "Queue overview" : "Hiring overview"}
              </p>
              <p className="mt-1 text-xs text-[#64748b]">A snapshot of records currently available</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {metrics.map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#f8faff] p-4">
                    <p className="text-xs font-semibold text-[#64748b]">{label}</p>
                    <p className="mt-2 font-display text-2xl font-extrabold text-[#172554]">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
          {admin && pendingPostings.length > 0 && (
            <section className="mt-6 overflow-hidden rounded-2xl border border-[#fde68a] bg-white">
              <div className="border-b border-[#fef3c7] bg-[#fffbeb] px-5 py-4">
                <p className="font-display text-lg font-extrabold text-[#172554]">Recruiter job approvals</p>
                <p className="mt-1 text-xs text-[#64748b]">Approve a job here, then use Job Management to move it between featured and normal placement.</p>
              </div>
              {pendingPostings.map((posting) => (
                <div key={posting.id} className="flex flex-col gap-3 border-b border-[#edf2f8] p-5 last:border-0 sm:flex-row sm:items-center">
                  <div className="flex-1"><p className="font-bold">{posting.title}</p><p className="mt-1 text-xs text-[#64748b]">{posting.company} · {posting.location} · {posting.type}</p></div>
                  <div className="flex gap-2"><button onClick={() => { const next = readMarketplacePostings().map((job) => job.id === posting.id ? {...job, status: "Approved" as const, placement: "featured" as const, updatedAt: new Date().toISOString()} : job); writeMarketplacePostings(next); setPendingPostings((current) => current.filter((job) => job.id !== posting.id)); notify(`${posting.title} approved and featured`); }} className="rounded-lg bg-[#16a34a] px-3 py-2 text-xs font-bold text-white">Approve & feature</button><button onClick={() => { const next = readMarketplacePostings().map((job) => job.id === posting.id ? {...job, status: "Rejected" as const, placement: "normal" as const, updatedAt: new Date().toISOString()} : job); writeMarketplacePostings(next); setPendingPostings((current) => current.filter((job) => job.id !== posting.id)); notify(`${posting.title} rejected`); }} className="rounded-lg border border-[#fecaca] px-3 py-2 text-xs font-bold text-[#b91c1c]">Reject</button></div>
                </div>
              ))}
            </section>
          )}
          <section className="mt-6 rounded-2xl border border-[#dbe4f2] bg-white">
            <div className="flex items-center justify-between border-b border-[#edf2f8] px-5 py-4">
              <div>
                <p className="font-display text-lg font-extrabold">
                  {queueHeading}
                </p>
                <p className="text-xs text-[#64748b]">
                  {admin
                    ? "Jobs awaiting approval are listed here."
                    : support
                      ? "Your unresolved support tickets are listed here."
                      : "Applications to your posted jobs are listed here."}
                </p>
              </div>
              <button className="text-xs font-bold text-[#2563eb]">
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[#f8faff] text-[10px] uppercase tracking-[.1em] text-[#64748b]">
                  <tr>
                    {[
                      "ID",
                      admin
                        ? "Job & company"
                        : support
                          ? "Ticket & customer"
                          : "Candidate",
                      admin ? "Company" : support ? "Priority" : "Role",
                      "Status",
                      "SLA / updated",
                      "Action",
                    ].map((column) => (
                      <th key={column} className="px-5 py-3 font-bold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.length ? queue.map((row) => (
                    <tr
                      key={row[0]}
                      className="border-t border-[#edf2f8] text-sm hover:bg-[#fbfdff]"
                    >
                      <td className="px-5 py-4 font-mono-custom text-[11px] font-bold text-[#2563eb]">
                        {row[0]}
                      </td>
                      <td className="px-5 py-4 font-semibold">{row[1]}</td>
                      <td className="px-5 py-4 text-[#64748b]">{row[2]}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#fff7ed] px-2 py-1 text-[10px] font-bold text-[#c2410c]">
                          {row[3]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#64748b]">
                        {row[4]}
                      </td>
                      <td className="px-5 py-4">
                        <button className="rounded-lg border border-[#cbdcf8] px-2.5 py-1.5 text-xs font-bold text-[#2563eb]">
                          {support ? "Reply" : admin ? "Review" : "Open"}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="border-t border-[#edf2f8] px-5 py-8 text-center text-sm text-[#64748b]">
                        No {admin ? "jobs need approval" : support ? "open support tickets" : "applications to your jobs"} yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
              <p className="font-display text-lg font-extrabold">
                Recent activity
              </p>
              <div className="mt-4 space-y-4">
                {queue.slice(0, 4).length ? queue.slice(0, 4).map((row, index) => (
                  <div key={row[0]} className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#fff7ed] text-[#ea580c]" : "bg-[#eff6ff] text-[#2563eb]"}`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{row[1]} · {row[3]}</p>
                      <p className="mt-0.5 text-xs text-[#94a3b8]">
                        {row[4]}
                      </p>
                    </div>
                  </div>
                )) : <p className="rounded-xl bg-[#f8faff] p-4 text-sm text-[#64748b]">No recent records need attention.</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-[#dbe4f2] bg-white p-5">
              <p className="font-display text-lg font-extrabold">
                Quick actions
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(admin
                  ? [
                      "Approve jobs",
                      "Verify recruiters",
                      "Create announcement",
                      "Review reports",
                    ]
                  : support
                    ? [
                        "Assign ticket",
                        "Open knowledge base",
                        "Escalate to admin",
                        "View performance",
                      ]
                    : [
                        "Post a job",
                        "Search talent",
                        "Invite candidate",
                        "Manage plan",
                      ]
                ).map((action) => (
                  <button
                    key={action}
                    className="rounded-xl border border-[#dbe4f2] p-3 text-left text-xs font-bold text-[#33517e] transition hover:border-[#2563eb] hover:bg-[#eff6ff]"
                  >
                    {action}
                    <ArrowUpRight
                      size={14}
                      className="float-right text-[#2563eb]"
                    />
                  </button>
                ))}
              </div>
            </section>
          </div>
          </> : <RoleWorkspacePage role={admin ? "admin" : "support"} page={activePage} notify={notify} />}
        </div>
      </main>
      {toastMessage && <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#172554] px-4 py-2.5 text-sm font-bold text-white shadow-xl" role="status">{toastMessage}</div>}
    </div>
  );
}

function SeekerSupportPage({ onToast }: { onToast: (message: string) => void }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Application help");
  const [tickets, setTickets] = useState<SupportTicket[]>(() => readSupportTickets().filter((ticket) => ticket.openedByRole === "job_seeker"));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (subject.trim().length < 5) { onToast("Please describe what you need help with"); return; }
    const ticket: SupportTicket = { id: `TK-${Date.now().toString().slice(-6)}`, subject: subject.trim(), category, openedBy: readCurrentUser()?.name || "Account", openedByRole: "job_seeker", priority: "Medium", status: "Open", createdAt: new Date().toISOString() };
    writeSupportTickets([ticket, ...readSupportTickets()]);
    setTickets((current) => [ticket, ...current]);
    setSubject("");
    onToast(`${ticket.id} created successfully`);
  };
  return <div className="space-y-7"><div><SectionHeading eyebrow="Help center" title="Support" /><p className="mt-2 text-sm text-[#64748b]">Create a request and track replies from the support team.</p></div><div className="grid gap-6 xl:grid-cols-[1fr_.9fr]"><form onSubmit={submit} className="rounded-2xl border border-[#dbe4f2] bg-white p-6"><p className="font-display text-lg font-extrabold">Create a ticket</p><label className="mt-5 block text-xs font-bold text-[#52627f]">Subject<textarea value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Tell us what happened and what you expected" rows={5} className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm outline-none focus:border-[#2563eb]" /></label><label className="mt-4 block text-xs font-bold text-[#52627f]">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dbe4f2] px-3 py-3 text-sm"><option>Application help</option><option>Profile or resume</option><option>Payment / subscription</option><option>Technical issue</option><option>Report a job</option></select></label><button className="mt-5 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white">Submit ticket</button></form><section className="rounded-2xl border border-[#dbe4f2] bg-white p-6"><p className="font-display text-lg font-extrabold">Your tickets</p>{tickets.length === 0 ? <p className="mt-4 text-sm text-[#64748b]">You have no support requests.</p> : tickets.map((ticket) => <div key={ticket.id} className="mt-4 rounded-xl border border-[#edf2f8] p-3"><span className="text-[10px] font-bold text-[#2563eb]">{ticket.id} · {ticket.category}</span><p className="mt-1 text-sm font-bold">{ticket.subject}</p><p className="mt-1 text-xs text-[#64748b]">{ticket.status}</p></div>)}</section></div></div>;
}

function JobSeekerPanel({ onLogout }: { onLogout: () => void }) {
  const [location] = useLocation();
  const currentUser = readCurrentUser();
  const displayName = currentUser?.name?.trim() || currentUser?.email || "Account";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "A";
  const savedJobsKey = `careerly-saved-jobs-${normalizedEmail(currentUser?.email || "account")}`;
  const applicationTrackerKey = `careerly-application-tracker-${normalizedEmail(currentUser?.email || "account")}`;
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(savedJobsKey) || "[]"); } catch { return []; }
  });
  const [applications, setApplications] = useState<Application[]>(() => {
    try { return JSON.parse(localStorage.getItem(applicationTrackerKey) || "[]"); } catch { return []; }
  });
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const syncApplications = () => {
      const email = currentUser?.email || "";
      const marketplace = readMarketplaceApplications().filter((application) => String(application.applicant.email || "").toLowerCase() === email.toLowerCase()).map<Application>((application) => ({ id: application.id, role: application.jobTitle, company: application.company, stage: application.status || "Applied", date: new Date(application.appliedAt).toLocaleDateString(), location: "", logo: application.company.charAt(0).toUpperCase() }));
      setApplications((current) => [...current.filter((item) => !item.id.startsWith("application-")), ...marketplace]);
    };
    syncApplications();
    window.addEventListener("careerly:applications-updated", syncApplications);
    window.addEventListener("storage", syncApplications);
    return () => { window.removeEventListener("careerly:applications-updated", syncApplications); window.removeEventListener("storage", syncApplications); };
  }, [currentUser?.email]);
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };
  const save = (job: Job) => {
    setSaved((prev) => {
      const next = prev.includes(job.id)
        ? prev.filter((id) => id !== job.id)
        : [...prev, job.id];
      localStorage.setItem(savedJobsKey, JSON.stringify(next));
      return next;
    });
    showToast(
      saved.includes(job.id)
        ? `${job.role} removed from saved`
        : `${job.role} saved for later`,
    );
  };
  const updateStage = (id: string, stage: string) => {
    setApplications((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, stage } : a));
      localStorage.setItem(applicationTrackerKey, JSON.stringify(next));
      if (id.startsWith("application-")) writeMarketplaceApplications(readMarketplaceApplications().map((application) => application.id === id ? { ...application, status: stage } : application));
      return next;
    });
    showToast("Application stage updated");
  };
  return (
    <Shell
      toast={toast}
      savedCount={saved.length}
      onMenu={() => setMenuOpen(!menuOpen)}
      onLogout={onLogout}
    >
      <div
        className={`fixed inset-0 z-40 bg-[#0b1f44]/40 transition lg:hidden ${menuOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#0b1f44] px-4 py-5 text-[#dbeafe] transition-transform lg:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="px-3">
          <Logo />
        </div>
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute right-4 top-5 rounded-lg p-2 text-[#bfc4d1]"
          data-testid="button-close-navigation"
        >
          <X size={18} />
        </button>
        <div className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#8d94a8]">
          Workspace
        </div>
        <nav className="mt-3 space-y-1">
          {[...nav, ...moreNav].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${location === href || (href !== "/job-seeker" && location.startsWith(href)) ? "bg-[#2563eb] text-white" : "text-[#c5d5f2]"}`}
              data-testid={`link-drawer-${label.toLowerCase().replaceAll(" ", "-")}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="flex items-center gap-2.5 rounded-2xl bg-[#303751] p-3">
            <Avatar small initials={initials} />
            <div>
              <p className="text-xs font-bold text-white">{displayName}</p>
              <p className="text-[11px] text-[#aeb4c4]">{currentUser?.role?.replace("_", " ") || "Member"}</p>
            </div>
          </div>
        </div>
      </aside>
      <Switch>
        <Route
          path="/job-seeker"
          component={() => (
            <Dashboard saved={saved} applications={applications} onSave={save} />
          )}
        />
        <Route
          path="/job-seeker/jobs"
          component={() => (
            <JobsPage saved={saved} onSave={save} onToast={showToast} />
          )}
        />
        <Route
          path="/job-seeker/applications"
          component={() => (
            <ApplicationsPage
              applications={applications}
              onStage={updateStage}
              onToast={showToast}
            />
          )}
        />
        <Route
          path="/job-seeker/saved"
          component={() => <SavedPage saved={saved} onSave={save} />}
        />
        <Route
          path="/job-seeker/profile"
          component={() => <ProfilePage onToast={showToast} />}
        />
        <Route
          path="/job-seeker/messages"
          component={() => <MessagesPage onToast={showToast} />}
        />
        <Route
          path="/job-seeker/notifications"
          component={() => (
            <NotificationsPage
              onRead={() => showToast("Notification marked as read")}
            />
          )}
        />
        <Route
          path="/job-seeker/subscription"
          component={() => <SubscriptionPage onToast={showToast} />}
        />
        <Route
          path="/job-seeker/support"
          component={() => <SeekerSupportPage onToast={showToast} />}
        />
        <Route
          path="/job-seeker/settings"
          component={() => <SettingsPage onToast={showToast} />}
        />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

const roleHome: Record<DemoRole, string> = {
  job_seeker: "/job-seeker",
  recruiter: "/recruiter",
  support: "/support",
  admin: "/admin",
};

function AppContent() {
  const [location, navigate] = useLocation();
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("careerly-demo-session") === "true",
  );
  const [demoRole, setDemoRole] = useState<DemoRole>(
    () =>
      (sessionStorage.getItem("careerly-demo-role") as DemoRole | null) ??
      "job_seeker",
  );

  useEffect(() => {
    const closeOpenMenus = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      document
        .querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((menu) => {
          if (!menu.contains(event.target as Node))
            menu.removeAttribute("open");
        });
    };
    document.addEventListener("pointerdown", closeOpenMenus);
    return () => document.removeEventListener("pointerdown", closeOpenMenus);
  }, []);

  useEffect(() => {
    if (!authenticated) {
      if (location !== "/login") navigate("/login");
      return;
    }
    const home = roleHome[demoRole];
    if (!location.startsWith(home)) navigate(home);
  }, [authenticated, demoRole, location, navigate]);

  useEffect(() => {
    if (!authenticated) return;
    const userId = readCurrentUser()?.id;
    if (userId) void enableSecureMessaging(userId).catch((error) => window.dispatchEvent(new CustomEvent("careerly:api-error", { detail: error.message })));
    let cancelled = false;
    let closeSocket: (() => void) | undefined;
    void syncDatabaseState()
      .then((canOpenSocket) => {
        if (cancelled || !canOpenSocket) return;
        closeSocket = openPlatformSocket((event) => {
          if ((event as { type?: string }).type === "message.created") {
            document.title = "New message · Careerly";
            window.dispatchEvent(new CustomEvent("careerly:new-message"));
            void applySocketMessage(event).then((applied) => { if (!applied) void syncMessages(); });
          }
        });
      })
      .catch((error: unknown) => window.dispatchEvent(new CustomEvent("careerly:api-error", {
        detail: error instanceof Error ? error.message : "Could not synchronize account data",
      })));
    return () => {
      cancelled = true;
      closeSocket?.();
    };
  }, [authenticated]);

  const login = (role: DemoRole) => {
    sessionStorage.setItem("careerly-demo-session", "true");
    sessionStorage.setItem("careerly-demo-role", role);
    setDemoRole(role);
    setAuthenticated(true);
    navigate(roleHome[role]);
  };

  const logout = () => {
    void apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
    sessionStorage.removeItem("careerly-demo-session");
    sessionStorage.removeItem("careerly-demo-role");
    setAuthenticated(false);
    setDemoRole("job_seeker");
    navigate("/login");
  };

  if (!authenticated) return <LoginPage onLogin={login} />;
  if (demoRole === "job_seeker") return <JobSeekerPanel onLogout={logout} />;
  if (demoRole === "recruiter") return <RecruiterPanel onLogout={logout} />;
  return <RoleDashboard role={demoRole} onLogout={logout} />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="rounded-2xl bg-[#fff0d0] p-4 text-[#b77624]">
        <Search size={25} />
      </span>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-[#252b43]">
        This page took a different route.
      </h1>
      <Link
        href="/job-seeker"
        className="mt-4 rounded-xl bg-[#147d6d] px-4 py-2.5 text-sm font-bold text-white"
        data-testid="link-not-found-home"
      >
        Back to overview
      </Link>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <RoutedErrorBoundary>
            <AppContent />
          </RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
