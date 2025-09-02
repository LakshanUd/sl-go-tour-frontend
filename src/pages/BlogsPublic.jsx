// src/pages/BlogsPublic.jsx
import { useEffect, useState } from "react";
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
} from "@mui/material";

export default function BlogsPublic() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchBlogs();
      setBlogs(data);
      setLoading(false);
    })();
  }, []);

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
      <Typography variant="h4" gutterBottom>
        Latest Blog Posts
      </Typography>

      {loading ? (
        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={28} />
        </Box>
      ) : blogs.length === 0 ? (
        <Typography color="text.secondary">No blogs yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {blogs.map((b) => (
            <Grid key={b._id} item xs={12} sm={6} md={4}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardActionArea onClick={() => openPost(b)}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={
                      b.image ||
                      "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format&fit=crop"
                    }
                    alt={b.title}
                  />
                  <CardContent>
                    <Typography variant="h6" gutterBottom noWrap title={b.title}>
                      {b.title}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {stripHtml(b.content)}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                      {(b.tags || []).slice(0, 3).map((t) => (
                        <Chip key={t} label={t} size="small" />
                      ))}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Detail modal */}
      <Dialog open={open} onClose={closePost} maxWidth="md" fullWidth>
        <DialogTitle>{active?.title}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            By {active?.author}{" "}
            {active?.publishedDate
              ? "• " + new Date(active.publishedDate).toLocaleString()
              : ""}
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
            style={{ lineHeight: 1.7 }}
          />

          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
            {(active?.tags || []).map((t) => (
              <Chip key={t} label={t} size="small" />
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}

function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || "";
  return text.length > 200 ? text.slice(0, 200) + "…" : text;
}

/* =======================
   Local "API" (in-memory/localStorage) so this page works immediately.
   Replace with your real HTTP calls when backend is ready.
======================= */
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
