// src/pages/BlogsAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchBlogs, createBlog, updateBlog, deleteBlog } from "../lib/api.js";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import toast, { Toaster } from "react-hot-toast";

export default function BlogsAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // blog object or null
  const [form, setForm] = useState({ title: "", author: "", content: "", image: "", tags: "", publishedDate: "" });

  const reload = async () => {
    setLoading(true);
    const data = await fetchBlogs();
    setRows(data);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", author: "", content: "", image: "", tags: "", publishedDate: "" });
    setOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || "",
      author: b.author || "",
      content: b.content || "",
      image: b.image || "",
      tags: (b.tags || []).join(", "),
      publishedDate: b.publishedDate ? new Date(b.publishedDate).toISOString().slice(0, 10) : "",
    });
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  const submit = async () => {
    const payload = {
      ...form,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      publishedDate: form.publishedDate ? new Date(form.publishedDate) : undefined,
    };

    try {
      if (editing) {
        await updateBlog(editing._id, payload);
      } else {
        await createBlog(payload);
      }
      await reload();
      closeModal();
    } catch (e) {
      // toast handled in api.js
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this blog?")) return;
    await deleteBlog(id);
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  const prettyRows = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        date: r.publishedDate ? new Date(r.publishedDate).toLocaleDateString() : "-",
        tagsCSV: (r.tags || []).join(", "),
      })),
    [rows]
  );

  return (
    <>
      <Toaster position="top-right" />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Manage Blogs</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          New Blog
        </Button>
      </Stack>

      <Paper>
        {loading ? (
          <Box p={2}><Typography>Loading…</Typography></Box>
        ) : prettyRows.length === 0 ? (
          <Box p={2}><Typography>No blogs found.</Typography></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Published</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prettyRows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell sx={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.title}
                  </TableCell>
                  <TableCell>{r.author}</TableCell>
                  <TableCell>{r.tagsCSV}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openEdit(r)} aria-label="edit"><Edit /></IconButton>
                    <IconButton onClick={() => onDelete(r._id)} aria-label="delete" color="error"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Create / Edit Modal (same UI) */}
      <Dialog open={open} onClose={closeModal} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? "Edit Blog" : "Create Blog"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={8}>
              <TextField label="Title" fullWidth value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Author" fullWidth value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </Grid>

            <Grid item xs={12}>
              <TextField label="Content (HTML or plain text)" fullWidth multiline minRows={6}
                value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField label="Image URL" fullWidth value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Published Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
                value={form.publishedDate} onChange={(e) => setForm({ ...form, publishedDate: e.target.value })} />
            </Grid>

            <Grid item xs={12}>
              <TextField label="Tags (comma separated)" fullWidth
                value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              <TagPreview csv={form.tags} />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={closeModal}>Cancel</Button>
                <Button variant="contained" onClick={submit}>{editing ? "Update" : "Create"}</Button>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TagPreview({ csv }) {
  const arr = (csv || "").split(",").map((t) => t.trim()).filter(Boolean);
  if (arr.length === 0) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
      {arr.map((t) => <Chip key={t} label={t} size="small" />)}
    </Stack>
  );
}
