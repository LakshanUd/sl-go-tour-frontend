// src/pages/BlogsPublic.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Grid,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Skeleton,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LabelIcon from "@mui/icons-material/Label";

export default function BlogsPublic() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [sort, setSort] = useState("newest"); // newest | oldest

  // Modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchBlogs();
      setBlogs(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  const tags = useMemo(() => {
    const set = new Set();
    blogs.forEach((b) => (b.tags || []).forEach((t) => set.add(t)));
    return ["all", ...Array.from(set)];
  }, [blogs]);

  const filtered = useMemo(() => {
    let items = [...blogs];

    // search
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter((b) => {
        const hay = `${b.title} ${b.author} ${stripHtml(b.content)} ${(b.tags || []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // tag
    if (activeTag !== "all") {
      items = items.filter((b) => (b.tags || []).includes(activeTag));
    }

    // sort
    items.sort((a, b) => {
      const da = new Date(a.publishedDate || a.createdAt || 0).getTime();
      const db = new Date(b.publishedDate || b.createdAt || 0).getTime();
      return sort === "newest" ? db - da : da - db;
    });

    return items;
  }, [blogs, query, activeTag, sort]);

  const openPost = (b) => {
    setActive(b);
    setOpen(true);
  };
  const closePost = () => {
    setOpen(false);
    setActive(null);
  };

  return (
    <>
      {/* Section header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
          Discover our <GradientText>Blog</GradientText>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Tips, guides, and travel stories to inspire your next journey.
        </Typography>
      </Box>

      {/* Controls */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        {/* Search */}
        <TextField
          placeholder="Search posts, authors, tags…"
          size="medium"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{
            maxWidth: 520,
            "& .MuiOutlinedInput-root": { borderRadius: 3 },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setQuery("")}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Sort */}
        <ToggleButtonGroup
          size="small"
          value={sort}
          exclusive
          onChange={(_, v) => v && setSort(v)}
          sx={{
            bgcolor: "background.paper",
            borderRadius: 999,
            "& .MuiToggleButton-root": { px: 2, textTransform: "none" },
          }}
        >
          <ToggleButton value="newest">Newest</ToggleButton>
          <ToggleButton value="oldest">Oldest</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Tag filter row */}
      {tags.length > 1 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          {tags.map((t) => (
            <Chip
              key={t}
              label={t === "all" ? "All" : t}
              onClick={() => setActiveTag(t)}
              icon={t === "all" ? <LabelIcon /> : undefined}
              color={activeTag === t ? "primary" : "default"}
              variant={activeTag === t ? "filled" : "outlined"}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Stack>
      )}

      {/* Content */}
      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Skeleton variant="rectangular" height={180} />
                <Box sx={{ p: 2 }}>
                  <Skeleton variant="text" height={32} width="70%" />
                  <Skeleton variant="text" height={20} width="95%" />
                  <Skeleton variant="text" height={20} width="90%" />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Skeleton variant="rounded" height={24} width={60} />
                    <Skeleton variant="rounded" height={24} width={70} />
                  </Stack>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <Grid container spacing={3}>
          {filtered.map((b) => (
            <Grid key={b._id} item xs={12} sm={6} md={4}>
              <BlogCard blog={b} onOpen={() => openPost(b)} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Reader modal */}
      <Dialog open={open} onClose={closePost} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{active?.title}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            By {active?.author}{" "}
            {active?.publishedDate ? (
              <>
                • <CalendarMonthIcon sx={{ fontSize: 16, verticalAlign: "-3px" }} />{" "}
                {new Date(active.publishedDate).toLocaleString()}
              </>
            ) : null}
          </Typography>

          {active?.image && (
            <img
              src={active.image}
              alt={active.title}
              style={{
                width: "100%",
                borderRadius: 12,
                marginBottom: 16,
                maxHeight: 420,
                objectFit: "cover",
              }}
            />
          )}

          <div
            dangerouslySetInnerHTML={{ __html: active?.content || "" }}
            style={{ lineHeight: 1.8, fontSize: 16 }}
          />

          {(active?.tags || []).length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {(active?.tags || []).map((t) => (
                  <Chip key={t} label={t} size="small" />
                ))}
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------- Pretty card -------------------- */

function BlogCard({ blog, onOpen }) {
  const cover =
    blog.image ||
    "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format&fit=crop";

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
        transition: "all .2s ease",
      }}
    >
      <CardActionArea onClick={onOpen} sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <Box sx={{ position: "relative" }}>
          <CardMedia component="img" height="180" image={cover} alt={blog.title} />
          {/* Subtle gradient overlay for readability */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,0) 55%)",
            }}
          />
          {/* Date badge */}
          {blog.publishedDate && (
            <Box
              sx={{
                position: "absolute",
                bottom: 10,
                left: 10,
                px: 1,
                py: 0.25,
                bgcolor: "rgba(0,0,0,.65)",
                color: "white",
                borderRadius: 1,
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <CalendarMonthIcon sx={{ fontSize: 14 }} />
              {new Date(blog.publishedDate).toLocaleDateString()}
            </Box>
          )}
        </Box>

        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom noWrap title={blog.title} sx={{ fontWeight: 700 }}>
            {blog.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: 64,
            }}
          >
            {stripHtml(blog.content)}
          </Typography>

          {(blog.tags || []).length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
              {(blog.tags || []).slice(0, 3).map((t) => (
                <Chip key={t} label={t} size="small" />
              ))}
            </Stack>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/* -------------------- Small UI helpers -------------------- */

function GradientText({ children }) {
  return (
    <span
      style={{
        background: "linear-gradient(90deg,#DA22FF,#9733EE)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </span>
  );
}

function EmptyState({ query }) {
  return (
    <Box
      sx={{
        py: 8,
        textAlign: "center",
        borderRadius: 3,
        border: "1px dashed",
        borderColor: "divider",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        No matching posts
      </Typography>
      <Typography color="text.secondary">
        {query ? `Try a different keyword or clear the search.` : `Please check back soon.`}
      </Typography>
    </Box>
  );
}

function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || "";
  return text.length > 200 ? text.slice(0, 200) + "…" : text;
}

/* ===================== Local "API" so the page works now ===================== */
const LS_KEY = "gotour_blogs";

function sleep(ms = 200) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBlogs() {
  await sleep(200);
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // seed a couple of posts for first run
      const seed = [
        {
          _id: "b1",
          title: "Top 10 spots in the Cultural Triangle",
          author: "Admin",
          content: "<p>Discover Sigiriya, Polonnaruwa, and more…</p>",
          image: "",
          tags: ["sri lanka", "culture"],
          publishedDate: new Date().toISOString(),
        },
        {
          _id: "b2",
          title: "Hill Country packing list",
          author: "Nimasha",
          content: "Warm layers, raincoat, hiking shoes…",
          image: "",
          tags: ["tips", "nuwara eliya"],
          publishedDate: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ];
      localStorage.setItem(LS_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load blogs", e);
    return [];
  }
}
