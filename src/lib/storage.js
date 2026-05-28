import fs from 'fs/promises';
import path from 'path';

/**
 * Uploads a file buffer either to Supabase Storage (in production) or local disk (in development).
 * @param {Buffer} buffer The file binary buffer
 * @param {string} filename The sanitized target filename
 * @param {string} mimeType The file MIME type (e.g. 'application/pdf')
 * @returns {Promise<{ pdfUrl: string, fileKey: string }>} Resolves with the public URL and file key
 */
export async function uploadFile(buffer, filename, mimeType = 'application/pdf') {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.SUPABASE_BUCKET || 'notes';

  if (supabaseUrl && supabaseKey) {
    // Production Mode: Upload to Supabase Storage via REST API
    // Ensure URL has no trailing slash
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    const uploadUrl = `${baseUrl}/storage/v1/object/${bucketName}/${filename}`;

    console.log(`[Storage] Uploading ${filename} to Supabase Storage bucket: ${bucketName}...`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': mimeType,
      },
      body: buffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Storage] Supabase upload failed:', errText);
      throw new Error(`Supabase Storage upload failed: ${response.statusText} (${errText})`);
    }

    // Public URL format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket-name]/[file-path]
    const publicUrl = `${baseUrl}/storage/v1/object/public/${bucketName}/${filename}`;
    console.log(`[Storage] Upload successful! Public URL: ${publicUrl}`);

    return {
      pdfUrl: publicUrl,
      fileKey: filename,
    };
  } else {
    // Development/Fallback Mode: Save to local disk (public/uploads)
    console.log(`[Storage] Local environment detected. Saving ${filename} to public/uploads...`);
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const absolutePath = path.join(uploadDir, filename);

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    return {
      pdfUrl: `/uploads/${filename}`,
      fileKey: filename,
    };
  }
}
