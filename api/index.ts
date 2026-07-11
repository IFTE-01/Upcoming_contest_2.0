import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const CLIST_USERNAME = process.env.CLIST_USERNAME || "ifte_";
const CLIST_API_KEY = process.env.CLIST_API_KEY || "633775f9b0697c2e405bcd4178ba504313313b14";

interface CacheStore {
  data: any;
  timestamp: number;
}
let contestsCache: CacheStore | null = null;
const CACHE_DURATION_MS = 60 * 1000; // Cache for 60 seconds

app.use(express.json());

// Proxy route for contests
app.get("/api/contests", async (req, res) => {
  const now = Date.now();
  
  // If we have fresh cached data, return it
  if (contestsCache && (now - contestsCache.timestamp) < CACHE_DURATION_MS) {
    return res.json({ source: "cache", data: contestsCache.data });
  }

  try {
    const url = `https://clist.by/api/v4/contest/?limit=800&username=${CLIST_USERNAME}&api_key=${CLIST_API_KEY}&order_by=-start`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CLIST API returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Save to cache
    contestsCache = {
      data,
      timestamp: now,
    };
    
    return res.json({ source: "api", data });
  } catch (error: any) {
    console.error("Error fetching contests from CLIST:", error);
    
    // Fallback to cache if available
    if (contestsCache) {
      return res.json({ 
        source: "stale-fallback", 
        data: contestsCache.data, 
        warning: "CLIST API query failed, showing cached data." 
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to fetch contests from CLIST API.", 
      message: error.message 
    });
  }
});

export default app;
