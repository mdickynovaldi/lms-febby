import { z } from "zod";

export const createCourseSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(1000).optional().nullable(),
});

export const createMaterialSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional().nullable(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

// Update schemas
export const updateCourseSchema = createCourseSchema.extend({
  id: z.string().uuid(),
});

export const updateMaterialSchema = createMaterialSchema.extend({
  id: z.string().uuid(),
});

// Delete schema (by id)
export const deleteByIdSchema = z.object({ id: z.string().uuid() });

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type DeleteByIdInput = z.infer<typeof deleteByIdSchema>;

// Material content schemas
export const materialContentTypeEnum = z.enum([
  "text",
  "image",
  "pdf",
  "link",
  "youtube",
]);

export const createMaterialContentSchema = z
  .object({
    materialId: z.string().uuid(),
    type: materialContentTypeEnum,
    content: z.string().optional().nullable(),
    url: z.string().url().optional().nullable(),
    orderIndex: z.number().int().min(0).default(0),
  })
  .superRefine((val, ctx) => {
    // Validasi kondisional per tipe
    if (val.type === "text") {
      if (!val.content || val.content.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Konten teks wajib diisi",
          path: ["content"],
        });
      }
    } else {
      if (!val.url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL wajib untuk tipe non-teks",
          path: ["url"],
        });
      }
      if (val.type === "youtube" && val.url) {
        const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(val.url);
        if (!isYouTube) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "URL harus YouTube yang valid",
            path: ["url"],
          });
        }
      }
    }
  });

export const updateMaterialContentSchema =
  createMaterialContentSchema.safeExtend({
    id: z.string().uuid(),
  });

export const deleteMaterialContentSchema = z.object({ id: z.string().uuid() });

export type CreateMaterialContentInput = z.infer<
  typeof createMaterialContentSchema
>;
export type UpdateMaterialContentInput = z.infer<
  typeof updateMaterialContentSchema
>;
export type DeleteMaterialContentInput = z.infer<
  typeof deleteMaterialContentSchema
>;
