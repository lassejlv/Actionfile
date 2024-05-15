import { z } from "zod";

const CommandSchema = z.object({
  cmd: z.string(),
  silent: z.boolean().optional(),
  path: z.string().optional(), // Only for env
});

type Command = z.infer<typeof CommandSchema>;

export { CommandSchema, type Command };
