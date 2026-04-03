import { Router, Response } from "express";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { itemService } from "../services/item.service";
import { tagService } from "../services/tag.service";
import { upload } from "../config/multer";
import { cloudinaryService } from "../services/cloudinary.service";
import { parserService } from "../services/parser.service";

const router = Router();

// All item routes require auth
router.use(authenticate);

// POST /api/v1/items — save URL or note
router.post("/", async (req: AuthRequest, res: Response) => {
  const { url, note } = req.body;
  const { userId, plan } = req.user!;

  if (!url && !note) {
    res.status(400).json({ error: "Provide either a url or a note" });
    return;
  }

  try {
    const result = await itemService.save(userId, plan, {
      url: url || undefined,
      note: note || undefined,
      sourceType: url ? "url" : "note",
      title: url || "Manual Note",
    });

    if (result.duplicate) {
      res.status(200).json({ message: "Already saved", item: result.item });
      return;
    }

    res.status(202).json({
      message: "Item queued for processing",
      item_id: result.item.id,
      status: "queued",
      estimated_ready_ms: 15000,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/items/pdf — upload PDF (Pro only handled in worker)
router.post(
  "/pdf",
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    const { userId, plan } = req.user!;

    if (plan !== "pro") {
      res.status(403).json({ error: "PDF ingestion is a Pro feature" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No PDF file uploaded" });
      return;
    }

    try {
      // 1. Parse PDF from memory buffer immediately (no Cloudinary download needed)
      const { title: parsedTitle, content } = await parserService.parsePdf(req.file.buffer);
      const chunkTexts = parserService.chunkText(content);

      const itemTitle = parsedTitle && parsedTitle !== "PDF Document"
        ? parsedTitle
        : req.file.originalname.replace(/\.pdf$/i, "");

      // 2. Upload to Cloudinary for archival storage (fire-and-forget style with error logging)
      let cloudinaryUrl = "";
      try {
        cloudinaryUrl = await cloudinaryService.uploadStream(
          req.file.buffer,
          `kortex/pdfs/${userId}`,
          `pdf_${Date.now()}_${req.file.originalname}`,
        );
      } catch (uploadErr: any) {
        console.warn(`⚠️ Cloudinary upload failed (item still saved): ${uploadErr.message}`);
      }

      // 3. Save item with pre-parsed content — goes directly to embed queue
      const result = await itemService.savePdf(userId, plan, {
        title: itemTitle,
        url: cloudinaryUrl,
        contentMd: content,
        chunkTexts,
      });

      res.status(202).json({
        message: "PDF processed and queued for embedding",
        item_id: result.item.id,
        status: "processing",
        chunks: chunkTexts.length,
        estimated_ready_ms: chunkTexts.length * 500,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
);

// GET /api/v1/items — list all items
router.get("/", async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;
  const result = await itemService.list(userId);
  res.json({ items: result, count: result.length });
});

// GET /api/v1/items/:id — get single item
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;
  const item = await itemService.getById(req.params.id as string, userId);

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await itemService.markViewed(req.params.id as string);
  res.json({ item });
});

// DELETE /api/v1/items/:id — delete item
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;
  const deleted = await itemService.delete(req.params.id as string, userId);

  if (!deleted) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json({ message: "Item deleted", id: deleted.id });
});

// POST /api/v1/items/:id/tags — manually add tags
router.post("/:id/tags", async (req: AuthRequest, res: Response) => {
  const { tags } = req.body;
  if (!Array.isArray(tags)) {
    res.status(400).json({ error: "Tags must be an array of strings" });
    return;
  }

  const { userId } = req.user!;
  const item = await itemService.getById(req.params.id as string, userId);

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await tagService.addManualTags(item.id, tags);
  res.status(200).json({ message: "Tags added successfully" });
});

// DELETE /api/v1/items/:id/tags/:tag — manually delete a tag
router.delete("/:id/tags/:tag", async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;
  const item = await itemService.getById(req.params.id as string, userId);

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await tagService.removeTag(item.id, req.params.tag as string);
  res.status(200).json({ message: "Tag removed successfully" });
});

export default router;
