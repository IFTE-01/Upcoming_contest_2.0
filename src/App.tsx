import React, { useState, useEffect } from "react";
import { 
  Clock, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Code, 
  Calendar, 
  Award, 
  RefreshCw, 
  Globe, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// TS Interfaces matching CLIST API
interface Contest {
  id: number;
  start: string;
  event: string;
  href: string;
  resource: {
    name: string;
  };
  duration: number;
}

interface ContestInfo {
  id: number;
  start: string;
  event: string;
  href: string;
  resourceName: string;
  duration: number;
  platform: "Codeforces" | "AtCoder" | "LeetCode" | "CodeChef" | "Other";
}

export default function App() {
  const [allContests, setAllContests] = useState<ContestInfo[]>([]);
  const [filteredContests, setFilteredContests] = useState<ContestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real-time states
  const [nowTime, setNowTime] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"time" | "duration">("time");

  // Keep clocks updated
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch contests
  const loadContests = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const response = await fetch("/api/contests");
      if (!response.ok) {
        throw new Error("Failed to fetch contest information from proxy.");
      }
      const json = await response.json();
      
      // Extract data
      const objects = json.data?.objects || [];
      const processed = filterAndProcessContests(objects);
      setAllContests(processed);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while loading contests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContests();
  }, []);

  // Apply search & filter changes
  useEffect(() => {
    let result = [...allContests];

    // Platform filter
    if (selectedPlatform !== "All") {
      result = result.filter(c => c.platform === selectedPlatform);
    }

    // Search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        c => c.event.toLowerCase().includes(query) || c.platform.toLowerCase().includes(query)
      );
    }

    // Sorting
    if (sortBy === "time") {
      result.sort((a, b) => parseUTC(a.start).getTime() - parseUTC(b.start).getTime());
    } else {
      result.sort((a, b) => a.duration - b.duration);
    }

    setFilteredContests(result);
  }, [allContests, selectedPlatform, searchQuery, sortBy]);

  // Helper: Correctly parse CLIST API dates as UTC
  const parseUTC = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    let cleanStr = dateStr.trim();
    // Replace space with T if needed
    if (!cleanStr.includes("T") && cleanStr.includes(" ")) {
      cleanStr = cleanStr.replace(" ", "T");
    }
    // Append Z if no timezone information is present
    if (!cleanStr.endsWith("Z") && !cleanStr.includes("+") && !/-\d{2}:?\d{2}$/.test(cleanStr)) {
      cleanStr += "Z";
    }
    return new Date(cleanStr);
  };

  // Original Filtering & Logical Checks
  const isUpcoming = (startStr: string) => {
    const contestUTC = parseUTC(startStr);
    const now = new Date();
    return contestUTC >= now;
  };

  const filterAndProcessContests = (objects: Contest[]): ContestInfo[] => {
    const processed: ContestInfo[] = [];
    
    objects.forEach(contest => {
      const eventLower = contest.event.toLowerCase();
      const href = contest.href;
      
      // Exact checks from original JS code
      const isCodeforces = href.includes("codeforces");
      const isAtCoderBeginner = eventLower.includes("atcoder beginner");
      const isCodeChefStarter = href.includes("codechef") && eventLower.includes("starter");
      const isLeetCode = href.includes("leetcode");
      
      if (isUpcoming(contest.start) && (isCodeforces || isAtCoderBeginner || isCodeChefStarter || isLeetCode)) {
        let platform: "Codeforces" | "AtCoder" | "LeetCode" | "CodeChef" | "Other" = "Other";
        if (isCodeforces) platform = "Codeforces";
        else if (href.includes("atcoder")) platform = "AtCoder";
        else if (isLeetCode) platform = "LeetCode";
        else if (isCodeChefStarter) platform = "CodeChef";
        
        processed.push({
          id: contest.id,
          start: contest.start,
          event: contest.event,
          href: contest.href,
          resourceName: contest.resource.name,
          duration: contest.duration,
          platform
        });
      }
    });

    // Bubble-like sort simulation (done through standard array sort)
    return processed.sort((a, b) => parseUTC(a.start).getTime() - parseUTC(b.start).getTime());
  };

  // Helper: Original duration converter
  const durationHM = (seconds: number) => {
    let minutes = seconds / 60;
    let h, m;
    m = minutes % 60;
    minutes -= (minutes % 60);
    h = minutes / 60;
    if (m !== 0) return `${h}:${m}`;
    return `${h}:00`;
  };

  // Helper: Correct Bangladesh standard time formatter using Intl to force Asia/Dhaka
  const formatDateTimeBD = (dtStr: string) => {
    try {
      const date = new Date(dtStr);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dhaka",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      
      const parts = formatter.formatToParts(date);
      let day = "";
      let month = "";
      let year = "";
      let hour = "";
      let minute = "";
      let dayPeriod = "";
      
      parts.forEach(part => {
        if (part.type === "day") day = part.value;
        if (part.type === "month") month = part.value;
        if (part.type === "year") year = part.value;
        if (part.type === "hour") hour = part.value;
        if (part.type === "minute") minute = part.value;
        if (part.type === "dayPeriod") dayPeriod = part.value.toUpperCase();
      });
      
      return `${day} ${month} ${year} - ${hour}:${minute} ${dayPeriod}`;
    } catch (e) {
      return new Date(dtStr).toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    }
  };

  // Helper: Live Local Time clock formatter
  const formatCurrentLocalTime = (date: Date) => {
    try {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return date.toLocaleTimeString();
    }
  };

  // Helper: Local browser timezone formatter
  const formatLocalTime = (dtStr: string) => {
    const d = parseUTC(dtStr);
    return d.toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  // Real-time Relative countdown calculations
  const getCountdown = (startStr: string) => {
    const contestTime = parseUTC(startStr).getTime();
    const now = nowTime.getTime();
    const diff = contestTime - now;

    if (diff <= 0) {
      return { text: "LIVE / STARTED", isLive: true };
    }

    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    const rHours = hours % 24;
    const rMins = mins % 60;
    const rSecs = secs % 60;

    let text = "";
    if (days > 0) {
      text = `${days}d ${rHours}h ${rMins}m`;
    } else if (rHours > 0) {
      text = `${rHours}h ${rMins}m ${rSecs}s`;
    } else {
      text = `${rMins}m ${rSecs}s`;
    }

    return { text, isLive: false };
  };

  // Original copy text functionality with interactive feedback
  const copyToClipboard = (contest: ContestInfo) => {
    const textToCopy = `🏆 Contest: ${contest.event}
Platform: ${contest.platform}
Starting Time: ${formatLocalTime(contest.start)}
Duration: ${durationHM(contest.duration)}
Link: ${contest.href}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(contest.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }  // Geometric theme platform brand specifications
  const platformStyles = {
    Codeforces: {
      badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
      barColor: "bg-sky-500",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="10" width="4.2" height="11" rx="1" className="fill-sky-400" />
          <rect x="9.9" y="4" width="4.2" height="17" rx="1" className="fill-red-500" />
          <rect x="16.8" y="7" width="4.2" height="14" rx="1" className="fill-amber-500" />
        </svg>
      )
    },
    AtCoder: {
      badge: "bg-red-500/10 text-red-400 border border-red-500/20",
      barColor: "bg-red-500",
      icon: (
        <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-950 text-[10px] font-bold text-white font-display">
          AC
        </div>
      )
    },
    LeetCode: {
      badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      barColor: "bg-amber-500",
      icon: (
        <img 
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFwAAABcCAMAAADUMSJqAAAAulBMVEUAAAD////4nxu0srG6uLdQT06Fg4P/pRyMjIz7oRuJiYn6nAD/pxz6+vqqqqr19fVCQkLWixoaGhpcXFzu7u7rrWOMWhK9exegZxFdPQ5ISEhoZ2clJSUgICCqbxaaYxHi4uLX19dwcHA6QUfco2GmZgBTNgxmQw8rHQnslADrmBusejpVMQDKgxl8URElGQlDLAjIyMg1NTWcnJwTDgY+Kg06Mivz6N4dFAfrvo3ruH7vnzL7sVaNWgKYtoPGAAACgUlEQVRoge2Y23LaMBRFbdkgBI6BcA/BENrQlgTiQGmTXv7/t2oIkSWN0c1Hfch4P8rDmsXRsSzJ86xyfW33O40sF+32Xc0Nu+Gf0nPI9vsO2S7Uc7a/dMj2oaeUZS+A2U2G7Xfcsa+A2Q2H3o2P4H0Dy27+L/Ynd2z/8/3KGXvQwrj7xRUbIUSi7ldX7CMegcg3ithZoqE7NkK4NJ17dzh2ebrgjTEhYHSe/W00Ho/WmMDQOfbD49vgaoMh6Byb+dRvAeiX18EVUxm7juS8hXVwwrpvIb1PdHZWn0zZTYm34G5cds67cPMzoR1PkhLeFzZWtDKG5nUNdu4eGdW8p6wJQydm4rO2jvcx6QYRw4/Ss6wHS6am622TO6162+XGobcXUzb4qcTzFu/sZ/FJp6aIevYvLSi7OFQmUBSSllw4Zc7CQCOhXH76Dg/48aYWPIilcLoc7vnxWIsdhDOX8Futsgh/cK9XlqCYeg6d0AU/3tGb0KkUnrfijh/vqTsxDOtydv4ShcKD22VdkeWukMgkoOoOLmuYFVc683ahdfH78PRprt6Gp+fqfl/6wtmk4+u6vyTr9ehgRme3LbK6p9lBIIvhsW6v5Z6i06aI4O9m9JilX6j7ARHLjWisrAxlG29E1e45G+G5KZxZBoo6kmGjyLBfVO4H5jhqIS5157zHNmzB/Uc+PmG9jWeziP7z/tzOLwl72LJm82/ToNVNhsOkizEMm3N/bRGchbtYKMVm6b/4+xAAdk6/+k3A2ZT+KopHAOxsE5YdwPpiUQgBuOI6Jh38ITyb4DXcxeVf7n4oQwNpn7PdoAifEqGNxSWIKulwniTzbQpPrlKlSpUqpfMPq4QsyhtkmfMAAAAASUVORK5CYII=" 
          alt="LeetCode Logo" 
          className="w-6 h-6 object-contain" 
          referrerPolicy="no-referrer" 
        />
      )
    },
    CodeChef: {
      badge: "bg-slate-500/15 text-slate-300 border border-slate-500/20",
      barColor: "bg-slate-500",
      icon: (
        <img 
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbdyss2t6VlW1E9KO5fqsFpvdBLFvrD_w6LqJVoxvLHQ&s=10" 
          alt="CodeChef Logo" 
          className="w-6 h-6 object-contain" 
          referrerPolicy="no-referrer" 
        />
      )
    },
    Other: {
      badge: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20",
      barColor: "bg-zinc-400",
      icon: <Code className="w-6 h-6 text-zinc-400" />
    }
  };

  // Get next immediate contest for the Hero Feature card
  const nextContest = filteredContests.length > 0 
    ? filteredContests.find(c => {
        const diff = parseUTC(c.start).getTime() - nowTime.getTime();
        return diff > 0;
      }) || filteredContests[0]
    : null;

  // Platform statistics
  const stats = {
    total: allContests.length,
    codeforces: allContests.filter(c => c.platform === "Codeforces").length,
    atcoder: allContests.filter(c => c.platform === "AtCoder").length,
    leetcode: allContests.filter(c => c.platform === "LeetCode").length,
    codechef: allContests.filter(c => c.platform === "CodeChef").length,
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f1f5f9] font-sans selection:bg-sky-500/30 selection:text-white relative">
      
      {/* Blueprint Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />

      <header className="relative border-b-2 border-[#1e293b] bg-[#0d1527]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          
          {/* Logo & Title in Geometric Style with Satisfying Reveal Animation */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-start text-left"
          >
            <span className="text-[10px] sm:text-xs font-bold text-sky-400 uppercase tracking-[0.2em] mb-1 font-mono">
              A3 Tech Presents
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-display bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              IIUC CP REMAINDER
            </h1>
          </motion.div>

          {/* Live Local Clock */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden sm:flex flex-col items-end font-mono text-right"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 flex items-center gap-1.5 leading-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Local Time
            </span>
            <span className="text-lg font-black text-white mt-1.5 tabular-nums">
              {formatCurrentLocalTime(nowTime)}
            </span>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
        {/* Error Alert Box */}
        {error && (
          <div className="mb-8 p-5 bg-red-950/40 border border-red-900/50 rounded flex items-start gap-3 shadow-md">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-200 font-display uppercase tracking-tight">Connection Error</h3>
              <p className="text-sm text-red-400 mt-1">{error}</p>
              <button 
                onClick={() => loadContests()} 
                className="mt-3 text-[10px] font-bold bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded uppercase tracking-wider transition cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* 1. Dashboard Bento Grid Header with Satisfying Spring Animations */}
        {!loading && !error && allContests.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            
            {/* Hero Card: Next Upcoming Contest */}
            {nextContest && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 15 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="lg:col-span-2 relative overflow-hidden bg-[#0d1527] border border-[#1e293b] rounded p-6 shadow-md group"
              >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-200 ${platformStyles[nextContest.platform]?.barColor || "bg-slate-400"}`} />
                
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded text-[9px] font-bold uppercase tracking-widest font-mono">
                      <Clock className="w-3 h-3" /> Next Contest
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-3 font-display">
                      {nextContest.event}
                    </h2>
                    <div className="text-slate-400 text-xs font-mono mt-1 flex items-center gap-2">
                      Platform: <span className={`platform-pill px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${platformStyles[nextContest.platform]?.badge || ""}`}>{nextContest.platform}</span>
                    </div>
                  </div>
                  
                  {/* Platform Indicator Icon */}
                  <div className="p-2.5 bg-[#152035] border border-[#1e293b] rounded shrink-0">
                    {platformStyles[nextContest.platform]?.icon}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#1e293b] font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Starts In</span>
                    <span className="text-white font-black text-base flex items-center gap-1.5 mt-1 font-display">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      {getCountdown(nextContest.start).text}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Starting Time</span>
                    <span className="text-slate-300 font-semibold text-xs leading-relaxed mt-1 block">
                      {formatLocalTime(nextContest.start)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Duration</span>
                    <span className="text-slate-300 font-semibold text-xs block mt-1">
                      {durationHM(nextContest.duration)} hrs
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-2">
                  <a 
                    href={nextContest.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#090d16] font-bold text-[11px] uppercase tracking-wider px-6 py-2.5 rounded transition duration-200 cursor-pointer shadow-sm"
                  >
                    Register <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button 
                    onClick={() => copyToClipboard(nextContest)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#152035] hover:bg-[#1e2d4a] text-slate-300 border border-[#273754] text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded transition duration-200 cursor-pointer"
                  >
                    {copiedId === nextContest.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Details
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Quick Stats Dashboard Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-[#0d1527] border border-[#1e293b] rounded p-6 flex flex-col justify-between shadow-md relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1e293b] transition-colors duration-200 group-hover:bg-[#38bdf8]" />
              <div>
                <h3 className="font-display font-black text-white flex items-center gap-2 uppercase text-sm tracking-wider">
                  <TrendingUp className="w-4 h-4 text-sky-400" /> Platform Insights
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Distribution of filtered upcoming events</p>
                
                <div className="space-y-3 mt-5 font-mono">
                  {/* Codeforces Row */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded bg-sky-500" /> Codeforces
                    </span>
                    <span className="font-mono font-bold text-white">{stats.codeforces} events</span>
                  </div>

                  {/* LeetCode Row */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500" /> LeetCode
                    </span>
                    <span className="font-mono font-bold text-white">{stats.leetcode} events</span>
                  </div>

                  {/* AtCoder Row */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded bg-red-500" /> AtCoder Beginner
                    </span>
                    <span className="font-mono font-bold text-white">{stats.atcoder} events</span>
                  </div>

                  {/* CodeChef Row */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded bg-slate-500" /> CodeChef Starters
                    </span>
                    <span className="font-mono font-bold text-white">{stats.codechef} events</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1e293b] mt-4 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 uppercase tracking-wider font-bold">Total Tracks</span>
                <span className="font-mono font-black text-base text-white bg-[#152035] border border-[#1e293b] px-3 py-0.5 rounded">
                  {stats.total}
                </span>
              </div>
            </motion.div>

          </div>
        )}

        {/* 2. Interactive Search & Advanced Filtering Controls with Motion Entry */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-[#0d1527] border border-[#1e293b] rounded p-4 sm:p-5 mb-8 shadow-md"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search input bar */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search contests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#152035] border border-[#273754] hover:border-[#33476a] focus:bg-[#1b2a47] focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] text-white placeholder-slate-400 rounded pl-10 pr-4 py-2 text-sm transition duration-150 outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* sorting selection toggles */}
            <div className="flex items-center gap-3 w-full md:w-auto self-start md:self-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 font-mono">
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" /> Sort:
              </span>
              <div className="inline-flex p-1 bg-[#152035] border border-[#1e293b] rounded text-xs w-full sm:w-auto font-mono">
                <button
                  onClick={() => setSortBy("time")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded transition duration-150 cursor-pointer text-[11px] font-bold uppercase tracking-wider ${sortBy === "time" ? "bg-[#38bdf8] text-[#090d16]" : "text-slate-400 hover:text-white"}`}
                >
                  Soonest
                </button>
                <button
                  onClick={() => setSortBy("duration")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded transition duration-150 cursor-pointer text-[11px] font-bold uppercase tracking-wider ${sortBy === "duration" ? "bg-[#38bdf8] text-[#090d16]" : "text-slate-400 hover:text-white"}`}
                >
                  Duration
                </button>
              </div>
            </div>

          </div>

          {/* Quick Platform Filtering Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-[#1e293b] no-scrollbar">
            <span className="text-[10px] text-slate-400 font-bold shrink-0 uppercase font-mono tracking-widest mr-2">Platforms</span>
            {[
              { id: "All", label: "All", count: stats.total },
              { id: "Codeforces", label: "Codeforces", count: stats.codeforces },
              { id: "LeetCode", label: "LeetCode", count: stats.leetcode },
              { id: "AtCoder", label: "AtCoder", count: stats.atcoder },
              { id: "CodeChef", label: "CodeChef", count: stats.codechef },
            ].map((chip) => {
              const isActive = selectedPlatform === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedPlatform(chip.id)}
                  className={`px-3.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer border ${
                    isActive 
                      ? "bg-[#38bdf8] text-[#090d16] border-[#38bdf8] shadow-sm" 
                      : "bg-[#152035] hover:bg-[#1e2d4a] text-slate-300 hover:text-white border-[#273754]"
                  }`}
                >
                  {chip.label}
                  <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                    isActive ? "bg-sky-900/40 text-sky-200" : "bg-[#273754] text-slate-300"
                  }`}>
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* 3. Main Contest Cards Grid */}
        {loading ? (
          /* Loading State: Shimmering Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="bg-[#0d1527] border border-[#1e293b] rounded p-5 h-[280px] flex flex-col justify-between animate-pulse"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#152035]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-[#152035] rounded w-1/4" />
                      <div className="h-4 bg-[#152035] rounded w-2/3" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-6">
                    <div className="h-3 bg-[#152035] rounded w-5/6" />
                    <div className="h-3 bg-[#152035] rounded w-4/5" />
                    <div className="h-3 bg-[#152035] rounded w-2/3" />
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-[#1e293b]">
                  <div className="h-9 bg-[#152035] rounded flex-1" />
                  <div className="h-9 bg-[#152035] rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContests.length === 0 ? (
          /* Beautiful Empty State */
          <div className="text-center py-16 bg-[#0d1527] border border-[#1e293b] rounded max-w-lg mx-auto shadow-md">
            <div className="w-12 h-12 bg-[#152035] border border-[#273754] rounded flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight">No Contests Found</h3>
            <p className="text-slate-400 text-sm mt-1 px-6 font-mono text-xs">
              {searchQuery 
                ? `No upcoming contests match your query "${searchQuery}". Try modifying your keywords.`
                : `There are currently no upcoming filtered contests for platform ${selectedPlatform}.`}
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPlatform("All");
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-bold uppercase tracking-wider cursor-pointer underline"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          /* Staggered Animated Card Presentation */
          <AnimatePresence mode="popLayout">
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredContests.map((contest, index) => {
                const style = platformStyles[contest.platform] || platformStyles.Other;
                const { text: countdownText, isLive } = getCountdown(contest.start);
                
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, ease: "easeOut", delay: Math.min(index * 0.04, 0.4) }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    key={contest.id}
                    className="group relative overflow-hidden bg-[#0d1527] hover:bg-[#121c33] border border-[#1e293b] hover:border-[#38bdf8]/50 p-5 rounded flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    
                    {/* Platform accent vertical border bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 ${style.barColor}`} />

                    <div>
                      {/* Card Header: Platform Logo & Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 p-1.5 bg-[#152035] border border-[#1e293b] rounded">
                            {style.icon}
                          </div>
                          <div>
                            <span className={`platform-pill rounded text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 inline-block ${style.badge}`}>
                              {contest.platform}
                            </span>
                          </div>
                        </div>

                        {/* Status Countdown Banner */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          isLive 
                            ? "bg-red-950/40 text-red-400 border border-red-900/50" 
                            : "bg-[#152035] text-slate-300 border border-[#273754]"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-red-500 animate-pulse" : "bg-slate-450"}`} />
                          {isLive ? "LIVE" : countdownText}
                        </span>
                      </div>

                      {/* Card Body: Title & Meta Info */}
                      <div className="mt-4">
                        <h4 className="text-base font-black text-white group-hover:text-[#38bdf8] leading-tight line-clamp-2 min-h-[2.5rem] font-display transition-colors duration-150">
                          {contest.event}
                        </h4>
                        
                        {/* Geometric metadata wrapper */}
                        <div className="mt-4 space-y-2.5 bg-[#152035] border border-[#1e293b] p-3.5 rounded text-xs font-mono text-slate-300">
                          
                          {/* Starting Time (Local) */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 leading-none">Starting Time</span>
                            <span className="text-slate-100 font-semibold mt-1">
                              {formatLocalTime(contest.start)}
                            </span>
                          </div>

                          {/* Duration Display */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#273754] text-[11px]">
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 leading-none">Duration</span>
                            <span className="text-slate-100 font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {durationHM(contest.duration)} hrs
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex gap-2.5 pt-4 mt-5 border-t border-[#1e293b] relative z-10 font-mono">
                      {/* Go to register link */}
                      <a
                        href={contest.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#090d16] rounded text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
                      >
                        Register <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                      
                      {/* Copy specific details */}
                      <button
                        onClick={() => copyToClipboard(contest)}
                        className="p-2 bg-[#152035] hover:bg-[#1e2d4a] text-slate-400 hover:text-white border border-[#273754] rounded transition duration-200 shrink-0 cursor-pointer"
                        title="Copy Contest Details"
                      >
                        {copiedId === contest.id ? (
                          <Check className="w-4 h-4 text-emerald-400 font-bold" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="relative border-t border-[#1e293b] bg-[#0d1527] py-8 mt-16 font-mono text-[10px] uppercase font-bold tracking-widest text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} IIUC CP REMAINDER | A3 Tech</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
            <span>Developer: Md. Iftekhar Alam</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
