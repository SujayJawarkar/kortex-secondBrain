import { cloudinary } from "../config/cloudinary";
import { Readable } from "stream";

export class CloudinaryService {
  async uploadStream(
    buffer: Buffer,
    folder: string,
    filename: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: filename.replace(/\.[^/.]+$/, ""), // Remove extension
          resource_type: "raw", // Needed for non-image files like PDF
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result || !result.secure_url) {
            return reject(new Error("Cloudinary upload failed: No secure_url"));
          }
          resolve(result.secure_url);
        },
      );

      // Convert buffer to stream and pipe to Cloudinary
      const readableStream = new Readable({
        read() {
          this.push(buffer);
          this.push(null);
        },
      });

      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Generate a signed download URL for a Cloudinary raw resource.
   * Raw files are private by default — a signed URL must be used to fetch them.
   * @param secureUrl - The stored secure_url from Cloudinary
   * @param expiresInSeconds - How long the signed URL remains valid (default: 5 min)
   */
  getSignedUrl(secureUrl: string, expiresInSeconds = 300): string {
    // Extract public_id from the URL.
    // Cloudinary URLs look like:
    //   https://res.cloudinary.com/<cloud>/raw/upload/v<ver>/<folder>/<public_id>
    // We need everything after "raw/upload/v<version>/" or "raw/upload/" as public_id.
    const uploadMarker = "/raw/upload/";
    const markerIdx = secureUrl.indexOf(uploadMarker);
    if (markerIdx === -1) {
      // Not a raw resource URL — fall back to original
      return secureUrl;
    }

    let publicIdPart = secureUrl.slice(markerIdx + uploadMarker.length);

    // Strip the version prefix (e.g. "v1712345678/") if present
    publicIdPart = publicIdPart.replace(/^v\d+\//, "");

    const signed = cloudinary.url(publicIdPart, {
      resource_type: "raw",
      type: "upload",
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });

    return signed;
  }
}

export const cloudinaryService = new CloudinaryService();

