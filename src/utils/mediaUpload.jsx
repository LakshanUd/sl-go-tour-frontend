// src/utils/mediaUpload.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pyxcvqyppklllelqioqt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5eGN2cXlwcGtsbGxlbHFpb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4OTgyNjYsImV4cCI6MjA3MjQ3NDI2Nn0.AUV3KWGx-dlAYe1P6lic6p63OntVDd45cm3uqvDP7jg"; // move to .env!

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,  
    autoRefreshToken: false, 
  },
});

export default async function mediaUpload(file, { bucket = "images", prefix = "vehicles" } = {}) {
  if (!file) throw new Error("No file selected");
  const key = `${prefix}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(key, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
    });

  if (error) throw new Error(error.message || "Upload failed");

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
  if (!pub?.publicUrl) throw new Error("Could not get public URL");

  return pub.publicUrl;
}
