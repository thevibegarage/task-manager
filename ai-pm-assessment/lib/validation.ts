import { z } from "zod";

export const studentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(254, "Email is too long")
    .pipe(z.email("Enter a valid email address")),
});

// Unknown keys (e.g. a "score" sent by a tampered client) are stripped and ignored.
export const submissionSchema = z.object({
  submissionId: z.uuid("Invalid submission ID"),
  name: studentSchema.shape.name,
  email: studentSchema.shape.email,
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(64),
        selectedOptionIds: z.array(z.string().min(1).max(64)).max(10),
      }),
    )
    .max(100),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const loginSchema = z.object({
  email: z.string().trim().max(254),
  password: z.string().max(256),
});
